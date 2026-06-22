import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import CreateTripModal from '../components/CreateTripModal'

const cleanDestName = (name) => name?.replace(/^[A-Z]{2,3} /, '') ?? name

const getAmbientGlow = () => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 8) {
    return {
      gradient: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(251,146,60,0.25) 0%, rgba(244,114,182,0.15) 30%, rgba(251,146,60,0.08) 50%, transparent 70%)",
      secondaryGlow: "radial-gradient(ellipse 60% 40% at 50% 5%, rgba(253,186,116,0.2) 0%, transparent 60%)",
      pulse: true,
    }
  }
  if (hour >= 8 && hour < 12) {
    return {
      gradient: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(253,224,71,0.18) 0%, rgba(251,191,36,0.1) 40%, transparent 70%)",
      secondaryGlow: "radial-gradient(ellipse 50% 35% at 50% 5%, rgba(254,249,195,0.15) 0%, transparent 50%)",
      pulse: false,
    }
  }
  if (hour >= 12 && hour < 18) {
    return {
      gradient: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(148,163,184,0.06) 0%, transparent 60%)",
      secondaryGlow: null,
      pulse: false,
    }
  }
  if (hour >= 18 && hour < 21) {
    return {
      gradient: "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(124,106,239,0.3) 0%, rgba(139,92,246,0.15) 35%, rgba(124,106,239,0.05) 55%, transparent 75%)",
      secondaryGlow: "radial-gradient(ellipse 60% 40% at 50% 5%, rgba(167,139,250,0.2) 0%, transparent 55%)",
      pulse: true,
    }
  }
  return {
    gradient: "radial-gradient(ellipse 85% 60% at 50% 0%, rgba(30,27,75,0.6) 0%, rgba(49,46,129,0.3) 30%, rgba(30,27,75,0.15) 50%, transparent 75%)",
    secondaryGlow: "radial-gradient(ellipse 50% 35% at 50% 8%, rgba(99,102,241,0.12) 0%, transparent 60%)",
    pulse: true,
  }
}

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [proToast, setProToast] = useState(false)
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [partnerProfile, setPartnerProfile] = useState(null)
  const [coupleLoading, setCoupleLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [customAvatar, setCustomAvatar] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [myProfile, setMyProfile] = useState(null)
  const [ambientGlow, setAmbientGlow] = useState(getAmbientGlow())
  const [showAddTrip, setShowAddTrip] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackBug, setFeedbackBug] = useState('')
  const [feedbackFeature, setFeedbackFeature] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [tripAgg, setTripAgg] = useState({})

  // Theme colors - Moonly aesthetic
  const colors = {
    bg: '#1A1B26',
    card: 'rgba(30, 32, 48, 0.7)',
    cardSolid: '#1E2030',
    primary: '#7C6AEF',
    pink: '#F472B6',
    cyan: '#22D3EE',
    text: '#E8E8ED',
    textMuted: '#8B8FA3',
    border: 'rgba(124, 106, 239, 0.2)',
  }

  const navItems = [
    { id: 'home', label: 'Plan', icon: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
    { id: 'scrapbook', label: 'Scrapbook', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'checklist', label: 'Checklist', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'profile', label: 'Us', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  ]

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
    const interval = setInterval(() => setAmbientGlow(getAmbientGlow()), 60000)
    return () => clearInterval(interval)
  }, [])

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
          // Anchor every booking to the trip's destination_currency via the
          // locked rate (no live FX on the bar). Unlocked rows are assumed
          // already in destination_currency.
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

  const CURR_SYMBOLS = {
    USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$',
    NZD: 'NZ$', JPY: '¥', CNY: '¥', KRW: '₩', PHP: '₱',
    IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫', SGD: 'S$',
    INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵',
    KES: 'KSh', ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼',
    BRL: 'R$', MXN: 'MX$', COP: 'COL$', ARS: 'AR$', CLP: 'CL$',
  }

  const myName = myProfile?.display_name || session?.user?.user_metadata?.full_name?.split(' ')[0] || 'You'
  const myAvatar = customAvatar || session?.user?.user_metadata?.avatar_url
  const partnerName = partnerProfile?.display_name || partnerProfile?.full_name?.split(' ')[0] || null

  // SVG Icon component
  const Icon = ({ path, size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )

  // Connection-bridge accent (previously derived from partner weather's local
  // time; now a constant since the weather card is gone).
  const timeGlow = 'rgba(99,102,241,0.4)'

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

  // Status pill derived from the bookings aggregate for a trip.
  const statusPill = (agg) => {
    if (agg?.unpaidCount > 0) return { label: `${agg.unpaidCount} unpaid`, color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' }
    if (agg?.reservationCount > 0) return { label: 'All settled', color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' }
    return { label: 'No bookings yet', color: colors.textMuted, bg: 'rgba(139,143,163,0.1)', border: colors.border }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex', 
      flexDirection: 'column', 
      maxWidth: '430px', 
      margin: '0 auto', 
      paddingBottom: '100px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: "fixed", inset: 0, background: ambientGlow.gradient, pointerEvents: "none", zIndex: 1, filter: "blur(1px)" }} />
      {ambientGlow.secondaryGlow && <div style={{ position: "fixed", inset: 0, background: ambientGlow.secondaryGlow, pointerEvents: "none", zIndex: 1 }} />}
      {ambientGlow.pulse && <div style={{ position: "fixed", inset: 0, background: ambientGlow.gradient, pointerEvents: "none", zIndex: 1, opacity: 0.3, animation: "pulse 4s ease-in-out infinite" }} />}

      {proToast && (
        <div style={{
          position: 'fixed', top: '1.25rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: 'linear-gradient(135deg, #22D3EE, #7C6AEF)',
          borderRadius: '100px', padding: '12px 20px', color: '#fff',
          fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 24px rgba(34,211,238,0.35)',
          display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
        }}>
          <span>✦</span> Welcome to Roamie Pro — enjoy unlimited searches!
          <button onClick={() => setProToast(false)} style={{
            marginLeft: '4px', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0,
          }}>×</button>
        </div>
      )}

      {/* Global styles */}
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.6} }
        @keyframes twinkle { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes pulseGlow { 0%,100%{box-shadow: 0 0 20px rgba(124,106,239,0.3)} 50%{box-shadow: 0 0 40px rgba(124,106,239,0.5)} }
        @keyframes heartbeat {
          0%   { transform: scale(1); }
          14%  { transform: scale(1.1); }
          28%  { transform: scale(1); }
          42%  { transform: scale(1.07); }
          70%, 100% { transform: scale(1); }
        }
        .glass-card {
          background: ${colors.card};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid ${colors.border};
          border-radius: 20px;
        }
        .glass-card:hover {
          border-color: rgba(124, 106, 239, 0.4);
        }
      `}</style>

      {/* Starfield background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '2px',
              height: '2px',
              background: 'white',
              borderRadius: '50%',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.3,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div style={{ 
        padding: '24px 20px 20px', 
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: colors.text, 
              margin: 0,
              letterSpacing: '-0.5px'
            }}>
              Roamie
            </h1>
            <p style={{ 
              fontSize: '14px', 
              color: colors.textMuted, 
              margin: '4px 0 0 0' 
            }}>
              Your love, across miles
            </p>
          </div>

          {/* Avatar pair */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div 
              style={{ 
                position: 'relative', 
                cursor: 'pointer',
                zIndex: 2
              }} 
              onClick={() => document.getElementById('avatar-upload').click()}
            >
              {myAvatar ? (
                <img 
                  src={myAvatar} 
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    border: `2px solid ${colors.cyan}`,
                    objectFit: 'cover' 
                  }} 
                  alt="you" 
                />
              ) : (
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: `linear-gradient(135deg, ${colors.cyan}, ${colors.primary})`,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: 'white'
                }}>
                  {myName[0]}
                </div>
              )}
              <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
            </div>

            {partnerProfile ? (
              <div style={{ marginLeft: '-8px', zIndex: 1 }}>
                {partnerProfile.avatar_url ? (
                  <img 
                    src={partnerProfile.avatar_url} 
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      border: `2px solid ${colors.pink}`,
                      objectFit: 'cover' 
                    }} 
                    alt="partner" 
                  />
                ) : (
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: `linear-gradient(135deg, ${colors.pink}, ${colors.primary})`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: 'white'
                  }}>
                    {partnerName?.[0] || '?'}
                  </div>
                )}
              </div>
            ) : (
              <div 
                onClick={() => navigate('/connect')} 
                style={{ 
                  marginLeft: '-12px',
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: colors.cardSolid,
                  border: `2px dashed ${colors.border}`,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '18px',
                  color: colors.textMuted,
                  cursor: 'pointer'
                }}
              >
                +
              </div>
            )}
          </div>
        </div>

        {/* Connection status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginTop: '20px',
          justifyContent: 'center'
        }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: partnerProfile ? '#34D399' : colors.textMuted,
            boxShadow: partnerProfile ? '0 0 8px #34D399' : 'none'
          }} />
          <span style={{ 
            fontSize: '12px', 
            color: colors.textMuted, 
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            {partnerProfile ? 'Connection Active' : 'Awaiting Partner'}
          </span>
        </div>

        {/* Progress Bridge */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginTop: '20px',
          padding: '0 8px'
        }}>
          {/* Memphis location */}
          <div style={{ width: '85px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: colors.cardSolid,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px',
              margin: '0 auto 8px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.cyan} strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div style={{ fontSize: '22px', lineHeight: 1 }}>🏠</div>
            <div style={{ fontSize: '11px', color: colors.textMuted }}>
              {myProfile?.home_iata || ''}
            </div>
          </div>

          {/* Connection line with distance */}
          <div style={{ flex: 1, padding: '0 16px', position: 'relative' }}>
            <div style={{ 
              height: '3px', 
              background: `linear-gradient(90deg, ${colors.cyan}, ${colors.pink})`,
              borderRadius: '2px',
              boxShadow: `0 0 12px ${colors.cyan}, 0 0 28px ${timeGlow}`
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: colors.cardSolid,
              border: `1px solid ${colors.border}`,
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: colors.text
            }}>
              {myProfile?.home_iata && partnerProfile?.home_iata
  ? `${myProfile.home_iata} ↔ ${partnerProfile.home_iata}`
  : '— mi'}
            </div>
          </div>

          {/* Partner location */}
          <div style={{ width: '85px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: colors.cardSolid,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.pink} strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div style={{ fontSize: '22px', lineHeight: 1 }}>🧡</div>
            <div style={{ fontSize: '11px', color: colors.textMuted }}>
              {partnerProfile?.home_iata || ''}
            </div>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, padding: '0 20px', position: 'relative', zIndex: 10 }}>

        {/* PLAN TAB - trip cards */}
        {activeTab === 'home' && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease' }}>
            

            {/* Trip list — the core of the new model */}
            <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textMuted, marginBottom: '14px', fontWeight: '500' }}>
              Your trips
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted, fontSize: '14px' }}>
                Loading...
              </div>
            )}

            {!loading && trips.length === 0 && (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>✈️</div>
                <div style={{ color: colors.textMuted, fontSize: '14px' }}>
                  No trips yet. Your next adventure starts here.
                </div>
              </div>
            )}

            {trips.map((trip, i) => {
              const agg = tripAgg[trip.id] || {}
              const spent = Math.round(agg.spent || 0)
              const budget = trip.budget_total != null ? Number(trip.budget_total) : null
              const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
              const sym = CURR_SYMBOLS[trip.destination_currency] || trip.destination_currency || ''
              const barColor = pct >= 100 ? '#EF4444' : pct >= 80 ? '#FBBF24' : `linear-gradient(90deg, ${colors.pink}, ${colors.primary})`
              const pill = statusPill(agg)
              const destLabel = cleanDestName(trip.destination_name) || ''
              return (
                <div
                  key={trip.id}
                  className="glass-card"
                  onClick={() => navigate(`/trip/${trip.id}`)}
                  style={{
                    position: 'relative', overflow: 'hidden', padding: 0,
                    marginBottom: '12px', cursor: 'pointer', minHeight: '170px',
                    animation: `fadeSlideUp 0.4s ease ${i * 0.05}s forwards`, opacity: 0,
                  }}
                >
                  {/* Photo background + overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: trip.destination_photo_url
                      ? `url(${trip.destination_photo_url}) center/cover no-repeat`
                      : `linear-gradient(135deg, rgba(124,106,239,0.3) 0%, rgba(244,114,182,0.2) 100%)`,
                  }} />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(26,27,38,0.97) 0%, rgba(26,27,38,0.82) 45%, rgba(26,27,38,0.4) 100%)',
                  }} />

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id) }}
                    style={{
                      position: 'absolute', top: '10px', right: '12px', zIndex: 2,
                      background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%',
                      width: '26px', height: '26px', color: 'rgba(255,255,255,0.7)',
                      cursor: 'pointer', fontSize: '16px', lineHeight: 1,
                    }}
                  >
                    ×
                  </button>

                  {/* Content */}
                  <div style={{ position: 'relative', zIndex: 1, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: '170px', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: colors.text, marginBottom: '2px' }}>
                      {trip.country_emoji} {trip.trip_name || destLabel || 'Untitled trip'}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '12px' }}>
                      {destLabel}{destLabel && (trip.dates_from || trip.dates_to) ? ' · ' : ''}{fmtDate(trip.dates_from)} → {fmtDate(trip.dates_to)}
                    </div>

                    {/* Budget progress — anchored to destination_currency */}
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

                    {/* Footer: avatars + reservations + status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex' }}>
                          {myAvatar ? (
                            <img src={myAvatar} style={{ width: '24px', height: '24px', borderRadius: '50%', border: `1.5px solid ${colors.cyan}`, objectFit: 'cover' }} alt="you" />
                          ) : (
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.cyan}, ${colors.primary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#fff' }}>{myName[0]}</div>
                          )}
                          {partnerProfile && (
                            <div style={{ marginLeft: '-7px' }}>
                              {partnerProfile.avatar_url ? (
                                <img src={partnerProfile.avatar_url} style={{ width: '24px', height: '24px', borderRadius: '50%', border: `1.5px solid ${colors.pink}`, objectFit: 'cover' }} alt="partner" />
                              ) : (
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.pink}, ${colors.primary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#fff' }}>{partnerName?.[0] || '?'}</div>
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
                style={{ 
                  width: '100%',
                  marginTop: '16px',
                  padding: '16px',
                  background: colors.cardSolid,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '16px',
                  color: colors.text,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '20px' }}>🔗</span>
                Connect your partner
              </button>
            )}

            {/* Add-trip FAB (stub — the new-trip flow is a later phase) */}
            <button
              onClick={() => setShowAddTrip(true)}
              aria-label="Add trip"
              style={{
                position: 'fixed', bottom: '96px', right: 'max(20px, calc(50% - 215px + 20px))', zIndex: 90,
                width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${colors.pink}, ${colors.primary})`,
                boxShadow: '0 8px 28px rgba(124,106,239,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Plus size={26} color="#fff" />
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
        )}


        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease', textAlign: 'center', paddingTop: '40px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '16px',
              background: colors.cardSolid,
              border: `1px solid ${colors.border}`,
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" size={28} color={colors.pink} />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>Booking Checklist</div>
            <div style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '32px', lineHeight: '1.6', maxWidth: '280px', margin: '0 auto 32px' }}>
              Track Commit → Flights → Stay for both partners. Coming soon.
            </div>
            
            <div className="glass-card" style={{ padding: '20px', opacity: 0.6, maxWidth: '300px', margin: '0 auto' }}>
              {['Commit to trip', 'Book flights', 'Book stay'].map((step, i) => (
                <div 
                  key={step} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '14px', 
                    padding: '14px 0', 
                    borderBottom: i < 2 ? `1px solid ${colors.border}` : 'none' 
                  }}
                >
                  <div style={{ 
                    width: '22px', 
                    height: '22px', 
                    borderRadius: '50%', 
                    border: `1.5px solid ${colors.border}`, 
                    flexShrink: 0 
                  }} />
                  <div style={{ fontSize: '14px', color: colors.textMuted }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease' }}>
            <div 
              className="glass-card"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                marginBottom: '24px', 
                padding: '20px'
              }}
            >
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => document.getElementById('avatar-upload').click()}>
                {myAvatar ? (
                  <img src={myAvatar} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} alt="you" />
                ) : (
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    background: `linear-gradient(135deg, ${colors.cyan}, ${colors.primary})`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '22px', 
                    fontWeight: '600', 
                    color: 'white'
                  }}>
                    {myName[0]}
                  </div>
                )}
                <div style={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  right: 0, 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  background: colors.pink, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '10px' 
                }}>
                  📷
                </div>
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '600', color: colors.text }}>
                  {session?.user?.user_metadata?.full_name || myName}
                </div>
                <div style={{ fontSize: '13px', color: colors.textMuted }}>{session?.user?.email}</div>
                {uploadingAvatar && (
                  <div style={{ fontSize: '11px', color: colors.pink, marginTop: '4px' }}>Uploading...</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                { label: 'Partner Sync', value: partnerProfile ? `Connected to ${partnerName}` : 'Not connected', action: () => navigate('/connect') },
              ].map(item => (
                <div
                  key={item.label}
                  onClick={item.action}
                  className="glass-card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    cursor: item.action ? 'pointer' : 'default'
                  }}
                >
                  <div style={{ fontSize: '14px', color: colors.text }}>{item.label}</div>
                  <div style={{ fontSize: '13px', color: colors.textMuted }}>
                    {item.value} {item.action ? '→' : ''}
                  </div>
                </div>
              ))}
              <div
                className="glass-card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}
              >
                <div style={{ fontSize: '14px', color: colors.text }}>Subscription</div>
                {myProfile?.is_pro ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: colors.bg,
                      background: `linear-gradient(135deg, ${colors.pink}, ${colors.primary})`,
                      padding: '3px 10px',
                      borderRadius: '100px',
                    }}>Pro</span>
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
                      style={{ fontSize: '13px', color: colors.primary, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Manage →
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: colors.textMuted }}>Free tier</div>
                )}
              </div>
            </div>


            <button
              onClick={() => setShowFeedback(true)}
              style={{
                background: 'none', border: 'none', color: colors.textMuted,
                fontSize: '13px', cursor: 'pointer', padding: '8px 0',
                width: '100%', textAlign: 'center', marginBottom: '12px',
              }}
            >
              Share feedback
            </button>

            <button
              onClick={() => supabase.auth.signOut().then(() => { localStorage.removeItem('roamie_paid'); navigate('/') })}
              style={{ 
                width: '100%', 
                padding: '16px', 
                background: 'none', 
                border: `1px solid ${colors.border}`, 
                borderRadius: '100px', 
                color: colors.textMuted, 
                fontSize: '14px', 
                cursor: 'pointer'
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Feedback modal */}
      {showFeedback && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 16px 32px',
          }}
          onClick={() => setShowFeedback(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '430px', background: colors.cardSolid,
              border: `1px solid ${colors.border}`, borderRadius: '24px', padding: '24px',
            }}
          >
            <div style={{ fontSize: '17px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>Share feedback</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>Something isn't working</label>
                <textarea
                  value={feedbackBug}
                  onChange={e => setFeedbackBug(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={3}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, color: colors.text, fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>I wish Roamie could...</label>
                <textarea
                  value={feedbackFeature}
                  onChange={e => setFeedbackFeature(e.target.value)}
                  placeholder="Share your idea..."
                  rows={3}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, color: colors.text, fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            </div>
            {feedbackSent ? (
              <div style={{ textAlign: 'center', color: '#34D399', fontSize: '14px', padding: '12px 0' }}>✓ Thanks for the feedback!</div>
            ) : (
              <button
                onClick={submitFeedback}
                disabled={!feedbackBug.trim() && !feedbackFeature.trim()}
                style={{ width: '100%', padding: '14px', background: `linear-gradient(135deg, ${colors.pink}, ${colors.primary})`, border: 'none', borderRadius: '100px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: feedbackBug.trim() || feedbackFeature.trim() ? 'pointer' : 'default', opacity: feedbackBug.trim() || feedbackFeature.trim() ? 1 : 0.4 }}
              >
                Submit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom nav - Moonly style */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: '50%', 
        transform: 'translateX(-50%)', 
        width: '100%', 
        maxWidth: '430px', 
        background: 'rgba(26, 27, 38, 0.95)', 
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${colors.border}`, 
        padding: '12px 8px 0',
        paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        zIndex: 100 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around',
          background: colors.cardSolid,
          borderRadius: '20px',
          padding: '8px',
          margin: '0 12px'
        }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
  if (item.id === 'home') {
    navigate('/dashboard')
  } else if (item.id === 'scrapbook') {
    navigate('/scrapbook')
  } else {
    setActiveTab(item.id)
  }
}}
                style={{ 
                  background: 'none', 
                  border: isActive ? `1.5px solid ${colors.pink}` : '1.5px solid transparent',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '4px', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? `0 0 20px ${colors.pink}40` : 'none'
                }}
              >
                <Icon path={item.icon} size={20} color={isActive ? colors.pink : colors.textMuted} />
                <div style={{ 
                  fontSize: '10px', 
                  color: isActive ? colors.pink : colors.textMuted, 
                  fontWeight: isActive ? '600' : '400', 
                  letterSpacing: '0.03em' 
                }}>
                  {item.label}
                </div>
                {isActive && (
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: colors.pink,
                    marginTop: '2px'
                  }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}