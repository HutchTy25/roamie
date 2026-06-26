import { useNavigate } from 'react-router-dom'
import { Layers, Coins, CalendarClock } from 'lucide-react'

const C = {
  bg: '#000000',
  card: '#121214',
  gold: '#C9A05C',
  text: '#F2F1ED',
  muted: '#5E6066',
  border: 'rgba(255,255,255,0.1)',
}
const serif = "'Playfair Display', Georgia, serif"

const FEATURES = [
  { icon: Layers, title: 'Every reservation in one place', line: 'Hotels, flights, cars and activities on one shared timeline.' },
  { icon: Coins, title: 'Both your currencies', line: 'Every amount shown at home and at the destination, automatically.' },
  { icon: CalendarClock, title: 'Never miss a deadline', line: 'Free-cancellation dates and unpaid balances, tracked for both of you.' },
]

function GoldButton({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      className="lp-gold"
      style={{
        border: 'none', borderRadius: '100px', background: C.gold, color: '#000',
        fontWeight: 600, cursor: 'pointer', ...style,
      }}
    >
      {children}
    </button>
  )
}

// iPhone-framed product screenshot. `stagger` controls the desktop offset.
function MarketingPhone({ src, alt, stagger, eager }) {
  return (
    <div
      className={`lp-phone ${stagger === 'down' ? 'lp-phone-down' : 'lp-phone-up'}`}
      style={{
        position: 'relative', flexShrink: 0, width: '230px',
        borderRadius: '2.4rem', border: `1px solid ${C.border}`, background: '#0a0a0b',
        padding: '6px', boxShadow: '0 40px 90px -30px rgba(0,0,0,0.95)',
        scrollSnapAlign: 'center',
      }}
    >
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '2rem' }}>
        <img
          src={src}
          alt={alt}
          draggable={false}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none' }}
        />
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const login = () => navigate('/login')

  return (
    <main style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <style>{`
        .lp-gold { transition: opacity 0.2s ease; }
        .lp-gold:hover { opacity: 0.9; }
        .lp-signin { transition: color 0.2s ease; }
        .lp-signin:hover { color: ${C.text}; }

        .lp-phones {
          display: flex; gap: 20px; overflow-x: auto; padding: 0 4px 24px;
          scroll-snap-type: x mandatory; scrollbar-width: none;
        }
        .lp-phones::-webkit-scrollbar { display: none; }

        .lp-features { display: grid; gap: 48px; }

        @media (min-width: 640px) {
          .lp-features { grid-template-columns: repeat(3, 1fr); gap: 32px; }
          .lp-footer { flex-direction: row !important; }
        }
        @media (min-width: 1024px) {
          .lp-phones { justify-content: center; overflow-x: visible; }
          .lp-phone-down { transform: translateY(24px); }
          .lp-phone-up { transform: translateY(-8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-phone-down, .lp-phone-up { transition: none; }
        }
      `}</style>

      {/* ===== Nav ===== */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px' }}>
          <span style={{ fontFamily: serif, fontSize: '24px', fontWeight: 600, letterSpacing: '-0.01em', color: C.text }}>Roamie</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={login} className="lp-signin" style={{ background: 'none', border: 'none', borderRadius: '100px', padding: '8px 16px', fontSize: '14px', fontWeight: 500, color: C.muted, cursor: 'pointer' }}>
              Sign in
            </button>
            <GoldButton onClick={login} style={{ padding: '8px 16px', fontSize: '14px' }}>Get started</GoldButton>
          </div>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '40px 20px 16px' }}>
        {/* ambient gold glow */}
        <div aria-hidden style={{ pointerEvents: 'none', position: 'absolute', top: '-96px', left: '50%', transform: 'translateX(-50%)', height: '288px', width: '120%', borderRadius: '9999px', background: 'rgba(201,160,92,0.10)', filter: 'blur(64px)' }} />

        <div style={{ position: 'relative', maxWidth: '768px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(2.75rem, 8vw, 4.5rem)', fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.02em', color: C.text, margin: 0 }}>
            Your trips, finally organized.
          </h1>
          <p style={{ maxWidth: '576px', margin: '24px auto 0', fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', lineHeight: 1.6, color: C.muted }}>
            One shared space for every reservation, deadline, and payment — in both your currencies.
          </p>
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
            <GoldButton onClick={login} style={{ padding: '14px 28px', fontSize: '16px' }}>Get started free</GoldButton>
          </div>
        </div>

        {/* product screenshots in iPhone frames */}
        <div style={{ position: 'relative', maxWidth: '1152px', margin: '56px auto 0' }}>
          <div className="lp-phones">
            <MarketingPhone src="/screens/dashboard.webp" alt="Roamie shared trips dashboard showing two trips with budgets" stagger="down" eager />
            <MarketingPhone src="/screens/timeline-albania.webp" alt="Roamie trip itinerary with a reservation timeline" stagger="up" />
            <MarketingPhone src="/screens/detail.webp" alt="Roamie reservation detail with status, dates and amount" stagger="down" />
            <MarketingPhone src="/screens/timeline-manchester.webp" alt="Roamie Manchester trip itinerary with currency conversion" stagger="up" />
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section style={{ maxWidth: '1024px', margin: '0 auto', padding: '80px 20px' }}>
        <div className="lp-features">
          {FEATURES.map((f) => (
            <div key={f.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
              <span style={{ display: 'flex', height: '44px', width: '44px', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.card }}>
                <f.icon size={20} color={C.gold} strokeWidth={1.75} />
              </span>
              <h3 style={{ fontFamily: serif, fontSize: '20px', fontWeight: 600, color: C.text, margin: 0 }}>{f.title}</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: C.muted, margin: 0 }}>{f.line}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Closing CTA ===== */}
      <section style={{ maxWidth: '768px', margin: '0 auto', padding: '0 20px 112px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: serif, fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 600, letterSpacing: '-0.02em', color: C.text, margin: 0 }}>
          Plan it together.
        </h2>
        <p style={{ maxWidth: '448px', margin: '20px auto 0', fontSize: '16px', lineHeight: 1.6, color: C.muted }}>
          For couples and solo travelers who want every trip in one calm, shared place.
        </p>
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
          <GoldButton onClick={login} style={{ padding: '14px 28px', fontSize: '16px' }}>Get started free</GoldButton>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="lp-footer" style={{ maxWidth: '1152px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '32px 20px' }}>
          <span style={{ fontFamily: serif, fontSize: '18px', fontWeight: 600, color: C.text }}>Roamie</span>
          <p style={{ fontSize: '12px', color: C.muted, margin: 0 }}>© {new Date().getFullYear()} Roamie. Made for two.</p>
        </div>
      </footer>
    </main>
  )
}
