import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { CURRENCIES, inputStyle, selectStyle } from './modalStyles'
import { Field, Row, ModalShell, PrimaryButton } from './modalKit'

const API = 'https://roamie-61ib.onrender.com'

export default function CreateTripModal({ session, profile, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [budget, setBudget] = useState('')
  const [budgetCur, setBudgetCur] = useState('USD')
  const [destCur, setDestCur] = useState('USD')
  const [destTouched, setDestTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Destination currency defaults to the budget currency until manually changed.
  useEffect(() => { if (!destTouched) setDestCur(budgetCur) }, [budgetCur, destTouched])

  const valid = name.trim() && destination.trim() && from && to && budget !== '' && Number(budget) >= 0

  async function submit() {
    if (!valid || saving) return
    setSaving(true); setError('')
    try {
      // Optional Unsplash photo for the destination (non-blocking on failure).
      let photo = null
      try {
        const r = await fetch(`${API}/api/photo?city=${encodeURIComponent(destination.trim())}`)
        const j = await r.json()
        photo = j?.url || null
      } catch { /* no photo is fine */ }

      const { data, error: err } = await supabase.from('trips').insert({
        user_id: session.user.id,
        couple_id: profile?.couple_id || null,
        trip_name: name.trim(),
        destination_name: destination.trim(),
        destination_photo_url: photo,
        dates_from: from,
        dates_to: to,
        budget_total: Number(budget),
        budget_currency: budgetCur,
        destination_currency: destCur,
      }).select('id').single()
      if (err) throw err
      onCreated(data.id)
    } catch (e) {
      console.error('Create trip error:', e)
      setError('Could not create trip. Please try again.')
      setSaving(false)
    }
  }

  return (
    <ModalShell title="New trip" onClose={onClose}>
      <Field label="Trip name" required>
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Our Lisbon escape" autoFocus />
      </Field>
      <Field label="Destination" required>
        <input style={inputStyle} value={destination} onChange={e => setDestination(e.target.value)} placeholder="Lisbon, Portugal" />
      </Field>
      <Row>
        <div style={{ flex: 1 }}>
          <Field label="From" required>
            <input type="date" style={{ ...inputStyle, colorScheme: 'dark' }} value={from} onChange={e => setFrom(e.target.value)} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="To" required>
            <input type="date" style={{ ...inputStyle, colorScheme: 'dark' }} value={to} min={from || undefined} onChange={e => setTo(e.target.value)} />
          </Field>
        </div>
      </Row>
      <Field label="Shared budget" required>
        <input type="number" inputMode="decimal" min="0" style={inputStyle} value={budget} onChange={e => setBudget(e.target.value)} placeholder="3000" />
      </Field>
      <Row>
        <div style={{ flex: 1 }}>
          <Field label="Budget currency" required>
            <select style={selectStyle} value={budgetCur} onChange={e => setBudgetCur(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Destination currency" required>
            <select style={selectStyle} value={destCur} onChange={e => { setDestTouched(true); setDestCur(e.target.value) }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </Row>
      {error && <div style={{ color: '#FF6B6B', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}
      <PrimaryButton onClick={submit} disabled={!valid || saving}>
        {saving ? 'Creating…' : 'Create trip'}
      </PrimaryButton>
    </ModalShell>
  )
}
