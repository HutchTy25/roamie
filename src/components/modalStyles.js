// Shared constants/styles for the add-flow modals. Kept separate from modalKit's
// components so each file has a single export kind (react-refresh friendly).

export const COLORS = {
  bg: '#000000',
  cardSolid: '#121214',
  primary: '#C9A05C',
  pink: '#C9A05C',
  cyan: '#6FA8C9',
  gold: '#C9A05C',
  text: '#F2F1ED',
  textMuted: '#5E6066',
  border: 'rgba(255, 255, 255, 0.08)',
}

// Currency options shared by both modals.
export const CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'JPY']

export const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${COLORS.border}`,
  borderRadius: '12px',
  color: COLORS.text,
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

export const selectStyle = { ...inputStyle, cursor: 'pointer' }
