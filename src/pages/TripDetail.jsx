import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plane, BedDouble, Car, Ticket, Plus, ArrowLeft } from 'lucide-react'
import { supabase } from '../supabase'

const colors = {
  bg: '#1A1B26',
  card: 'rgba(30, 32, 48, 0.72)',
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
  CNY: '¥', KRW: '₩', PHP: '₱', IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫',
  SGD: 'S$', INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵', KES: 'KSh',
  ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼', BRL: 'R$', MXN: 'MX$',
  COP: 'COL$', ARS: 'AR$', CLP: 'CL$', CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr',
}
const sym = (c) => CURR_SYMBOLS[c] || (c ? `${c} ` : '')

// category -> { icon, label }
const CATEGORY = {
  flight:    { Icon: Plane,     label: 'Flight' },
  hotel:     { Icon: BedDouble, label: 'Hotel' },
  transport: { Icon: Car,       label: 'Transport' },
  other:     { Icon: Ticket,    label: 'Other' },
}

// status -> pill style
const STATUS = {
  booked_paid:   { label: 'Booked · Paid',     color: '#34D399', bg: 'rgba(52,211,153,0.14)',  border: 'rgba(52,211,153,0.35)' },
  booked_unpaid: { label: 'Reserved · Unpaid', color: '#FBBF24', bg: 'rgba(251,191,36,0.14)',  border: 'rgba(251,191,36,0.35)' },
  settled:       { label: 'Settled',           color: '#22D3EE', bg: 'rgba(34,211,238,0.14)',  border: 'rgba(34,211,238,0.35)' },
  draft:         { label: 'Draft',             color: '#8B8FA3', bg: 'rgba(139,143,163,0.12)', border: 'rgba(139,143,163,0.3)' },
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null

export default function TripDetail({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [trip, setTrip] = useState(undefined)   // undefined = loading, null = not found
  const [bookings, setBookings] = useState([])
  const [nameById, setNameById] = useState({})
  const [homeCurrency, setHomeCurrency] = useState(null)
  const [fxRates, setFxRates] = useState(null)   // { [currency]: units per 1 home }
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (!session) { navigate('/login'); return }
    let cancelled = false

    async function load() {
      // Trip + viewer profile in parallel.
      const [{ data: tripData }, { data: me }] = await Promise.all([
        supabase.from('trips')
          .select('trip_name, destination_name, destination_photo_url, dates_from, dates_to, budget_total, budget_currency, destination_currency, destination_iata, country_emoji')
          .eq('id', id).single(),
        supabase.from('profiles').select('home_currency').eq('id', session.user.id).single(),
      ])
      if (cancelled) return
      setTrip(tripData ?? null)
      const home = me?.home_currency || null
      setHomeCurrency(home)

      // Bookings, chronological by deadline (nulls last).
      const { data: bks } = await supabase.from('bookings')
        .select('*')
        .eq('trip_id', id)
        .order('deadline_date', { ascending: true, nullsFirst: false })
      if (cancelled) return
      const rows = bks ?? []
      setBookings(rows)

      // Resolve owner/payer display names in one batched read.
      const ids = [...new Set(rows.flatMap(b => [b.owner_id, b.payer_id]).filter(Boolean))]
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', ids)
        if (cancelled) return
        setNameById(Object.fromEntries((profs ?? []).map(p => [p.id, p.display_name])))
      }

      // Single FX call via our proxy (Frankfurter blocks direct browser CORS).
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
  }, [id, session])

  // Bold figure, anchored to destination_currency (locked rate; matches Dashboard).
  const destAmount = (b) => b.fx_rate_locked != null
    ? Number(b.price_amount) * Number(b.fx_rate_locked)
    : Number(b.price_amount)

  // Subtle figure: price_currency -> home_currency, live Frankfurter (cached).
  const homeAmount = (b) => {
    if (!homeCurrency || !fxRates) return null
    if (b.price_currency === homeCurrency) return Number(b.price_amount)
    const rate = fxRates[b.price_currency]
    if (!rate) return null
    return Number(b.price_amount) / rate
  }

  const destSym = sym(trip?.destination_currency || trip?.budget_currency)

  if (trip === undefined) {
    return <Shell><div style={{ color: colors.textMuted, fontSize: '14px', textAlign: 'center', paddingTop: '80px' }}>Loading…</div></Shell>
  }
  if (trip === null) {
    return (
      <Shell>
        <BackBtn onClick={() => navigate('/dashboard')} />
        <div style={{ color: colors.textMuted, fontSize: '14px', textAlign: 'center', paddingTop: '60px' }}>Trip not found.</div>
      </Shell>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, position: 'relative', maxWidth: '430px', margin: '0 auto', overflow: 'hidden' }}>
      {/* Atmospheric background: destination photo, blurred + darkened, fixed */}
      <div style={{
        position: 'fixed', inset: 0, maxWidth: '430px', margin: '0 auto', zIndex: 0,
        background: trip.destination_photo_url
          ? `url(${trip.destination_photo_url}) center/cover no-repeat`
          : `linear-gradient(135deg, ${colors.primary}, ${colors.pink})`,
        filter: 'blur(18px) brightness(0.4)', transform: 'scale(1.15)',
      }} />
      <div style={{ position: 'fixed', inset: 0, maxWidth: '430px', margin: '0 auto', zIndex: 0, background: 'linear-gradient(to bottom, rgba(26,27,38,0.6) 0%, rgba(26,27,38,0.85) 55%, rgba(26,27,38,0.97) 100%)' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '20px 18px 120px' }}>
        <BackBtn onClick={() => navigate('/dashboard')} />

        {/* Trip header overlay */}
        <div style={{ margin: '20px 0 28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.text, margin: 0, letterSpacing: '-0.5px' }}>
            {trip.country_emoji} {trip.trip_name || trip.destination_name || 'Untitled trip'}
          </h1>
          <p style={{ fontSize: '14px', color: colors.textMuted, margin: '6px 0 0' }}>
            {trip.destination_name}
            {(trip.dates_from || trip.dates_to) && (
              <> · {fmtDate(trip.dates_from) || '—'} → {fmtDate(trip.dates_to) || '—'}</>
            )}
          </p>
        </div>

        {/* Empty state */}
        {bookings.length === 0 && (
          <div style={{ background: colors.card, backdropFilter: 'blur(20px)', border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧾</div>
            <div style={{ color: colors.textMuted, fontSize: '14px' }}>No reservations yet — add your first.</div>
          </div>
        )}

        {/* Reservation timeline */}
        {bookings.map((b, i) => {
          const cat = CATEGORY[b.category] || CATEGORY.other
          const st = STATUS[b.status] || STATUS.draft
          const last = i === bookings.length - 1

          const dDays = b.deadline_date ? Math.ceil((new Date(b.deadline_date) - new Date()) / 86400000) : null
          const goldDot = b.status === 'booked_unpaid'
          const blueDot = dDays != null && dDays <= 7

          const subtitleBits = [cat.label]
          if (b.nights) subtitleBits.push(`${b.nights} night${b.nights !== 1 ? 's' : ''}`)
          else if (b.deadline_date) subtitleBits.push(`by ${fmtDate(b.deadline_date)}`)

          const payer = b.payer_id ? nameById[b.payer_id] : null
          const owner = b.owner_id ? nameById[b.owner_id] : null

          const home = homeAmount(b)

          return (
            <div key={b.id} style={{ display: 'flex', gap: '12px' }}>
              {/* Numbered node + connector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${colors.pink}, ${colors.primary})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '700', color: '#fff',
                }}>{i + 1}</div>
                {!last && <div style={{ flex: 1, width: '2px', background: colors.border, margin: '4px 0', minHeight: '20px' }} />}
              </div>

              {/* Booking card */}
              <div style={{
                flex: 1, marginBottom: '14px',
                background: colors.cardSolid, border: `1px solid ${colors.border}`, borderRadius: '16px',
                padding: '14px', display: 'flex', gap: '12px',
              }}>
                {/* Category glyph */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                  background: 'rgba(124,106,239,0.12)', border: `1px solid ${colors.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <cat.Icon size={20} color={colors.cyan} />
                </div>

                {/* Middle: title / subtitle / payer-owner */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.vendor_name || b.title || cat.label}
                    </span>
                    {/* micro-dots */}
                    {goldDot && <span title="Unpaid" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FBBF24', flexShrink: 0 }} />}
                    {blueDot && <span title="Deadline within 7 days" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22D3EE', flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '2px' }}>
                    {subtitleBits.join(' · ')}
                  </div>
                  {(payer || owner) && (
                    <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
                      {payer ? `${payer} paid` : 'Unpaid'}{owner ? ` · ${owner}'s cost` : ''}
                    </div>
                  )}
                </div>

                {/* Right: amounts + pill */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: colors.text, whiteSpace: 'nowrap' }}>
                      {destSym}{Math.round(destAmount(b)).toLocaleString()}
                    </div>
                    {home != null && (
                      <div style={{ fontSize: '11px', color: colors.textMuted, whiteSpace: 'nowrap' }}>
                        ≈ {sym(homeCurrency)}{Math.round(home).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: '100px', padding: '3px 9px', whiteSpace: 'nowrap', marginTop: '8px' }}>
                    {st.label}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating add button (stub) */}
      <button
        onClick={() => setShowAdd(true)}
        aria-label="Add reservation"
        style={{
          position: 'fixed', bottom: '28px', right: 'max(20px, calc(50% - 215px + 20px))', zIndex: 20,
          width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${colors.pink}, ${colors.primary})`,
          boxShadow: '0 8px 28px rgba(124,106,239,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Plus size={26} color="#fff" />
      </button>

      {/* Add-reservation modal (stub — full form is a later phase) */}
      {showAdd && (
        <div
          onClick={() => setShowAdd(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 32px' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '430px', background: colors.cardSolid, border: `1px solid ${colors.border}`, borderRadius: '24px', padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧾</div>
            <div style={{ fontSize: '17px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>Add a reservation</div>
            <div style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '20px' }}>The add-reservation form is coming soon.</div>
            <button onClick={() => setShowAdd(false)} style={{ width: '100%', padding: '14px', background: `linear-gradient(135deg, ${colors.pink}, ${colors.primary})`, border: 'none', borderRadius: '100px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: colors.bg, maxWidth: '430px', margin: '0 auto', padding: '20px 18px' }}>
      {children}
    </div>
  )
}

function BackBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${colors.border}`, borderRadius: '100px', padding: '8px 14px', color: colors.text, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
    >
      <ArrowLeft size={15} /> Back
    </button>
  )
}
