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

  useEffect(() => {
    if (!session) { navigate('/login'); return }
    
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
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

  // Connected state
  if (coupled) return (
    <div style={{
      minHeight: '100vh',
      background: '#1A1B26',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pulseRing { 0%,100%{box-shadow:0 0 0 0 rgba(34,211,238,0.4)} 50%{box-shadow:0 0 0 15px rgba(34,211,238,0)} }
      `}</style>

      {/* Stars */}
      {[...Array(15)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          background: '#fff',
          borderRadius: '50%',
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          opacity: 0.3,
          animation: `twinkle ${3 + Math.random() * 2}s ease-in-out infinite`,
        }} />
      ))}

      {/* Connection visual */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '1.5rem',
        animation: 'float 4s ease-in-out infinite',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #22D3EE, #7C6AEF)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: '600',
          color: '#fff',
          boxShadow: '0 0 30px rgba(34,211,238,0.5)',
          animation: 'pulseRing 2s ease-in-out infinite',
        }}>
          {session?.user?.user_metadata?.full_name?.[0] || 'Y'}
        </div>
        <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
          <path d="M4 12H28" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="4 4"/>
          <circle cx="16" cy="12" r="4" fill="#22D3EE"/>
          <defs>
            <linearGradient id="lineGrad" x1="4" y1="12" x2="28" y2="12">
              <stop stopColor="#22D3EE"/>
              <stop offset="1" stopColor="#F472B6"/>
            </linearGradient>
          </defs>
        </svg>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #F472B6, #7C6AEF)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: '600',
          color: '#fff',
          boxShadow: '0 0 30px rgba(244,114,182,0.5)',
          animation: 'pulseRing 2s ease-in-out infinite 0.5s',
        }}>
          {partnerName[0] || 'P'}
        </div>
      </div>

      <div style={{ 
        fontFamily: "'Geist', sans-serif", 
        fontSize: '1.8rem', 
        fontWeight: '600',
        marginBottom: '0.5rem',
        color: '#E8E8ED',
      }}>
        {"You're connected"}
      </div>
      <div style={{ fontSize: '15px', color: '#8B8FA3', marginBottom: '2rem' }}>
        You and <span style={{ color: '#22D3EE', fontWeight: '500' }}>{partnerName}</span> are synced on Roamie
      </div>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          background: 'linear-gradient(135deg, #22D3EE, #7C6AEF)',
          border: 'none',
          borderRadius: '100px',
          padding: '16px 36px',
          color: '#fff',
          fontSize: '15px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 0 30px rgba(34,211,238,0.4)',
          marginBottom: '1rem',
        }}
      >
        Go to dashboard
      </button>
      <button
        onClick={disconnect}
        disabled={loading}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '100px',
          padding: '12px 24px',
          color: '#8B8FA3',
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        Disconnect partner
      </button>
    </div>
  )

  // Not connected state
  return (
    <div style={{
      minHeight: '100vh',
      background: '#1A1B26',
      padding: '2rem 1.5rem',
      maxWidth: '480px',
      margin: '0 auto',
      position: 'relative',
    }}>
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
      `}</style>

      {/* Stars */}
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{
          position: 'fixed',
          width: '1px',
          height: '1px',
          background: '#fff',
          borderRadius: '50%',
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          opacity: 0.3,
          animation: `twinkle ${3 + Math.random() * 2}s ease-in-out infinite`,
        }} />
      ))}

      <button
        onClick={() => navigate('/dashboard')}
        style={{ 
          background: 'none', 
          border: 'none', 
          color: '#8B8FA3', 
          fontSize: '13px', 
          cursor: 'pointer', 
          marginBottom: '2rem', 
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        back
      </button>

      <div style={{ 
        fontFamily: "'Geist', sans-serif", 
        fontSize: '1.8rem', 
        fontWeight: '600',
        marginBottom: '0.5rem',
        color: '#E8E8ED',
      }}>
        Connect with your partner
      </div>
      <div style={{ 
        fontSize: '14px', 
        color: '#8B8FA3', 
        marginBottom: '2.5rem', 
        lineHeight: '1.6' 
      }}>
        Link your accounts so you can plan trips together, share favorites, and track booking progress.
      </div>

      {/* Generate invite card */}
      <div style={{
        background: 'rgba(30,32,48,0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(124,106,239,0.2)',
        borderRadius: '20px',
        padding: '1.5rem',
        marginBottom: '1rem',
      }}>
        <div style={{ 
          fontSize: '11px', 
          letterSpacing: '0.12em', 
          textTransform: 'uppercase', 
          color: '#7C6AEF', 
          marginBottom: '0.75rem', 
          fontWeight: '600' 
        }}>
          Step 1 — Send your invite
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: '#8B8FA3', 
          marginBottom: '1rem', 
          lineHeight: '1.6' 
        }}>
          {"Generate a link and send it to your partner. They click it and you're connected."}
        </div>

        {!inviteCode ? (
          <button
            onClick={generateInvite}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #7C6AEF, #F472B6)',
              border: 'none',
              borderRadius: '100px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 0 24px rgba(124,106,239,0.4)',
            }}
          >
            {loading ? 'Generating...' : 'Generate invite link'}
          </button>
        ) : (
          <div>
            <div style={{
              background: 'rgba(124,106,239,0.1)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '13px',
              color: '#8B8FA3',
              marginBottom: '10px',
              wordBreak: 'break-all',
              border: '1px solid rgba(124,106,239,0.2)',
            }}>
              roamie-nu.vercel.app/connect?code={inviteCode}
            </div>
            <button
              onClick={copyInviteLink}
              style={{
                width: '100%',
                padding: '12px',
                background: copyDone ? 'rgba(34,211,238,0.1)' : 'rgba(124,106,239,0.15)',
                border: `1px solid ${copyDone ? 'rgba(34,211,238,0.3)' : 'rgba(124,106,239,0.3)'}`,
                borderRadius: '100px',
                color: copyDone ? '#22D3EE' : '#7C6AEF',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {copyDone ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Copied!
                </>
              ) : 'Copy invite link'}
            </button>
          </div>
        )}
      </div>

      {/* Accept invite card */}
      <div style={{
        background: 'rgba(30,32,48,0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(244,114,182,0.2)',
        borderRadius: '20px',
        padding: '1.5rem',
      }}>
        <div style={{ 
          fontSize: '11px', 
          letterSpacing: '0.12em', 
          textTransform: 'uppercase', 
          color: '#F472B6', 
          marginBottom: '0.75rem', 
          fontWeight: '600' 
        }}>
          Step 2 — Got a link from your partner?
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: '#8B8FA3', 
          marginBottom: '1rem', 
          lineHeight: '1.6' 
        }}>
          Paste their invite code below to connect.
        </div>
        <input
          type="text"
          placeholder="roamie-xxxxxx"
          value={inputCode}
          onChange={e => setInputCode(e.target.value)}
          style={{ 
            width: '100%',
            marginBottom: '10px',
            padding: '14px 18px',
            background: 'rgba(30,32,48,0.8)',
            border: '1px solid rgba(244,114,182,0.2)',
            borderRadius: '100px',
            color: '#E8E8ED',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        {error && (
          <div style={{ 
            fontSize: '13px', 
            color: '#FF6B6B', 
            marginBottom: '10px',
            padding: '8px 12px',
            background: 'rgba(255,107,107,0.1)',
            borderRadius: '8px',
          }}>
            {error}
          </div>
        )}
        <button
          onClick={acceptInvite}
          disabled={loading || !inputCode.trim()}
          style={{
            width: '100%',
            padding: '14px',
            background: 'rgba(244,114,182,0.15)',
            border: '1px solid rgba(244,114,182,0.3)',
            borderRadius: '100px',
            color: '#F472B6',
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