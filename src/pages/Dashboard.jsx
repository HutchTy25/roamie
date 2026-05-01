import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [partnerProfile, setPartnerProfile] = useState(null)
  const [coupleLoading, setCoupleLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [customAvatar, setCustomAvatar] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

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
  }, [session])

  async function fetchData() {
    try {
      const [tripsResult, profileResult] = await Promise.all([
        supabase.from('trips').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
      ])
      if (tripsResult.data) setTrips(tripsResult.data)
      if (profileResult.data?.avatar_url) setCustomAvatar(profileResult.data.avatar_url)
      if (profileResult.data?.couple_id) {
        const { data: couple } = await supabase
          .from('couples').select('*').eq('id', profileResult.data.couple_id).single()
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

  const upcomingTrip = trips.find(t => t.dates_from && new Date(t.dates_from) > new Date())
  const daysUntil = upcomingTrip
    ? Math.ceil((new Date(upcomingTrip.dates_from) - new Date()) / (1000 * 60 * 60 * 24))
    : null
  const myName = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'You'
  const myAvatar = customAvatar || session?.user?.user_metadata?.avatar_url
  const partnerName = partnerProfile?.full_name?.split(' ')[0] || null

  // SVG Icon component
  const Icon = ({ path, size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )

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
      {/* Global styles */}
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
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
              <div style={{ marginLeft: '-12px', zIndex: 1 }}>
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
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '52px', 
              height: '52px', 
              borderRadius: '16px', 
              background: colors.cardSolid,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.cyan} strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>Memphis</div>
            <div style={{ fontSize: '11px', color: colors.textMuted }}>TN, USA</div>
          </div>

          {/* Connection line with distance */}
          <div style={{ flex: 1, padding: '0 16px', position: 'relative' }}>
            <div style={{ 
              height: '3px', 
              background: `linear-gradient(90deg, ${colors.cyan}, ${colors.pink})`,
              borderRadius: '2px',
              boxShadow: `0 0 12px ${colors.cyan}`
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
              4,347 mi
            </div>
          </div>

          {/* Manchester location */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '52px', 
              height: '52px', 
              borderRadius: '16px', 
              background: colors.cardSolid,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.pink} strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>Manchester</div>
            <div style={{ fontSize: '11px', color: colors.textMuted }}>UK</div>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, padding: '0 20px', position: 'relative', zIndex: 10 }}>

        {/* HOME TAB - Moon Odyssey + Love in Miles */}
        {activeTab === 'home' && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease' }}>
            
            {/* Moon Odyssey Card */}
            <div className="glass-card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.text, margin: 0 }}>The Moon Odyssey</h3>
                  <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0 0' }}>Our Time Together</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: colors.pink }}>10%</div>
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
                      top: '50%',
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: `repeating-linear-gradient(90deg, ${colors.pink} 0, ${colors.pink} 4px, transparent 4px, transparent 8px)`,
                      opacity: 0.6
                    }} />
                    {/* Rocket at 10% */}
                    <div style={{
                      position: 'absolute',
                      left: '10%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '20px'
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
                  <div style={{ fontSize: '24px', fontWeight: '700', color: colors.text }}>893</div>
                  <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days</div>
                </div>
                <div style={{ fontSize: '20px', color: colors.textMuted }}>=</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: colors.pink }}>10%</div>
                  <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>To Moon</div>
                </div>
              </div>
            </div>

            {/* Love in Miles Card */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.text, margin: 0 }}>Love in Miles</h3>
                  <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0 0' }}>Conquered Distance</p>
                </div>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: colors.cardSolid,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.pink} strokeWidth="1.5" style={{ transform: 'rotate(-45deg)' }}>
                    <path d="M12 19l9-7-9-7v14zM3 12h9"/>
                  </svg>
                </div>
              </div>

              {/* Big miles number */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ 
                  fontSize: '48px', 
                  fontWeight: '700', 
                  background: `linear-gradient(135deg, ${colors.pink}, ${colors.primary})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-2px'
                }}>
                  147,798
                </div>
                <div style={{ fontSize: '13px', color: colors.textMuted }}>Total Miles Flown</div>
              </div>

              {/* Flight path visualization */}
              <div style={{ 
                background: colors.cardSolid, 
                borderRadius: '12px', 
                padding: '16px',
                marginBottom: '20px',
                position: 'relative'
              }}>
                <svg viewBox="0 0 300 60" style={{ width: '100%', height: '60px' }}>
                  <path 
                    d="M 20 50 Q 150 10 280 50" 
                    fill="none" 
                    stroke={colors.pink}
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />
                  <circle cx="20" cy="50" r="6" fill={colors.pink} />
                  <circle cx="280" cy="50" r="6" fill={colors.cyan} />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: colors.textMuted }}>MEM</span>
                  <span style={{ fontSize: '12px', color: colors.textMuted }}>MAN</span>
                </div>
              </div>

              {/* Year bars */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
                {[
                  { year: '2023', trips: 4 },
                  { year: '2024', trips: 6 },
                  { year: '2025', trips: 5 },
                  { year: '2026', trips: 2 },
                ].map(item => (
                  <div key={item.year} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>{item.trips}</div>
                    <div style={{ 
                      width: '36px', 
                      height: `${item.trips * 12}px`,
                      background: `linear-gradient(180deg, ${colors.primary}, ${colors.pink})`,
                      borderRadius: '8px 8px 4px 4px',
                      opacity: item.year === '2026' ? 0.5 : 1
                    }} />
                    <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '8px' }}>{item.year}</div>
                  </div>
                ))}
              </div>

              {/* Stats row */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                gap: '20px',
                paddingTop: '16px',
                borderTop: `1px solid ${colors.border}`
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>17</div>
                  <div style={{ fontSize: '11px', color: colors.textMuted }}>Trips</div>
                </div>
                <div style={{ width: '1px', background: colors.border }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: colors.pink }}>34</div>
                  <div style={{ fontSize: '11px', color: colors.textMuted }}>Flights</div>
                </div>
                <div style={{ width: '1px', background: colors.border }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: colors.cyan }}>Since '23</div>
                  <div style={{ fontSize: '11px', color: colors.textMuted }}>Together</div>
                </div>
              </div>
            </div>

            {/* Upcoming trip or CTA */}
            {upcomingTrip && (
              <div className="glass-card" style={{ padding: '20px', marginTop: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Next Adventure</div>
                <div style={{ fontSize: '48px', fontWeight: '700', color: colors.text }}>{daysUntil}</div>
                <div style={{ fontSize: '13px', color: colors.textMuted }}>days until</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: colors.pink, marginTop: '8px' }}>
                  {upcomingTrip.destinations?.[0]?.name || 'your trip'}
                </div>
              </div>
            )}

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: colors.text, marginBottom: '4px' }}>
                      {trip.p1_city === trip.p2_city ? `${trip.p1_city} · Same city` : `${trip.p1_city} → ${trip.p2_city}`}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textMuted }}>
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
                      lineHeight: 1
                    }}
                  >
                    ×
                  </button>
                </div>
                
                {trip.destinations?.slice(0, 2).map(dest => (
                  <div 
                    key={dest.name} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '10px 12px', 
                      background: colors.cardSolid, 
                      borderRadius: '10px', 
                      marginBottom: '6px', 
                      fontSize: '13px' 
                    }}
                  >
                    <span style={{ color: colors.text }}>{dest.country_emoji} {dest.name}</span>
                    <span style={{ color: colors.pink, fontSize: '12px', fontWeight: '500' }}>
                      {trip.p1_currency === 'USD' ? '$' : trip.p1_currency}{dest.p1_cost?.toLocaleString()}
                    </span>
                  </div>
                ))}
                
                <button 
                  onClick={() => navigate('/quiz', { state: { prefill: trip } })} 
                  style={{ 
                    marginTop: '12px', 
                    width: '100%',
                    padding: '10px',
                    background: 'none', 
                    border: `1px solid ${colors.border}`, 
                    borderRadius: '100px', 
                    color: colors.textMuted, 
                    fontSize: '12px', 
                    cursor: 'pointer'
                  }}
                >
                  Plan again with same cities →
                </button>
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
                { label: 'Subscription', value: 'Free tier', action: null },
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
            </div>

            <button 
              onClick={() => supabase.auth.signOut().then(() => navigate('/'))} 
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
        padding: '12px 8px 28px',
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