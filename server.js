import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import https from 'https'
import rateLimit from 'express-rate-limit'
import { body, validationResult } from 'express-validator'
import { readFileSync } from 'fs'
import { resolve } from 'path'
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

// Cache exchange rates for 6 hours to avoid hitting rate limits
let ratesCache = null
let ratesCacheTime = 0

async function getExchangeRates(baseCurrency) {
  const now = Date.now()
  const sixHours = 6 * 60 * 60 * 1000
  
  if (ratesCache && (now - ratesCacheTime) < sixHours) {
    console.log('Exchange rates from cache')
    return ratesCache
  }

  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGERATE_API_KEY}/latest/${baseCurrency}`
    )
    const text = await res.text()
    if (!text.startsWith('{')) {
      console.error('ExchangeRate API returned non-JSON:', text.substring(0, 100))
      return ratesCache || null
    }
    const data = JSON.parse(text)
    if (data.result === 'success') {
      ratesCache = data.conversion_rates
      ratesCacheTime = now
      console.log('Exchange rates refreshed')
      return ratesCache
    }
    return ratesCache || null
  } catch (e) {
    console.error('Exchange rate error:', e)
    return ratesCache || null
  }
}


let airportDB = null

function loadAirportDB() {
  if (airportDB) return airportDB
  try {
    const data = readFileSync(resolve('./airports.csv'), 'utf8')
    airportDB = {}
    const lines = data.split('\n').slice(1) // skip header
    lines.forEach(line => {
      const parts = line.split(',').map(p => p.replace(/"/g, '').trim())
      if (parts.length < 14) return
      const type = parts[2]
      const city = parts[10]?.toLowerCase()
      const scheduled = parts[11]
      const iata = parts[13]
      if (!iata || iata === '' || iata.length !== 3) return
      if (type === 'heliport' || type === 'closed' || type === 'seaplane_base') return
      if (scheduled !== 'yes' && type === 'small_airport') return
      if (city) airportDB[city] = iata
    })
    console.log(`Airport DB loaded: ${Object.keys(airportDB).length} entries`)
    return airportDB
  } catch (e) {
    console.error('Airport DB load error:', e)
    return {}
  }
}

function getCityIATA(cityName) {
  const db = loadAirportDB()
  const city = cityName.toLowerCase().split(/[,\.]/)[0].trim()

  // Check overrides FIRST
  const overrides = {
    'london': 'LHR', 'new york': 'JFK', 'paris': 'CDG',
    'chicago': 'ORD', 'los angeles': 'LAX', 'tokyo': 'NRT',
    'washington': 'IAD', 'san francisco': 'SFO', 'miami': 'MIA',
    'dubai': 'DXB', 'amsterdam': 'AMS', 'frankfurt': 'FRA',
    'manchester': 'MAN', 'birmingham': 'BHX', 'edinburgh': 'EDI',
    'glasgow': 'GLA', 'dublin': 'DUB', 'sydney': 'SYD',
    'melbourne': 'MEL', 'toronto': 'YYZ', 'vancouver': 'YVR',
    'reykjavik': 'KEF', 'lisbon': 'LIS', 'barcelona': 'BCN',
    'madrid': 'MAD', 'rome': 'FCO', 'milan': 'MXP',
    'munich': 'MUC', 'zurich': 'ZRH', 'vienna': 'VIE',
    'athens': 'ATH', 'istanbul': 'IST', 'bangkok': 'BKK',
    'singapore': 'SIN', 'hong kong': 'HKG', 'seoul': 'ICN',
    'osaka': 'KIX', 'shanghai': 'PVG', 'beijing': 'PEK',
    'cairo': 'CAI', 'cape town': 'CPT', 'nairobi': 'NBO',
    'mexico city': 'MEX', 'buenos aires': 'EZE', 'rio de janeiro': 'GIG',
    'sao paulo': 'GRU', 'bogota': 'BOG', 'lima': 'LIM', 'nice': 'NCE',
  }
 
  if (overrides[city]) return overrides[city]

  // Then DB lookups
  if (db[city]) return db[city]

  const startsMatch = Object.keys(db).find(key => key.startsWith(city) || city.startsWith(key))
  if (startsMatch) return db[startsMatch]

  const firstWord = city.split(' ')[0]
  if (firstWord.length > 3 && db[firstWord]) return db[firstWord]

  return overrides[firstWord] || null
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
  try {
    const p1IATA = req.body.p1Iata || getCityIATA(p1City)
const p2IATA = req.body.p2Iata || getCityIATA(p2City)

    if (!p1IATA || !p2IATA) {
      console.log(`IATA not found for ${p1City} or ${p2City}, falling back to Perplexity`)
      return await getFlightPricesPerplexity(p1City, p2City, dates)
    }

   const dateParts = dates.split(' to ')
const departDate = dateParts[0]?.trim() || dates
const returnDate = dateParts[1]?.trim() || dates

    // Use each partner's city as destination for the other
const [p1Flights, p2Flights] = await Promise.all([
  fetch(`https://api.flightapi.io/roundtrip/${process.env.FLIGHTAPI_KEY}/${p1IATA}/${p2IATA}/${departDate}/${returnDate}/1/0/0/Economy/USD`)
    .then(r => r.json()).catch(() => null),
  fetch(`https://api.flightapi.io/roundtrip/${process.env.FLIGHTAPI_KEY}/${p2IATA}/${p1IATA}/${departDate}/${returnDate}/1/0/0/Economy/USD`)
    .then(r => r.json()).catch(() => null),
])

