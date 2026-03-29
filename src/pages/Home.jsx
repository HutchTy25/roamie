import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(201,149,108,0.08) 0%, transparent 70%)'
    }}>

      <div style={{ marginBottom: '1rem', fontSize: '13px', letterSpacing: '0.15em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
        Introducing Roamie
      </div>

      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
        fontWeight: '400',
        lineHeight: '1.1',
        marginBottom: '1.5rem',
        color: 'var(--text-primary)'
      }}>
        Plan your next trip,<br />
        <em style={{ color: 'var(--accent)' }}>together.</em>
      </h1>

      <p style={{
        fontSize: '17px',
        color: 'var(--text-secondary)',
        maxWidth: '420px',
        lineHeight: '1.7',
        marginBottom: '3rem'
      }}>
        Two people. Two budgets. Two cities. One perfect trip. Roamie finds what works for both of you.
      </p>

      <button
        onClick={() => navigate('/quiz')}
        style={{
          background: 'var(--accent)',
          color: '#0a0a0a',
          fontSize: '15px',
          fontWeight: '600',
          padding: '16px 40px',
          borderRadius: '100px',
          letterSpacing: '0.02em',
          transition: 'opacity 0.2s, transform 0.2s',
        }}
        onMouseEnter={e => e.target.style.opacity = '0.85'}
        onMouseLeave={e => e.target.style.opacity = '1'}
      >
        Start planning
     </button>

      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '13px',
          marginTop: '1rem',
          cursor: 'pointer',
        }}
      >
        ← back
      </button>

      <div style={{ marginTop: '4rem', color: 'var(--text-muted)', fontSize: '13px' }}>
        Fill it out together on your next call
      </div>

    </div>
  )
}