import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../supabase'

const colors = {
  bg: '#000000',
  card: '#121214',
  gold: '#C9A05C',
  blue: '#6FA8C9',
  text: '#F5F5F5',
  textMuted: '#8A8A8F',
  border: 'rgba(255,255,255,0.08)',
}

export default function Profile({ session }) {
  const navigate = useNavigate()
  const [myProfile, setMyProfile] = useState(null)
  const [partnerProfile, setPartnerProfile] = useState(null)
  const [customAvatar, setCustomAvatar] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackBug, setFeedbackBug] = useState('')
  const [feedbackFeature, setFeedbackFeature] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)

  useEffect(() => {
    if (!session) { navigate('/login'); return }
    ;(async () => {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (profile) {
        setMyProfile(profile)
        if (profile.avatar_url) setCustomAvatar(profile.avatar_url)
        if (profile.couple_id) {
          const { data: couple } = await supabase.from('couples').select('*').eq('id', profile.couple_id).single()
          if (couple?.status === 'connected') {
            const partnerId = couple.partner1_id === session.user.id ? couple.partner2_id : couple.partner1_id
            const { data: partner } = await supabase.from('profiles').select('*').eq('id', partnerId).single()
            setPartnerProfile(partner)
          }
        }
      }
    })()
  }, [session])

  const myName = myProfile?.display_name || session?.user?.user_metadata?.full_name?.split(' ')[0] || 'You'
  const myAvatar = customAvatar || session?.user?.user_metadata?.avatar_url
  const partnerName = partnerProfile?.display_name || partnerProfile?.full_name?.split(' ')[0] || null

  async function uploadAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${session.user.id}/avatar.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', session.user.id)
      setCustomAvatar(data.publicUrl)
    } catch (e) {
      console.error('Upload error:', e)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function submitFeedback() {
    if (!feedbackBug.trim() && !feedbackFeature.trim()) return
    await supabase.from('feedback').insert({
      user_id: session.user.id,
      bug_report: feedbackBug.trim() || null,
      feature_request: feedbackFeature.trim() || null,
    })
    setFeedbackSent(true)
    setTimeout(() => { setShowFeedback(false); setFeedbackBug(''); setFeedbackFeature(''); setFeedbackSent(false) }, 1500)
  }

  const card = { background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '16px' }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, maxWidth: '430px', margin: '0 auto', padding: '20px 18px 40px' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '100px', padding: '8px 14px', color: colors.text, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <ArrowLeft size={15} /> Back
      </button>

      {/* Identity */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '16px', margin: '20px 0 24px', padding: '20px' }}>
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => document.getElementById('avatar-upload').click()}>
          {myAvatar ? (
            <img src={myAvatar} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} alt="you" />
          ) : (
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: colors.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '600', color: '#000' }}>
              {myName[0]?.toUpperCase()}
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderRadius: '50%', background: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>📷</div>
          <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
        </div>
        <div>
          <div style={{ fontSize: '17px', fontWeight: '600', color: colors.text }}>
            {session?.user?.user_metadata?.full_name || myName}
          </div>
          <div style={{ fontSize: '13px', color: colors.textMuted }}>{session?.user?.email}</div>
          {uploadingAvatar && <div style={{ fontSize: '11px', color: colors.gold, marginTop: '4px' }}>Uploading…</div>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        <div onClick={() => navigate('/connect')} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer' }}>
          <div style={{ fontSize: '14px', color: colors.text }}>Partner Sync</div>
          <div style={{ fontSize: '13px', color: colors.textMuted }}>
            {partnerProfile ? `Connected to ${partnerName}` : 'Not connected'} →
          </div>
        </div>

        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
          <div style={{ fontSize: '14px', color: colors.text }}>Subscription</div>
          {myProfile?.is_pro ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#000', background: colors.gold, padding: '3px 10px', borderRadius: '100px' }}>Pro</span>
              <button
                onClick={async () => {
                  const { data: { session: portalSession } } = await supabase.auth.getSession()
                  const res = await fetch('https://roamie-61ib.onrender.com/api/create-portal-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${portalSession?.access_token}` },
                    body: JSON.stringify({}),
                  })
                  const { url } = await res.json()
                  if (url) window.location.href = url
                }}
                style={{ fontSize: '13px', color: colors.blue, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Manage →
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: colors.textMuted }}>Free tier</div>
          )}
        </div>
      </div>

      <button onClick={() => setShowFeedback(true)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: '13px', cursor: 'pointer', padding: '8px 0', width: '100%', textAlign: 'center', marginBottom: '12px' }}>
        Share feedback
      </button>

      <button onClick={() => supabase.auth.signOut().then(() => { localStorage.removeItem('roamie_paid'); navigate('/') })}
        style={{ width: '100%', padding: '16px', background: 'none', border: `1px solid ${colors.border}`, borderRadius: '100px', color: colors.textMuted, fontSize: '14px', cursor: 'pointer' }}>
        Sign out
      </button>

      {showFeedback && (
        <div onClick={() => setShowFeedback(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 32px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '430px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '24px', padding: '24px' }}>
            <div style={{ fontSize: '17px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>Share feedback</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>Something isn't working</label>
                <textarea value={feedbackBug} onChange={e => setFeedbackBug(e.target.value)} placeholder="Describe the issue…" rows={3}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, color: colors.text, fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>I wish Roamie could…</label>
                <textarea value={feedbackFeature} onChange={e => setFeedbackFeature(e.target.value)} placeholder="Share your idea…" rows={3}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, color: colors.text, fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
            </div>
            {feedbackSent ? (
              <div style={{ textAlign: 'center', color: '#34D399', fontSize: '14px', padding: '12px 0' }}>✓ Thanks for the feedback!</div>
            ) : (
              <button onClick={submitFeedback} disabled={!feedbackBug.trim() && !feedbackFeature.trim()}
                style={{ width: '100%', padding: '14px', background: `linear-gradient(135deg, ${colors.gold}, #E0A53B)`, border: 'none', borderRadius: '100px', color: '#000', fontSize: '14px', fontWeight: '700', cursor: feedbackBug.trim() || feedbackFeature.trim() ? 'pointer' : 'default', opacity: feedbackBug.trim() || feedbackFeature.trim() ? 1 : 0.4 }}>
                Submit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