console.log('P1 IATA:', p1IATA, 'P2 IATA:', p2IATA)
console.log('Depart:', departDate, 'Return:', returnDate)
console.log('FlightAPI URL:', `https://api.flightapi.io/roundtrip/${process.env.FLIGHTAPI_KEY}/${p1IATA}/${p2IATA}/${departDate}/${returnDate}/1/0/0/Economy/USD`)

    console.log('FlightAPI P1 response:', JSON.stringify(p1Flights)?.substring(0, 200))
    console.log('FlightAPI P2 response:', JSON.stringify(p2Flights)?.substring(0, 200))

    let result = `LIVE FLIGHT PRICES FROM FLIGHTAPI:\n`

    if (p1Flights && !p1Flights.error) {
      result += `Flights from ${p1City} (${p1IATA}): Data received\n`
    }
    if (p2Flights && !p2Flights.error) {
      result += `Flights from ${p2City} (${p2IATA}): Data received\n`
    }

    return result

  } catch (e) {
    console.error('FlightAPI error:', e)
    return await getFlightPricesPerplexity(p1City, p2City, dates)
  }
}

async function getFlightPricesPerplexity(p1City, p2City, dates) {
  const query = `What are typical economy flight prices in 2026 for these routes during ${dates}? Give realistic price ranges only in this exact format, no explanations:

${p1City} to top destinations: $XXX-XXX USD (Airline name)
${p2City} to top destinations: $XXX-XXX (local currency) (Airline name)

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
    return result.choices?.[0]?.message?.content || ''
  } catch (e) {
    console.error('Perplexity fallback error:', e)
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
    console.log('API hit - p1City:', p1City, 'p2City:', p2City, 'dates:', dates)

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

async function searchDuffelFlights(originIata, destIata, departDate, returnDate) {
  try {
    const body = JSON.stringify({
      data: {
        slices: [
  { origin: originIata, destination: destIata, departure_date: departDate, max_connections: 2 },
  { origin: destIata, destination: originIata, departure_date: returnDate, max_connections: 2 }
],
passengers: [{ type: 'adult' }],
cabin_class: 'economy',
max_connections: 2
      }
    })

    const res = await fetch('https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=15000', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DUFFEL_API_KEY}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body
    })

   if (res.status === 429) {
  console.log('Duffel rate limited, waiting 2s...')
  await new Promise(r => setTimeout(r, 2000))
  const retry = await fetch('https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=15000', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DUFFEL_API_KEY}`,
      'Duffel-Version': 'v2',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body
  })
  const retryData = await retry.json()
  console.log('Duffel retry status:', retry.status)
  console.log('Duffel retry offers:', retryData.data?.offers?.length)
  if (!retryData.data?.offers?.length) return null
  const retryPrices = retryData.data.offers
    .map(o => parseFloat(o.total_amount))
    .filter(p => !isNaN(p) && p > 0)
    .sort((a, b) => a - b)
  return retryPrices.length > 0 ? Math.round(retryPrices[0]) : null
}

