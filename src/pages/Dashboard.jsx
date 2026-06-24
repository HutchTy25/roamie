import { useEffect, useState } from 'react'
import { Plus, Clock, ChevronLeft, Camera, User } from 'lucide-react'
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom'
import { supabase } from '../supabase'
import CreateTripModal from '../components/CreateTripModal'

// Screen entrance: slide from the right on forward nav (PUSH/REPLACE), from the
// left on browser back/forward (POP). Ends at transform:none (see index.css).
const screenClass = (navType) => navType === 'POP' ? 'roamie-screen-back' : 'roamie-screen-forward'

// Shimmering skeleton block.
const Sk = ({ w = '100%', h = 14, r = 8, style }) => (
  <div className="roamie-skeleton" style={{ width: w, height: h, borderRadius: r, background: '#1B1B1F', ...style }} />
)

// Trip-card placeholder matching the real card's footprint.
const TripCardSkeleton = () => (
  <div style={{ borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: '#121214', overflow: 'hidden' }}>
    <Sk w="100%" h={176} r={0} />
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Sk w="60%" h={20} />
      <Sk w="40%" h={12} />
      <Sk w="100%" h={8} r={100} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Sk w={56} h={24} r={100} />
        <Sk w={80} h={12} />
      </div>
    </div>
  </div>
)

const cleanDestName = (name) => name?.replace(/^[A-Z]{2,3} /, '') ?? name

// New "Moonly → midnight" palette: true black, warm gold accent, cool blue.
const colors = {
  bg: '#000000',
  card: '#121214',
  cardElevated: '#1B1B1F',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.16)',
  gold: '#C9A05C',
  goldSoft: 'rgba(201,160,92,0.14)',
  blue: '#6FA8C9',
  text: '#F2F1ED',
  textMuted: '#5E6066',
  textSoft: '#8A8A8F',
  paid: '#6FBF8E',
  paidSoft: 'rgba(111,191,142,0.12)',
}
const serif = "'Playfair Display', Georgia, serif"

const CURR_SYMBOLS = {
  USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$',
  NZD: 'NZ$', JPY: '¥', CNY: '¥', KRW: '₩', PHP: '₱',
  IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫', SGD: 'S$',
  INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵',
  KES: 'KSh', ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼',
  BRL: 'R$', MXN: 'MX$', COP: 'COL$', ARS: 'AR$', CLP: 'CL$',
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null
const formatCountdown = (days) => {
  if (days == null || days < 0) return null
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 30) return `in ${days} days`
  return `in ${Math.round(days / 7)} weeks`
}
const greetingFor = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// Status pill tone derived from a trip's bookings aggregate.
const statusPill = (agg) => {
  if (agg?.unpaidCount > 0) return { label: `${agg.unpaidCount} unpaid`, tone: 'gold' }
  if (agg?.reservationCount > 0) return { label: 'All settled', tone: 'paid' }
  return { label: 'No bookings', tone: 'draft' }
}

