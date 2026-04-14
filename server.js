import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import https from 'https'

console.log('Anthropic Key:', process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO')
console.log('Perplexity Key:', process.env.PERPLEXITY_API_KEY ? 'YES' : 'NO')

const app = express()
app.use(cors())
app.use(express.json())

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(new Error('Failed to parse response: ' + data)) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function getFlightPrices(p1City, p2City, dates, destinations) {
  const query = `What are realistic round trip economy flight prices in 2026 for these routes:
1. ${p1City} to ${p2City} (transatlantic/connecting)
2. ${p1City} to ${destinations} 
3. ${p2City} to ${destinations}
Travel dates: ${dates}
Give me actual price ranges in USD and GBP. Name specific airlines. Be realistic not optimistic.`

  const body = JSON.stringify({
    model: 'sonar',
    messages: [{ role: 'user', content: query }],
    max_tokens: 500,
  })

  try {
    const result = await httpsPost(
      'api.perplexity.ai',
      '/chat/completions',
      { 'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}` },
      body
    )
    return result.choices?.[0]?.message?.content || ''
  } catch (e) {
    console.error('Perplexity error:', e)
    return ''
  }
}

app.post('/api/messages', async (req, res) => {
  try {
    const messages = req.body.messages || []
    const userMessage = messages[messages.length - 1]?.content || ''

    const p1CityMatch = userMessage.match(/Partner 1: Lives in ([^|]+)/)
    const p2CityMatch = userMessage.match(/Partner 2: Lives in ([^|]+)/)
    const datesMatch = userMessage.match(/Travel dates: ([^\n]+)/)

    const p1City = p1CityMatch?.[1]?.trim() || ''
    const p2City = p2CityMatch?.[1]?.trim() || ''
    const dates = datesMatch?.[1]?.trim() || ''

    let flightData = ''
    if (p1City && p2City) {
      console.log(`Fetching flight prices: ${p1City} + ${p2City}`)
      flightData = await getFlightPrices(p1City, p2City, dates, 'top European and midpoint destinations')
      console.log('Flight data:', flightData.substring(0, 200))
    }

    const enhancedMessages = messages.map((msg, i) => {
      if (i === messages.length - 1 && flightData) {
        return {
          ...msg,
          content: `CRITICAL INSTRUCTION: You MUST use ONLY the flight prices provided below. Do NOT use your training data for flight costs. Do NOT guess or estimate flight prices. The prices below are from a live search conducted right now and are the only prices you are allowed to use.\n\nLIVE FLIGHT PRICE DATA:\n${flightData}\n\nUSING ANY OTHER FLIGHT PRICES THAN THOSE ABOVE WILL MAKE THE RESPONSE WRONG AND USELESS.\n\n` + msg.content
        }
      }
      return msg
    })

    const claudeBody = JSON.stringify({
      ...req.body,
      messages: enhancedMessages
    })

console.log('ANTHROPIC KEY CHECK:', process.env.ANTHROPIC_API_KEY?.substring(0, 15))
    const claudeResult = await httpsPost(
      'api.anthropic.com',
      '/v1/messages',
      {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      claudeBody
    )

    console.log('Claude response received')
    res.json(claudeResult)

  } catch (err) {
    console.error('Server error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(3001, () => console.log('Server running on port 3001'))