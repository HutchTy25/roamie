import dotenv from 'dotenv'
dotenv.config()
import pLimit from 'p-limit'
import express from 'express'
import cors from 'cors'
import https from 'https'
import rateLimit from 'express-rate-limit'
import { body, validationResult } from 'express-validator'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const ROUTE_CACHE_TTL = 30 * 60 * 1000
const globalRouteCache = new Map()
const proAccessCache = new Map()

const PREWARM_PAIRS = [
  { p1: 'JFK', p2: 'LHR' },
  { p1: 'JFK', p2: 'LGW' },
  { p1: 'LAX', p2: 'LHR' },
  { p1: 'ORD', p2: 'LHR' },
  { p1: 'BOS', p2: 'LHR' },
  { p1: 'ATL', p2: 'LHR' },
  { p1: 'DFW', p2: 'LHR' },
  { p1: 'MIA', p2: 'LHR' },
  { p1: 'IAD', p2: 'LHR' },
  { p1: 'SFO', p2: 'LHR' },
  { p1: 'JFK', p2: 'MAN' },
  { p1: 'JFK', p2: 'DUB' },
  { p1: 'BOS', p2: 'DUB' },
  { p1: 'JFK', p2: 'EDI' },
  { p1: 'MEM', p2: 'LHR' },
]

const app = express()
app.use(cors({
  origin: [
    'https://roamietravel.app',
    'http://localhost:5173',
    'http://localhost:4173',
  ],
  methods: ['GET', 'POST'],
 allowedHeaders: ['Content-Type', 'stripe-signature', 'x-roamie-secret', 'Authorization'],
  credentials: false,
}))
app.use(express.json())
async function requireAppSecret(req, res, next) {
  const secret = req.headers['x-roamie-secret']
  if (secret === process.env.ROAMIE_SECRET) return next()
  const authHeader = req.headers['authorization']
  if (authHeader?.startsWith('Bearer ')) {
    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7))
    if (user) return next()
  }
  return res.status(403).json({ error: 'Forbidden' })
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7))
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })
  req.user = user
  next()
}
app.set('trust proxy', 1)

function makeLimit(max) {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    max,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  })
}

app.use('/api/messages',            makeLimit(10))
app.use('/api/trip-basics',         makeLimit(10))
app.use('/api/flight-prices',       makeLimit(20))
app.use('/api/verify-subscription', makeLimit(5))
app.use('/api/create-invite',       makeLimit(10))
app.use('/api/accept-invite',       makeLimit(10))
app.use('/api/disconnect',          makeLimit(10))
app.use('/api/waitlist',            makeLimit(5))

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

const FALLBACK_RATES = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.53,
  NZD: 1.66,
  JPY: 149.50,
  SGD: 1.34,
  INR: 83.50,
  ZAR: 18.63,
}

