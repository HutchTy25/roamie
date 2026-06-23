import { useEffect, useState } from 'react'
import { Plus, Settings } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import CreateTripModal from '../components/CreateTripModal'

const cleanDestName = (name) => name?.replace(/^[A-Z]{2,3} /, '') ?? name

// v0 design tokens
const colors = {
  bg: '#000000',
  card: '#121214',
  gold: '#C9A05C',
  blue: '#6FA8C9',
  text: '#F5F5F5',
  textMuted: '#8A8A8F',
  border: 'rgba(255,255,255,0.08)',
}

const CURR_SYMBOLS = {
  USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$',
  NZD: 'NZ$', JPY: '¥', CNY: '¥', KRW: '₩', PHP: '₱',
  IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫', SGD: 'S$',
  INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵',
  KES: 'KSh', ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼',
  BRL: 'R$', MXN: 'MX$', COP: 'COL$', ARS: 'AR$', CLP: 'CL$',
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [proToast, setProToast] = useState(false)
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [partnerProfile, setPartnerProfile] = useState(null)
  const [coupleLoading, setCoupleLoading] = useState(true)
  const [myProfile, setMyProfile] = useState(null)
  const [showAddTrip, setShowAddTrip] = useState(false)
  const [tripAgg, setTripAgg] = useState({})

  useEffect(() => {
    if (!session) { navigate('/login'); return }
    fetchData()
    const handleFocus = () => fetchData()
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchData()
    })
    return () => { window.removeEventListener('focus', handleFocus) }
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
      if (profile) setMyProfile(profile)

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

      // Budget spend + reservation/unpaid counts derived live from bookings.
      const tripIds = dedupedTrips.map(t => t.id)
      if (tripIds.length) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('trip_id, status, price_amount, fx_rate_locked')
          .in('trip_id', tripIds)
        const agg = {}
        for (const b of bookings ?? []) {
          if (b.status === 'draft') continue
          const a = agg[b.trip_id] || (agg[b.trip_id] = { reservationCount: 0, unpaidCount: 0, spent: 0 })
          a.reservationCount++
          if (b.status === 'booked_unpaid') a.unpaidCount++
          a.spent += b.fx_rate_locked != null
            ? Number(b.price_amount) * Number(b.fx_rate_locked)
            : Number(b.price_amount)
        }
        setTripAgg(agg)
      } else {
        setTripAgg({})
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

  const myName = myProfile?.display_name || session?.user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const myAvatar = myProfile?.avatar_url || session?.user?.user_metadata?.avatar_url
  const partnerName = partnerProfile?.display_name || partnerProfile?.full_name?.split(' ')[0] || null

  const statusPill = (agg) => {
    if (agg?.unpaidCount > 0) return { label: `${agg.unpaidCount} unpaid`, color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' }
    if (agg?.reservationCount > 0) return { label: 'All settled', color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' }
    return { label: 'No bookings yet', color: colors.textMuted, bg: 'rgba(255,255,255,0.05)', border: colors.border }
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, maxWidth: '430px', margin: '0 auto', position: 'relative', paddingBottom: '40px' }}>
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .trip-card { background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: 20px; transition: border-color 0.2s ease; }
        .trip-card:hover { border-color: rgba(201,160,92,0.4); }
      `}</style>

      {proToast && (
        <div style={{
          position: 'fixed', top: '1.25rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: `linear-gradient(135deg, ${colors.gold}, #E0A53B)`,
          borderRadius: '100px', padding: '12px 20px', color: '#1A1A1A',
          fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 24px rgba(201,160,92,0.35)',
          display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
        }}>
          <span>✦</span> Welcome to Roamie Pro!
          <button onClick={() => setProToast(false)} style={{ marginLeft: '4px', background: 'none', border: 'none', color: 'rgba(0,0,0,0.6)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '28px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, margin: 0, letterSpacing: '-0.4px' }}>
          {greeting()}, {myName}
        </h1>
        <button
          onClick={() => navigate('/profile')}
          aria-label="Profile and settings"
          style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%', background: colors.card, border: `1px solid ${colors.border}`, color: colors.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 0 }}
        >
          {myAvatar
            ? <img src={myAvatar} alt="you" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Settings size={18} color={colors.textMuted} />}
        </button>
      </div>

      {/* Trips */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.textMuted, margin: '20px 0 14px', fontWeight: '600' }}>
          Your trips
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted, fontSize: '14px' }}>Loading…</div>
        )}

        {!loading && trips.length === 0 && (
          <div className="trip-card" style={{ padding: '40px', textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✈️</div>
            <div style={{ color: colors.textMuted, fontSize: '14px' }}>No trips yet. Your next adventure starts here.</div>
          </div>
        )}

        {trips.map((trip, i) => {
          const agg = tripAgg[trip.id] || {}
          const spent = Math.round(agg.spent || 0)
          const budget = trip.budget_total != null ? Number(trip.budget_total) : null
          const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
          const sym = CURR_SYMBOLS[trip.destination_currency] || trip.destination_currency || ''
          const barColor = pct >= 100 ? '#EF4444' : pct >= 80 ? '#E0A53B' : `linear-gradient(90deg, ${colors.blue}, ${colors.gold})`
          const pill = statusPill(agg)
          const destLabel = cleanDestName(trip.destination_name) || ''
          return (
            <div
              key={trip.id}
              className="trip-card"
              onClick={() => navigate(`/trip/${trip.id}`)}
              style={{ position: 'relative', overflow: 'hidden', padding: 0, marginBottom: '12px', cursor: 'pointer', minHeight: '170px', animation: `fadeSlideUp 0.4s ease ${i * 0.05}s forwards`, opacity: 0 }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: trip.destination_photo_url
                  ? `url(${trip.destination_photo_url}) center/cover no-repeat`
                  : `linear-gradient(135deg, rgba(111,168,201,0.25) 0%, rgba(201,160,92,0.2) 100%)`,
              }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.82) 45%, rgba(0,0,0,0.35) 100%)' }} />

              <button
                onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id) }}
                aria-label="Delete trip"
                style={{ position: 'absolute', top: '10px', right: '12px', zIndex: 2, background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
              >×</button>

              <div style={{ position: 'relative', zIndex: 1, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: '170px', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: colors.text, marginBottom: '2px' }}>
                  {trip.country_emoji} {trip.trip_name || destLabel || 'Untitled trip'}
                </div>
                <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '12px' }}>
                  {destLabel}{destLabel && (trip.dates_from || trip.dates_to) ? ' · ' : ''}{fmtDate(trip.dates_from)} → {fmtDate(trip.dates_to)}
                </div>

                {budget > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '11px' }}>
                      <span style={{ color: pct >= 100 ? '#EF4444' : colors.textMuted }}>{sym}{spent.toLocaleString()} spent</span>
                      <span style={{ color: colors.textMuted }}>{sym}{budget.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex' }}>
                      {myAvatar ? (
                        <img src={myAvatar} style={{ width: '24px', height: '24px', borderRadius: '50%', border: `1.5px solid ${colors.blue}`, objectFit: 'cover' }} alt="you" />
                      ) : (
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: colors.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#000' }}>{myName[0]?.toUpperCase()}</div>
                      )}
                      {partnerProfile && (
                        <div style={{ marginLeft: '-7px' }}>
                          {partnerProfile.avatar_url ? (
                            <img src={partnerProfile.avatar_url} style={{ width: '24px', height: '24px', borderRadius: '50%', border: `1.5px solid ${colors.gold}`, objectFit: 'cover' }} alt="partner" />
                          ) : (
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#000' }}>{partnerName?.[0]?.toUpperCase() || '?'}</div>
                          )}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: colors.textMuted }}>
                      {agg.reservationCount || 0} reservation{(agg.reservationCount || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: pill.color, background: pill.bg, border: `1px solid ${pill.border}`, borderRadius: '100px', padding: '4px 10px' }}>
                    {pill.label}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {!coupleLoading && !partnerProfile && (
          <button
            onClick={() => navigate('/connect')}
            style={{ width: '100%', marginTop: '4px', padding: '16px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '16px', color: colors.text, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <span style={{ fontSize: '20px' }}>🔗</span> Connect your partner
          </button>
        )}
      </div>

      {/* Add-trip FAB */}
      <button
        onClick={() => setShowAddTrip(true)}
        aria-label="Add trip"
        style={{
          position: 'fixed', bottom: 'calc(28px + env(safe-area-inset-bottom))',
          right: 'max(20px, calc(50% - 215px + 20px))', zIndex: 110,
          width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${colors.gold}, #E0A53B)`,
          boxShadow: '0 8px 28px rgba(201,160,92,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Plus size={26} color="#000" />
      </button>

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