const data = await res.json()
console.log('Duffel response status:', res.status)
console.log('Duffel offers count:', data.data?.offers?.length)

if (!data.data?.offers?.length) return null

    const prices = data.data.offers
      .map(o => parseFloat(o.total_amount))
      .filter(p => !isNaN(p) && p > 0)
      .sort((a, b) => a - b)

    return prices.length > 0 ? Math.round(prices[0]) : null
  } catch (e) {
    console.error('Duffel search error:', e)
    return null
  }
}

app.post('/api/flight-prices', [
  body('p1City').isString().trim().notEmpty(),
  body('p2City').isString().trim().notEmpty(),
  body('destinations').isArray().notEmpty(),
  body('dates').isString().trim().notEmpty(),
  body('routing').isString().trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  try {
    const { p1City, p2City, p1Iata, p2Iata, destinations, dates, routing, sameCity } = req.body
    const dateParts = dates.split(' to ')
    const departDate = dateParts[0]?.trim()
    const returnDate = dateParts[1]?.trim()

    const p1IATA = req.body.p1Iata || getCityIATA(p1City)
    const p2IATA = req.body.p2Iata || getCityIATA(p2City)

    console.log('Flight prices request:', { p1City, p2City, p1IATA, p2IATA, departDate, returnDate, routing })

    const priceResults = {}

  for (const destName of destinations) {
  const destIATA = getCityIATA(destName)
  console.log(`Destination: ${destName} → IATA: ${destIATA}`)

 if (!destIATA) {
    console.log(`No IATA for ${destName}, skipping`)
    priceResults[destName] = { p1: null, p2: null, source: 'estimate' }
    continue
  }


  try {
    if (sameCity) {
      const price = await searchDuffelFlights(p1IATA, destIATA, departDate, returnDate)
      priceResults[destName] = {
        p1: price ? Math.round(price / 2) : null,
        p2: price ? Math.round(price / 2) : null,
        source: price ? 'duffel' : 'estimate'
      }

    } else if (routing === 'meet') {
      const [p1Price, p2Price] = await Promise.all([
        p1IATA ? searchDuffelFlights(p1IATA, destIATA, departDate, returnDate) : null,
        p2IATA ? searchDuffelFlights(p2IATA, destIATA, departDate, returnDate) : null,
      ])
      console.log(`Meet prices for ${destName} — P1: ${p1Price}, P2: ${p2Price}`)
      priceResults[destName] = {
        p1: p1Price,
        p2: p2Price,
        source: 'duffel'
      }

    } else if (routing === 'fly_together') {
      const p1ToP2Price = (p1IATA && p2IATA) ? await searchDuffelFlights(p1IATA, p2IATA, departDate, returnDate) : null
      const bothToDestPrice = p2IATA ? await searchDuffelFlights(p2IATA, destIATA, departDate, returnDate) : null
      const p2ToDestPrice = bothToDestPrice
      console.log(`Fly together prices for ${destName} — P1toP2: ${p1ToP2Price}, BothToDest: ${bothToDestPrice}, P2toDest: ${p2ToDestPrice}`)
      priceResults[destName] = {
        p1: (p1ToP2Price || 0) + (bothToDestPrice || 0),
        p2: p2ToDestPrice || 0,
        p1_breakdown: {
          leg1: p1ToP2Price || 0,
          leg2: bothToDestPrice || 0,
        },
        source: 'duffel'
      }
    }

} catch (e) {
    console.error(`Flight price error for ${destName}:`, e)
    priceResults[destName] = { p1: null, p2: null, source: 'estimate' }
  }

  await new Promise(r => setTimeout(r, 1000))
  }
    console.log('Final price results:', JSON.stringify(priceResults))
    res.json(priceResults)

  } catch (err) {
    console.error('Flight prices endpoint error:', err)
    res.status(500).json({ error: err.message })
  }
})