function Pill({ label, tone, style }) {
  const tones = {
    gold: { color: colors.gold, bg: colors.goldSoft },
    paid: { color: colors.paid, bg: colors.paidSoft },
    draft: { color: colors.textSoft, bg: 'rgba(255,255,255,0.06)' },
  }
  const t = tones[tone] || tones.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      fontSize: '11px', fontWeight: '500', letterSpacing: '-0.01em',
      color: t.color, background: t.bg, borderRadius: '100px', padding: '4px 10px',
      ...style,
    }}>
      {tone !== 'draft' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.color }} />}
      {label}
    </span>
  )
}

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const navType = useNavigationType()
  const [proToast, setProToast] = useState(false)
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [partnerProfile, setPartnerProfile] = useState(null)
  const [coupleLoading, setCoupleLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [customAvatar, setCustomAvatar] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [myProfile, setMyProfile] = useState(null)
  const [showAddTrip, setShowAddTrip] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackBug, setFeedbackBug] = useState('')
  const [feedbackFeature, setFeedbackFeature] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [tripAgg, setTripAgg] = useState({})
  const [budgetDest, setBudgetDest] = useState({})   // trip.id -> budget_total in destination_currency

  useEffect(() => {
    if (!session) { navigate('/login'); return }
    fetchData()

    const handleFocus = () => fetchData()
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchData()
    })

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [session])

  useEffect(() => {
    if (location.state?.proUpgrade) {
      setProToast(true)
      const t = setTimeout(() => setProToast(false), 5000)
      return () => clearTimeout(t)
    }
  }, [])

  async function fetchData() {
    try {
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()

      if (profile) {
        setMyProfile(profile)
        if (profile.avatar_url) setCustomAvatar(profile.avatar_url)
      }

      const tripQueries = [
        supabase.from('trips').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10),
      ]
      if (profile?.couple_id) {
        tripQueries.push(
          supabase.from('trips').select('*').eq('couple_id', profile.couple_id).order('created_at', { ascending: false }).limit(10)
        )
      }

      const tripResults = await Promise.all(tripQueries)
      const allTrips = tripResults.flatMap(r => r.data ?? [])
      const dedupedTrips = [...new Map(allTrips.map(t => [t.id, t])).values()]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setTrips(dedupedTrips)

      // Budget spend + reservation/unpaid counts are derived live from the
      // bookings ledger (never stored on the trip). One batched read for all
      // visible trips; RLS lets either partner see their trips' bookings.
      const tripIds = dedupedTrips.map(t => t.id)
      if (tripIds.length) {
        const destCurById = Object.fromEntries(dedupedTrips.map(t => [t.id, t.destination_currency || null]))
        const { data: bookings } = await supabase
          .from('bookings')
          .select('trip_id, status, price_amount, price_currency, fx_rate_locked')
          .in('trip_id', tripIds)

        // Every booking must be converted to its trip's destination_currency
        // before summing — never mix raw amounts in different currencies.
        const agg = {}
        const pending = {}  // destCur -> [{ trip_id, amount, priceCur }] needing a live rate
        for (const b of bookings ?? []) {
          if (b.status === 'draft') continue
          const a = agg[b.trip_id] || (agg[b.trip_id] = { reservationCount: 0, unpaidCount: 0, spent: 0 })
          a.reservationCount++
          if (b.status === 'booked_unpaid') a.unpaidCount++

          const destCur = destCurById[b.trip_id]
          if (b.fx_rate_locked != null) {
            // Locked rate already converts price_currency -> destination_currency.
            a.spent += Number(b.price_amount) * Number(b.fx_rate_locked)
          } else if (!destCur || !b.price_currency || b.price_currency === destCur) {
            // Already in destination currency (or no anchor) — add as-is.
            a.spent += Number(b.price_amount)
          } else {
            // No locked rate + different currency: defer to a live conversion.
            pending[destCur] = pending[destCur] || []
            pending[destCur].push({ trip_id: b.trip_id, amount: Number(b.price_amount), priceCur: b.price_currency })
          }
        }

        // budget_total is stored in budget_currency; the bar compares it against
        // spent (in destination_currency), so convert it to destination too.
        const budgetMap = {}
        const budgetPending = {}  // destCur -> [{ trip_id, amount, budgetCur }]
        for (const t of dedupedTrips) {
          if (t.budget_total == null) { budgetMap[t.id] = null; continue }
          const amt = Number(t.budget_total)
          const dC = t.destination_currency
          if (!dC || !t.budget_currency || t.budget_currency === dC) {
            budgetMap[t.id] = amt
          } else {
            budgetPending[dC] = budgetPending[dC] || []
            budgetPending[dC].push({ trip_id: t.id, amount: amt, budgetCur: t.budget_currency })
          }
        }

        // One live FX fetch per distinct destination currency needed (for either
        // booking spend or budget conversion). /api/fx-rates?from=D returns
        // rates[C] = units of C per 1 D, so converting an amount in currency X
        // into D divides by rates[X].
        const neededDest = [...new Set([...Object.keys(pending), ...Object.keys(budgetPending)])]
        if (neededDest.length) {
          const entries = await Promise.all(neededDest.map(async (d) => {
            try {
              const r = await fetch(`https://roamie-61ib.onrender.com/api/fx-rates?from=${d}`)
              const j = await r.json()
              return [d, j?.rates || null]
            } catch { return [d, null] }
          }))
          const ratesByDest = Object.fromEntries(entries)
          for (const d of Object.keys(pending)) {
            const rates = ratesByDest[d]
            for (const it of pending[d]) {
              const rate = rates?.[it.priceCur]
              agg[it.trip_id].spent += rate ? it.amount / rate : it.amount
            }
          }
          for (const d of Object.keys(budgetPending)) {
            const rates = ratesByDest[d]
            for (const it of budgetPending[d]) {
              const rate = rates?.[it.budgetCur]
              budgetMap[it.trip_id] = rate ? it.amount / rate : it.amount
            }
          }
        }
        setTripAgg(agg)
        setBudgetDest(budgetMap)
      } else {
        setTripAgg({})
        setBudgetDest({})
      }

      if (profile?.couple_id) {
        const { data: couple } = await supabase
          .from('couples').select('*').eq('id', profile.couple_id).single()
        if (couple?.status === 'connected') {
          const partnerId = couple.partner1_id === session.user.id ? couple.partner2_id : couple.partner1_id
          const { data: partner } = await supabase
            .from('profiles').select('*').eq('id', partnerId).single()
          setPartnerProfile(partner)
        }
      }
    } catch (e) {
      console.error('Fetch data error:', e)
    } finally {
      setLoading(false)
      setCoupleLoading(false)
    }
  }

  async function deleteTrip(id) {
    await supabase.from('trips').delete().eq('id', id)
    setTrips(trips.filter(t => t.id !== id))
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${session.user.id}/avatar.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', session.user.id)
      setCustomAvatar(data.publicUrl)
    } catch (e) {
      console.error('Upload error:', e)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function submitFeedback() {
    if (!feedbackBug.trim() && !feedbackFeature.trim()) return
    await supabase.from('feedback').insert({
      user_id: session.user.id,
      bug_report: feedbackBug.trim() || null,
      feature_request: feedbackFeature.trim() || null,
    })
    setFeedbackSent(true)
    setTimeout(() => {
      setShowFeedback(false)
      setFeedbackBug('')
      setFeedbackFeature('')
      setFeedbackSent(false)
    }, 1500)
  }

  const myName = myProfile?.display_name || session?.user?.user_metadata?.full_name?.split(' ')[0] || 'You'
  const myAvatar = customAvatar || session?.user?.user_metadata?.avatar_url
  const partnerName = partnerProfile?.display_name || partnerProfile?.full_name?.split(' ')[0] || null
  const togetherLabel = partnerName ? `Together · ${myName} & ${partnerName}` : `${greetingFor()}, ${myName}`

  // Small avatar chip (image when available, initials otherwise).
  const AvatarChip = ({ src, name, accent = colors.gold, size = 28, style }) => (
    src ? (
      <img src={src} alt={name || ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${colors.bg}`, ...style }} />
    ) : (
      <div style={{
        width: size, height: size, borderRadius: '50%', border: `1.5px solid ${colors.bg}`,
        background: accent, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.4, fontWeight: '600', ...style,
      }}>
        {(name || '?')[0]}
      </div>
    )
  )

  return (
    <div className={screenClass(navType)} style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '430px',
      margin: '0 auto',
      paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient brand glow */}
      <div aria-hidden className="roamie-glow" style={{
        position: 'absolute', top: '-96px', left: '50%', transform: 'translateX(-50%)',
        height: '256px', width: '120%', borderRadius: '50%',
        background: 'rgba(201,160,92,0.10)', filter: 'blur(64px)', pointerEvents: 'none', zIndex: 0,
      }} />

      {proToast && (
        <div style={{
          position: 'fixed', top: '1.25rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: colors.gold,
          borderRadius: '100px', padding: '12px 20px', color: colors.bg,
          fontSize: '14px', fontWeight: '600', boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
        }}>
          Welcome to Roamie Pro — enjoy unlimited searches!
          <button onClick={() => setProToast(false)} style={{
            marginLeft: '4px', background: 'none', border: 'none',
            color: 'rgba(0,0,0,0.6)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0,
          }}>×</button>
        </div>
      )}

      <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />

      {/* ===================== HOME / TRIPS ===================== */}
      {activeTab === 'home' && (
        <>
          <header style={{
            position: 'relative', zIndex: 10,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            padding: '64px 20px 12px',
          }}>
            <div style={{ minWidth: 0 }}>
              {loading
                ? <Sk w={150} h={13} style={{ margin: '2px 0 4px' }} />
                : <p style={{ fontSize: '13px', fontWeight: '500', color: colors.textSoft, margin: 0 }}>{togetherLabel}</p>}
              <h1 style={{ fontFamily: serif, fontSize: '32px', fontWeight: '600', lineHeight: 1, letterSpacing: '-0.01em', color: colors.text, margin: '6px 0 0' }}>
                Your trips
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={() => setShowAddTrip(true)}
                aria-label="New trip"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: colors.text, color: colors.bg, border: 'none', cursor: 'pointer' }}
              >
                <Plus size={20} />
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                aria-label="Open profile"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: colors.card, border: `1px solid ${colors.border}`, cursor: 'pointer', padding: 0, overflow: 'hidden' }}
              >
                {loading
                  ? <div className="roamie-skeleton" style={{ width: '100%', height: '100%', background: '#1B1B1F' }} />
                  : myAvatar
                    ? <img src={myAvatar} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <User size={18} color={colors.text} />}
              </button>
            </div>
          </header>

          <div style={{ position: 'relative', zIndex: 10, flex: 1, padding: '8px 16px 0' }}>
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <TripCardSkeleton />
                <TripCardSkeleton />
              </div>
            )}

            {!loading && trips.length === 0 && (
              <div style={{ borderRadius: '24px', border: `1px solid ${colors.border}`, background: colors.card, padding: '44px 24px', textAlign: 'center' }}>
                <div style={{ color: colors.text, fontSize: '15px', fontWeight: '500', marginBottom: '6px' }}>No trips yet</div>
                <div style={{ color: colors.textMuted, fontSize: '13px' }}>
                  Your next adventure starts here.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {trips.map((trip, i) => {
                const agg = tripAgg[trip.id] || {}
                const spent = Math.round(agg.spent || 0)
                // Budget converted to destination_currency (see fetchData); falls
                // back to the raw value until that resolves.
                const budget = budgetDest[trip.id] != null
                  ? budgetDest[trip.id]
                  : (trip.budget_total != null ? Number(trip.budget_total) : null)
                const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
                const sym = CURR_SYMBOLS[trip.destination_currency] || trip.destination_currency || ''
                const pill = statusPill(agg)
                const destLabel = cleanDestName(trip.destination_name) || ''
                const days = daysUntil(trip.dates_from)
                const countdown = formatCountdown(days)
                const imminent = days != null && days >= 0 && days <= 21
                return (
                  <button
                    key={trip.id}
                    onClick={() => navigate(`/trip/${trip.id}`, { state: { trip } })}
                    className="roamie-rise"
                    style={{
                      position: 'relative', overflow: 'hidden', textAlign: 'left',
                      borderRadius: '24px', border: `1px solid ${colors.border}`, background: colors.card,
                      padding: 0, cursor: 'pointer', width: '100%',
                      boxShadow: '0 18px 40px -18px rgba(0,0,0,0.9)',
                      animationDelay: `${i * 90}ms`,
                    }}
                  >
                    {/* Photo */}
                    <div style={{ position: 'relative', height: '176px', width: '100%', overflow: 'hidden' }}>
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: trip.destination_photo_url
                          ? `url(${trip.destination_photo_url}) center/cover no-repeat`
                          : `linear-gradient(135deg, ${colors.cardElevated}, ${colors.card})`,
                      }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.15) 100%)' }} />

                      {/* Status pill (top-left) */}
                      <div style={{ position: 'absolute', top: '16px', left: '16px' }}>
                        <Pill label={pill.label} tone={pill.tone} style={{ backdropFilter: 'blur(8px)' }} />
                      </div>

                      {/* Countdown (top-right) */}
                      {countdown && (
                        <span
                          className={imminent ? 'roamie-pulse-gold' : undefined}
                          style={{
                            position: 'absolute', top: '16px', right: '16px',
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            borderRadius: '100px', padding: '5px 10px', fontSize: '11px', fontWeight: '500',
                            backdropFilter: 'blur(8px)',
                            color: imminent ? colors.gold : 'rgba(255,255,255,0.9)',
                            background: imminent ? colors.goldSoft : 'rgba(0,0,0,0.4)',
                          }}
                        >
                          <Clock size={12} color={imminent ? colors.gold : 'rgba(255,255,255,0.7)'} />
                          {countdown}
                        </span>
                      )}

                      {/* Delete */}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); deleteTrip(trip.id) } }}
                        aria-label="Delete trip"
                        style={{
                          position: 'absolute', bottom: '12px', right: '14px',
                          background: 'rgba(0,0,0,0.4)', borderRadius: '50%',
                          width: '26px', height: '26px', color: 'rgba(255,255,255,0.7)',
                          cursor: 'pointer', fontSize: '15px', lineHeight: '26px', textAlign: 'center',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        ×
                      </span>
                    </div>

                    {/* Body */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h3 style={{ fontFamily: serif, fontSize: '22px', fontWeight: '600', lineHeight: 1.15, color: colors.text, margin: 0 }}>
                          {trip.trip_name || destLabel || 'Untitled trip'}
                        </h3>
                        <p style={{ fontSize: '13px', color: colors.textSoft, margin: 0 }}>{destLabel}</p>
                        {(trip.dates_from || trip.dates_to) && (
                          <p style={{ fontSize: '13px', fontWeight: '500', color: 'rgba(242,241,237,0.8)', margin: '2px 0 0' }}>
                            {fmtDate(trip.dates_from)} → {fmtDate(trip.dates_to)}
                          </p>
                        )}
                      </div>

                      {/* Budget bar */}
                      {budget > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.textMuted }}>
                              {partnerProfile ? 'Shared budget' : 'Budget'}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: '500', color: colors.text }}>
                              {sym}{spent.toLocaleString()} <span style={{ color: colors.textMuted }}>/ {sym}{budget.toLocaleString()}</span>
                            </span>
                          </div>
                          <div style={{ height: '8px', width: '100%', borderRadius: '100px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                            <div className="roamie-fill" style={{ width: `${pct}%`, height: '100%', borderRadius: '100px', background: pct >= 100 ? '#E5675F' : colors.gold }} />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <AvatarChip src={myAvatar} name={myName} accent={colors.gold} />
                          {partnerProfile && (
                            <AvatarChip src={partnerProfile.avatar_url} name={partnerName} accent={colors.blue} style={{ marginLeft: '-9px' }} />
                          )}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: colors.textMuted }}>
                          {agg.reservationCount || 0} reservation{(agg.reservationCount || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {!coupleLoading && !partnerProfile && (
              <button
                onClick={() => navigate('/connect')}
                style={{
                  width: '100%', marginTop: '16px', padding: '16px',
                  background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '16px',
                  color: colors.text, fontSize: '14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                Connect your partner
              </button>
            )}
          </div>
        </>
      )}

      {/* ===================== PROFILE ===================== */}
      {activeTab === 'profile' && (
        <>
          <header style={{
            position: 'relative', zIndex: 10,
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '64px 20px 12px',
          }}>
            <button
              onClick={() => setActiveTab('home')}
              aria-label="Back to trips"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: colors.card, border: `1px solid ${colors.border}`, color: colors.text, cursor: 'pointer' }}
            >
              <ChevronLeft size={20} />
            </button>
            <h1 style={{ fontFamily: serif, fontSize: '28px', fontWeight: '600', color: colors.text, margin: 0 }}>Profile</h1>
          </header>

          <div style={{ position: 'relative', zIndex: 10, padding: '8px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '20px', borderRadius: '20px', border: `1px solid ${colors.border}`, background: colors.card }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => document.getElementById('avatar-upload').click()}>
                {myAvatar ? (
                  <img src={myAvatar} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} alt="you" />
                ) : (
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '600', color: colors.bg }}>
                    {myName[0]}
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderRadius: '50%', background: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${colors.bg}` }}>
                  <Camera size={10} color={colors.bg} />
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '17px', fontWeight: '600', color: colors.text }}>
                  {session?.user?.user_metadata?.full_name || myName}
                </div>
                <div style={{ fontSize: '13px', color: colors.textSoft, overflow: 'hidden', textOverflow: 'ellipsis' }}>{session?.user?.email}</div>
                {uploadingAvatar && <div style={{ fontSize: '11px', color: colors.gold, marginTop: '4px' }}>Uploading…</div>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <div
                onClick={() => navigate('/connect')}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '16px', border: `1px solid ${colors.border}`, background: colors.card, cursor: 'pointer' }}
              >
                <div style={{ fontSize: '14px', color: colors.text }}>Partner Sync</div>
                <div style={{ fontSize: '13px', color: colors.textSoft }}>
                  {partnerProfile ? `Connected to ${partnerName}` : 'Not connected'} →
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '16px', border: `1px solid ${colors.border}`, background: colors.card }}>
                <div style={{ fontSize: '14px', color: colors.text }}>Subscription</div>
                {myProfile?.is_pro ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: colors.bg, background: colors.gold, padding: '3px 10px', borderRadius: '100px' }}>Pro</span>
                    <button
                      onClick={async () => {
                        const { data: { session: portalSession } } = await supabase.auth.getSession()
                        const res = await fetch('https://roamie-61ib.onrender.com/api/create-portal-session', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${portalSession?.access_token}`,
                          },
                          body: JSON.stringify({}),
                        })
                        const { url } = await res.json()
                        if (url) window.location.href = url
                      }}
                      style={{ fontSize: '13px', color: colors.gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Manage →
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: colors.textSoft }}>Free tier</div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowFeedback(true)}
              style={{ background: 'none', border: 'none', color: colors.textSoft, fontSize: '13px', cursor: 'pointer', padding: '8px 0', width: '100%', textAlign: 'center', marginBottom: '12px' }}
            >
              Share feedback
            </button>

            <button
              onClick={() => supabase.auth.signOut().then(() => { localStorage.removeItem('roamie_paid'); navigate('/') })}
              style={{ width: '100%', padding: '16px', background: 'none', border: `1px solid ${colors.border}`, borderRadius: '16px', color: colors.textSoft, fontSize: '14px', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
        </>
      )}

      {/* Feedback modal */}
      {showFeedback && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 32px' }}
          onClick={() => setShowFeedback(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="roamie-sheet-up"
            style={{ width: '100%', maxWidth: '430px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '24px', padding: '24px' }}
          >
            <div style={{ fontFamily: serif, fontSize: '20px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>Share feedback</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>Something isn&apos;t working</label>
                <textarea
                  value={feedbackBug}
                  onChange={e => setFeedbackBug(e.target.value)}
                  placeholder="Describe the issue…"
                  rows={3}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: colors.cardElevated, border: `1px solid ${colors.border}`, color: colors.text, fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>I wish Roamie could…</label>
                <textarea
                  value={feedbackFeature}
                  onChange={e => setFeedbackFeature(e.target.value)}
                  placeholder="Share your idea…"
                  rows={3}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: colors.cardElevated, border: `1px solid ${colors.border}`, color: colors.text, fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            </div>
            {feedbackSent ? (
              <div style={{ textAlign: 'center', color: colors.paid, fontSize: '14px', padding: '12px 0' }}>Thanks for the feedback!</div>
            ) : (
              <button
                onClick={submitFeedback}
                disabled={!feedbackBug.trim() && !feedbackFeature.trim()}
                style={{ width: '100%', padding: '14px', background: (feedbackBug.trim() || feedbackFeature.trim()) ? colors.text : 'rgba(242,241,237,0.25)', border: 'none', borderRadius: '16px', color: colors.bg, fontSize: '14px', fontWeight: '600', cursor: feedbackBug.trim() || feedbackFeature.trim() ? 'pointer' : 'default' }}
              >
                Submit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create-trip modal */}
      {showAddTrip && (
        <CreateTripModal
          session={session}
          profile={myProfile}
          onClose={() => setShowAddTrip(false)}
          onCreated={async (tripId) => { setShowAddTrip(false); await fetchData(); navigate(`/trip/${tripId}`) }}
        />
      )}
    </div>
  )
}
