// ntfyの購読済みトピックを固定し、共有コードや役割選択を不要にします。
const TOPIC = "nyuko-acfa47fc4a1f8d6dc2ddb2c0dae4c9fa7ea48bad4c239313";
const button = document.getElementById('send');
const status = document.getElementById('status');
let sending = false;
button.addEventListener('click', async () => {
  if (sending) return;
  sending = true;
  button.disabled = true;
  status.textContent = '通知を送信しています…';
  try {
    const response = await fetch('https://ntfy.sh/' + TOPIC, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain'},
      body: '入庫しました'
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    status.textContent = '送信完了：' + new Date().toLocaleTimeString('ja-JP');
    if (navigator.vibrate) navigator.vibrate(100);
  } catch (error) {
    console.error(error);
    status.textContent = '送信失敗：' + (error.message || '通信状態を確認してください');
  } finally {
    sending = false;
    button.disabled = false;
  }
});
