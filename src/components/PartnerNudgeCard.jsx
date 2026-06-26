import { useState } from 'react'

const C = {
  card: '#121214',
  gold: '#C9A05C',
  text: '#F2F1ED',
  muted: '#5E6066',
  border: 'rgba(255,255,255,0.08)',
}
const serif = "'Playfair Display', Georgia, serif"

// Contextual suggestion shown on the dashboard once a trip exists and no
// partner is connected. Presentational only — parent owns the conditions.
export default function PartnerNudgeCard({ onInvite, onDismiss }) {
  const [pressed, setPressed] = useState(false)

  return (
    <div
      className="roamie-rise"
      style={{
        marginTop: '16px', borderRadius: '20px', border: `1px solid ${C.border}`,
        background: C.card, padding: '20px',
        boxShadow: '0 18px 40px -22px rgba(0,0,0,0.9)',
      }}
    >
      <h3 style={{ fontFamily: serif, fontSize: '19px', fontWeight: '600', color: C.text, margin: 0, letterSpacing: '-0.01em' }}>
        Planning with someone?
      </h3>
      <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.6, margin: '8px 0 18px' }}>
        Invite your partner to share this trip and see everything in their currency too.
      </p>

      <button
        onClick={onInvite}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        style={{
          width: '100%', padding: '13px', border: 'none', borderRadius: '14px',
          background: C.gold, color: '#1a1408', fontSize: '14px', fontWeight: '600',
          cursor: 'pointer', transform: pressed ? 'scale(0.98)' : 'scale(1)',
          boxShadow: pressed ? 'none' : '0 8px 24px -12px rgba(201,160,92,0.7)',
          transition: 'transform 0.12s ease, box-shadow 0.2s ease',
        }}
      >
        Invite partner
      </button>
      <button
        onClick={onDismiss}
        style={{
          width: '100%', marginTop: '4px', padding: '12px', background: 'none',
          border: 'none', color: C.muted, fontSize: '13px', cursor: 'pointer',
        }}
      >
        I&apos;m planning solo
      </button>
    </div>
  )
}
