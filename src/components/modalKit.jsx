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
          width: '100%', maxWidth: '430px', maxHeight: '92vh', overflowY: 'auto',
          background: COLORS.cardSolid, border: `1px solid ${COLORS.border}`,
          borderRadius: '24px 24px 0 0',
          padding: '24px 20px calc(24px + env(safe-area-inset-bottom))',
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
        width: '100%', padding: '15px', marginTop: '6px', border: 'none', borderRadius: '100px',
        background: disabled ? 'rgba(245,196,81,0.3)' : 'linear-gradient(135deg, #F5C451, #E0A53B)',
        color: '#1A1B26', fontSize: '15px', fontWeight: '700',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 4px 20px rgba(245,196,81,0.35)',
      }}
    >
      {children}
    </button>
  )
}
