// Telegram Bot API Proxy - keeps bot token on server side
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  const { action, chat_id, text, parse_mode, caption, file_content, file_name } = req.body;

  if (!action || !chat_id) {
    return res.status(400).json({ error: 'action and chat_id are required' });
  }

  try {
    if (action === 'sendMessage') {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id,
          text,
          parse_mode: parse_mode || 'HTML'
        })
      });

      const data = await response.json();
      return res.status(response.ok ? 200 : 400).json(data);
    }

    if (action === 'sendDocument') {
      if (!file_content || !file_name) {
        return res.status(400).json({ error: 'file_content and file_name are required for sendDocument' });
      }

      // Convert base64 file content to a Blob for multipart upload
      const fileBuffer = Buffer.from(file_content, 'base64');

      const formData = new FormData();
      formData.append('chat_id', String(chat_id));
      formData.append('document', new Blob([fileBuffer], { type: 'text/plain' }), file_name);
      if (caption) {
        formData.append('caption', caption);
      }

      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      return res.status(response.ok ? 200 : 400).json(data);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    console.error('Telegram proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
