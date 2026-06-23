import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plane, BedDouble, Car, Ticket, Sparkles, ArrowLeft, Pencil } from 'lucide-react'
import { supabase } from '../supabase'
import AddReservationModal from '../components/AddReservationModal'

const colors = {
  bg: '#1A1B26',
  cardSolid: '#1E2030',
  primary: '#7C6AEF',
  pink: '#F472B6',
  cyan: '#22D3EE',
  text: '#E8E8ED',
  textMuted: '#8B8FA3',
  border: 'rgba(124, 106, 239, 0.2)',
}

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
  booked_paid:   { label: 'Booked · Paid',     color: '#34D399', bg: 'rgba(52,211,153,0.14)',  border: 'rgba(52,211,153,0.35)' },
  booked_unpaid: { label: 'Reserved · Unpaid', color: '#FBBF24', bg: 'rgba(251,191,36,0.14)',  border: 'rgba(251,191,36,0.35)' },
  settled:       { label: 'Settled',           color: '#22D3EE', bg: 'rgba(34,211,238,0.14)',  border: 'rgba(34,211,238,0.35)' },
  draft:         { label: 'Draft',             color: '#8B8FA3', bg: 'rgba(139,143,163,0.12)', border: 'rgba(139,143,163,0.3)' },
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

export default function ReservationDetail({ session }) {
  const { tripId, bookingId } = useParams()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(undefined)  // undefined = loading, null = not found
  const [trip, setTrip] = useState(null)
  const [payerName, setPayerName] = useState(null)
  const [homeCurrency, setHomeCurrency] = useState(null)
  const [fxRates, setFxRates] = useState(null)
  const [partners, setPartners] = useState([])
  const [showEdit, setShowEdit] = useState(false)

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

      if (home) {
        try {
          const r = await fetch(`https://roamie-61ib.onrender.com/api/fx-rates?from=${home}`)
          const j = await r.json()
          if (!cancelled && j?.rates) setFxRates({ [home]: 1, ...j.rates })
        } catch { /* bold-only fallback */ }
      }
    }

    load()
    return () => { cancelled = true }
  }, [tripId, bookingId, session])

  const back = () => navigate(`/trip/${tripId}`)

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, maxWidth: '430px', margin: '0 auto', padding: '20px 18px 40px' }}>
      <button onClick={back} style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${colors.border}`, borderRadius: '100px', padding: '8px 14px', color: colors.text, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <ArrowLeft size={15} /> Back
      </button>

      {booking === undefined && <Skeleton />}

      {booking === null && (
        <div style={{ color: colors.textMuted, fontSize: '14px', textAlign: 'center', paddingTop: '60px' }}>Reservation not found.</div>
      )}

      {booking && (() => {
        const cat = CATEGORY[booking.category] || CATEGORY.other
        const st = STATUS[booking.status] || STATUS.draft
        const destCur = trip?.destination_currency || booking.price_currency
        const destAmt = booking.fx_rate_locked != null ? Number(booking.price_amount) * Number(booking.fx_rate_locked) : Number(booking.price_amount)
        let homeAmt = null
        if (homeCurrency && fxRates) {
          if (booking.price_currency === homeCurrency) homeAmt = Number(booking.price_amount)
          else if (fxRates[booking.price_currency]) homeAmt = Number(booking.price_amount) / fxRates[booking.price_currency]
        }

        const isHotel = booking.category === 'hotel'
        const checkOut = isHotel && booking.deadline_date && booking.nights ? addDays(booking.deadline_date, booking.nights) : null

        const rows = []
        rows.push(['Status', <span key="s" style={{ fontSize: '12px', fontWeight: '600', color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: '100px', padding: '3px 10px' }}>{st.label}</span>])
        rows.push(['Type', cat.label])
        rows.push(['Paid by', payerName || '—'])
        if (isHotel && booking.nights) rows.push(['Nights', `${booking.nights} night${booking.nights !== 1 ? 's' : ''}`])
        if (isHotel && booking.deadline_date) {
          rows.push(['Check-in', fmtDate(booking.deadline_date)])
          if (checkOut) rows.push(['Check-out', fmtDate(checkOut)])
        } else if (booking.deadline_date) {
          rows.push(['Deadline', fmtDate(booking.deadline_date)])
        }
        if (booking.confirmation_code) rows.push(['Confirmation code', booking.confirmation_code])
        rows.push(['Amount', (
          <span key="a" style={{ textAlign: 'right' }}>
            <span style={{ fontWeight: '700', color: colors.text }}>{sym(destCur)}{Math.round(destAmt).toLocaleString()}</span>
            {homeAmt != null && <span style={{ display: 'block', fontSize: '12px', color: colors.textMuted }}>≈ {sym(homeCurrency)}{Math.round(homeAmt).toLocaleString()}</span>}
          </span>
        )])
        rows.push(['Free cancellation', booking.deadline_date ? `Until ${fmtDate(booking.deadline_date)}` : '—'])

        return (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '22px 0 24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0, background: 'rgba(124,106,239,0.12)', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <cat.Icon size={24} color={colors.cyan} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: '22px', fontWeight: '700', color: colors.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {booking.vendor_name || booking.title || cat.label}
                </h1>
                {trip?.trip_name && <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0' }}>{trip.trip_name}</p>}
              </div>
            </div>

            <div style={{ background: colors.cardSolid, border: `1px solid ${colors.border}`, borderRadius: '18px', padding: '4px 18px' }}>
              {rows.map(([label, value], i) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '14px 0', borderBottom: i < rows.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                  <span style={{ fontSize: '13px', color: colors.textMuted, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: '14px', color: colors.text, textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowEdit(true)}
              style={{ width: '100%', marginTop: '20px', padding: '14px', background: 'none', border: `1px solid ${colors.border}`, borderRadius: '100px', color: colors.text, fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Pencil size={15} /> Edit reservation
            </button>

            {showEdit && (
              <AddReservationModal
                tripId={tripId}
                partners={partners}
                defaultCurrency={destCur}
                booking={booking}
                onClose={() => setShowEdit(false)}
                onAdded={loadBooking}
              />
            )}
          </>
        )
      })()}
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ marginTop: '22px' }}>
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: colors.cardSolid }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: '20px', width: '60%', borderRadius: '6px', background: colors.cardSolid, marginBottom: '8px' }} />
          <div style={{ height: '12px', width: '35%', borderRadius: '6px', background: colors.cardSolid }} />
        </div>
      </div>
      <div style={{ background: colors.cardSolid, border: `1px solid ${colors.border}`, borderRadius: '18px', padding: '18px' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 5 ? `1px solid ${colors.border}` : 'none' }}>
            <div style={{ height: '12px', width: '30%', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ height: '12px', width: '25%', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
