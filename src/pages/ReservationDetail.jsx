import { useEffect, useState } from 'react'
import { useParams, useNavigate, useNavigationType } from 'react-router-dom'
import { Plane, BedDouble, Car, Ticket, Sparkles, ChevronLeft, Pencil } from 'lucide-react'
import { supabase } from '../supabase'
import AddReservationModal from '../components/AddReservationModal'

const screenClass = (navType) => navType === 'POP' ? 'roamie-screen-back' : 'roamie-screen-forward'
const Sk = ({ w = '100%', h = 14, r = 8, style }) => (
  <div className="roamie-skeleton" style={{ width: w, height: h, borderRadius: r, background: '#1B1B1F', ...style }} />
)

const colors = {
  bg: '#000000',
  card: '#121214',
  cardElevated: '#1B1B1F',
  border: 'rgba(255,255,255,0.08)',
  gold: '#C9A05C',
  goldSoft: 'rgba(201,160,92,0.14)',
  blue: '#6FA8C9',
  text: '#F2F1ED',
  textMuted: '#5E6066',
  textSoft: '#8A8A8F',
  paid: '#6FBF8E',
  paidSoft: 'rgba(111,191,142,0.12)',
}
const serif = "'Playfair Display', Georgia, serif"

const CURR_SYMBOLS = {
  USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$', NZD: 'NZ$', JPY: '¥',
  CNY: '¥', KRW: '₩', SGD: 'S$', INR: '₹', ZAR: 'R', CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr',
}
const sym = (c) => CURR_SYMBOLS[c] || (c ? `${c} ` : '')

const CATEGORY = {
  flight:    { Icon: Plane,     label: 'Flight' },
  hotel:     { Icon: BedDouble, label: 'Hotel' },
  transport: { Icon: Car,       label: 'Transport' },
  activity:  { Icon: Sparkles,  label: 'Activity' },
  other:     { Icon: Ticket,    label: 'Other' },
}

const STATUS = {
  booked_paid:   { label: 'Booked · Paid',     color: colors.paid, bg: colors.paidSoft },
  booked_unpaid: { label: 'Reserved · Unpaid', color: colors.gold, bg: colors.goldSoft },
  settled:       { label: 'Settled',           color: colors.blue, bg: 'rgba(111,168,201,0.14)' },
  draft:         { label: 'Draft',             color: colors.textSoft, bg: 'rgba(255,255,255,0.06)' },
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

function StatusPill({ st }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '500', color: st.color, background: st.bg, borderRadius: '100px', padding: '4px 11px' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color }} />
      {st.label}
    </span>
  )
}

