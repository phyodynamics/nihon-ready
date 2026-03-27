// Telegram WebApp integration helpers
const ADMIN_IDS = (import.meta.env.VITE_ADMIN_IDS || '').split(',').map(Number);

export function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

export function isTelegramEnv() {
  // Check if running inside Telegram WebApp
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
    // Disable closing confirmation
    if (tg.enableClosingConfirmation) {
      tg.enableClosingConfirmation();
    }
  }
}

export function sendTelegramFile(userId, fileContent, fileName) {
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!botToken) return Promise.reject('No bot token');
  
  const blob = new Blob([fileContent], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('chat_id', userId);
  formData.append('document', blob, fileName);
  formData.append('caption', 'Nihon Ready - သင့်ရဲ့ Interview Preparation Package');
  
  return fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: 'POST',
    body: formData
  });
}

// Send notification to admin
export async function notifyAdmin(message) {
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  for (const adminId of ADMIN_IDS) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId,
          text: message,
          parse_mode: 'HTML'
        })
      });
    } catch (e) {
      console.error('Failed to notify admin:', e);
    }
  }
}
