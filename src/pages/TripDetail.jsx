import { useEffect, useState } from 'react'
import { useParams, useNavigate, useNavigationType, useLocation } from 'react-router-dom'
import { Plane, BedDouble, Car, Ticket, Sparkles, Plus, ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../supabase'
import AddReservationModal from '../components/AddReservationModal'
import CreateTripModal from '../components/CreateTripModal'

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
  CNY: '¥', KRW: '₩', PHP: '₱', IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫',
  SGD: 'S$', INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵', KES: 'KSh',
  ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼', BRL: 'R$', MXN: 'MX$',
  COP: 'COL$', ARS: 'AR$', CLP: 'CL$', CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr',
}
const sym = (c) => CURR_SYMBOLS[c] || (c ? `${c} ` : '')

const CATEGORY = {
  flight:    { Icon: Plane,     label: 'Flight' },
  hotel:     { Icon: BedDouble, label: 'Hotel' },
  transport: { Icon: Car,       label: 'Transport' },
  activity:  { Icon: Sparkles,  label: 'Activity' },
  other:     { Icon: Ticket,    label: 'Other' },
}

// status -> pill tone in the new palette
const STATUS = {
  booked_paid:   { label: 'Booked · Paid',     color: colors.paid, bg: colors.paidSoft },
  booked_unpaid: { label: 'Reserved · Unpaid', color: colors.gold, bg: colors.goldSoft },
  settled:       { label: 'Settled',           color: colors.blue, bg: 'rgba(111,168,201,0.14)' },
  draft:         { label: 'Draft',             color: colors.textSoft, bg: 'rgba(255,255,255,0.06)' },
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null

export default function TripDetail({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const navType = useNavigationType()
  const location = useLocation()

  // Seed the trip from navigation state (passed by the dashboard) so the hero
  // paints instantly; a fresh fetch still runs to confirm/update it.
  const [trip, setTrip] = useState(location.state?.trip ?? undefined)   // undefined = loading, null = not found
  const [bookings, setBookings] = useState([])
  const [nameById, setNameById] = useState({})
  const [homeCurrency, setHomeCurrency] = useState(null)   // for the add-modal default
  const [destRates, setDestRates] = useState(null)   // { [currency]: units per 1 destination_currency }
  const [partners, setPartners] = useState([])   // [{ id, display_name }] for "Paid by"
  const [showAdd, setShowAdd] = useState(false)
  const [showEditTrip, setShowEditTrip] = useState(false)
  const [ready, setReady] = useState(false)   // all initial data (incl. FX) loaded
  const [editing, setEditing] = useState(false)

  // Bookings (+ owner/payer names). Standalone so it can refresh after an add.
  async function loadBookings() {
    const { data: bks } = await supabase.from('bookings')
      .select('*')
      .eq('trip_id', id)
      .order('deadline_date', { ascending: true, nullsFirst: false })
    const rows = bks ?? []
    setBookings(rows)
    const ids = [...new Set(rows.flatMap(b => [b.owner_id, b.payer_id]).filter(Boolean))]
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', ids)
      setNameById(Object.fromEntries((profs ?? []).map(p => [p.id, p.display_name])))
    } else {
      setNameById({})
    }
  }

  // Refetch just the trip header (after an edit).
  async function reloadTrip() {
    const { data } = await supabase.from('trips')
      .select('user_id, couple_id, trip_name, destination_name, destination_photo_url, dates_from, dates_to, budget_total, budget_currency, destination_currency, destination_iata, country_emoji')
      .eq('id', id).single()
    setTrip(data ?? null)
  }

  // Remove a booking (timeline "Edit" mode). Confirmed before delete.
  async function removeBooking(b) {
    if (!window.confirm(`Remove "${b.vendor_name || b.title || 'this reservation'}" from this trip?`)) return
    await supabase.from('bookings').delete().eq('id', b.id)
    setBookings(prev => prev.filter(x => x.id !== b.id))
  }

  useEffect(() => {
    if (!session) { navigate('/login'); return }
    let cancelled = false

    async function load() {
      // Trip + viewer profile in parallel.
      const [{ data: tripData }, { data: me }] = await Promise.all([
        supabase.from('trips')
          .select('user_id, couple_id, trip_name, destination_name, destination_photo_url, dates_from, dates_to, budget_total, budget_currency, destination_currency, destination_iata, country_emoji')
          .eq('id', id).single(),
        supabase.from('profiles').select('home_currency, display_name').eq('id', session.user.id).single(),
      ])
      if (cancelled) return
      setTrip(tripData ?? null)
      const home = me?.home_currency || null
      setHomeCurrency(home)

      // Couple members for the "Paid by" selector (fall back to just the viewer).
      const meEntry = { id: session.user.id, display_name: me?.display_name || 'You' }
      if (tripData?.couple_id) {
        const { data: couple } = await supabase.from('couples')
          .select('partner1_id, partner2_id').eq('id', tripData.couple_id).single()
        const pids = [couple?.partner1_id, couple?.partner2_id].filter(Boolean)
        if (pids.length) {
          const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', pids)
          const list = (profs ?? []).map(p => ({
            id: p.id,
            display_name: p.display_name || (p.id === session.user.id ? 'You' : 'Partner'),
          }))
          if (!cancelled) setPartners(list.length ? list : [meEntry])
        } else if (!cancelled) setPartners([meEntry])
      } else if (!cancelled) setPartners([meEntry])

      await loadBookings()

      // FX rates anchored to the trip's destination currency, used to show the
      // destination equivalent for bookings whose fx_rate_locked is null.
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
  }, [id, session])

  const destCur = trip?.destination_currency

  // Destination-currency equivalent of a booking's native charge (primary/bold):
  // locked rate when set, else a live destination-anchored rate, else native.
  const destEquivalent = (b) => {
    if (b.fx_rate_locked != null) return Number(b.price_amount) * Number(b.fx_rate_locked)
    if (!destCur || b.price_currency === destCur) return Number(b.price_amount)
    const rate = destRates?.[b.price_currency]
    return rate != null ? Number(b.price_amount) / rate : null
  }

  // Viewer's home-currency equivalent (subtle/secondary): convert the destination
  // amount via destRates[home] (= home units per 1 destination). null when N/A.
  const homeEquivalent = (b) => {
    if (!homeCurrency || homeCurrency === destCur) return null
    const d = destEquivalent(b)
    if (d == null) return null
    const rate = destRates?.[homeCurrency]
    return rate != null ? d * rate : null
  }

  // Only a true cold load (no trip from state and not yet fetched) shows the
  // full-screen skeleton. With navigation state, the hero renders immediately.
  if (trip === undefined) {
    return <TripDetailSkeleton />
  }
  if (trip === null) {
    return (
      <Shell>
        <BackBtn onClick={() => navigate(-1)} />
        <div style={{ color: colors.textMuted, fontSize: '14px', textAlign: 'center', paddingTop: '60px' }}>Trip not found.</div>
      </Shell>
    )
  }

  return (
    <div className={screenClass(navType)} style={{ minHeight: '100vh', background: colors.bg, position: 'relative', maxWidth: '430px', margin: '0 auto', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Atmospheric hero */}
      <div style={{ position: 'relative', height: '224px', width: '100%', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, transform: 'scale(1.1)',
          background: trip.destination_photo_url
            ? `url(${trip.destination_photo_url}) center/cover no-repeat`
            : `linear-gradient(135deg, ${colors.cardElevated}, ${colors.card})`,
          filter: 'blur(2px)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.4) 45%, ${colors.bg} 100%)` }} />

        {/* Top controls */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '56px 16px 0' }}>
          <button
            onClick={() => navigate(-1)}
            aria-label="Back to trips"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', border: `1px solid ${colors.border}`, background: 'rgba(0,0,0,0.4)', color: colors.text, cursor: 'pointer', backdropFilter: 'blur(8px)' }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setShowEditTrip(true)}
            aria-label="Edit trip"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '100px', border: `1px solid ${colors.border}`, background: 'rgba(0,0,0,0.4)', color: colors.text, fontSize: '13px', fontWeight: '500', padding: '8px 14px', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
          >
            <Pencil size={15} /> Edit
          </button>
        </div>

        {/* Title overlay */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 20px 16px' }}>
          <h1 style={{ fontFamily: serif, fontSize: '28px', fontWeight: '600', lineHeight: 1.15, color: colors.text, margin: 0 }}>
            {trip.trip_name || trip.destination_name || 'Untitled trip'}
          </h1>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'rgba(242,241,237,0.8)', margin: '4px 0 0' }}>
            {trip.destination_name}
            {(trip.dates_from || trip.dates_to) && <> · {fmtDate(trip.dates_from) || '—'} → {fmtDate(trip.dates_to) || '—'}</>}
          </p>
        </div>
      </div>

      {/* Itinerary */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, padding: '20px 16px calc(40px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.textMuted, margin: 0 }}>Itinerary</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: '500', color: colors.textMuted }}>
              {bookings.length} stop{bookings.length !== 1 ? 's' : ''}
            </span>
            {bookings.length > 0 && (
              <button
                onClick={() => setEditing(e => !e)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: editing ? '#E5675F' : colors.gold }}
              >
                {editing ? 'Done' : 'Edit'}
              </button>
            )}
          </div>
        </div>

        {/* Timeline skeleton — only the bookings are still loading; the hero is
            already populated from navigation state. */}
        {!ready && (
          <div>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
                <Sk w={28} h={28} r={14} />
                <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'center', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '12px' }}>
                  <Sk w={52} h={52} r={12} />
                  <div style={{ flex: 1 }}>
                    <Sk w="60%" h={15} style={{ marginBottom: '8px' }} />
                    <Sk w="40%" h={12} />
                  </div>
                  <Sk w={64} h={26} r={100} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {ready && bookings.length === 0 && (
          <div style={{ margin: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center' }}>
            <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text, margin: 0 }}>No reservations yet</p>
            <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>Add hotels, flights and activities to build out this trip.</p>
          </div>
        )}

        {/* Reservation timeline */}
        {ready && bookings.map((b, i) => {
          const cat = CATEGORY[b.category] || CATEGORY.other
          const st = STATUS[b.status] || STATUS.draft
          const last = i === bookings.length - 1
          const num = i + 1

          const dDays = b.deadline_date ? Math.ceil((new Date(b.deadline_date) - new Date()) / 86400000) : null
          const goldDot = b.status === 'booked_unpaid'
          const blueDot = dDays != null && dDays <= 7

          const subtitleBits = [cat.label]
          if (b.nights) subtitleBits.push(`${b.nights} night${b.nights !== 1 ? 's' : ''}`)
          else if (b.deadline_date) subtitleBits.push(`by ${fmtDate(b.deadline_date)}`)

          const payer = b.payer_id ? nameById[b.payer_id] : null
          const dEquiv = destEquivalent(b)
          const hEquiv = homeEquivalent(b)
          const boldCur = destCur || b.price_currency
          const boldVal = dEquiv != null ? dEquiv : Number(b.price_amount)

          return (
            <div key={b.id} className="roamie-rise" style={{ position: 'relative', display: 'flex', gap: '14px', animationDelay: `${i * 70}ms` }}>
              {/* Numbered rail */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px', flexShrink: 0 }}>
                <span style={{ zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', border: `1px solid ${colors.border}`, background: colors.card, fontSize: '12px', fontWeight: '600', color: colors.text }}>{num}</span>
                {!last && <span style={{ position: 'absolute', top: '28px', height: 'calc(100% + 1rem)', width: '1px', background: colors.border }} />}
              </div>

              {/* Card */}
              <button
                onClick={() => editing ? removeBooking(b) : navigate(`/trip/${id}/reservation/${b.id}`)}
                style={{
                  flex: 1, marginBottom: '16px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', gap: '12px', alignItems: 'center',
                  background: colors.card, border: `1px solid ${editing ? 'rgba(229,103,95,0.25)' : colors.border}`, borderRadius: '16px', padding: '12px',
                }}>
                {/* Category glyph */}
                <div style={{ position: 'relative', width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0, background: colors.goldSoft, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editing
                    ? <Trash2 size={20} color="#E5675F" />
                    : <cat.Icon size={22} color={colors.gold} />}
                </div>

                {/* Middle */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.vendor_name || b.title || cat.label}
                    </span>
                    {goldDot && <span title="Unpaid" style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.gold, flexShrink: 0 }} />}
                    {blueDot && <span title="Deadline within 7 days" style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.blue, flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontSize: '12.5px', color: colors.textSoft, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {subtitleBits.join(' · ')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '500', color: st.color, background: st.bg, borderRadius: '100px', padding: '3px 9px' }}>
                      {b.status !== 'draft' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color }} />}
                      {st.label}
                    </span>
                    {payer && <span style={{ fontSize: '11px', color: colors.textMuted }}>{payer} paid</span>}
                  </div>
                </div>

                {/* Right: destination equivalent (primary) + home equivalent (secondary) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '100px', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', fontSize: '13px', fontWeight: '600', color: colors.text, whiteSpace: 'nowrap' }}>
                    {sym(boldCur)}{Math.round(boldVal).toLocaleString()}
                  </span>
                  {hEquiv != null && (
                    <span style={{ fontSize: '11px', color: colors.textMuted, whiteSpace: 'nowrap', paddingRight: '4px' }}>
                      ≈ {sym(homeCurrency)}{Math.round(hEquiv).toLocaleString()}
                    </span>
                  )}
                </div>
              </button>
            </div>
          )
        })}

        {/* Inline add-reservation button */}
        {ready && !editing && (
          <button
            onClick={() => setShowAdd(true)}
            style={{
              marginLeft: '42px', width: 'calc(100% - 42px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              borderRadius: '16px', border: `1px dashed ${colors.border}`, background: 'rgba(18,18,20,0.4)',
              padding: '14px', fontSize: '14px', fontWeight: '500', color: colors.textMuted, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Add reservation
          </button>
        )}
      </div>

      {/* Add-reservation modal */}
      {showAdd && (
        <AddReservationModal
          tripId={id}
          partners={partners}
          defaultCurrency={homeCurrency || trip.destination_currency || 'USD'}
          destinationCurrency={trip.destination_currency}
          onClose={() => setShowAdd(false)}
          onAdded={loadBookings}
        />
      )}

      {/* Edit-trip modal */}
      {showEditTrip && (
        <CreateTripModal
          session={session}
          trip={{ ...trip, id }}
          onClose={() => setShowEditTrip(false)}
          onSaved={reloadTrip}
        />
      )}
    </div>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: colors.bg, maxWidth: '430px', margin: '0 auto', padding: '56px 18px 20px' }}>
      {children}
    </div>
  )
}

function BackBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '50%', width: '40px', height: '40px', color: colors.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <ChevronLeft size={20} />
    </button>
  )
}

// Full-screen placeholder (cold load only — no transform/slide; the populated
// content root owns the screen transition).
function TripDetailSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: colors.bg, maxWidth: '430px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: '224px', flexShrink: 0 }}>
        <Sk w="100%" h={224} r={0} />
        <div style={{ position: 'absolute', top: '56px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Sk w={40} h={40} r={20} />
          <Sk w={72} h={36} r={100} />
        </div>
        <div style={{ position: 'absolute', left: '20px', right: '20px', bottom: '16px' }}>
          <Sk w="70%" h={26} style={{ marginBottom: '8px' }} />
          <Sk w="50%" h={13} />
        </div>
      </div>
      <div style={{ padding: '20px 16px' }}>
        <Sk w={90} h={13} style={{ marginBottom: '20px' }} />
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
            <Sk w={28} h={28} r={14} />
            <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'center', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '12px' }}>
              <Sk w={52} h={52} r={12} />
              <div style={{ flex: 1 }}>
                <Sk w="60%" h={15} style={{ marginBottom: '8px' }} />
                <Sk w="40%" h={12} />
              </div>
              <Sk w={64} h={26} r={100} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
