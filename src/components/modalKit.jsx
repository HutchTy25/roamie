// Shared component building blocks for the add-flow modals (dark bottom sheet,
// labelled fields, gold primary CTA). Constants/styles live in ./modalStyles.
import { COLORS } from './modalStyles'

export function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '12px', color: COLORS.textMuted, marginBottom: '6px' }}>
        {label}{required && <span style={{ color: COLORS.pink }}> *</span>}
      </label>
      {children}
    </div>
  )
}

export function Row({ children }) {
  return <div style={{ display: 'flex', gap: '10px' }}>{children}</div>
}

export function ModalShell({ title, children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '430px', maxHeight: '88vh', overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: COLORS.cardSolid, border: `1px solid ${COLORS.border}`,
          borderRadius: '24px 24px 0 0',
          // Generous bottom padding so the last fields + CTA clear the fixed
          // bottom nav / home indicator and stay scrollable into view.
          padding: '24px 20px calc(96px + env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: COLORS.text }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: COLORS.textMuted, fontSize: '24px', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '15px', marginTop: '6px', border: 'none', borderRadius: '16px',
        background: disabled ? 'rgba(242,241,237,0.25)' : '#F2F1ED',
        color: '#000000', fontSize: '15px', fontWeight: '600',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}
