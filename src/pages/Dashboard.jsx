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
  const accent = '#FF6B35'
  const purple = '#9c7ec4'

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'plan', label: 'Plan', icon: '✨' },
    { id: 'orbit', label: 'Orbit', icon: '🪐' },
    { id: 'checklist', label: 'Checklist', icon: '✓' },
    { id: 'profile', label: 'You', icon: '👤' },
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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', maxWidth: '520px', margin: '0 auto', paddingBottom: '80px' }}>
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
      `}</style>

      {/* Header */}
      <div style={{ padding: '3rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '0.75rem' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => document.getElementById('avatar-upload').click()}>
            {myAvatar ? (
              <img src={myAvatar} style={{ width: '44px', height: '44px', borderRadius: '50%', border: `2px solid ${accent}`, objectFit: 'cover' }} alt="you" />
            ) : (
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,107,53,0.2)', border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '600', color: accent }}>
                {myName[0]}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
              📷
            </div>
            <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
          </div>

          <div style={{ fontSize: '32px', animation: 'pulse 2s infinite', color: accent }}>♥</div>

          {partnerProfile ? (
            <div>
              {partnerProfile.avatar_url ? (
                <img src={partnerProfile.avatar_url} style={{ width: '44px', height: '44px', borderRadius: '50%', border: `2px solid ${purple}`, objectFit: 'cover' }} alt="partner" />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(156,126,196,0.2)', border: `2px solid ${purple}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '600', color: purple }}>
                  {partnerName?.[0] || '?'}
                </div>
              )}
            </div>
          ) : (
            <div onClick={() => navigate('/connect')} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer' }}>
              +
            </div>
          )}
        </div>

        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
          {myName} {partnerName ? `♥ ${partnerName}` : ''}
        </div>
        {!coupleLoading && !partnerProfile && (
          <button onClick={() => navigate('/connect')} style={{ background: 'none', border: 'none', color: accent, fontSize: '13px', cursor: 'pointer', padding: 0 }}>
            + Connect your partner
          </button>
        )}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, padding: '0 1.5rem' }}>

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease' }}>
            {upcomingTrip ? (
              <div style={{ borderRadius: '24px', overflow: 'hidden', marginBottom: '1.5rem', height: '220px', background: 'linear-gradient(135deg, #1a0a05 0%, #2d1408 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem', fontWeight: '700', color: 'white', fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{daysUntil}</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>days until</div>
                <div style={{ fontSize: '18px', color: accent, fontWeight: '500', marginTop: '8px' }}>{upcomingTrip.destinations?.[0]?.name || 'your trip'}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{upcomingTrip.dates_from} → {upcomingTrip.dates_to}</div>
              </div>
            ) : (
              <div style={{ borderRadius: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✈️</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', marginBottom: '8px' }}>Your next adventure starts here</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {trips.length > 0 ? 'Pick up where you left off?' : 'Plan your first trip together'}
                </div>
              </div>
            )}

            {!coupleLoading && !partnerProfile && (
              <button onClick={() => navigate('/connect')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>🔗</div>
                Connect your partner
              </button>
            )}
          </div>
        )}

        {/* SAVED TRIPS TAB */}
        {activeTab === 'trips' && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: '500' }}>Saved trips</div>
            {loading && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>}
            {!loading && trips.length === 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No saved trips yet. Plan your first one!
              </div>
            )}
            {trips.map((trip, i) => (
              <div key={trip.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '10px', animation: `fadeSlideUp 0.4s ease ${i * 0.05}s forwards`, opacity: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {trip.p1_city === trip.p2_city ? `${trip.p1_city} · Same city` : `${trip.p1_city} → ${trip.p2_city}`}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{trip.dates_from} · {trip.vibes?.join(', ')}</div>
                  </div>
                  <button onClick={() => deleteTrip(trip.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '0' }}>×</button>
                </div>
                {trip.destinations?.slice(0, 2).map(dest => (
                  <div key={dest.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: '4px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{dest.country_emoji} {dest.name}</span>
                    <span style={{ color: accent, fontSize: '12px' }}>{trip.p1_currency === 'USD' ? '$' : trip.p1_currency}{dest.p1_cost?.toLocaleString()}</span>
                  </div>
                ))}
                <button onClick={() => navigate('/quiz', { state: { prefill: trip } })} style={{ marginTop: '10px', background: 'none', border: '1px solid var(--border)', borderRadius: '100px', padding: '6px 16px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', width: '100%' }}>
                  Plan again with same cities →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ORBIT TAB */}
        {activeTab === 'orbit' && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease', textAlign: 'center', paddingTop: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🪐</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', marginBottom: '8px' }}>Your Orbit</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '280px', margin: '0 auto' }}>
              A shared space for trip ideas, restaurants, and date plans. Coming soon.
            </div>
          </div>
        )}

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease', textAlign: 'center', paddingTop: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✓</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', marginBottom: '8px' }}>Booking checklist</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6', maxWidth: '280px', margin: '0 auto 2rem' }}>
              Track Commit → Flights → Stay for both partners. Coming soon.
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', opacity: 0.5 }}>
              {['Commit to trip', 'Book flights', 'Book stay'].map((step, i) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid var(--border)', flexShrink: 0 }} />
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '2rem', padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => document.getElementById('avatar-upload').click()}>
                {myAvatar ? (
                  <img src={myAvatar} style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover' }} alt="you" />
                ) : (
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,107,53,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '600', color: accent }}>
                    {myName[0]}
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '18px', height: '18px', borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                  📷
                </div>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>{session?.user?.user_metadata?.full_name || myName}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{session?.user?.email}</div>
                {uploadingAvatar && <div style={{ fontSize: '11px', color: accent, marginTop: '4px' }}>Uploading...</div>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '2rem' }}>
              {[
                { label: 'Partner Sync', value: partnerProfile ? `Connected to ${partnerName}` : 'Not connected', action: () => navigate('/connect') },
                { label: 'Subscription', value: 'Free tier', action: null },
              ].map(item => (
                <div key={item.label} onClick={item.action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: item.action ? 'pointer' : 'default' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{item.value} {item.action ? '→' : ''}</div>
                </div>
              ))}
            </div>

            <button onClick={() => supabase.auth.signOut().then(() => navigate('/'))} style={{ width: '100%', padding: '14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer' }}>
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '520px', background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-around', padding: '0.75rem 0 1.25rem', zIndex: 100 }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'plan') {
                navigate('/quiz')
              } else {
                setActiveTab(item.id)
              }
            }}
            style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '4px 16px' }}
          >
            <div style={{ fontSize: '20px' }}>{item.icon}</div>
            <div style={{ fontSize: '10px', color: activeTab === item.id ? accent : 'var(--text-muted)', fontWeight: activeTab === item.id ? '600' : '400', letterSpacing: '0.05em' }}>
              {item.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}