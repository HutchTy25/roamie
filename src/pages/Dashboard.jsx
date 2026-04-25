import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const accent = '#FF6B35'
  const purple = '#9c7ec4'

  useEffect(() => {
    if (!session) { navigate('/login'); return }
    fetchTrips()
  }, [session])

  async function fetchTrips() {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      setTrips(data || [])
    } catch (e) {
      console.error('Fetch trips error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function deleteTrip(id) {
    await supabase.from('trips').delete().eq('id', id)
    setTrips(trips.filter(t => t.id !== id))
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '2rem 1.5rem',
      maxWidth: '520px',
      margin: '0 auto',
    }}>
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: accent, marginBottom: '4px', fontWeight: '500' }}>
            ✦ Your dashboard
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', color: 'var(--text-primary)' }}>
            {session?.user?.user_metadata?.full_name?.split(' ')[0] || 'Hey'} 👋
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <img
            src={session?.user?.user_metadata?.avatar_url}
            style={{ width: '32px', height: '32px', borderRadius: '50%' }}
            alt="avatar"
          />
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate('/'))}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/quiz')}
          style={{
            background: accent,
            border: 'none',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            color: '#0a0a0a',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          ✦ Plan new trip
        </button>
        <button
  onClick={() => navigate('/connect')}
  style={{
    background: 'var(--bg-card)',
    border: '1px solid rgba(156,126,196,0.3)',
    borderRadius: 'var(--radius)',
    padding: '1rem',
    fontSize: '13px',
    color: purple,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    cursor: 'pointer',
    textAlign: 'left',
  }}
>
<div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Connect your partner →</div>
        </button>
      </div>

      {/* Saved trips */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: '500' }}>
          Saved trips
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '14px' }}>
            Loading...
          </div>
        )}

        {!loading && trips.length === 0 && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '14px',
          }}>
            No saved trips yet. Plan your first one!
          </div>
        )}

        {trips.map((trip, i) => (
          <div
            key={trip.id}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '1.25rem',
              marginBottom: '10px',
              animation: `fadeSlideUp 0.4s ease ${i * 0.05}s forwards`,
              opacity: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>
  {trip.p1_city === trip.p2_city 
    ? `${trip.p1_city} · Same city` 
    : `${trip.p1_city} → ${trip.p2_city}`}
</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {trip.dates_from} · {trip.vibes?.join(', ')}
                </div>
              </div>
              <button
                onClick={() => deleteTrip(trip.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '0' }}
              >
                ×
              </button>
            </div>

            {/* Top destinations */}
            {trip.destinations?.slice(0, 2).map(dest => (
              <div key={dest.name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 10px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '4px',
                fontSize: '13px',
              }}>
                <span style={{ color: 'var(--text-primary)' }}>{dest.country_emoji} {dest.name}</span>
                <span style={{ color: accent, fontSize: '12px' }}>
                  {trip.p1_currency === 'USD' ? '$' : trip.p1_currency}{dest.p1_cost?.toLocaleString()}
                </span>
              </div>
            ))}

            <button
              onClick={() => navigate('/quiz', { state: { prefill: trip } })}
              style={{
                marginTop: '10px',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '100px',
                padding: '6px 16px',
                color: 'var(--text-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Plan again with same cities →
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '13px',
          cursor: 'pointer',
          marginTop: '1rem',
        }}
      >
        ← Back to home
      </button>
    </div>
  )
}