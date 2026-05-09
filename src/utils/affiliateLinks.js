const AFFILIATE_IDS = {
  travelpayouts: '526993',
  viator: 'YOUR_VIATOR_ID',
  wise: 'YOUR_WISE_ID',
}

export function generateAffiliateLink(type, params = {}) {
  switch (type) {
    case 'wayaway':
      return `https://wayaway.io/?marker=${AFFILIATE_IDS.travelpayouts}`

    case 'booking':
      return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(params.city || '')}&aid=${AFFILIATE_IDS.travelpayouts}`

    case 'viator':
      return `https://www.viator.com/en-US/search?text=${encodeURIComponent(params.city || '')}&pid=${AFFILIATE_IDS.viator}&mcid=42383&medium=api`

    case 'wise':
      return `https://wise.com/invite/ih/${AFFILIATE_IDS.wise}`

    default:
      return null
  }
}