export default function ReservationDetail({ session }) {
  const { tripId, bookingId } = useParams()
  const navigate = useNavigate()
  const navType = useNavigationType()

  const [booking, setBooking] = useState(undefined)  // undefined = loading, null = not found
  const [trip, setTrip] = useState(null)
  const [payerName, setPayerName] = useState(null)
  const [homeCurrency, setHomeCurrency] = useState(null)   // for the edit-modal default
  const [destRates, setDestRates] = useState(null)   // { [currency]: units per 1 destination_currency }
  const [partners, setPartners] = useState([])
  const [showEdit, setShowEdit] = useState(false)
  const [ready, setReady] = useState(false)   // all initial data (incl. FX) loaded

  async function loadBooking() {
    const { data } = await supabase.from('bookings').select('*').eq('id', bookingId).single()
    setBooking(data ?? null)
    if (data?.payer_id) {
      const { data: p } = await supabase.from('profiles').select('display_name').eq('id', data.payer_id).single()
      setPayerName(p?.display_name || null)
    } else {
      setPayerName(null)
    }
  }

  useEffect(() => {
    if (!session) { navigate('/login'); return }
    let cancelled = false

    async function load() {
      const [{ data: tripData }, { data: me }] = await Promise.all([
        supabase.from('trips').select('couple_id, trip_name, destination_currency').eq('id', tripId).single(),
        supabase.from('profiles').select('home_currency, display_name').eq('id', session.user.id).single(),
      ])
      if (cancelled) return
      setTrip(tripData ?? null)
      const home = me?.home_currency || null
      setHomeCurrency(home)

      // Couple members for the edit modal's "Paid by" select.
      const meEntry = { id: session.user.id, display_name: me?.display_name || 'You' }
      if (tripData?.couple_id) {
        const { data: couple } = await supabase.from('couples').select('partner1_id, partner2_id').eq('id', tripData.couple_id).single()
        const pids = [couple?.partner1_id, couple?.partner2_id].filter(Boolean)
        if (pids.length) {
          const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', pids)
          const list = (profs ?? []).map(p => ({ id: p.id, display_name: p.display_name || (p.id === session.user.id ? 'You' : 'Partner') }))
          if (!cancelled) setPartners(list.length ? list : [meEntry])
        } else if (!cancelled) setPartners([meEntry])
      } else if (!cancelled) setPartners([meEntry])

      await loadBooking()

      // FX anchored to the trip's destination currency, for the destination
      // equivalent of a booking whose fx_rate_locked is null.
      const destCur = tripData?.destination_currency
      if (destCur) {
        try {
          const r = await fetch(`https://roamie-61ib.onrender.com/api/fx-rates?from=${destCur}`)
          const j = await r.json()
          if (!cancelled && j?.rates) setDestRates({ [destCur]: 1, ...j.rates })
        } catch { /* native-only fallback */ }
      }

      if (!cancelled) setReady(true)
    }

    load()
    return () => { cancelled = true }
  }, [tripId, bookingId, session])

  const back = () => navigate(`/trip/${tripId}`)

  if (!ready) return <ReservationSkeleton navType={navType} />

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, maxWidth: '430px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '56px 16px 8px' }}>
        <button onClick={back} aria-label="Back to itinerary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, cursor: 'pointer' }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize: '13px', fontWeight: '500', color: colors.textSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
          {trip?.trip_name || ''}
        </span>
        <button onClick={() => booking && setShowEdit(true)} aria-label="Edit reservation" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, cursor: 'pointer' }}>
          <Pencil size={17} />
        </button>
      </header>

      <div style={{ flex: 1, padding: '8px 16px calc(40px + env(safe-area-inset-bottom))' }}>
        {booking === null && (
          <div style={{ color: colors.textMuted, fontSize: '14px', textAlign: 'center', paddingTop: '60px' }}>Reservation not found.</div>
        )}

        {booking && (() => {
          const cat = CATEGORY[booking.category] || CATEGORY.other
          const st = STATUS[booking.status] || STATUS.draft
          const destCur = trip?.destination_currency || null
          const native = Number(booking.price_amount)
          const crossCurrency = destCur && booking.price_currency !== destCur
          // Destination-currency equivalent: locked rate, else live, else null.
          let destAmt = null
          if (booking.fx_rate_locked != null) destAmt = native * Number(booking.fx_rate_locked)
          else if (!destCur || booking.price_currency === destCur) destAmt = native
          else if (destRates?.[booking.price_currency] != null) destAmt = native / destRates[booking.price_currency]
          const showDest = crossCurrency && destAmt != null
          // Rate used to convert native -> destination (dest units per 1 price_currency).
          let usedRate = null, rateSource = null
          if (crossCurrency) {
            if (booking.fx_rate_locked != null) { usedRate = Number(booking.fx_rate_locked); rateSource = 'locked' }
            else if (destRates?.[booking.price_currency] != null) { usedRate = 1 / destRates[booking.price_currency]; rateSource = 'live' }
          }

          const isHotel = booking.category === 'hotel'
          const checkOut = isHotel && booking.deadline_date && booking.nights ? addDays(booking.deadline_date, booking.nights) : null

          // Build the middle rows (everything except Status/Amount/cancellation,
          // which are rendered explicitly to control ordering + styling).
          const midRows = []
          midRows.push(['Type', (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '100px', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', fontSize: '13px', fontWeight: '500', color: colors.text }}>
              <cat.Icon size={14} color={colors.textSoft} /> {cat.label}
            </span>
          )])
          midRows.push(['Paid by', payerName || '—'])
          if (isHotel && booking.nights) midRows.push(['Nights', `${booking.nights} night${booking.nights !== 1 ? 's' : ''}`])
          if (isHotel && booking.deadline_date) {
            midRows.push(['Check-in', fmtDate(booking.deadline_date)])
            if (checkOut) midRows.push(['Check-out', fmtDate(checkOut)])
          } else if (booking.deadline_date) {
            midRows.push(['Deadline', fmtDate(booking.deadline_date)])
          }

          return (
            <>
              {/* Title block */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', flexShrink: 0, background: colors.goldSoft, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <cat.Icon size={28} color={colors.gold} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h1 style={{ fontFamily: serif, fontSize: '24px', fontWeight: '600', lineHeight: 1.15, color: colors.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {booking.vendor_name || booking.title || cat.label}
                  </h1>
                  <p style={{ fontSize: '13px', color: colors.textSoft, margin: '4px 0 0' }}>{cat.label}</p>
                </div>
              </div>

              {/* Settings-style card */}
              <div style={{ overflow: 'hidden', borderRadius: '16px', border: `1px solid ${colors.border}`, background: colors.card }}>
                <DetailRow label="Status"><StatusPill st={st} /></DetailRow>
                {midRows.map(([label, value]) => (
                  <DetailRow key={label} label={label}>{value}</DetailRow>
                ))}
                <DetailRow label="Confirmation no.">
                  {booking.confirmation_code ? (
                    <span style={{ borderRadius: '6px', background: 'rgba(255,255,255,0.06)', padding: '4px 8px', fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.05em', color: colors.text }}>{booking.confirmation_code}</span>
                  ) : (
                    <span style={{ fontSize: '14px', fontWeight: '400', color: colors.textMuted }}>Pending</span>
                  )}
                </DetailRow>
                <DetailRow label="Amount">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '17px', fontWeight: '600', color: colors.text }}>{sym(booking.price_currency)}{Math.round(native).toLocaleString()}</span>
                    {showDest && <span style={{ fontSize: '13px', fontWeight: '400', color: colors.textMuted }}>≈ {sym(destCur)}{Math.round(destAmt).toLocaleString()}</span>}
                  </div>
                </DetailRow>
                {crossCurrency && (
                  <DetailRow label="Exchange rate">
                    {usedRate != null ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>1 {booking.price_currency} = {usedRate.toFixed(4)} {destCur}</span>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: rateSource === 'locked' ? colors.gold : colors.blue, background: rateSource === 'locked' ? colors.goldSoft : 'rgba(111,168,201,0.14)', borderRadius: '100px', padding: '2px 8px' }}>
                          {rateSource === 'locked' ? 'locked' : 'live'}
                        </span>
                      </span>
                    ) : (
                      <span style={{ color: colors.textMuted }}>Unavailable</span>
                    )}
                  </DetailRow>
                )}
                <DetailRow label="Free cancellation" last>
                  <span style={{ color: booking.deadline_date ? colors.paid : colors.textMuted }}>
                    {booking.deadline_date ? `Until ${fmtDate(booking.deadline_date)}` : '—'}
                  </span>
                </DetailRow>
              </div>

              {/* Primary action */}
              <button
                onClick={() => setShowEdit(true)}
                style={{ width: '100%', marginTop: '24px', padding: '16px', background: colors.text, border: 'none', borderRadius: '16px', color: colors.bg, fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
              >
                Edit reservation
              </button>

              {showEdit && (
                <AddReservationModal
                  tripId={tripId}
                  partners={partners}
                  defaultCurrency={homeCurrency || destCur || 'USD'}
                  destinationCurrency={destCur}
                  booking={booking}
                  onClose={() => setShowEdit(false)}
                  onAdded={loadBooking}
                />
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}

function DetailRow({ label, children, last }) {
  return (
    <div style={{ display: 'flex', minHeight: '52px', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 16px', borderBottom: last ? 'none' : `1px solid ${colors.border}` }}>
      <span style={{ fontSize: '14px', color: colors.textSoft, flexShrink: 0 }}>{label}</span>
      <div style={{ textAlign: 'right', fontSize: '15px', fontWeight: '500', color: colors.text }}>{children}</div>
    </div>
  )
}

// Full-screen placeholder matching the header + detail-card layout.
function ReservationSkeleton({ navType }) {
  return (
    <div className={screenClass(navType)} style={{ minHeight: '100vh', background: colors.bg, maxWidth: '430px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '56px 16px 8px' }}>
        <Sk w={40} h={40} r={20} />
        <Sk w={120} h={13} />
        <Sk w={40} h={40} r={20} />
      </header>
      <div style={{ flex: 1, padding: '8px 16px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <Sk w={64} h={64} r={16} />
          <div style={{ flex: 1 }}>
            <Sk w="60%" h={22} style={{ marginBottom: '8px' }} />
            <Sk w="35%" h={12} />
          </div>
        </div>
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '4px 16px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: i < 5 ? `1px solid ${colors.border}` : 'none' }}>
              <Sk w="30%" h={12} />
              <Sk w="25%" h={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
