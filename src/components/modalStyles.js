// Shared constants/styles for the add-flow modals. Kept separate from modalKit's
// components so each file has a single export kind (react-refresh friendly).

export const COLORS = {
  bg: '#1A1B26',
  cardSolid: '#1E2030',
  primary: '#7C6AEF',
  pink: '#F472B6',
  cyan: '#22D3EE',
  gold: '#F5C451',
  text: '#E8E8ED',
  textMuted: '#8B8FA3',
  border: 'rgba(124, 106, 239, 0.2)',
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
