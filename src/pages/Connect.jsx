import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Connect({ session }) {
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [coupled, setCoupled] = useState(false)
  const [partnerName, setPartnerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [copyDone, setCopyDone] = useState(false)
  const [error, setError] = useState('')
  const accent = '#FF6B35'
  const purple = '#9c7ec4'

useEffect(() => {
  if (!session) { navigate('/login'); return }
  
  // Check if coming from invite link
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (code) {
    // Extract just the code if full URL was pasted
    const extractedCode = code.includes('roamie-') 
      ? code.split('roamie-')[1] 
        ? 'roamie-' + code.split('roamie-')[1].split('?')[0].split(' ')[0]
        : code 
      : code
    setInputCode(extractedCode)
  }
  
  checkCoupleStatus()
}, [session])

  async function checkCoupleStatus() {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id')
        .eq('id', session.user.id)
        .single()

      if (profile?.couple_id) {
        const { data: couple } = await supabase
          .from('couples')
          .select('*')
          .eq('id', profile.couple_id)
          .single()

        if (couple?.status === 'connected') {
          const partnerId = couple.partner1_id === session.user.id
            ? couple.partner2_id
            : couple.partner1_id

          const { data: partnerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', partnerId)
            .single()

          setPartnerName(partnerProfile?.full_name?.split(' ')[0] || 'Your partner')
          setCoupled(true)
        } else if (couple?.invite_code) {
          setInviteCode(couple.invite_code)
        }
      }
    } catch (e) {
      console.error('Check couple status error:', e)
    }
  }

  async function generateInvite() {
    setLoading(true)
    try {
      const res = await fetch('https://roamie-61ib.onrender.com/api/create-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET,
        },
        body: JSON.stringify({ userId: session.user.id })
      })
      const data = await res.json()
      setInviteCode(data.invite_code)
    } catch (e) {
      console.error('Generate invite error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function acceptInvite() {
  if (!inputCode.trim()) return
  setLoading(true)
  setError('')
  
  // Extract code if full URL pasted
  let code = inputCode.trim()
  if (code.includes('?code=')) {
    code = code.split('?code=')[1]
  }
  if (code.includes('&')) {
    code = code.split('&')[0]
  }
    try {
      const res = await fetch('https://roamie-61ib.onrender.com/api/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET,
        },
        body: JSON.stringify({ inviteCode: code, userId: session.user.id })
      })
      const data = await res.json()
      if (data.success) {
        await checkCoupleStatus()
      } else {
        setError(data.error || 'Invalid invite code')
      }
    } catch (e) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }



async function disconnect() {
  if (!window.confirm('Are you sure you want to disconnect from your partner?')) return
  setLoading(true)
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('couple_id')
      .eq('id', session.user.id)
      .single()

    if (profile?.couple_id) {
      await supabase
        .from('profiles')
        .update({ couple_id: null })
        .eq('couple_id', profile.couple_id)

      await supabase
        .from('couples')
        .delete()
        .eq('id', profile.couple_id)
    }

    setCoupled(false)
    setPartnerName('')
    setInviteCode('')
  } catch (e) {
    console.error('Disconnect error:', e)
  } finally {
    setLoading(false)
  }
}

  function copyInviteLink() {
    const link = `https://roamie-nu.vercel.app/connect?code=${inviteCode}`
    navigator.clipboard.writeText(link)
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2000)
  }

  if (coupled) return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💑</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', marginBottom: '0.5rem' }}>
        You're connected
      </div>
      <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        You and <span style={{ color: accent }}>{partnerName}</span> are synced on Roamie
      </div>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          background: accent,
          border: 'none',
          borderRadius: '100px',
          padding: '14px 36px',
          color: '#0a0a0a',
          fontSize: '15px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Go to dashboard ✦
      </button>
    <button
  onClick={disconnect}
  disabled={loading}
  style={{
    marginTop: '1rem',
    background: 'none',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '100px',
    padding: '10px 24px',
    color: 'var(--text-muted)',
    fontSize: '13px',
    cursor: 'pointer',
  }}
>
  Disconnect partner
</button>
</div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '2rem 1.5rem',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      <button
        onClick={() => navigate('/dashboard')}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', marginBottom: '2rem', padding: 0 }}
      >
        ← back
      </button>

      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', marginBottom: '0.5rem' }}>
        Connect with your partner
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
        Link your accounts so you can plan trips together, share favorites, and track booking progress.
      </div>

      {/* Generate invite */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        marginBottom: '1rem',
      }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: accent, marginBottom: '0.75rem', fontWeight: '500' }}>
          Step 1 — Send your invite
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.6' }}>
          Generate a link and send it to your partner. They click it and you're connected.
        </div>

        {!inviteCode ? (
          <button
            onClick={generateInvite}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: accent,
              border: 'none',
              borderRadius: '100px',
              color: '#0a0a0a',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Generating...' : 'Generate invite link'}
          </button>
        ) : (
          <div>
            <div style={{
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '10px',
              wordBreak: 'break-all',
            }}>
              roamie-nu.vercel.app/connect?code={inviteCode}
            </div>
            <button
              onClick={copyInviteLink}
              style={{
                width: '100%',
                padding: '12px',
                background: copyDone ? 'rgba(255,255,255,0.06)' : 'rgba(255,107,53,0.15)',
                border: `1px solid ${copyDone ? 'rgba(255,255,255,0.1)' : 'rgba(255,107,53,0.3)'}`,
                borderRadius: '100px',
                color: copyDone ? 'rgba(255,255,255,0.4)' : accent,
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              {copyDone ? '✓ Copied!' : 'Copy invite link'}
            </button>
          </div>
        )}
      </div>

      {/* Accept invite */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
      }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: purple, marginBottom: '0.75rem', fontWeight: '500' }}>
          Step 2 — Got a link from your partner?
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.6' }}>
          Paste their invite code below to connect.
        </div>
        <input
          type="text"
          placeholder="roamie-xxxxxx"
          value={inputCode}
          onChange={e => setInputCode(e.target.value)}
          style={{ marginBottom: '10px' }}
        />
        {error && (
          <div style={{ fontSize: '13px', color: '#ff6b6b', marginBottom: '10px' }}>
            {error}
          </div>
        )}
        <button
          onClick={acceptInvite}
          disabled={loading || !inputCode.trim()}
          style={{
            width: '100%',
            padding: '14px',
            background: 'rgba(156,126,196,0.15)',
            border: '1px solid rgba(156,126,196,0.3)',
            borderRadius: '100px',
            color: purple,
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'wait' : 'pointer',
            opacity: !inputCode.trim() ? 0.4 : 1,
          }}
        >
          {loading ? 'Connecting...' : 'Connect with partner'}
        </button>
      </div>
    </div>
  )
}