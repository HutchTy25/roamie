import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import https from 'https'
import rateLimit from 'express-rate-limit'
import { body, validationResult } from 'express-validator'
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

console.log('Anthropic Key:', process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO')
console.log('Perplexity Key:', process.env.PERPLEXITY_API_KEY ? 'YES' : 'NO')

const app = express()
app.use(cors({
  origin: [
    'https://roamie-nu.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
  ],
  methods: ['GET', 'POST'],
 allowedHeaders: ['Content-Type', 'stripe-signature'],
  credentials: false,
}))
app.use(express.json())

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // max 10 requests per IP per hour
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many requests, please try again later.' },
})

app.use('/api/messages', apiLimiter)
app.use('/api/waitlist', waitlistLimiter)

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
const query = `Flight prices for travel ${dates}. Return ONLY prices in this exact format, no explanation:

${p1City} to ${p2City}: $XXX-XXX USD (Airline name)
${p1City} to Lisbon: $XXX-XXX USD (Airline name)
${p1City} to Porto: $XXX-XXX USD (Airline name)
${p1City} to Azores: $XXX-XXX USD (Airline name)
${p1City} to Iceland: $XXX-XXX USD (Airline name)
${p1City} to Malta: $XXX-XXX USD (Airline name)
${p2City} to Lisbon: £XXX-XXX GBP (Airline name)
${p2City} to Porto: £XXX-XXX GBP (Airline name)
${p2City} to Azores: £XXX-XXX GBP (Airline name)
${p2City} to Iceland: £XXX-XXX GBP (Airline name)
${p2City} to Malta: £XXX-XXX GBP (Airline name)

Numbers only. No paragraphs. No explanations. Just the price list.`  

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

app.post('/api/messages', [
  body('messages').isArray().notEmpty(),
  body('messages.*.role').isIn(['user', 'assistant']),
  body('messages.*.content').isString().trim().isLength({ max: 50000 }),
  body('model').isString().trim(),
  body('max_tokens').isInt({ min: 1, max: 4000 }),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid request', details: errors.array() })
  }

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
app.post('/api/waitlist', [
  body('email').isEmail().normalizeEmail().trim(),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid email' })
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'Roamie <onboarding@resend.dev>',
      to: ['hutchiesonty25@gmail.com'],
      subject: `New beta signup: ${email}`,
      html: `<p>New Roamie beta signup: <strong>${email}</strong></p>`
    })

    res.json({ success: true })
  } catch (err) {
    console.error('Resend error:', err)
    res.status(500).json({ error: err.message })
  }
})
app.post('/api/create-checkout', [
  body('priceId').isString().trim().notEmpty(),
  body('mode').isIn(['payment', 'subscription']),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  try {
    const { priceId, mode } = req.body
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode,
      success_url: 'https://roamie-nu.vercel.app/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://roamie-nu.vercel.app/results',
    })
    res.json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/verify-payment', [
  body('sessionId').isString().trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  try {
    const { sessionId } = req.body
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status === 'paid' || session.status === 'complete') {
      res.json({ success: true, customerId: session.customer })
    } else {
      res.json({ success: false })
    }
  } catch (err) {
    console.error('Verify error:', err)
    res.status(500).json({ error: err.message })
  }
})
app.listen(3001, () => console.log('Server running on port 3001'))