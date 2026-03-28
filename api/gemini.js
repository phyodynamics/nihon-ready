// Gemini API Proxy - keeps API keys on server side
const API_KEYS = (process.env.GEMINI_API_KEYS || '').split(',').filter(Boolean);
let currentKeyIndex = 0;

function getNextApiKey() {
  if (API_KEYS.length === 0) return null;
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
}

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

  const { prompt, retries = 3 } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Limit prompt size to prevent abuse (100KB max)
  if (typeof prompt !== 'string' || prompt.length > 100000) {
    return res.status(400).json({ error: 'Prompt too large or invalid' });
  }

  // Clamp retries to a reasonable range
  const maxRetries = Math.min(Math.max(1, Number(retries) || 3), 5);

  if (API_KEYS.length === 0) {
    return res.status(500).json({ error: 'No API keys configured' });
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getNextApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 16384,
          }
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited, wait and retry
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return res.status(200).json({ text });
    } catch (error) {
      if (attempt === maxRetries - 1) {
        return res.status(500).json({ error: error.message });
      }
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  return res.status(500).json({ error: 'All retries exhausted' });
}
