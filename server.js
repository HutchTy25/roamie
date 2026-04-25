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
 allowedHeaders: ['Content-Type', 'stripe-signature', 'x-roamie-secret'],
  credentials: false,
}))
app.use(express.json())
app.use('/api/messages', (req, res, next) => {
  const secret = req.headers['x-roamie-secret']
  if (secret !== process.env.ROAMIE_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
})
app.set('trust proxy', 1)

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

async function getExchangeRates(baseCurrency) {
  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGERATE_API_KEY}/latest/${baseCurrency}`
    )
    const data = await res.json()
    if (data.result === 'success') {
      return data.conversion_rates
    }
    return null
  } catch (e) {
    console.error('Exchange rate error:', e)
    return null
  }
}

const searchCache = new Map()
let globalTripCount = 0

function getCacheKey(p1City, p2City, dates) {
  return `${p1City.toLowerCase()}-${p2City.toLowerCase()}-${dates}`
}

function getCached(key) {
  const cached = searchCache.get(key)
  if (!cached) return null
  const age = Date.now() - cached.timestamp
  if (age > 30 * 60 * 1000) {
    searchCache.delete(key)
    return null
  }
  return cached.data
}

function setCache(key, data) {
  searchCache.set(key, { data, timestamp: Date.now() })
  if (searchCache.size > 100) {
    const firstKey = searchCache.keys().next().value
    searchCache.delete(firstKey)
  }
}

async function getFlightPrices(p1City, p2City, dates, destinations) {
  const query = `What are typical economy flight prices in 2026 for these routes during ${dates}? Give realistic price ranges only in this exact format, no explanations:

${p1City} to ${destinations}: $XXX-XXX USD (Airline name)
${p2City} to ${destinations}: $XXX-XXX (local currency) (Airline name)

If exact prices unknown give realistic estimates based on distance and typical fares. Always provide numbers, never say unknown or cannot.`

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
    const content = result.choices?.[0]?.message?.content || ''
    console.log('Perplexity raw:', content.substring(0, 300))
    return content
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

 // CACHE CHECK HERE
const cacheKey = getCacheKey(p1City, p2City, dates)
const cachedData = getCached(cacheKey)

let flightData = ''
let exchangeRates = null
let currencyContext = ''

const p1CurrMatch = userMessage.match(/Currency: ([A-Z]{3})/)
const p2CurrMatch = userMessage.match(/Currency: ([A-Z]{3}).*Currency: ([A-Z]{3})/s)
const p1Currency = p1CurrMatch?.[1] || 'USD'
const p2Currency = p2CurrMatch?.[2] || 'GBP'

if (cachedData) {
  console.log('Cache hit:', cacheKey)
  flightData = cachedData.flightData
  exchangeRates = cachedData.exchangeRates
} else {
  const [flightResult, ratesResult] = await Promise.all([
    p1City && p2City ? getFlightPrices(p1City, p2City, dates, 'top destinations') : Promise.resolve(''),
    getExchangeRates('USD')
  ])
  exchangeRates = ratesResult

  if (flightResult &&
      !flightResult.toLowerCase().includes('cannot') &&
      !flightResult.toLowerCase().includes('unable') &&
      !flightResult.toLowerCase().includes('xxx') &&
      !flightResult.toLowerCase().includes('don\'t have') &&
      (flightResult.includes('$') || flightResult.includes('£') || flightResult.includes('€'))) {
    flightData = flightResult
  } else {
    console.log('Perplexity returned unusable data, skipping flight injection')
  }

  setCache(cacheKey, { flightData, exchangeRates })
}

if (exchangeRates) {
  const p1Rate = exchangeRates[p1Currency] || 1
  const p2Rate = exchangeRates[p2Currency] || 1
  currencyContext = `
LIVE EXCHANGE RATES (as of today, use these for ALL currency conversions):
1 USD = ${p1Rate} ${p1Currency}
1 USD = ${p2Rate} ${p2Currency}
1 ${p1Currency} = ${(p2Rate/p1Rate).toFixed(4)} ${p2Currency}
1 ${p2Currency} = ${(p1Rate/p2Rate).toFixed(4)} ${p1Currency}
Use these rates for all cost calculations. Do not estimate exchange rates.`
  console.log('Currency context:', currencyContext)
}

const enhancedMessages = messages.map((msg, i) => {
  if (i === messages.length - 1) {
    const injections = []
    if (currencyContext) injections.push(currencyContext)
    if (flightData) injections.push(`LIVE FLIGHT PRICE DATA:\n${flightData}\nUSING ANY OTHER FLIGHT PRICES THAN THOSE ABOVE WILL MAKE THE RESPONSE WRONG.`)
    if (injections.length > 0) {
      return {
        ...msg,
        content: injections.join('\n\n') + '\n\n' + msg.content
      }
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
globalTripCount++
console.log('Global trip count:', globalTripCount)
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
    const { email } = req.body
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

app.post('/api/trip-basics', [
  body('destination').isString().trim().notEmpty(),
  body('neighborhood').isString().trim().optional(),
  body('vibe').isArray().optional(),
  body('accommodation').isString().trim().optional(),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  try {
    const { destination, vibe, accommodation } = req.body

    const perplexityQuery = `For ${destination} in 2026, give me ONLY these specific details in plain text:

1. AIRPORT: Which airport serves ${destination}? How do you get from airport to city center? What does it cost?
2. GETTING AROUND: Best ways to get around ${destination} - Uber/taxi/public transport/rental car with rough costs per trip
3. NEIGHBORHOOD: Best area to stay for ${vibe?.join(', ')} vibe with ${accommodation} accommodation. Why?
4. STAYS: 3 specific hotels or Airbnb areas in that neighborhood with price range per night in local currency
5. FOOD: 3 specific restaurant recommendations near that neighborhood with cuisine type and price range
6. ESSENTIALS: Nearest grocery store, pharmacy, and convenience store to tourist areas

Be specific with real place names. No fluff.`

    const perplexityBody = JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: perplexityQuery }],
      max_tokens: 1000,
    })

    const perplexityData = await httpsPost(
      'api.perplexity.ai',
      '/chat/completions',
      { 'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}` },
      perplexityBody
    )

    const rawData = perplexityData.choices?.[0]?.message?.content || ''

    const claudePrompt = `You are Roamie. Based on this research about ${destination}, create a structured Trip Basics guide.

RESEARCH DATA:
${rawData}

Respond ONLY with valid JSON no markdown no backticks:
{
  "destination": "${destination}",
  "airport": {
    "name": "Airport name",
    "transport_options": [
      { "method": "Taxi", "cost": "$25-35", "time": "30 mins" },
      { "method": "Metro", "cost": "$3", "time": "45 mins" }
    ]
  },
  "getting_around": [
    { "method": "Uber/Bolt", "avg_cost": "$5-10 per trip", "recommended": true },
    { "method": "Public transit", "avg_cost": "$1-2 per trip", "recommended": false }
  ],
  "neighborhood": {
    "name": "Neighborhood name",
    "why": "One sentence why this fits their vibe"
  },
  "stays": [
    { "name": "Hotel/Area name", "type": "Hotel or Airbnb", "price_range": "$80-120/night" }
  ],
  "restaurants": [
    { "name": "Restaurant name", "cuisine": "Type", "price": "$$ or $$$" }
  ],
  "essentials": {
    "grocery": "Store name",
    "pharmacy": "Pharmacy name",
    "convenience": "Store name"
  }
}`

    const claudeBody = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: claudePrompt }]
    })

    const claudeResult = await httpsPost(
      'api.anthropic.com',
      '/v1/messages',
      {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      claudeBody
    )

    const text = claudeResult.content?.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(text)
    res.json(parsed)

  } catch (err) {
    console.error('Trip basics error:', err)
    res.status(500).json({ error: err.message })
  }
})
app.post('/api/create-invite', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Check if user already has a couple
    const { data: existingCouple } = await supabase
      .from('couples')
      .select('*')
      .or(`partner1_id.eq.${userId},partner2_id.eq.${userId}`)
      .single()

    if (existingCouple) {
      return res.json({ invite_code: existingCouple.invite_code, existing: true })
    }

    // Generate unique invite code
    const inviteCode = `roamie-${Math.random().toString(36).substring(2, 8)}`

    // Create couple record
    const { data, error } = await supabase
      .from('couples')
      .insert({
        partner1_id: userId,
        invite_code: inviteCode,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    res.json({ invite_code: inviteCode, couple_id: data.id })
  } catch (err) {
    console.error('Create invite error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/accept-invite', async (req, res) => {
  try {
    const { inviteCode, userId } = req.body
    if (!inviteCode || !userId) return res.status(400).json({ error: 'Missing fields' })

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Find the couple
    const { data: couple, error: findError } = await supabase
      .from('couples')
      .select('*')
      .eq('invite_code', inviteCode)
      .single()

    if (findError || !couple) return res.status(404).json({ error: 'Invalid invite code' })
    if (couple.partner2_id) return res.status(400).json({ error: 'Already connected' })
    if (couple.partner1_id === userId) return res.status(400).json({ error: 'Cannot connect with yourself' })

    // Link the couple
    const { error: updateError } = await supabase
      .from('couples')
      .update({ partner2_id: userId, status: 'connected' })
      .eq('id', couple.id)

    if (updateError) throw updateError

    // Update both profiles with couple_id
    await supabase.from('profiles').update({ couple_id: couple.id }).eq('id', userId)
    await supabase.from('profiles').update({ couple_id: couple.id }).eq('id', couple.partner1_id)

    res.json({ success: true, couple_id: couple.id })
  } catch (err) {
    console.error('Accept invite error:', err)
    res.status(500).json({ error: err.message })
  }
})
app.listen(3001, () => console.log('Server running on port 3001'))
app.get('/api/trip-count', (req, res) => {
  res.json({ count: globalTripCount })
})