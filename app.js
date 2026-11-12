// Set the Firebase project configuration below before publishing.
// Realtime Database must be enabled and secured with suitable authentication/rules for production.
{config}
const $ = id => document.getElementById(id);
let db, room, role, unsubscribe;
$('connect').onclick = async () => {
  room = $('room').value.trim();
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(room)) { $('status').textContent='共有コードは英数字・ハイフン・下線で12〜80文字にしてください'; return; }
  if (!firebaseConfig) { $('status').textContent='未設定：公開前にFirebase接続情報が必要です'; return; }
  try {
    const [{initializeApp},{getDatabase,ref,set,onValue}] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js')
    ]);
    db = { database:getDatabase(initializeApp(firebaseConfig)),ref,set,onValue };
    $('modebox').hidden=false; $('status').textContent='接続準備完了。役割を選んでください';
  } catch(e){$('status').textContent='接続に失敗しました。設定とネット接続を確認してください';}
};
function selectRole(next){
  role=next; $('modebox').hidden=true; $('sender').hidden=role!=='sender'; $('receiver').hidden=role!=='receiver';
  $('status').textContent=role==='sender'?'送信側':'受信側：通知待ち';
  if(unsubscribe) unsubscribe();
  if(role==='receiver') {
    let initial=true, last=null;
    unsubscribe=db.onValue(db.ref(db.database,'rooms/'+room+'/event'), snapshot=>{
      const value=snapshot.val();
      if(initial){initial=false;last=value?.id??null;return;}
      if(value?.id && value.id!==last){last=value.id;showNotice(value.timestamp);}
    },()=>{$('status').textContent='受信エラー：データベース権限を確認してください';});
  }
}
$('asSender').onclick=()=>selectRole('sender');
$('asReceiver').onclick=()=>selectRole('receiver');
$('send').onclick=async()=>{
  try {const timestamp=Date.now();await db.set(db.ref(db.database,'rooms/'+room+'/event'),{id:crypto.randomUUID(),timestamp});$('sent').textContent='送信しました：'+new Date(timestamp).toLocaleTimeString('ja-JP');}
  catch(e){$('sent').textContent='送信に失敗しました';}
};
function showNotice(timestamp){$('time').textContent=new Date(timestamp||Date.now()).toLocaleString('ja-JP');$('notice').style.display='flex';if(navigator.vibrate)navigator.vibrate([300,150,300]);}
$('test').onclick=()=>showNotice(Date.now());
$('ack').onclick=()=>{$('notice').style.display='none';};