async function getExchangeRates(baseCurrency) {
  const now = Date.now()
  const sixHours = 6 * 60 * 60 * 1000

  if (ratesCache && (now - ratesCacheTime) < sixHours) {
    console.log('Exchange rates from cache')
    return ratesCache
  }

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${baseCurrency}`
    )
    const data = await res.json()
    if (data.rates) {
      ratesCache = { [baseCurrency]: 1, ...data.rates }
      ratesCacheTime = now
      console.log('Exchange rates refreshed from Frankfurter')
      return ratesCache
    }
    return ratesCache || FALLBACK_RATES
  } catch (e) {
    console.error('Exchange rate error:', e)
    return ratesCache || FALLBACK_RATES
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
    'atlanta': 'ATL', 'memphis': 'MEM', 'san diego': 'SAN',
    'las vegas': 'LAS', 'orlando': 'MCO', 'denver': 'DEN',
    'seattle': 'SEA', 'boston': 'BOS', 'nashville': 'BNA',
    'charlotte': 'CLT', 'detroit': 'DTW', 'minneapolis': 'MSP',
    'portland': 'PDX', 'phoenix': 'PHX', 'dallas': 'DFW',
    'houston': 'IAH', 'new orleans': 'MSY', 'tampa': 'TPA',
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

async function checkProAccess(userId, supabase) {
  if (!userId) return { allowed: true }

  const cached = proAccessCache.get(userId)
  if (cached && Date.now() - cached.timestamp < 60000) return cached.result

  function cache(result) {
    proAccessCache.set(userId, { result, timestamp: Date.now() })
    return result
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id, search_count')
    .eq('id', userId)
    .single()

  if (!profile) return cache({ allowed: true })

  if (profile.couple_id) {
    const { data: couple } = await supabase
      .from('couples')
      .select('is_pro')
      .eq('id', profile.couple_id)
      .single()
    if (couple?.is_pro) return cache({ allowed: true, reason: 'pro' })
  }

  const searchCount = profile.search_count || 0
  if (searchCount >= 3) return cache({ allowed: false, reason: 'limit_reached' })

  await supabase.from('profiles').update({ search_count: searchCount + 1 }).eq('id', userId)
  return cache({ allowed: true, reason: 'trial' })
}

function computeTripCosts(dest, flightPrices, exchangeRates, data, estimates = null) {
  const p1Rate = exchangeRates?.[data.p1.currency] || 1
  const p2Rate = exchangeRates?.[data.p2.currency] || 1

  // Duffel prices are in USD — convert to each partner's currency.
  // p1_breakdown only exists for fly_together routing (two legs).
  // For meet/sameCity, p1 is a single direct price with no breakdown.
  const leg1Usd = flightPrices?.p1_breakdown?.leg1 ?? null
  const leg2Usd = flightPrices?.p1_breakdown?.leg2 ?? null
  const p1FlightUsd = flightPrices?.p1 ?? null
  const p2FlightUsd = flightPrices?.p2 ?? null

  const flights_p1_leg1 = leg1Usd !== null ? Math.round(leg1Usd * p1Rate) : null
  const flights_p1_leg2 = leg2Usd !== null ? Math.round(leg2Usd * p1Rate) : null
  const flights_p1_total =
    flights_p1_leg1 !== null && flights_p1_leg2 !== null
      ? flights_p1_leg1 + flights_p1_leg2
      : p1FlightUsd !== null ? Math.round(p1FlightUsd * p1Rate) : null
  const flights_p2 = p2FlightUsd !== null ? Math.round(p2FlightUsd * p2Rate) : null

  let lodging_per_night = null, lodging_total = null
  let food_per_day = null, food_total = null, activities_total = null
  let p1_cost = null, p2_cost = null
  let p1_days_income = null, p2_days_income = null, harder_partner = null

  if (estimates) {
    const { lodgingPerNight, foodPerDay, activitiesTotal, nights } = estimates
    const days = nights + 1
    lodging_per_night = lodgingPerNight || 0
    lodging_total     = Math.round(lodging_per_night * nights)
    food_per_day      = foodPerDay || 0
    food_total        = Math.round(food_per_day * days)
    activities_total  = activitiesTotal || 0
    const stayUsd = lodging_total + food_total + activities_total
    p1_cost = (flights_p1_total ?? 0) + Math.round(stayUsd * p1Rate)
    p2_cost = (flights_p2 ?? 0)       + Math.round(stayUsd * p2Rate)
    p1_days_income = data.p1.maxSpend ? Math.round(p1_cost / (data.p1.maxSpend / 30)) : null
    p2_days_income = data.p2.maxSpend ? Math.round(p2_cost / (data.p2.maxSpend / 30)) : null
    harder_partner = data.p1.maxSpend && data.p2.maxSpend
      ? (p1_cost / data.p1.maxSpend >= p2_cost / data.p2.maxSpend ? 'p1' : 'p2')
      : null
  }

  return {
    cost_breakdown: {
      flights_p1_leg1,
      flights_p1_leg2,
      flights_p1_total,
      flights_p2,
      lodging_per_night,
      lodging_total,
      food_per_day,
      food_total,
      activities_total,
    },
    p1_cost,
    p2_cost,
    p1_days_income,
    p2_days_income,
    harder_partner,
  }
}

app.post('/api/messages', requireAppSecret, [
  body('messages').isArray().notEmpty(),
  body('messages.*.role').isIn(['user', 'assistant']),
  body('messages.*.content').isString().trim().isLength({ max: 50000 }),
  body('model').isString().trim(),
  body('max_tokens').isInt({ min: 1, max: 4000 }),
  body('userId').isString().trim().optional(),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid request', details: errors.array() })
  }

  try {
    const { userId } = req.body
    const messages = req.body.messages || []
    const userMessage = messages[messages.length - 1]?.content || ''

    if (userId) {
      const access = await checkProAccess(userId, supabase)
      if (!access.allowed) {
        return res.status(402).json({ error: 'upgrade_required', message: 'Upgrade to Roamie Pro to continue searching' })
      }
    }

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

let exchangeRates = null
let currencyContext = ''

const p1CurrMatch = userMessage.match(/Currency: ([A-Z]{3})/)
const p2CurrMatch = userMessage.match(/Currency: ([A-Z]{3}).*Currency: ([A-Z]{3})/s)
const p1Currency = p1CurrMatch?.[1] || 'USD'
const p2Currency = p2CurrMatch?.[2] || 'GBP'

if (cachedData) {
  console.log('Cache hit:', cacheKey)
  exchangeRates = cachedData.exchangeRates
} else {
  exchangeRates = await getExchangeRates('USD')
  setCache(cacheKey, { exchangeRates })
}

if (exchangeRates) {
  const p1Rate = exchangeRates[p1Currency] || 1
  const p2Rate = exchangeRates[p2Currency] || 1
  if (p1Currency === p2Currency) {
    currencyContext = `LIVE EXCHANGE RATES (as of today): P1 and P2 both use ${p1Currency}. No conversion needed.`
  } else {
    const p1ToP2 = (p2Rate / p1Rate).toFixed(4)
    const p2ToP1 = (p1Rate / p2Rate).toFixed(4)
    currencyContext = `LIVE EXCHANGE RATES (as of today, use these for ALL currency conversions):
1 ${p1Currency} = ${p1ToP2} ${p2Currency}
1 ${p2Currency} = ${p2ToP1} ${p1Currency}
Use these rates for all cost calculations. Do not estimate exchange rates.`
  }
  console.log('Currency context:', currencyContext)
}

const isCall2 = userMessage.includes('breakdown') ||
                userMessage.includes('trip_basics') ||
                userMessage.includes('COST BREAKDOWN')
const enhancedMessages = messages.map((msg, i) => {
  if (i === messages.length - 1 && currencyContext && isCall2) {
    return { ...msg, content: currencyContext + '\n\n' + msg.content }
  }
  return msg
})

    const { flightPrices: _fp, quizData: _qd, ...anthropicFields } = req.body
    const claudeBody = JSON.stringify({
      ...anthropicFields,
      messages: enhancedMessages
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

   console.log('Claude response received')
globalTripCount++
console.log('Global trip count:', globalTripCount)

  if (isCall2 && exchangeRates) {
    try {
      const flightPrices = req.body.flightPrices || {}
      const quizData    = req.body.quizData    || {}
      if (Object.keys(flightPrices).length > 0) {
        const contentText = Array.isArray(claudeResult.content)
          ? claudeResult.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
          : ''
        if (contentText) {
          let parsed
          try {
            parsed = JSON.parse(contentText)
          } catch (parseErr) {
            console.error('[Call2 enrichment] JSON.parse failed:', parseErr.message)
            throw parseErr
          }
          const dests  = Array.isArray(parsed) ? parsed : (parsed.destinations || [])
          const from   = quizData?.dates?.from
          const to     = quizData?.dates?.to
          const nights = from && to
            ? Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000))
            : 5
          const p1c = quizData.p1?.currency || 'USD'
          const p2c = quizData.p2?.currency || 'GBP'
          const enriched = dests.map(dest => {
            const cb = dest.cost_breakdown || {}
            const computed = computeTripCosts(
              dest,
              flightPrices[dest.iata] || flightPrices[dest.name] || {},
              exchangeRates,
              { p1: { currency: p1c, maxSpend: quizData.p1?.maxSpend || 0 },
                p2: { currency: p2c, maxSpend: quizData.p2?.maxSpend || 0 } },
              { lodgingPerNight: cb.lodging_per_night  || 0,
                foodPerDay:      cb.food_per_day       || 0,
                activitiesTotal: cb.activities_total   || 0,
                nights }
            )
            return { ...dest, ...computed }
          })
          const enrichedResult = Array.isArray(parsed) ? enriched : { ...parsed, destinations: enriched }
          console.log('[Call 2 enrichment] computed costs for', enriched.length, 'destinations')
          return res.json({ ...claudeResult, content: [{ type: 'text', text: JSON.stringify(enrichedResult) }] })
        }
      }
    } catch (e) {
      console.error('[Call 2 enrichment error]', e.message)
    }
  }

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
      from: 'Roamie <noreply@roamietravel.app>',
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
  body('plan').isIn(['monthly', 'founding']).optional(),
  body('priceId').isString().trim().optional(),
  body('mode').isIn(['payment', 'subscription']),
  body('userId').isString().trim().optional(),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid request' })
  }
  console.log('ENV check:', { monthly: process.env.STRIPE_PRICE_MONTHLY, founding: process.env.STRIPE_PRICE_FOUNDING })
  console.log('Checkout body:', req.body)

  try {
    const { plan, priceId: rawPriceId, mode, userId } = req.body

    let resolvedPriceId = rawPriceId
    if (plan === 'monthly') resolvedPriceId = process.env.STRIPE_PRICE_MONTHLY
    else if (plan === 'founding') resolvedPriceId = process.env.STRIPE_PRICE_FOUNDING

    if (!resolvedPriceId) return res.status(400).json({ error: 'Invalid plan or missing priceId' })
    console.log('Resolved price ID:', resolvedPriceId)

    let customerId
    if (userId) {
      const existing = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      })
      const existingCustomer = existing.data[0]
      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        const customer = await stripe.customers.create({ metadata: { userId } })
        customerId = customer.id
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      mode,
      ...(customerId ? { customer: customerId } : {}),
      success_url: 'https://roamietravel.app/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://roamietravel.app/results?cancelled=true',
      metadata: { userId: userId || '' },
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

app.post('/api/verify-subscription', [
  body('sessionId').isString().trim().notEmpty(),
  body('userId').isString().trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid request' })

  try {
    const { sessionId, userId } = req.body

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    if (session.metadata?.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: session does not belong to this user' })
    }

    const sub = session.subscription
    if (!sub || sub.status !== 'active') {
      return res.json({ success: false })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('couple_id')
      .eq('id', userId)
      .single()

    await supabase
      .from('profiles')
      .update({ is_pro: true, stripe_subscription_id: sub.id })
      .eq('id', userId)
    console.log(`Profile ${userId} upgraded to pro via subscription ${sub.id}`)

    if (profile?.couple_id) {
      await supabase
        .from('couples')
        .update({ is_pro: true, stripe_subscription_id: sub.id })
        .eq('id', profile.couple_id)
      console.log(`Couple ${profile.couple_id} upgraded to pro via subscription ${sub.id}`)
    }

    proAccessCache.delete(userId)
    res.json({ success: true, subscriptionId: sub.id })
  } catch (err) {
    console.error('Verify subscription error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/trip-basics', requireAppSecret, [
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
app.post('/api/create-invite', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

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

app.post('/api/accept-invite', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { inviteCode } = req.body
    if (!inviteCode) return res.status(400).json({ error: 'Missing inviteCode' })

    // Find the couple
    const { data: couple, error: findError } = await supabase
      .from('couples')
      .select('*')
      .eq('invite_code', inviteCode)
      .single()

    if (findError || !couple) return res.status(404).json({ error: 'Invalid invite code' })
    if (couple.partner2_id) return res.status(400).json({ error: 'Already connected' })
    if (couple.partner1_id === userId) return res.status(400).json({ error: 'Cannot connect with yourself' })

    // Fetch both profiles in parallel — need couple_id for old-couple cleanup, is_pro for propagation
    const [{ data: accepterProfile }, { data: partner1Profile }] = await Promise.all([
      supabase.from('profiles').select('couple_id, is_pro').eq('id', userId).single(),
      supabase.from('profiles').select('is_pro').eq('id', couple.partner1_id).single(),
    ])

    if (accepterProfile?.couple_id) {
      const oldCoupleId = accepterProfile.couple_id
      await supabase.from('couples').update({ status: 'disconnected' }).eq('id', oldCoupleId)
      await supabase.from('profiles').update({ couple_id: null }).eq('couple_id', oldCoupleId)
      console.log(`Soft-deleted old couple ${oldCoupleId} for user ${userId} before new link`)
    }

    // Link the couple, propagating Pro if either partner already has it
    const coupleUpdate = { partner2_id: userId, status: 'connected' }
    if (accepterProfile?.is_pro || partner1Profile?.is_pro) coupleUpdate.is_pro = true

    const { error: updateError } = await supabase
      .from('couples')
      .update(coupleUpdate)
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

app.post('/api/disconnect', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('couple_id')
      .eq('id', userId)
      .single()

    if (!profile?.couple_id) return res.status(400).json({ error: 'Not in a couple' })

    const coupleId = profile.couple_id

    await supabase.from('couples').update({ status: 'disconnected' }).eq('id', coupleId)
    await supabase.from('profiles').update({ couple_id: null }).eq('couple_id', coupleId)

    console.log(`Couple ${coupleId} soft-deleted by user ${userId}`)
    res.json({ success: true })
  } catch (err) {
    console.error('Disconnect error:', err)
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

    const res = await fetch('https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=8000', {
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
  const retry = await fetch('https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=8000', {
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

async function searchDuffelFlightsWithDetail(originIata, destIata, departDate, returnDate) {
  try {
    const body = JSON.stringify({
      data: {
        slices: [
          { origin: originIata, destination: destIata, departure_date: departDate, max_connections: 2 },
          { origin: destIata, destination: originIata, departure_date: returnDate, max_connections: 2 },
        ],
        passengers: [{ type: 'adult' }],
        cabin_class: 'economy',
        max_connections: 2,
      }
    })
    const makeReq = () => fetch('https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=8000', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DUFFEL_API_KEY}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body
    })
    let res = await makeReq()
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 2000))
      res = await makeReq()
    }
    const data = await res.json()
    if (!data.data?.offers?.length) return null
    const sorted = data.data.offers
      .map(o => ({ price: parseFloat(o.total_amount), offer: o }))
      .filter(({ price }) => !isNaN(price) && price > 0)
      .sort((a, b) => a.price - b.price)
    if (!sorted.length) return null
    const cheapest = sorted[0]
    const firstSeg = cheapest.offer.slices?.[0]?.segments?.[0]
    const arrivalAt = cheapest.offer.slices?.[0]?.segments?.at(-1)?.arriving_at || null
    const airline = firstSeg?.marketing_carrier?.name || null
    const flightNumber = firstSeg?.marketing_carrier_flight_number || null
    const departureAt = firstSeg?.departing_at || null
    return { price: Math.round(cheapest.price), arrivalAt, airline, flightNumber, departureAt }
  } catch (e) {
    console.error('Duffel detail search error:', e)
    return null
  }
}

app.post('/api/flight-prices', requireAppSecret, [
  body('p1City').isString().trim().notEmpty(),
  body('p2City').isString().trim().notEmpty(),
  body('destinations').isArray().notEmpty(),
  body('dates').isString().trim().notEmpty(),
  body('routing').isString().trim().notEmpty(),
  body('userId').isString().trim().optional(),
  body('p1Currency').isString().trim().isLength({ min: 3, max: 3 }).optional(),
  body('p2Currency').isString().trim().isLength({ min: 3, max: 3 }).optional(),
  body('p1Budget').isNumeric().optional(),
  body('p2Budget').isNumeric().optional(),
  body('syncArrival').isBoolean().optional(),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  try {
    const { p1City, p2City, p1Iata, p2Iata, destinations, dates, routing, sameCity, userId,
            p1Currency, p2Currency, p1Budget, p2Budget, syncArrival } = req.body
    const dateParts = dates.split(' to ')
    const departDate = dateParts[0]?.trim()
    const returnDate = dateParts[1]?.trim()

    const p1IATA = req.body.p1Iata || getCityIATA(p1City)
    const p2IATA = req.body.p2Iata || getCityIATA(p2City)

    console.log('Flight prices request:', { p1City, p2City, p1IATA, p2IATA, departDate, returnDate, routing })

    const destIataSorted = destinations
      .map(d => (typeof d === 'object' ? d.iata : getCityIATA(d.split(',')[0].trim())))
      .filter(Boolean).sort().join('|')
    const cacheKey = [p1IATA, p2IATA, destIataSorted, departDate, routing,
                      p1Currency || '', p2Currency || ''].join('::')
    const cached = globalRouteCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < ROUTE_CACHE_TTL) {
      console.log(`[cache hit] ${cacheKey}`)
      return res.json(cached.data)
    }

    const SIX_HOURS = 6 * 60 * 60 * 1000
    const { data: sbCached } = await supabase
      .from('flight_cache')
      .select('data')
      .eq('cache_key', cacheKey)
      .gt('created_at', new Date(Date.now() - SIX_HOURS).toISOString())
      .single()
    if (sbCached) {
      console.log(`[supabase cache hit] ${cacheKey}`)
      globalRouteCache.set(cacheKey, { data: sbCached.data, timestamp: Date.now() })
      return res.json(sbCached.data)
    }

    if (userId) {
      const access = await checkProAccess(userId, supabase)
      if (!access.allowed) {
        return res.status(402).json({ error: 'upgrade_required', message: 'Upgrade to Roamie Pro to continue searching' })
      }
    }

    const priceResults = {}

  const limit = pLimit(4)

  await Promise.all(destinations.map(dest => limit(async () => {
    const destName = typeof dest === 'object' ? dest.name : dest
    const destIATA = (typeof dest === 'object' && dest.iata)
      ? dest.iata
      : getCityIATA(destName.split(',')[0].trim())
    const resultKey = destIATA || destName
    console.log(`Destination: ${destName} → IATA: ${destIATA}`)

    if (!destIATA) {
      console.log(`No IATA for ${destName}, skipping`)
      priceResults[resultKey] = { p1: null, p2: null, source: 'estimate' }
      return
    }

    try {
      if (sameCity) {
        const price = await searchDuffelFlights(p1IATA, destIATA, departDate, returnDate)
        priceResults[resultKey] = {
          p1: price ? Math.round(price / 2) : null,
          p2: price ? Math.round(price / 2) : null,
          source: price ? 'duffel' : 'estimate'
        }
      } else if (routing === 'meet') {
        if (syncArrival && p1IATA && p2IATA) {
          const p1Detail = await searchDuffelFlightsWithDetail(p1IATA, destIATA, departDate, returnDate)
          let p2Price = null
          let p2ArrivalAt = null
          let p2Airline = null
          let p2FlightNumber = null
          let p2DepartureAt = null
          if (p1Detail?.arrivalAt) {
            const localMinutes = parseInt(p1Detail.arrivalAt.slice(11, 13)) * 60
                               + parseInt(p1Detail.arrivalAt.slice(14, 16))
            const minsToHHMM = m => { const n = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}` }
            const windowFrom = minsToHHMM(localMinutes - 60)
            const windowTo   = minsToHHMM(localMinutes + 60)
            const p2Body = JSON.stringify({
              data: {
                slices: [
                  { origin: p2IATA, destination: destIATA, departure_date: p1Detail.arrivalAt.slice(0, 10),
                    arrival_time: { from: windowFrom, to: windowTo }, max_connections: 2 },
                  { origin: destIATA, destination: p2IATA, departure_date: returnDate, max_connections: 2 },
                ],
                passengers: [{ type: 'adult' }],
                cabin_class: 'economy',
                max_connections: 2,
              }
            })
            const makeP2Req = () => fetch('https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=8000', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${process.env.DUFFEL_API_KEY}`, 'Duffel-Version': 'v2',
                         'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: p2Body
            })
            try {
              let p2Res = await makeP2Req()
              if (p2Res.status === 429) { await new Promise(r => setTimeout(r, 2000)); p2Res = await makeP2Req() }
              const p2Data = await p2Res.json()
              if (p2Data.data?.offers?.length) {
                const sorted = p2Data.data.offers
                  .map(o => ({ price: parseFloat(o.total_amount), offer: o }))
                  .filter(({ price }) => !isNaN(price) && price > 0)
                  .sort((a, b) => a.price - b.price)
                if (sorted.length) {
                  p2Price = Math.round(sorted[0].price)
                  p2ArrivalAt = sorted[0].offer.slices?.[0]?.segments?.at(-1)?.arriving_at || null
                  const p2FirstSeg = sorted[0].offer.slices?.[0]?.segments?.[0]
                  p2Airline = p2FirstSeg?.marketing_carrier?.name || null
                  p2FlightNumber = p2FirstSeg?.marketing_carrier_flight_number || null
                  p2DepartureAt = p2FirstSeg?.departing_at || null
                }
              }
            } catch (e) { console.error(`P2 sync arrival error for ${destName}:`, e) }
          } else {
            p2Price = await searchDuffelFlights(p2IATA, destIATA, departDate, returnDate)
          }
          const gapMinutes = (p1Detail?.arrivalAt && p2ArrivalAt)
            ? Math.abs(Math.round((new Date(p2ArrivalAt) - new Date(p1Detail.arrivalAt)) / 60000))
            : null
          const p1Date = p1Detail?.arrivalAt?.slice(0, 10) || null
          const p2Date = p2ArrivalAt?.slice(0, 10) || null
          const syncValid = gapMinutes !== null && gapMinutes <= 120 && p1Date === p2Date
          if (!syncValid && p2Price === null) {
            p2Price = await searchDuffelFlights(p2IATA, destIATA, departDate, returnDate)
          }
          console.log(`Sync arrival for ${destName} — P1: ${p1Detail?.price}, P2: ${p2Price}, gap: ${gapMinutes}min, valid: ${syncValid}`)
          priceResults[resultKey] = {
            p1: p1Detail?.price || null,
            p2: p2Price,
            source: 'duffel',
            synchronized_arrival: syncValid
              ? {
                  p1_arrives: p1Detail.arrivalAt,
                  p2_arrives: p2ArrivalAt,
                  gap_minutes: gapMinutes,
                  p1_airline: p1Detail.airline,
                  p1_flight_number: p1Detail.flightNumber,
                  p1_departs_at: p1Detail.departureAt,
                  p2_airline: p2Airline,
                  p2_flight_number: p2FlightNumber,
                  p2_departs_at: p2DepartureAt,
                  dest_iata: destIATA,
                }
              : null,
          }
        } else {
          const [p1Price, p2Price] = await Promise.all([
            p1IATA ? searchDuffelFlights(p1IATA, destIATA, departDate, returnDate) : null,
            p2IATA ? searchDuffelFlights(p2IATA, destIATA, departDate, returnDate) : null,
          ])
          console.log(`Meet prices for ${destName} — P1: ${p1Price}, P2: ${p2Price}`)
          priceResults[resultKey] = { p1: p1Price, p2: p2Price, source: 'duffel' }
        }
      } else if (routing === 'fly_together') {
        const [p1ToP2Price, bothToDestPrice] = await Promise.all([
          (p1IATA && p2IATA) ? searchDuffelFlights(p1IATA, p2IATA, departDate, returnDate) : Promise.resolve(null),
          p2IATA ? searchDuffelFlights(p2IATA, destIATA, departDate, returnDate) : Promise.resolve(null),
        ])
        const p2ToDestPrice = bothToDestPrice
        console.log(`Fly together prices for ${destName} — P1toP2: ${p1ToP2Price}, BothToDest: ${bothToDestPrice}, P2toDest: ${p2ToDestPrice}`)
        priceResults[resultKey] = {
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
      priceResults[resultKey] = { p1: null, p2: null, source: 'estimate' }
    }
  })))
    console.log('Final price results:', JSON.stringify(priceResults))

    let finalResults = priceResults
    if (p1Currency && p2Currency) {
      const exchangeRates = await getExchangeRates('USD')
      finalResults = {}
      for (const [destName, prices] of Object.entries(priceResults)) {
        const computed = computeTripCosts(
          { name: destName },
          prices,
          exchangeRates,
          { p1: { currency: p1Currency, maxSpend: Number(p1Budget) || 0 },
            p2: { currency: p2Currency, maxSpend: Number(p2Budget) || 0 } }
        )
        finalResults[destName] = { ...prices, ...computed }
      }
    }

    globalRouteCache.set(cacheKey, { data: finalResults, timestamp: Date.now() })
    supabase
      .from('flight_cache')
      .upsert({ cache_key: cacheKey, data: finalResults }, { onConflict: 'cache_key' })
      .then(() => {})
      .catch(e => console.error('[flight_cache write error]', e))
    res.json(finalResults)

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

async function prewarmFlightCache() {
  console.log('[prewarm] Starting flight cache pre-warm...')
  const limit = pLimit(1)
  const SIX_HOURS = 6 * 60 * 60 * 1000
  const dates = []
  for (let i = 1; i <= 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  let fetched = 0, skipped = 0, errors = 0
  const tasks = []
  for (const { p1, p2 } of PREWARM_PAIRS) {
    let pairRateLimited = false
    for (const departDate of dates) {
      const cacheKey = `${p1}::${p2}::${departDate}`
      tasks.push(limit(async () => {
        if (pairRateLimited) { skipped++; return }
        try {
          const { data: existing } = await supabase
            .from('flight_cache')
            .select('cache_key')
            .eq('cache_key', cacheKey)
            .gt('created_at', new Date(Date.now() - SIX_HOURS).toISOString())
            .single()
          if (existing) { skipped++; return }
          const returnDate = new Date(departDate)
          returnDate.setDate(returnDate.getDate() + 7)
          const returnDateStr = returnDate.toISOString().split('T')[0]
          const p1ToP2 = await searchDuffelFlights(p1, p2, departDate, returnDateStr)
          await new Promise(r => setTimeout(r, p1ToP2 === null ? 5000 : 2000))
          const p2ToP1 = await searchDuffelFlights(p2, p1, departDate, returnDateStr)
          await new Promise(r => setTimeout(r, p2ToP1 === null ? 5000 : 2000))
          if (p1ToP2 === null && p2ToP1 === null) {
            console.log(`[prewarm] Both directions null for ${cacheKey} — likely rate limited, skipping remaining dates for ${p1}/${p2}`)
            pairRateLimited = true
            errors++
            return
          }
          await supabase
            .from('flight_cache')
            .upsert({ cache_key: cacheKey, data: { p1_to_p2: p1ToP2, p2_to_p1: p2ToP1 } }, { onConflict: 'cache_key' })
          console.log(`[prewarm] ${cacheKey} → p1→p2: ${p1ToP2}, p2→p1: ${p2ToP1}`)
          fetched++
        } catch (e) {
          console.error(`[prewarm] Error for ${cacheKey}:`, e.message)
          pairRateLimited = true
          errors++
        }
      }))
    }
  }
  await Promise.all(tasks)
  console.log(`[prewarm] Done — ${fetched} fetched, ${skipped} skipped, ${errors} errors`)
}

app.get('/api/prewarm', requireAppSecret, async (req, res) => {
  res.json({ message: 'Pre-warm started' })
  prewarmFlightCache().catch(e => console.error('[prewarm] Unhandled error:', e))
})

app.use((err, req, res, next) => {
  console.error('[FATAL]', err.stack || err)
  res.status(500).json({ success: false, error: 'Something went wrong on our end. Please try again.' })
})

app.listen(3001, () => console.log('Server running on port 3001'))

setInterval(
  () => prewarmFlightCache().catch(e => console.error('[prewarm] Interval error:', e)),
  6 * 60 * 60 * 1000
)

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.stack || err)
})