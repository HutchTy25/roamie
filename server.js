import 'dotenv/config'
console.log('API Key loaded:', process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO')
import express from 'express'
import cors from 'cors'
import https from 'https'

const app = express()
app.use(cors())
app.use(express.json())

app.post('/api/messages', (req, res) => {
  const body = JSON.stringify(req.body)

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(body)
    }
  }

  const request = https.request(options, (response) => {
    let data = ''
    response.on('data', chunk => data += chunk)
    response.on('end', () => {
      console.log('Response:', data)
      res.json(JSON.parse(data))
    })
  })

  request.on('error', (err) => {
    console.error('Error:', err)
    res.status(500).json({ error: err.message })
  })

  request.write(body)
  request.end()
})

app.listen(3001, () => console.log('Server running on port 3001'))