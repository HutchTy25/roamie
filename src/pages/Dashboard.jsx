import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

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
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [partnerProfile, setPartnerProfile] = useState(null)
  const [coupleLoading, setCoupleLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [customAvatar, setCustomAvatar] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [myProfile, setMyProfile] = useState(null)
  const [ambientGlow, setAmbientGlow] = useState(getAmbientGlow())
  const [partnerWeather, setPartnerWeather] = useState(null)

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
    { id: 'orbit', label: 'Orbit', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'saved', label: 'Saved', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
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

      if (profile?.couple_id) {
        const { data: couple } = await supabase
          .from('couples').select('*').eq('id', profile.couple_id).single()
        if (couple?.status === 'connected') {
          const partnerId = couple.partner1_id === session.user.id ? couple.partner2_id : couple.partner1_id
          const { data: partner } = await supabase
            .from('profiles').select('*').eq('id', partnerId).single()
          setPartnerProfile(partner)
          fetchPartnerWeather(partner)
        }
      }
    } catch (e) {
      console.error('Fetch data error:', e)
    } finally {
      setLoading(false)
      setCoupleLoading(false)
    }
  }

  async function fetchPartnerWeather(profile) {
    if (!profile?.home_city) return
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(profile.home_city)}&appid=${import.meta.env.VITE_OPENWEATHER_KEY}&units=metric`)
      const data = await res.json()
      if (data.cod === 200) setPartnerWeather(data)
    } catch (e) {
      console.error('Weather fetch error:', e)
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

  const CURR_SYMBOLS = {
    USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$',
    NZD: 'NZ$', JPY: '¥', CNY: '¥', KRW: '₩', PHP: '₱',
    IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫', SGD: 'S$',
    INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵',
    KES: 'KSh', ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼',
    BRL: 'R$', MXN: 'MX$', COP: 'COL$', ARS: 'AR$', CLP: 'CL$',
  }

  const upcomingTrip = trips.find(t => t.dates_from && new Date(t.dates_from) > new Date())
  const daysUntil = upcomingTrip
    ? Math.ceil((new Date(upcomingTrip.dates_from) - new Date()) / (1000 * 60 * 60 * 24))
    : null
  const myName = myProfile?.display_name || session?.user?.user_metadata?.full_name?.split(' ')[0] || 'You'
  const myAvatar = customAvatar || session?.user?.user_metadata?.avatar_url
  const partnerName = partnerProfile?.display_name || partnerProfile?.full_name?.split(' ')[0] || null
  const relationshipDays = myProfile?.relationship_start_date
  ? Math.floor((new Date() - new Date(myProfile.relationship_start_date)) / (1000 * 60 * 60 * 24))
  : null
const moonPercent = relationshipDays ? Math.min(Math.round((relationshipDays / 8878) * 100), 100) : null

  // SVG Icon component
  const Icon = ({ path, size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )

  const partnerLocalHour = partnerWeather
    ? new Date((partnerWeather.dt + partnerWeather.timezone) * 1000).getUTCHours()
    : null
  const timeGlow = partnerLocalHour == null ? 'rgba(99,102,241,0.4)'
    : partnerLocalHour >= 5 && partnerLocalHour < 8 ? 'rgba(251,146,60,0.4)'
    : partnerLocalHour >= 8 && partnerLocalHour < 18 ? 'rgba(96,165,250,0.4)'
    : partnerLocalHour >= 18 && partnerLocalHour < 20 ? 'rgba(192,132,252,0.4)'
    : 'rgba(99,102,241,0.4)'

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
      {partnerWeather && <div style={{ position: "fixed", inset: 0, background: `radial-gradient(ellipse 70% 40% at 50% 0%, ${timeGlow.replace('0.4', '0.10')} 0%, transparent 60%)`, pointerEvents: "none", zIndex: 1 }} />}

      {/* Global styles */}
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.6} }
        @keyframes twinkle { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes pulseGlow { 0%,100%{box-shadow: 0 0 20px rgba(124,106,239,0.3)} 50%{box-shadow: 0 0 40px rgba(124,106,239,0.5)} }
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

        {/* HOME TAB - Moon Odyssey + Love in Miles */}
        {activeTab === 'home' && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease' }}>
            
            {/* Committed Trip Countdown */}
            {trips.find(t => t.committed) && (() => {
  const committedTrip = trips.find(t => t.committed)
  const daysUntilCommitted = committedTrip.dates_from
    ? Math.ceil((new Date(committedTrip.dates_from) - new Date()) / (1000 * 60 * 60 * 24))
    : null
  return (
    <div className="glass-card" style={{ padding: '20px', marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', textAlign: 'center' }}>🚀 Next Adventure</div>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '56px', fontWeight: '700', background: `linear-gradient(135deg, ${colors.pink}, ${colors.primary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {daysUntilCommitted > 0 ? daysUntilCommitted : '🎉'}
        </div>
        <div style={{ fontSize: '13px', color: colors.textMuted }}>
          {daysUntilCommitted > 0 ? 'days until' : 'trip time!'}
        </div>
        <div style={{ fontSize: '18px', fontWeight: '600', color: colors.pink, marginTop: '8px' }}>
          {committedTrip.country_emoji} {cleanDestName(committedTrip.destination_name) || `${committedTrip.p1_city} → ${committedTrip.p2_city}`}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{committedTrip.dates_from}</div>
          <div style={{ fontSize: '11px', color: colors.textMuted }}>Departure</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{committedTrip.dates_to}</div>
          <div style={{ fontSize: '11px', color: colors.textMuted }}>Return</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: colors.cyan }}>{committedTrip.p1_city} → {committedTrip.p2_city}</div>
          <div style={{ fontSize: '11px', color: colors.textMuted }}>Route</div>
        </div>
      </div>
      <button
        onClick={async () => {
          await supabase.from('trips').update({ committed: false, committed_at: null }).eq('id', committedTrip.id)
          setTrips(prev => prev.map(t => t.id === committedTrip.id ? { ...t, committed: false, committed_at: null } : t))
        }}
        style={{
          display: 'block',
          width: '100%',
          marginTop: '12px',
          padding: '8px',
          background: 'none',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '100px',
          color: 'rgba(239, 68, 68, 0.6)',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        Remove from planning
      </button>
    </div>
  )
})()}

            {/* Moon Odyssey Card */}
            <div className="glass-card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.text, margin: 0 }}>The Moon Odyssey</h3>
                  <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0 0' }}>Our Time Together</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: colors.pink }}>{moonPercent ? `${moonPercent}%` : '—'}</div>  
                  <div style={{ fontSize: '11px', color: colors.textMuted }}>to the Moon</div>
                </div>
              </div>

              {/* Earth to Moon visualization */}
              <div style={{ 
                background: colors.cardSolid, 
                borderRadius: '16px', 
                padding: '24px 16px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Stars */}
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: '2px',
                    height: '2px',
                    background: 'white',
                    borderRadius: '50%',
                    left: `${10 + i * 12}%`,
                    top: `${20 + (i % 3) * 25}%`,
                    opacity: 0.4,
                    animation: `twinkle ${2 + i * 0.3}s ease-in-out infinite`
                  }} />
                ))}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Earth */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #22D3EE 0%, #34D399 50%, #22D3EE 100%)',
                      boxShadow: '0 0 24px rgba(34, 211, 238, 0.4)',
                      position: 'relative'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '30%',
                        width: '12px',
                        height: '8px',
                        background: 'rgba(255,255,255,0.3)',
                        borderRadius: '50%',
                        transform: 'translateY(-50%)'
                      }} />
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '8px' }}>Earth</div>
                  </div>

                  {/* Flight path with rocket */}
