import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import posthog from 'posthog-js'

export default function Home({ session }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [tripCount, setTripCount] = useState(0)

  useEffect(() => {
    fetch('https://roamie-61ib.onrender.com/api/trip-count')
      .then(res => res.json())
      .then(data => setTripCount(data.count))
      .catch(() => {
        const count = parseInt(localStorage.getItem('roamie_trip_count') || '0')
        setTripCount(count)
      })
  }, [])

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  const accent = '#FF6B35'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        .start-btn:hover { opacity: 0.88; transform: scale(1.02); }
        .start-btn:active { transform: scale(0.98); }
        .feature-pill { transition: border-color 0.2s; }
        .feature-pill:hover { border-color: rgba(255,107,53,0.4) !important; }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(ellipse, rgba(255,107,53,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Floating dots */}
      <div style={{ position: 'absolute', top: '15%', left: '8%', width: '4px', height: '4px', borderRadius: '50%', background: accent, opacity: 0.3, animation: 'pulse 3s infinite' }} />
      <div style={{ position: 'absolute', top: '25%', right: '10%', width: '3px', height: '3px', borderRadius: '50%', background: '#9c7ec4', opacity: 0.3, animation: 'pulse 3s infinite 1s' }} />
      <div style={{ position: 'absolute', bottom: '30%', left: '12%', width: '3px', height: '3px', borderRadius: '50%', background: accent, opacity: 0.2, animation: 'pulse 3s infinite 2s' }} />

      {/* User bar */}
      {session ? (
        <div style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <img
            src={session.user.user_metadata?.avatar_url}
            style={{ width: '28px', height: '28px', borderRadius: '50%' }}
            alt="avatar"
          />
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      ) : (
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '100px',
              padding: '6px 14px',
              color: 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        </div>
      )}

      {/* Badge */}
      <div style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'fadeUp 0.6s ease forwards' : 'none',
        marginBottom: '1.5rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(255,107,53,0.1)',
        border: '1px solid rgba(255,107,53,0.25)',
        borderRadius: '100px',
        padding: '6px 14px',
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent, animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: '12px', color: accent, letterSpacing: '0.08em', fontWeight: '500' }}>Built for long distance couples</span>
      </div>

      {/* Main headline */}
      <div style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'fadeUp 0.6s ease 0.1s forwards' : 'none',
        textAlign: 'center',
        marginBottom: '1.25rem',
        maxWidth: '520px',
      }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(2.8rem, 9vw, 4.2rem)',
          fontWeight: '400',
          lineHeight: '1.05',
          margin: 0,
          color: '#f0ebe4',
        }}>
          Stop arguing<br />about where<br />
          <em style={{ color: accent }}>to go next.</em>
        </h1>
      </div>

      {/* Subheading */}
      <div style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'fadeUp 0.6s ease 0.2s forwards' : 'none',
        textAlign: 'center',
        marginBottom: '2rem',
        maxWidth: '380px',
      }}>
        <p style={{
          fontSize: '16px',
          color: '#8a8278',
          lineHeight: '1.7',
          margin: 0,
        }}>
          Put in both your budgets, your cities, your vibe — Roamie finds trips that actually work for both of you.
        </p>
      </div>

      {/* Feature pills */}
      <div style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'fadeUp 0.6s ease 0.3s forwards' : 'none',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: '2.5rem',
      }}>
        {[
          { icon: '💸', text: 'Two budgets, one plan' },
          { icon: '🌍', text: '30+ currencies' },
          { icon: '✈️', text: 'Flights from both cities' },
        ].map(p => (
          <div key={p.text} className="feature-pill" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '100px',
            padding: '7px 14px',
            fontSize: '13px',
            color: '#8a8278',
          }}>
            <span style={{ fontSize: '14px' }}>{p.icon}</span>
            {p.text}
          </div>
        ))}
      </div>

      {/* FaceTime line */}
      <div style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'fadeUp 0.6s ease 0.35s forwards' : 'none',
        fontSize: '13px',
        color: '#4a4642',
        marginBottom: '1rem',
        textAlign: 'center',
      }}>
        Fill it out together on your next FaceTime 🤙
      </div>

      {/* CTA Button */}
      <div style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'fadeUp 0.6s ease 0.4s forwards' : 'none',
        width: '100%',
        maxWidth: '320px',
        marginBottom: '1rem',
      }}>
        <button
          className="start-btn"
          onClick={() => navigate('/quiz')}
          style={{
            width: '100%',
            padding: '18px',
            background: accent,
            color: '#0a0a0a',
            fontSize: '16px',
            fontWeight: '700',
            borderRadius: '100px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.02em',
          }}
        >
          Plan our next trip ✦
        </button>
      </div>

      {/* Trust line */}
      <div style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'fadeUp 0.6s ease 0.5s forwards' : 'none',
        fontSize: '12px',
        color: '#4a4642',
        marginBottom: '1rem',
      }}>
        Free to use · No sign up required · Takes 2 minutes
      </div>

      {/* Trip counter */}
      <div style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'fadeUp 0.6s ease 0.6s forwards' : 'none',
        fontSize: '13px',
        color: accent,
        marginBottom: '2rem',
        fontWeight: '500',
        textAlign: 'center',
      }}>
        {tripCount > 0 && `✦ ${tripCount} trips planned by couples worldwide`}
      </div>

      {/* Social proof */}
      <div style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'fadeUp 0.6s ease 0.7s forwards' : 'none',
        maxWidth: '360px',
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(255,107,53,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', flexShrink: 0,
          }}>👤</div>
          <div>
            <div style={{ fontSize: '13px', color: '#f0ebe4', lineHeight: '1.6', marginBottom: '8px' }}>
              "Having both people input their stuff upfront could definitely cut through decision paralysis. Interface feels pretty clean for a V1"
            </div>
            <div style={{ fontSize: '11px', color: '#4a4642' }}>r/SaaS · real user review</div>
          </div>
        </div>
      </div>

    </div>
  )
}