const firebaseConfig = {
  apiKey: "AIzaSyCLzuSbh1QOTeGdkHYAlm_sXSRiex-5iGw",
  authDomain: "nyuko-app-f10b6.firebaseapp.com",
  databaseURL: "https://nyuko-app-f10b6-default-rtdb.firebaseio.com",
  projectId: "nyuko-app-f10b6",
  storageBucket: "nyuko-app-f10b6.firebasestorage.app",
  messagingSenderId: "970608663097",
  appId: "1:970608663097:web:12a6ff870ca16878298be8",
  measurementId: "G-K1V36J9XY5"
};
const $ = id => document.getElementById(id);
let db, room, role, unsubscribe;
$('connect').onclick = async () => {
  room = $('room').value.trim();
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(room)) {
    $('status').textContent = '共有コードは英数字・ハイフン・下線で12〜80文字にしてください'; return;
  }
  $('status').textContent = '接続中…';
  try {
    const [{initializeApp},{getDatabase,ref,set,onValue},{getAuth,signInAnonymously}] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')
    ]);
    const app = initializeApp(firebaseConfig);
    await signInAnonymously(getAuth(app));
    db = {database:getDatabase(app),ref,set,onValue};
    $('modebox').hidden = false;
    $('status').textContent = '認証完了。役割を選んでください';
  } catch(e) {
    console.error(e);
    $('status').textContent = '接続エラー：' + (e.code || e.message || '通信を確認してください');
  }
};
function selectRole(next) {
  role=next;
  $('modebox').hidden=true;
  $('sender').hidden=role!=='sender';
  $('receiver').hidden=role!=='receiver';
  $('status').textContent=role==='sender'?'送信側':'受信側：通知待ち';
  if(unsubscribe) unsubscribe();
  if(role==='receiver') {
    let initial=true,last=null;
    unsubscribe=db.onValue(db.ref(db.database,'rooms/'+room+'/event'), snapshot=>{
      const value=snapshot.val();
      if(initial){initial=false;last=value?.id??null;return;}
      if(value?.id && value.id!==last){last=value.id;showNotice(value.timestamp);}
    }, e=>{console.error(e);$('status').textContent='受信エラー：'+(e.code||'権限を確認');});
  }
}
$('asSender').onclick=()=>selectRole('sender');
$('asReceiver').onclick=()=>selectRole('receiver');
$('send').onclick=async()=>{
  try {
    const timestamp=Date.now();
    await db.set(db.ref(db.database,'rooms/'+room+'/event'),{id:crypto.randomUUID(),timestamp});
    $('sent').textContent='送信しました：'+new Date(timestamp).toLocaleTimeString('ja-JP');
  } catch(e){console.error(e);$('sent').textContent='送信エラー：'+(e.code||e.message||'不明');}
};
function showNotice(timestamp){
  $('time').textContent=new Date(timestamp||Date.now()).toLocaleString('ja-JP');
  $('notice').style.display='flex';
  if(navigator.vibrate)navigator.vibrate([300,150,300]);
}
$('test').onclick=()=>showNotice(Date.now());
$('ack').onclick=()=>{$('notice').style.display='none';};
