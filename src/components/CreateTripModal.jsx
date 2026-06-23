import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { CURRENCIES, inputStyle, selectStyle } from './modalStyles'
import { Field, Row, ModalShell, PrimaryButton } from './modalKit'

const API = 'https://roamie-61ib.onrender.com'

// `trip` present => edit mode (prefill + UPDATE, calls onSaved); absent => create
// mode (INSERT, calls onCreated with the new id).
export default function CreateTripModal({ session, profile, trip, onClose, onCreated, onSaved }) {
  const editing = !!trip
  const [name, setName] = useState(trip?.trip_name || '')
  const [destination, setDestination] = useState(trip?.destination_name || '')
  const [from, setFrom] = useState(trip?.dates_from || '')
  const [to, setTo] = useState(trip?.dates_to || '')
  const [budget, setBudget] = useState(trip?.budget_total != null ? String(trip.budget_total) : '')
  const [budgetCur, setBudgetCur] = useState(trip?.budget_currency || 'USD')
  const [destCur, setDestCur] = useState(trip?.destination_currency || 'USD')
  // In edit mode treat the destination currency as already chosen so the sync
  // effect below doesn't overwrite it from the budget currency.
  const [destTouched, setDestTouched] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Destination currency defaults to the budget currency until manually changed.
  useEffect(() => { if (!destTouched) setDestCur(budgetCur) }, [budgetCur, destTouched])

  const valid = name.trim() && destination.trim() && from && to && budget !== '' && Number(budget) >= 0

  async function submit() {
    if (!valid || saving) return
    setSaving(true); setError('')
    try {
      // Fetch an Unsplash photo for new trips, or when the destination changed on
      // edit. Otherwise keep the existing photo. Non-blocking on failure.
      const destChanged = editing && destination.trim() !== (trip.destination_name || '')
      let photo = editing ? (trip.destination_photo_url || null) : null
      if (!editing || destChanged) {
        try {
          const r = await fetch(`${API}/api/photo?city=${encodeURIComponent(destination.trim())}`)
          const j = await r.json()
          photo = j?.url || photo
        } catch { /* keep existing / null */ }
      }

      const fields = {
        trip_name: name.trim(),
        destination_name: destination.trim(),
        destination_photo_url: photo,
        dates_from: from,
        dates_to: to,
        budget_total: Number(budget),
        budget_currency: budgetCur,
        destination_currency: destCur,
      }

      if (editing) {
        const { error: err } = await supabase.from('trips').update(fields).eq('id', trip.id)
        if (err) throw err
        await onSaved?.()
        onClose()
      } else {
        const { data, error: err } = await supabase.from('trips')
          .insert({ user_id: session.user.id, couple_id: profile?.couple_id || null, ...fields })
          .select('id').single()
        if (err) throw err
        onCreated(data.id)
      }
    } catch (e) {
      console.error('Save trip error:', e)
      setError(`Could not ${editing ? 'save' : 'create'} trip. Please try again.`)
      setSaving(false)
    }
  }

  return (
    <ModalShell title={editing ? 'Edit trip' : 'New trip'} onClose={onClose}>
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
        {saving ? (editing ? 'Saving…' : 'Creating…') : (editing ? 'Save changes' : 'Create trip')}
      </PrimaryButton>
    </ModalShell>
  )
}
