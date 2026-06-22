import { useState } from 'react'
import { supabase } from '../supabase'
import { CURRENCIES, inputStyle, selectStyle } from './modalStyles'
import { Field, Row, ModalShell, PrimaryButton } from './modalKit'

const CATEGORIES = [
  { value: 'flight', label: 'Flight' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'transport', label: 'Transport' },
  { value: 'activity', label: 'Activity' },
  { value: 'other', label: 'Other' },
]

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'booked_unpaid', label: 'Reserved · Unpaid' },
  { value: 'booked_paid', label: 'Booked · Paid' },
  { value: 'settled', label: 'Settled' },
]

export default function AddReservationModal({ tripId, partners, defaultCurrency, onClose, onAdded }) {
  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState('flight')
  const [status, setStatus] = useState('booked_unpaid')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency || 'USD')
  const [payer, setPayer] = useState(partners[0]?.id || '')
  const [nights, setNights] = useState('')
  const [code, setCode] = useState('')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const valid = vendor.trim() && amount !== '' && Number(amount) >= 0 && currency

  async function submit() {
    if (!valid || saving) return
    setSaving(true); setError('')
    try {
      // title is NOT NULL in the schema; mirror the vendor input into both.
      const { error: err } = await supabase.from('bookings').insert({
        trip_id: tripId,
        title: vendor.trim(),
        vendor_name: vendor.trim(),
        category,
        status,
        price_amount: Number(amount),
        price_currency: currency,
        payer_id: payer || null,
        nights: category === 'hotel' && nights !== '' ? Number(nights) : null,
        confirmation_code: code.trim() || null,
        deadline_date: deadline || null,
      })
      if (err) throw err
      await onAdded()
      onClose()
    } catch (e) {
      console.error('Add reservation error:', e)
      setError('Could not add reservation. Please try again.')
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Add reservation" onClose={onClose}>
      <Field label="Title / vendor" required>
        <input style={inputStyle} value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Ryanair FR1234 · Hotel Lux" autoFocus />
      </Field>
      <Row>
        <div style={{ flex: 1 }}>
          <Field label="Category" required>
            <select style={selectStyle} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Status" required>
            <select style={selectStyle} value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </div>
      </Row>
      <Row>
        <div style={{ flex: 2 }}>
          <Field label="Amount" required>
            <input type="number" inputMode="decimal" min="0" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} placeholder="250" />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Currency" required>
            <select style={selectStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </Row>
      <Field label="Paid by">
        <select style={selectStyle} value={payer} onChange={e => setPayer(e.target.value)}>
          {partners.length === 0 && <option value="">—</option>}
          {partners.map(p => <option key={p.id} value={p.id}>{p.display_name || 'Partner'}</option>)}
        </select>
      </Field>
      {category === 'hotel' && (
        <Field label="Nights">
          <input type="number" inputMode="numeric" min="0" style={inputStyle} value={nights} onChange={e => setNights(e.target.value)} placeholder="3" />
        </Field>
      )}
      <Field label="Confirmation code">
        <input style={inputStyle} value={code} onChange={e => setCode(e.target.value)} placeholder="ABC123" />
      </Field>
      <Field label="Deadline / cancellation date">
        <input type="date" style={{ ...inputStyle, colorScheme: 'dark' }} value={deadline} onChange={e => setDeadline(e.target.value)} />
      </Field>
      {error && <div style={{ color: '#FF6B6B', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}
      <PrimaryButton onClick={submit} disabled={!valid || saving}>
        {saving ? 'Adding…' : 'Add reservation'}
      </PrimaryButton>
    </ModalShell>
  )
}
