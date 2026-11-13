const firebaseConfig = {
  apiKey: "AIzaSyCLzuSbh1QOTeGdkHYAlm_sXSRiex-5iGw",
  authDomain: "nyuko-app-f10b6.firebaseapp.com",
  databaseURL: "https://nyuko-app-f10b6-default-rtdb.firebaseio.com",
  projectId: "nyuko-app-f10b6",
  storageBucket: "nyuko-app-f10b6.firebasestorage.app",
  messagingSenderId: "970608663097",
  appId: "1:970608663097:web:12a6ff870ca16878298be8"
};
const $ = id => document.getElementById(id);
let db, room = '', role = '', unsubscribe = null, connecting = false, sending = false;
const savedRoom = localStorage.getItem('nyuko.room') || '';
$('room').value = savedRoom;
async function notificationTopic(code) {
  const bytes = new TextEncoder().encode('nyuko-v1:' + code);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return 'nyuko-' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('').slice(0, 48);
}
async function showTopic() {
  if (!room) return;
  const topic = await notificationTopic(room);
  $('topic').textContent = topic;
  $('ntfySetup').hidden = false;
}
function status(message) { $('status').textContent = message; }
function stopListening() { if (unsubscribe) { unsubscribe(); unsubscribe = null; } }
function showNotice(timestamp) {
  $('time').textContent = new Date(timestamp || Date.now()).toLocaleString('ja-JP');
  $('notice').style.display = 'flex';
  if (navigator.vibrate) navigator.vibrate([300,150,300]);
}
function selectRole(next) {
  if (!db) return;
  stopListening();
  role = next;
  localStorage.setItem('nyuko.role', role);
  $('modebox').hidden = true;
  $('sender').hidden = role !== 'sender';
  $('receiver').hidden = role !== 'receiver';
  status(role === 'sender' ? '送信側：接続済み' : '受信側：接続中…');
  if (role !== 'receiver') {
    if (window.AndroidArrival) window.AndroidArrival.disableReceiver();
    return;
  }
  if (window.AndroidArrival) window.AndroidArrival.setReceiverRoom(room);
  showTopic().catch(console.error);
  let initial = true, last = null;
  unsubscribe = db.onValue(db.ref(db.database, 'rooms/' + room + '/event'), snapshot => {
    const value = snapshot.val();
    if (initial) {
      initial = false;
      last = value?.id ?? null;
      status('受信側：通知待ち（接続済み）');
      return;
    }
    if (value?.id && value.id !== last) {
      last = value.id;
      status('受信側：新しい入庫通知を受信');
      showNotice(value.timestamp);
    }
  }, error => {
    console.error(error);
    status('受信エラー：' + (error.code || '通信・権限を確認してください'));
  });
}
async function connect() {
  if (connecting) return;
  const nextRoom = $('room').value.trim();
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(nextRoom)) {
    status('共有コードは英数字・ハイフン・下線で12〜80文字にしてください');
    return;
  }
  connecting = true;
  $('connect').disabled = true;
  status('Firebaseに接続中…');
  try {
    if (!db) {
      const [{initializeApp},{getDatabase,ref,set,onValue},{getAuth,signInAnonymously}] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js'),
        import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')
      ]);
      const app = initializeApp(firebaseConfig);
      await signInAnonymously(getAuth(app));
      db = {database:getDatabase(app),ref,set,onValue};
    }
    room = nextRoom;
    localStorage.setItem('nyuko.room', room);
    $('modebox').hidden = false;
    $('sender').hidden = true;
    $('receiver').hidden = true;
    stopListening();
    status('接続済み：役割を選んでください');
    const rememberedRole = localStorage.getItem('nyuko.role');
    if (rememberedRole === 'sender' || rememberedRole === 'receiver') selectRole(rememberedRole);
  } catch (error) {
    console.error(error);
    status('接続エラー：' + (error.code || error.message || '通信を確認してください'));
  } finally {
    connecting = false;
    $('connect').disabled = false;
  }
}
$('connect').onclick = connect;
$('asSender').onclick = () => selectRole('sender');
$('asReceiver').onclick = () => selectRole('receiver');
$('send').onclick = async () => {
  if (!db || !room || sending) return;
  sending = true;
  $('send').disabled = true;
  $('sent').textContent = '送信中…';
  try {
    const timestamp = Date.now();
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(timestamp) + '-' + Math.random().toString(36).slice(2);
    await db.set(db.ref(db.database, 'rooms/' + room + '/event'), {id, timestamp});
    $('sent').textContent = '入庫データ送信完了。通知を送信中…';
    try {
      const topic = await notificationTopic(room);
      const response = await fetch('https://ntfy.sh/' + topic, {
        method: 'POST',
        headers: {'Content-Type': 'text/plain'},
        body: '入庫しました'
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      $('sent').textContent = '入庫・通知送信完了：' + new Date(timestamp).toLocaleTimeString('ja-JP');
    } catch (notifyError) {
      console.error(notifyError);
      $('sent').textContent = '入庫データ送信済み。ただしバックグラウンド通知は送信失敗：' + (notifyError.message || '通信エラー');
    }
  } catch (error) {
    console.error(error);
    $('sent').textContent = '送信エラー：' + (error.code || error.message || '通信を確認してください');
  } finally {
    sending = false;
    $('send').disabled = false;
  }
};
$('test').onclick = () => showNotice(Date.now());
$('ack').onclick = () => { $('notice').style.display = 'none'; status('受信側：通知待ち（確認済み）'); };
$('changeRole').onclick = () => {
  stopListening();
  if (window.AndroidArrival) window.AndroidArrival.disableReceiver();
  localStorage.removeItem('nyuko.role');
  role = '';
  $('sender').hidden = true;
  $('receiver').hidden = true;
  $('modebox').hidden = false;
  status('役割を選んでください');
};
if (savedRoom) connect();

$('copyTopic').onclick = async () => {
  const value = $('topic').textContent;
  try { await navigator.clipboard.writeText(value); $('copyTopic').textContent = 'コピーしました'; }
  catch(e) { $('copyTopic').textContent = '上の文字を長押ししてコピーしてください'; }
};
