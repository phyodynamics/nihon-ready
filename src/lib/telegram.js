// Telegram WebApp integration helpers
const ADMIN_IDS = (import.meta.env.VITE_ADMIN_IDS || '').split(',').map(Number);

export function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

export function isTelegramEnv() {
  const tg = getTelegramWebApp();
  return !!tg?.initData;
}

export function getTelegramUser() {
  const tg = getTelegramWebApp();
  if (!tg?.initDataUnsafe?.user) return null;
  const user = tg.initDataUnsafe.user;
  return {
    id: user.id,
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    username: user.username || '',
    languageCode: user.language_code || 'my',
    photoUrl: user.photo_url || ''
  };
}

export function isAdmin(userId) {
  return ADMIN_IDS.includes(Number(userId));
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#ffffff');
    tg.setBackgroundColor('#ffffff');
    if (tg.enableClosingConfirmation) {
      tg.enableClosingConfirmation();
    }
  }
}

// Send file via proxy server
export async function sendTelegramFile(userId, fileContent, fileName) {
  // Convert string content to base64
  const base64Content = btoa(unescape(encodeURIComponent(fileContent)));

  const response = await fetch('/api/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'sendDocument',
      chat_id: userId,
      file_content: base64Content,
      file_name: fileName,
      caption: 'Nihon Ready - သင့်ရဲ့ Interview Preparation Package'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to send file');
  }

  return response.json();
}

// Send notification to admin via proxy (only once to primary admin)
export async function notifyAdmin(message) {
  if (ADMIN_IDS.length === 0) return;

  const primaryAdminId = ADMIN_IDS[0];
  try {
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendMessage',
        chat_id: primaryAdminId,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error('Failed to notify admin:', e);
  }
}
