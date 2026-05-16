const AFFILIATE_IDS = {
  travelpayouts: '526993',
  viator: 'P00300467',
  wise: '',
}

export function generateAffiliateLink(type, params = {}) {
  switch (type) {
    case 'booking':
      return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(params.city || '')}&checkin=${params.checkin || ''}&checkout=${params.checkout || ''}&aid=${AFFILIATE_IDS.travelpayouts}${params.note ? `&label=${encodeURIComponent(params.note)}` : ''}`

    case 'booking_flights':
      return `https://www.booking.com/flights/search.html?from=${encodeURIComponent(params.from || '')}&to=${encodeURIComponent(params.to || '')}&depart=${params.depart || ''}${params.return ? `&return=${params.return}` : ''}&aid=526993`

    case 'wayaway':
      return `https://wayaway.io/?marker=${AFFILIATE_IDS.travelpayouts}`

    case 'viator':
      return `https://www.viator.com/en-US/search?text=${encodeURIComponent(params.city || '')}&pid=${AFFILIATE_IDS.viator}&mcid=42383&medium=api`

    case 'wise':
      return `https://wise.com/invite/ih/${AFFILIATE_IDS.wise}`

    default:
      return null
  }
}