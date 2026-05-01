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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1A1B26',
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
        @keyframes twinkle { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .start-btn:hover { opacity: 0.92; transform: scale(1.02); }
        .start-btn:active { transform: scale(0.98); }
        .feature-pill { transition: all 0.2s; }
        .feature-pill:hover { border-color: rgba(124,106,239,0.5) !important; background: rgba(124,106,239,0.1) !important; }
      `}</style>

      {/* Stars */}
      {[...Array(25)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 4 === 0 ? '2px' : '1px',
          height: i % 4 === 0 ? '2px' : '1px',
          background: '#fff',
          borderRadius: '50%',
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          opacity: 0.3,
          animation: `twinkle ${3 + Math.random() * 3}s ease-in-out infinite ${Math.random() * 2}s`,
        }} />
      ))}

      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '500px',
        background: 'radial-gradient(ellipse, rgba(124,106,239,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* User bar */}
      {session ? (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 100,
          background: 'rgba(30,32,48,0.8)',
          backdropFilter: 'blur(12px)',
          borderRadius: '100px',
          padding: '4px 12px 4px 4px',
          border: '1px solid rgba(124,106,239,0.2)',
        }}>
          <img
            src={session.user.user_metadata?.avatar_url}
            style={{ width: '26px', height: '26px', borderRadius: '50%' }}
            alt="avatar"
          />
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              color: '#7C6AEF',
              fontSize: '12px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              background: 'none',
              border: 'none',
              color: '#8B8FA3',
              fontSize: '12px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Sign out
          </button>
        </div>
      ) : (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 100,
        }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'rgba(30,32,48,0.8)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(124,106,239,0.2)',
              borderRadius: '100px',
              padding: '8px 16px',
              color: '#8B8FA3',
              fontSize: '13px',
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
        marginTop: '2.5rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(244,114,182,0.1)',
        border: '1px solid rgba(244,114,182,0.25)',
        borderRadius: '100px',
        padding: '8px 16px',
      }}>
        <div style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          background: 'linear-gradient(135deg, #F472B6, #7C6AEF)',
          animation: 'twinkle 2s infinite' 
        }} />
        <span style={{ fontSize: '12px', color: '#F472B6', letterSpacing: '0.05em', fontWeight: '500' }}>
          Built for long distance couples
        </span>
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
          fontFamily: "'Geist', sans-serif",
          fontSize: 'clamp(2.4rem, 8vw, 3.8rem)',
          fontWeight: '600',
          lineHeight: '1.1',
          margin: 0,
          color: '#E8E8ED',
        }}>
          Stop arguing<br />about where<br />
          <span style={{ 
            background: 'linear-gradient(135deg, #F472B6, #7C6AEF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>to go next.</span>
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
          color: '#8B8FA3',
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
            background: 'rgba(30,32,48,0.6)',
            border: '1px solid rgba(124,106,239,0.2)',
            borderRadius: '100px',
            padding: '8px 14px',
            fontSize: '13px',
            color: '#8B8FA3',
            backdropFilter: 'blur(8px)',
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
        color: '#6B6F85',
        marginBottom: '1rem',
        textAlign: 'center',
      }}>
        Fill it out together on your next FaceTime
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
            background: 'linear-gradient(135deg, #F472B6, #7C6AEF)',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '600',
            borderRadius: '100px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 0 40px rgba(124,106,239,0.4)',
          }}
        >
          Plan our next trip
        </button>
      </div>

      {/* Trust line */}
      <div style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'fadeUp 0.6s ease 0.5s forwards' : 'none',
        fontSize: '12px',
        color: '#6B6F85',
        marginBottom: '1rem',
      }}>
        Free to use · No sign up required · Takes 2 minutes
      </div>

      {/* Trip counter */}
      <div style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'fadeUp 0.6s ease 0.6s forwards' : 'none',
        fontSize: '13px',
        background: 'linear-gradient(135deg, #F472B6, #22D3EE)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '2rem',
        fontWeight: '500',
        textAlign: 'center',
      }}>
        {tripCount > 0 && `${tripCount} trips planned by couples worldwide`}
      </div>

      {/* Social proof */}
      <div style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'fadeUp 0.6s ease 0.7s forwards' : 'none',
        maxWidth: '360px',
        background: 'rgba(30,32,48,0.6)',
        border: '1px solid rgba(124,106,239,0.15)',
        borderRadius: '20px',
        padding: '1.25rem',
        marginBottom: '2rem',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{
            width: '36px', 
            height: '36px', 
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F472B6, #7C6AEF)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '14px', 
            flexShrink: 0,
            color: '#fff',
            fontWeight: '600',
          }}>R</div>
          <div>
            <div style={{ fontSize: '13px', color: '#E8E8ED', lineHeight: '1.6', marginBottom: '8px' }}>
              {"\"Having both people input their stuff upfront could definitely cut through decision paralysis. Interface feels pretty clean for a V1\""}
            </div>
            <div style={{ fontSize: '11px', color: '#6B6F85' }}>r/SaaS · real user review</div>
          </div>
        </div>
      </div>
    </div>
  )
}