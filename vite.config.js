import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(),
      // Dev-only API proxy plugin
      {
        name: 'api-proxy',
        configureServer(server) {
          // Gemini API proxy
          server.middlewares.use('/api/gemini', async (req, res) => {
            if (req.method === 'OPTIONS') {
              res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' })
              return res.end()
            }
            if (req.method !== 'POST') {
              res.writeHead(405, { 'Content-Type': 'application/json' })
              return res.end(JSON.stringify({ error: 'Method not allowed' }))
            }

            let body = ''
            for await (const chunk of req) body += chunk
            const { prompt, retries = 3 } = JSON.parse(body)

            const apiKeys = (env.GEMINI_API_KEYS || '').split(',').filter(Boolean)
            if (!apiKeys.length) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              return res.end(JSON.stringify({ error: 'No API keys configured' }))
            }

            let keyIndex = Math.floor(Math.random() * apiKeys.length)

            for (let attempt = 0; attempt < retries; attempt++) {
              const apiKey = apiKeys[keyIndex % apiKeys.length]
              keyIndex++
              const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`

              try {
                const response = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 16384 }
                  })
                })

                if (!response.ok) {
                  if (response.status === 429) {
                    await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
                    continue
                  }
                  throw new Error(`API error: ${response.status}`)
                }

                const data = await response.json()
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
                res.writeHead(200, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ text }))
              } catch (error) {
                if (attempt === retries - 1) {
                  res.writeHead(500, { 'Content-Type': 'application/json' })
                  return res.end(JSON.stringify({ error: error.message }))
                }
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
              }
            }

            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'All retries failed' }))
          })

          // Telegram API proxy
          server.middlewares.use('/api/telegram', async (req, res) => {
            if (req.method === 'OPTIONS') {
              res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' })
              return res.end()
            }
            if (req.method !== 'POST') {
              res.writeHead(405, { 'Content-Type': 'application/json' })
              return res.end(JSON.stringify({ error: 'Method not allowed' }))
            }

            let body = ''
            for await (const chunk of req) body += chunk
            const { action, chat_id, text, parse_mode, caption, file_content, file_name } = JSON.parse(body)

            const botToken = env.TELEGRAM_BOT_TOKEN
            if (!botToken) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              return res.end(JSON.stringify({ error: 'Bot token not configured' }))
            }

            try {
              if (action === 'sendMessage') {
                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id, text, parse_mode: parse_mode || 'HTML' })
                })
                const data = await response.json()
                res.writeHead(response.ok ? 200 : 400, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify(data))
              }

              if (action === 'sendDocument') {
                const fileBuffer = Buffer.from(file_content, 'base64')
                const formData = new FormData()
                formData.append('chat_id', String(chat_id))
                formData.append('document', new Blob([fileBuffer], { type: 'text/plain' }), file_name)
                if (caption) formData.append('caption', caption)

                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
                  method: 'POST',
                  body: formData
                })
                const data = await response.json()
                res.writeHead(response.ok ? 200 : 400, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify(data))
              }

              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: `Unknown action: ${action}` }))
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: error.message }))
            }
          })
        }
      }
    ]
  }
})
