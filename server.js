import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { body, validationResult } from 'express-validator'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const proAccessCache = new Map()
const PHOTO_CACHE_TTL = 30 * 24 * 60 * 60 * 1000
const photoCache = new Map()

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
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: err.message })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.userId
    const subscriptionId = session.subscription
    if (userId && subscriptionId) {
      activatePro(userId, subscriptionId).catch(e =>
        console.error('[webhook] activatePro error:', e)
      )
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscriptionId = event.data.object.id
    deactivatePro(subscriptionId).catch(e =>
      console.error('[webhook] deactivatePro error:', e)
    )
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object
    if (sub.status === 'canceled' || sub.status === 'unpaid') {
      deactivatePro(sub.id).catch(e =>
        console.error('[webhook] deactivatePro error:', e)
      )
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const subscriptionId = event.data.object.subscription
    console.log(`[webhook] Payment failed for subscription ${subscriptionId} — Stripe will retry`)
  }

  res.json({ received: true })
})

app.use(express.json())

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

async function deactivatePro(subscriptionId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, couple_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!profile) {
    console.warn(`[deactivatePro] No profile found for subscription ${subscriptionId}`)
    return
  }

  await supabase
    .from('profiles')
    .update({ is_pro: false, stripe_subscription_id: null })
    .eq('id', profile.id)
  console.log(`[deactivatePro] Profile ${profile.id} downgraded from pro`)
  proAccessCache.delete(profile.id)

  if (profile.couple_id) {
    const { data: couple } = await supabase
      .from('couples')
      .select('partner1_id, partner2_id')
      .eq('id', profile.couple_id)
      .single()

    await supabase
      .from('couples')
      .update({ is_pro: false, stripe_subscription_id: null })
      .eq('id', profile.couple_id)
    console.log(`[deactivatePro] Couple ${profile.couple_id} downgraded from pro`)

    const partnerId = couple?.partner1_id === profile.id
      ? couple?.partner2_id
      : couple?.partner1_id

    if (partnerId) {
      await supabase
        .from('profiles')
        .update({ is_pro: false, stripe_subscription_id: null })
        .eq('id', partnerId)
      console.log(`[deactivatePro] Partner ${partnerId} downgraded from pro`)
      proAccessCache.delete(partnerId)
    }
  }
}

async function activatePro(userId, subscriptionId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id, is_pro')
    .eq('id', userId)
    .single()

  if (profile?.is_pro) {
    console.log(`[activatePro] ${userId} already pro, skipping duplicate activation`)
    return
  }

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ is_pro: true, stripe_subscription_id: subscriptionId })
    .eq('id', userId)
  if (profileErr) throw new Error(`Profile update failed: ${profileErr.message}`)
  console.log(`[activatePro] Profile ${userId} upgraded to pro`)

  proAccessCache.delete(userId)

  if (profile?.couple_id) {
    const { data: couple } = await supabase
      .from('couples')
      .select('partner1_id, partner2_id')
      .eq('id', profile.couple_id)
      .single()

    const partnerId = couple?.partner1_id === userId
      ? couple?.partner2_id
      : couple?.partner1_id

    const { error: coupleErr } = await supabase
      .from('couples')
      .update({ is_pro: true, stripe_subscription_id: subscriptionId })
      .eq('id', profile.couple_id)
    if (coupleErr) throw new Error(`Couple update failed: ${coupleErr.message}`)

    if (partnerId) {
      const { error: partnerErr } = await supabase
        .from('profiles')
        .update({ is_pro: true, stripe_subscription_id: subscriptionId })
        .eq('id', partnerId)
      if (partnerErr) throw new Error(`Partner update failed: ${partnerErr.message}`)
      console.log(`[activatePro] Partner ${partnerId} upgraded to pro`)
      proAccessCache.delete(partnerId)
    }
  }
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

app.use('/api/verify-subscription', makeLimit(5))
app.use('/api/create-invite',       makeLimit(10))
app.use('/api/accept-invite',       makeLimit(10))
app.use('/api/disconnect',          makeLimit(10))
app.use('/api/photo',               makeLimit(120))


// Cache exchange rates for 6 hours to avoid hitting rate limits.
// Keyed by base currency: each base has its own rate set, so requests with
// different `from` values (partners' differing home currencies) don't collide.
const ratesCache = new Map() // base -> { rates, time }

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

  const cached = ratesCache.get(baseCurrency)
  if (cached && (now - cached.time) < sixHours) {
    console.log('Exchange rates from cache')
    return cached.rates
  }

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${baseCurrency}`
    )
    const data = await res.json()
    if (data.rates) {
      const rates = { [baseCurrency]: 1, ...data.rates }
      ratesCache.set(baseCurrency, { rates, time: now })
      console.log('Exchange rates refreshed from Frankfurter')
      return rates
    }
    return cached?.rates || FALLBACK_RATES
  } catch (e) {
    console.error('Exchange rate error:', e)
    return cached?.rates || FALLBACK_RATES
  }
}

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

    await activatePro(userId, sub.id)
    res.json({ success: true, subscriptionId: sub.id })
  } catch (err) {
    console.error('Verify subscription error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/create-portal-session', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    const existing = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    })
    const customer = existing.data[0]
    if (!customer) return res.status(404).json({ error: 'No Stripe customer found for this user' })

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: 'https://roamietravel.app/dashboard',
    })
    res.json({ url: portalSession.url })
  } catch (err) {
    console.error('Portal session error:', err)
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

// FX proxy: browsers can't call Frankfurter directly (CORS). Thin passthrough to
// getExchangeRates(base), which carries the existing 6h in-memory cache. No auth,
// no metering. Returns { base, rates } where rates[CUR] = units of CUR per 1 base.
app.get('/api/fx-rates', async (req, res) => {
  const from = String(req.query.from || 'USD').toUpperCase()
  if (!/^[A-Z]{3}$/.test(from)) {
    return res.status(400).json({ error: 'Invalid base currency' })
  }
  const rates = await getExchangeRates(from)
  res.json({ base: from, rates })
})

app.get('/api/photo', async (req, res) => {
  const city = req.query.city
  if (!city) return res.status(400).json({ error: 'Missing city' })
  const key = city.toLowerCase()
  const cached = photoCache.get(key)
  if (cached && Date.now() - cached.timestamp < PHOTO_CACHE_TTL) {
    return res.json({ url: cached.url })
  }
  try {
    const unsplashRes = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city + ' travel destination')}&per_page=3&orientation=landscape&order_by=relevant&content_filter=high`,
      { headers: { Authorization: `Client-ID ${process.env.VITE_UNSPLASH_KEY}` } }
    )
    const json = await unsplashRes.json()
    const url = json.results?.length > 0
      ? json.results.reduce((prev, curr) => curr.likes > prev.likes ? curr : prev).urls.regular
      : null
    photoCache.set(key, { url, timestamp: Date.now() })
    res.json({ url })
  } catch (e) {
    console.error('Photo fetch error:', e)
    res.json({ url: null })
  }
})

app.use((err, req, res, next) => {
  console.error('[FATAL]', err.stack || err)
  res.status(500).json({ success: false, error: 'Something went wrong on our end. Please try again.' })
})

app.listen(3001, () => console.log('Server running on port 3001'))


process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.stack || err)
})
