// Shared currency formatting helpers. Kept tiny and dependency-free so any
// screen can import them without pulling in page-level code.

export const CURR_SYMBOLS = {
  USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$',
  NZD: 'NZ$', JPY: '¥', CNY: '¥', KRW: '₩', PHP: '₱',
  IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫', SGD: 'S$',
  INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵',
  KES: 'KSh', ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼',
  BRL: 'R$', MXN: 'MX$', COP: 'COL$', ARS: 'AR$', CLP: 'CL$',
  TWD: 'NT$', HKD: 'HK$', CHF: 'CHF', SEK: 'kr', NOK: 'kr',
  DKK: 'kr', PLN: 'zł', CZK: 'Kč', TRY: '₺', ILS: '₪',
  HUF: 'Ft', RON: 'lei',
}

export function currencySymbol(code) {
  return CURR_SYMBOLS[code] || code || ''
}

// Whole-unit money, e.g. formatMoney(1234.5, 'USD') -> "$1,235".
export function formatMoney(amount, code = 'USD') {
  if (amount == null || Number.isNaN(Number(amount))) return null
  return `${currencySymbol(code)}${Math.round(Number(amount)).toLocaleString()}`
}