app.get('/api/iata-lookup', (req, res) => {
  const city = req.query.city
  if (!city) return res.status(400).json({ error: 'Missing city' })
  
  const db = loadAirportDB()
  const query = city.toLowerCase().split(/[,\.]/)[0].trim()
  
  const matches = []
  const seen = new Set()
  
  Object.entries(db).forEach(([key, iata]) => {
    if (key.startsWith(query) && !seen.has(iata)) {
      seen.add(iata)
      matches.push({ city: key, iata })
    }
  })

  
  
// Inject major airport for ambiguous cities
const ambiguous = {
  'manchester': { city: 'manchester (uk)', iata: 'MAN' },
  'birmingham': { city: 'birmingham (uk)', iata: 'BHX' },
  'edinburgh': { city: 'edinburgh (uk)', iata: 'EDI' },
}
if (ambiguous[query] && !seen.has(ambiguous[query].iata)) {
  matches.unshift(ambiguous[query])
  seen.add(ambiguous[query].iata)
}

const majorAirports = ['MAN', 'LHR', 'JFK', 'LAX', 'CDG', 'SYD', 'DXB', 'SIN', 'HKG', 'NRT', 'MEM']
matches.sort((a, b) => {
  const aIsMajor = majorAirports.includes(a.iata) ? 0 : 1
  const bIsMajor = majorAirports.includes(b.iata) ? 0 : 1
  if (aIsMajor !== bIsMajor) return aIsMajor - bIsMajor
  return a.city.length - b.city.length
})

res.json({ 
  iata: matches[0]?.iata || null,
  matches: matches.slice(0, 5)
})
})

app.get('/api/airport-search', async (req, res) => {
  const query = req.query.q
  if (!query || query.length < 2) return res.json({ suggestions: [] })

  try {
    const response = await fetch(
      `https://api.duffel.com/places/suggestions?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DUFFEL_API_KEY}`,
          'Duffel-Version': 'v2',
          'Accept': 'application/json',
        }
      }
    )
    const data = await response.json()
    console.log('Duffel places:', JSON.stringify(data).substring(0, 500))
    const suggestions = (data.data || [])
      .filter(p => p.iata_code)
      .map(p => ({
        city: p.city_name || p.name,
        airport: p.name,
        iata: p.iata_code,
        country: p.country_name,
      }))
      .slice(0, 6)
    res.json({ suggestions })
  } catch (e) {
    console.error('Airport search error:', e)
    res.json({ suggestions: [] })
  }
})

app.get('/api/trip-count', (req, res) => {
  res.json({ count: globalTripCount })
})

app.get('/api/nearest-airport', (req, res) => {
  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng)
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'Invalid coordinates' })

  try {
    const data = readFileSync(resolve('./airports.csv'), 'utf8')
    const lines = data.split('\n').slice(1)
    
    let closestAny = null
    let closestLarge = null
    let minDistAny = Infinity
    let minDistLarge = Infinity

    lines.forEach(line => {
      const parts = line.split(',').map(p => p.replace(/"/g, '').trim())
      if (parts.length < 14) return
      const type = parts[2]
      const city = parts[10]
      const scheduled = parts[11]
      const iata = parts[13]
      const airLat = parseFloat(parts[4])
      const airLng = parseFloat(parts[5])

      if (!iata || iata.length !== 3) return
      if (isNaN(airLat) || isNaN(airLng)) return
      if (type === 'heliport' || type === 'closed') return

      const R = 6371
      const dLat = (airLat - lat) * Math.PI / 180
      const dLng = (airLng - lng) * Math.PI / 180
      const a = Math.sin(dLat/2) ** 2 +
        Math.cos(lat * Math.PI / 180) * Math.cos(airLat * Math.PI / 180) *
        Math.sin(dLng/2) ** 2
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

      if (dist < minDistAny) {
        minDistAny = dist
        closestAny = { iata, city, dist, type }
      }

      if ((type === 'large_airport' || type === 'medium_airport') && scheduled === 'yes') {
        if (dist < minDistLarge) {
          minDistLarge = dist
          closestLarge = { iata, city, dist, type }
        }
      }
    })

    // Gemini's snap logic — if large airport within 100km, use it
    console.log('Closest any:', closestAny?.iata, closestAny?.type, Math.round(minDistAny), 'km')
console.log('Closest large:', closestLarge?.iata, closestLarge?.type, Math.round(minDistLarge), 'km')
    const result = (closestLarge && minDistLarge < 100) ? closestLarge : closestAny

    if (result) {
      res.json({ iata: result.iata, city: result.city })
    } else {
      res.status(404).json({ error: 'No airport found' })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(3001, () => console.log('Server running on port 3001'))