<div style={{ flex: 1, position: 'relative', height: '40px', margin: '0 16px' }}>
  <div style={{
    position: 'absolute',
    left: `${moonPercent || 0}%`,
    top: '50%',
    transform: 'translate(-50%, -50%) rotate(45deg)',
    fontSize: '24px',
    filter: 'drop-shadow(0 0 8px rgba(244,114,182,0.6))',
  }}>
    🚀
  </div>
</div>

                  {/* Moon */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #E5E5E5 0%, #9CA3AF 100%)',
                      boxShadow: '0 0 20px rgba(156, 163, 175, 0.3)',
                      position: 'relative'
                    }}>
                      {/* Craters */}
                      {[
                        { top: '20%', left: '25%', size: '8px' },
                        { top: '50%', left: '60%', size: '6px' },
                        { top: '70%', left: '35%', size: '5px' },
                      ].map((crater, i) => (
                        <div key={i} style={{
                          position: 'absolute',
                          top: crater.top,
                          left: crater.left,
                          width: crater.size,
                          height: crater.size,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.1)'
                        }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '8px' }}>Moon</div>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '24px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: `1px solid ${colors.border}`
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: colors.text }}>{relationshipDays || '—'}</div>
                  <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days</div>
                </div>
                <div style={{ fontSize: '20px', color: colors.textMuted }}>=</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: colors.pink }}>{moonPercent ? `${moonPercent}%` : '—'}</div>
                  <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>To Moon</div>
                </div>
              </div>
            </div>

            {/* Partner Weather Card */}
            {(() => {
              const weatherCondition = () => {
                if (!partnerWeather) return null
                const id = partnerWeather.weather[0].id
                const icon = partnerWeather.weather[0].icon
                if (icon.includes('n')) return { label: 'Clear Night', emoji: '🌙', gradient: 'rgba(99,102,241,0.1)', iconBg: 'linear-gradient(135deg, #818CF8, #6366F1)', glow: 'rgba(99,102,241,0.4)' }
                if (id >= 200 && id < 300) return { label: 'Stormy', emoji: '⛈️', gradient: 'rgba(99,102,241,0.12)', iconBg: 'linear-gradient(135deg, #6366F1, #4F46E5)', glow: 'rgba(99,102,241,0.4)' }
                if (id >= 300 && id < 600) return { label: 'Rainy', emoji: '🌧️', gradient: 'rgba(96,165,250,0.12)', iconBg: 'linear-gradient(135deg, #60A5FA, #3B82F6)', glow: 'rgba(96,165,250,0.4)' }
                if (id >= 600 && id < 700) return { label: 'Snowy', emoji: '❄️', gradient: 'rgba(186,230,253,0.12)', iconBg: 'linear-gradient(135deg, #E0F2FE, #BAE6FD)', glow: 'rgba(186,230,253,0.4)' }
                if (id >= 700 && id < 800) return { label: 'Foggy', emoji: '🌫️', gradient: 'rgba(148,163,184,0.1)', iconBg: 'linear-gradient(135deg, #94A3B8, #64748B)', glow: 'rgba(148,163,184,0.3)' }
                if (id === 800) return { label: 'Sunny', emoji: '☀️', gradient: 'rgba(251,191,36,0.15)', iconBg: 'linear-gradient(135deg, #FCD34D, #F59E0B)', glow: 'rgba(251,191,36,0.4)' }
                return { label: 'Cloudy', emoji: '☁️', gradient: 'rgba(148,163,184,0.1)', iconBg: 'linear-gradient(135deg, #94A3B8, #64748B)', glow: 'rgba(148,163,184,0.3)' }
              }
              const wc = weatherCondition()
              const partnerLocalTime = partnerWeather
                ? new Date(Date.now() + partnerWeather.timezone * 1000).toUTCString().match(/(\d+:\d+)/)?.[1]
                : null
              return partnerProfile ? (
                <div className="glass-card" style={{ padding: '20px', marginBottom: '16px', position: 'relative', overflow: 'hidden', boxShadow: `0 0 80px ${timeGlow}, 0 0 32px ${timeGlow}` }}>
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 65% 0%, ${timeGlow.replace('0.4', '0.3')} 0%, transparent 65%), radial-gradient(ellipse at 20% 100%, ${timeGlow.replace('0.4', '0.12')} 0%, transparent 50%)`, pointerEvents: 'none' }} />
                  {wc && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 70% 20%, ${wc.gradient} 0%, transparent 50%)`, pointerEvents: 'none' }} />}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <p style={{ fontSize: '13px', color: colors.pink, fontWeight: '500', marginBottom: '4px' }}>{partnerName}'s weather</p>
                        <h3 style={{ fontSize: '22px', fontWeight: '600', color: colors.text, margin: 0 }}>{partnerProfile.home_city}</h3>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>Local time</p>
                        <p style={{ fontSize: '16px', fontWeight: '500', color: colors.text }}>{partnerLocalTime || '--:--'}</p>
                      </div>
                    </div>
                    {wc ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: wc.iconBg, boxShadow: `0 0 20px ${wc.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                          {wc.emoji}
                        </div>
                        <div>
                          <p style={{ fontSize: '16px', fontWeight: '500', color: colors.text, marginBottom: '2px' }}>{wc.label}</p>
                          <p style={{ fontSize: '13px', color: colors.textMuted }}>{Math.round(partnerWeather.main.temp)}°C · feels like {Math.round(partnerWeather.main.feels_like)}°C</p>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '13px', color: colors.textMuted }}>Loading weather...</p>
                    )}
                  </div>
                </div>
              ) : null
            })()}

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
          </div>
        )}

        {/* SAVED TRIPS TAB */}
        {activeTab === 'saved' && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease' }}>
            <div style={{ 
              fontSize: '11px', 
              letterSpacing: '0.12em', 
              textTransform: 'uppercase', 
              color: colors.textMuted, 
              marginBottom: '16px', 
              fontWeight: '500' 
            }}>
              Saved trips
            </div>
            
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted, fontSize: '14px' }}>
                Loading...
              </div>
            )}
            
            {!loading && trips.length === 0 && (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>✈️</div>
                <div style={{ color: colors.textMuted, fontSize: '14px' }}>
                  No saved trips yet. Plan your first one!
                </div>
              </div>
            )}
            
            {trips.map((trip, i) => (
              <div 
                key={trip.id} 
                className="glass-card"
                style={{ 
                  padding: '16px', 
                  marginBottom: '12px', 
                  animation: `fadeSlideUp 0.4s ease ${i * 0.05}s forwards`, 
                  opacity: 0 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '17px', fontWeight: '600', color: colors.text, marginBottom: '4px' }}>
                      {trip.country_emoji} {cleanDestName(trip.destination_name) || `${trip.p1_city} → ${trip.p2_city}`}
                    </div>
                    {trip.tagline && (
                      <div style={{ fontSize: '12px', color: colors.textMuted, lineHeight: '1.5', marginBottom: '4px' }}>
                        {trip.tagline}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: colors.textMuted }}>
                      {trip.dates_from} · {trip.vibes?.join(', ')}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTrip(trip.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.textMuted,
                      cursor: 'pointer',
                      fontSize: '20px',
                      padding: '0',
                      lineHeight: 1,
                      flexShrink: 0,
                      marginLeft: '8px',
                    }}
                  >
                    ×
                  </button>
                </div>

                {(trip.p1_cost != null || trip.p2_cost != null) && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    {trip.p1_cost != null && (
                      <div style={{
                        flex: 1,
                        background: 'rgba(244,114,182,0.1)',
                        border: '1px solid rgba(244,114,182,0.25)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '12px',
                      }}>
                        <span style={{ color: colors.textMuted, marginRight: '4px' }}>P1</span>
                        <span style={{ color: colors.pink, fontWeight: '600', fontSize: '14px' }}>
                          {CURR_SYMBOLS[trip.p1_currency] || trip.p1_currency}{trip.p1_cost?.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {trip.p2_cost != null && (
                      <div style={{
                        flex: 1,
                        background: 'rgba(124,106,239,0.1)',
                        border: '1px solid rgba(124,106,239,0.25)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '12px',
                      }}>
                        <span style={{ color: colors.textMuted, marginRight: '4px' }}>P2</span>
                        <span style={{ color: colors.primary, fontWeight: '600', fontSize: '14px' }}>
                          {CURR_SYMBOLS[trip.p2_currency] || trip.p2_currency}{trip.p2_cost?.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
  <button
    onClick={async () => {
      if (trip.committed) return
      await supabase.from('trips').update({ committed: true, committed_at: new Date().toISOString() }).eq('id', trip.id)
      setTrips(trips.map(t => t.id === trip.id ? { ...t, committed: true, committed_at: new Date().toISOString() } : t))
    }}
    style={{
      width: '100%', padding: '10px',
      background: trip.committed ? 'rgba(52,211,153,0.1)' : `linear-gradient(135deg, ${colors.pink}, ${colors.primary})`,
      border: trip.committed ? '1px solid rgba(52,211,153,0.3)' : 'none',
      borderRadius: '100px',
      color: trip.committed ? '#34D399' : '#fff',
      fontSize: '12px', fontWeight: '600',
      cursor: trip.committed ? 'default' : 'pointer',
    }}
  >
    {trip.committed ? '✅ Trip committed' : '🚀 Commit to this trip'}
  </button>
  <button
    onClick={() => navigate('/quiz', { state: { prefill: trip } })}
    style={{
      width: '100%', padding: '10px',
      background: 'none',
      border: `1px solid ${colors.border}`,
      borderRadius: '100px',
      color: colors.textMuted,
      fontSize: '12px', cursor: 'pointer'
    }}
  >
    Plan again with same cities →
  </button>
</div> 
              </div>
            ))}
          </div>
        )}

        {/* ORBIT TAB */}
        {activeTab === 'orbit' && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease', textAlign: 'center', paddingTop: '40px' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.pink})`,
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 40px ${colors.primary}40`,
              animation: 'pulseGlow 3s ease-in-out infinite'
            }}>
              <span style={{ fontSize: '32px' }}>🪐</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>Your Orbit</div>
            <div style={{ fontSize: '14px', color: colors.textMuted, lineHeight: '1.6', maxWidth: '280px', margin: '0 auto' }}>
              A shared space for trip ideas, restaurants, and date plans. Coming soon.
            </div>
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
    navigate('/quiz')
  } else if (item.id === 'orbit') {
    navigate('/orbit')
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