import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Plus } from 'lucide-react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

const THEME = {
  primary: '#7C6AEF',
  accent: '#F472B6',
  cyan: '#22D3EE',
  text: '#E8E8ED',
  muted: '#8B8FA3',
  border: 'rgba(124, 106, 239, 0.2)',
}

const planetColors = [
  { base: '#8B2942', accent: '#C44569', highlight: '#F472B6', glow: 'rgba(244,114,182,0.5)' },
  { base: '#1E3A5F', accent: '#2E5A8F', highlight: '#4A90C2', glow: 'rgba(74,144,194,0.5)' },
  { base: '#4C3575', accent: '#6B4F9E', highlight: '#9F7AEA', glow: 'rgba(159,122,234,0.5)' },
  { base: '#1A4731', accent: '#2D7A52', highlight: '#34D399', glow: 'rgba(52,211,153,0.5)' },
  { base: '#7A3A1A', accent: '#C4693A', highlight: '#FB923C', glow: 'rgba(251,146,60,0.5)' },
]

const orbitRadii = [140, 190, 230, 160, 210]
const orbitDurations = [55, 75, 95, 45, 85]

export default function Orbit({ session }) {
  const [planets, setPlanets] = useState([])
  const [coupleId, setCoupleId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlanet, setSelectedPlanet] = useState(null)
  const [showAddPlanet, setShowAddPlanet] = useState(false)
  const [newPlanetName, setNewPlanetName] = useState('')
  const [adding, setAdding] = useState(false)
  const [partnerName, setPartnerName] = useState('')
  const [showAddMoon, setShowAddMoon] = useState(false)
const [newMoonLabel, setNewMoonLabel] = useState('')
const [partnerOnline, setPartnerOnline] = useState(false)
const [hasCommittedTrip, setHasCommittedTrip] = useState(false)

  useEffect(() => {
    if (!session) return
    fetchCoupleAndPlanets()
  }, [session])

useEffect(() => {
  if (!coupleId) return

  // Subscribe to planet changes
  const planetSub = supabase
    .channel('planets-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'planets',
      filter: `couple_id=eq.${coupleId}`
    }, async (payload) => {
      // Fetch with moons included
      const { data } = await supabase
        .from('planets')
        .select('*, moons(*)')
        .eq('id', payload.new.id)
        .single()
      if (data) setPlanets(prev => [...prev, data])
    })
    .subscribe()

  // Subscribe to moon changes
  const moonSub = supabase
    .channel('moons-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'moons',
      filter: `couple_id=eq.${coupleId}`
    }, (payload) => {
      setPlanets(prev => prev.map(p =>
        p.id === payload.new.planet_id
          ? { ...p, moons: [...(p.moons || []), payload.new] }
          : p
      ))
    })
    .subscribe()

  return () => {
    supabase.removeChannel(planetSub)
    supabase.removeChannel(moonSub)
  }
}, [coupleId])

useEffect(() => {
  if (!coupleId || !session) return

  // Broadcast my presence
  const presenceChannel = supabase.channel(`presence:${coupleId}`)
  
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState()
      const others = Object.values(state).flat().filter(
        (p) => p.user_id !== session.user.id
      )
      setPartnerOnline(others.length > 0)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ user_id: session.user.id })
      }
    })

  return () => {
    supabase.removeChannel(presenceChannel)
  }
}, [coupleId, session])

  async function fetchCoupleAndPlanets() {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id, display_name')
        .eq('id', session.user.id)
        .single()

      if (!profile?.couple_id) { setLoading(false); return }

      setCoupleId(profile.couple_id)

      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .eq('id', profile.couple_id)
        .single()

      if (couple) {
        const partnerId = couple.partner1_id === session.user.id ? couple.partner2_id : couple.partner1_id
        const { data: partner } = await supabase
          .from('profiles')
          .select('display_name, full_name')
          .eq('id', partnerId)
          .single()
        setPartnerName(partner?.display_name || partner?.full_name?.split(' ')[0] || 'Partner')
      }

      const { data: planetsData } = await supabase
        .from('planets')
        .select('*, moons(*)')
        .eq('couple_id', profile.couple_id)
        .order('created_at', { ascending: true })

      if (planetsData) setPlanets(planetsData)

      const { data: committedTrips } = await supabase
        .from('trips')
        .select('id')
        .eq('couple_id', profile.couple_id)
        .eq('committed', true)
        .limit(1)
      if (committedTrips?.length > 0) setHasCommittedTrip(true)
    } catch (e) {
      console.error('Orbit fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function addPlanet() {
    if (!newPlanetName.trim() || !coupleId) return
    setAdding(true)
    try {
      const { data, error } = await supabase
        .from('planets')
        .insert({ couple_id: coupleId, display_name: newPlanetName.trim() })
        .select('*, moons(*)')
        .single()
      if (error) throw error
      setPlanets(prev => [...prev, data])
      setNewPlanetName('')
      setShowAddPlanet(false)
    } catch (e) {
      console.error('Add planet error:', e)
    } finally {
      setAdding(false)
    }
  }

  async function addMoon() {
  if (!newMoonLabel.trim() || !selectedPlanet) return
  setAdding(true)
  try {
    const { data, error } = await supabase
      .from('moons')
      .insert({
        planet_id: selectedPlanet.id,
        couple_id: coupleId,
        trip_label: newMoonLabel.trim(),
      })
      .select()
      .single()
    if (error) throw error
    // Update local state
    setPlanets(prev => prev.map(p =>
      p.id === selectedPlanet.id
        ? { ...p, moons: [...(p.moons || []), data] }
        : p
    ))
    setSelectedPlanet(prev => ({ ...prev, moons: [...(prev.moons || []), data] }))
    setNewMoonLabel('')
    setShowAddMoon(false)
  } catch (e) {
    console.error('Add moon error:', e)
  } finally {
    setAdding(false)
  }
}

  const visualPlanets = planets.map((p, i) => ({
    ...p,
    texture: planetColors[i % planetColors.length],
    glow: planetColors[i % planetColors.length].glow,
    orbitRadius: orbitRadii[i % orbitRadii.length],
    orbitDuration: orbitDurations[i % orbitDurations.length],
    startAngle: (i * 137) % 360,
  }))

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: THEME.muted, fontSize: '14px' }}>Loading your galaxy...</div>
    </div>
  )

  if (!coupleId) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem' }}>🪐</div>
      <div style={{ fontSize: '20px', fontWeight: '600', color: THEME.text }}>Your Galaxy Awaits</div>
      <div style={{ fontSize: '14px', color: THEME.muted, maxWidth: '280px', lineHeight: 1.6 }}>
        Connect with your partner to start building your shared galaxy of memories.
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#050505' }}>
      <style>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.8; } }
        @keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes counter-orbit { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(-360deg); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        @keyframes moon-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes moon-counter { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes ping { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(2); opacity: 0; } }
      `}</style>

      {/* Starfield */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        {[...Array(80)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 2 + 1,
            height: Math.random() * 2 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            borderRadius: '50%',
            background: 'white',
            opacity: Math.random() * 0.5 + 0.2,
            animation: `twinkle ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }} />
        ))}
      </div>

      {/* Presence Pulse */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 30, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
          {session?.user?.user_metadata?.full_name?.split(' ')[0] || 'You'} & {partnerName}
        </span>
        <div style={{ position: 'relative', width: '12px', height: '12px' }}>
        <div style={{ 
  width: '12px', height: '12px', borderRadius: '50%', 
  background: partnerOnline ? '#22C55E' : '#4B5563',
  boxShadow: partnerOnline ? '0 0 12px #22C55E' : 'none',
  transition: 'all 0.5s ease'
}} />  
         {partnerOnline && (
  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22C55E', opacity: 0.4, animation: 'ping 1.5s ease-out infinite' }} />
)}
        </div>
      </div>

      {/* Add Planet Button */}
      <button
        onClick={() => setShowAddPlanet(true)}
        style={{
          position: 'absolute', top: '24px', left: '24px', zIndex: 30,
          width: '40px', height: '40px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
        }}
      >
        <Plus size={20} color="rgba(255,255,255,0.7)" />
      </button>

      <button
  onClick={() => navigate('/dashboard')}
  style={{
    position: 'absolute', top: '24px', left: '72px', zIndex: 30,
    height: '40px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '0 14px',
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
  }}
>
  ← Dashboard
</button>

      {/* Galaxy Container */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Orbit Paths */}
        {visualPlanets.map((planet) => (
          <div key={`orbit-${planet.id}`} style={{
            position: 'absolute',
            width: planet.orbitRadius * 2,
            height: planet.orbitRadius * 2,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)',
            pointerEvents: 'none',
          }} />
        ))}

        {/* Planning Ring */}
        {hasCommittedTrip && (
          <div style={{
            position: 'absolute',
            width: 148, height: 148,
            borderRadius: '50%',
            border: '2px dashed rgba(255,180,50,0.55)',
            boxShadow: '0 0 20px rgba(255,180,50,0.15)',
            pointerEvents: 'none',
            animation: 'pulse-glow 3s ease-in-out infinite',
          }} />
        )}

        {/* Sun */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{
            position: 'relative', zIndex: 10,
            width: 110, height: 110,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at 35% 35%, #FFF8E7, #FFD93D 30%, #FF9500 60%, #FF6B00 80%, #E85D00)',
            boxShadow: '0 0 80px rgba(255,180,50,0.7), 0 0 150px rgba(255,140,50,0.5), 0 0 200px rgba(255,100,50,0.3)',
          }}
        >
          <span style={{ position: 'relative', zIndex: 10, fontSize: '12px', fontWeight: '600', color: 'white', textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.5)', padding: '0 8px' }}>
            Our<br/>Galaxy
          </span>
        </motion.div>

        {/* Empty state */}
        {visualPlanets.length === 0 && (
          <div style={{ position: 'absolute', top: '62%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '13px', color: THEME.muted }}>Tap + to add your first destination</div>
          </div>
        )}

        {/* Planets */}
        {visualPlanets.map((planet, index) => (
          <div
            key={planet.id}
            style={{
              position: 'absolute',
              width: planet.orbitRadius * 2,
              height: planet.orbitRadius * 2,
              animation: `orbit ${planet.orbitDuration}s linear infinite`,
              animationDelay: `${-(planet.startAngle / 360) * planet.orbitDuration}s`,
              pointerEvents: 'none',
            }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.15, duration: 0.5 }}
              style={{
                position: 'absolute',
                right: -24, top: '50%',
                animation: `counter-orbit ${planet.orbitDuration}s linear infinite`,
                animationDelay: `${-(planet.startAngle / 360) * planet.orbitDuration}s`,
                pointerEvents: 'none',
              }}
            >
              {/* Moons */}
              {planet.moons && planet.moons.length > 0 && (
                <div style={{
                  position: 'absolute',
                  width: 90, height: 90,
                  left: -21, top: -21,
                  animation: 'moon-orbit 12s linear infinite',
                }}>
                  {planet.moons.map((moon, mi) => {
                    const moonAngle = (mi * (360 / planet.moons.length)) * (Math.PI / 180)
                    const moonX = Math.cos(moonAngle) * 38
                    const moonY = Math.sin(moonAngle) * 38
                    return (
                      <div
                        key={moon.id}
                        style={{
                          position: 'absolute',
                          width: 10, height: 10,
                          borderRadius: '50%',
                          left: `calc(50% + ${moonX}px - 5px)`,
                          top: `calc(50% + ${moonY}px - 5px)`,
                          background: `radial-gradient(circle at 25% 25%, #fff, ${planet.texture.highlight} 60%)`,
                          boxShadow: `0 0 8px ${planet.texture.highlight}`,
                          animation: 'moon-counter 12s linear infinite',
                          cursor: 'pointer',
                        }}
                      />
                    )
                  })}
                </div>
              )}

              {/* Planet */}
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedPlanet(planet)}
                style={{
                  width: 48, height: 48,
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  background: `radial-gradient(circle at 25% 25%, ${planet.texture.highlight} 0%, transparent 50%), radial-gradient(circle at 70% 60%, ${planet.texture.accent} 0%, transparent 40%), radial-gradient(circle at 50% 50%, ${planet.texture.base} 0%, ${planet.texture.base} 100%)`,
                  boxShadow: `0 0 24px ${planet.glow}, 0 0 48px ${planet.glow}, inset -8px -8px 20px rgba(0,0,0,0.4)`,
                }}
              />
            </motion.div>
          </div>
        ))}
      </div>

      {/* Crystallize Button */}
      <div style={{ position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddPlanet(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', borderRadius: '100px',
            fontSize: '14px', fontWeight: '500', color: 'white',
            border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.accent})`,
            boxShadow: '0 0 30px rgba(124,106,239,0.4)',
          }}
        >
          <Sparkles size={16} />
          Add Trip Memory
        </motion.button>
      </div>

      {/* Add Planet Modal */}
      <AnimatePresence>
        {showAddPlanet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!showAddMoon) setSelectedPlanet(null) }}
            style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '360px', borderRadius: '24px', padding: '24px', background: 'rgba(25,25,30,0.95)', border: `1px solid ${THEME.border}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: THEME.text, margin: 0 }}>Add a destination</h2>
                <button onClick={() => setShowAddPlanet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="rgba(255,255,255,0.5)" />
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. Manchester, Paris, Tokyo..."
                value={newPlanetName}
                onChange={e => setNewPlanetName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPlanet()}
                autoFocus
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${THEME.border}`,
                  borderRadius: '12px', color: THEME.text,
                  fontSize: '14px', outline: 'none',
                  marginBottom: '16px', fontFamily: 'Inter, sans-serif',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={addPlanet}
                disabled={adding || !newPlanetName.trim()}
                style={{
                  width: '100%', padding: '14px',
                  background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`,
                  border: 'none', borderRadius: '100px',
                  color: '#fff', fontSize: '14px', fontWeight: '600',
                  cursor: adding ? 'wait' : 'pointer',
                  opacity: !newPlanetName.trim() ? 0.4 : 1,
                }}
              >
                {adding ? 'Adding...' : 'Add to Galaxy'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
  {showAddMoon && selectedPlanet && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setShowAddMoon(false)}
      style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '360px', borderRadius: '24px', padding: '24px', background: 'rgba(25,25,30,0.95)', border: `1px solid ${THEME.border}` }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: THEME.text, margin: 0 }}>Add a memory</h2>
          <button onClick={() => setShowAddMoon(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="rgba(255,255,255,0.5)" />
          </button>
        </div>
        <p style={{ fontSize: '13px', color: THEME.muted, marginBottom: '16px' }}>
          A trip or moment in {selectedPlanet.display_name}
        </p>
        <input
          type="text"
          placeholder="e.g. Christmas '26, First Visit, Summer Trip..."
          value={newMoonLabel}
          onChange={e => setNewMoonLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addMoon()}
          autoFocus
          style={{
            width: '100%', padding: '12px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${THEME.border}`,
            borderRadius: '12px', color: THEME.text,
            fontSize: '14px', outline: 'none',
            marginBottom: '16px', fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={addMoon}
          disabled={adding || !newMoonLabel.trim()}
          style={{
            width: '100%', padding: '14px',
            background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`,
            border: 'none', borderRadius: '100px',
            color: '#fff', fontSize: '14px', fontWeight: '600',
            cursor: adding ? 'wait' : 'pointer',
            opacity: !newMoonLabel.trim() ? 0.4 : 1,
          }}
        >
          {adding ? 'Adding...' : 'Add Memory'}
        </button>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      {/* Planet Modal */}
      <AnimatePresence>
        {selectedPlanet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setSelectedPlanet(null); setShowAddMoon(false) }}
            style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '360px', borderRadius: '24px', padding: '24px', background: 'rgba(25,25,30,0.95)', border: `1px solid ${selectedPlanet.texture.highlight}33`, boxShadow: `0 0 80px ${selectedPlanet.glow}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: `radial-gradient(circle at 25% 25%, ${selectedPlanet.texture.highlight} 0%, transparent 50%), radial-gradient(circle at 50% 50%, ${selectedPlanet.texture.base} 0%, ${selectedPlanet.texture.base} 100%)`,
                  boxShadow: `0 0 40px ${selectedPlanet.glow}`,
                }} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '600', color: THEME.text, textAlign: 'center', marginBottom: '4px' }}>
                {selectedPlanet.display_name}
              </h2>
              <p style={{ fontSize: '12px', color: THEME.muted, textAlign: 'center', marginBottom: '20px' }}>
                {selectedPlanet.moons?.length || 0} {selectedPlanet.moons?.length === 1 ? 'memory' : 'memories'}
              </p>

              {selectedPlanet.moons && selectedPlanet.moons.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', color: THEME.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trips & Memories</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedPlanet.moons.map(moon => (
                      <div key={moon.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: `radial-gradient(circle at 25% 25%, #fff, ${selectedPlanet.texture.highlight} 60%)`, boxShadow: `0 0 8px ${selectedPlanet.texture.highlight}` }} />
                        <span style={{ fontSize: '13px', color: THEME.text }}>{moon.trip_label}</span>
                        {moon.is_side_quest && <span style={{ fontSize: '10px', color: THEME.muted, marginLeft: 'auto' }}>side quest</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
  onClick={(e) => { e.stopPropagation(); setShowAddMoon(true) }}
  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`, border: 'none', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '8px' }}
>
  + Add Memory
</button>

<button
  onClick={async () => {
    if (!confirm(`Delete ${selectedPlanet.display_name} and all its memories?`)) return
    await supabase.from('moons').delete().eq('planet_id', selectedPlanet.id)
    await supabase.from('planets').delete().eq('id', selectedPlanet.id)
    setPlanets(prev => prev.filter(p => p.id !== selectedPlanet.id))
    setSelectedPlanet(null)
  }}
  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.2)', color: '#FF6B6B', fontSize: '13px', cursor: 'pointer', marginBottom: '8px' }}
>
  Delete planet
</button>

<button
  onClick={() => setSelectedPlanet(null)}
  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: THEME.muted, fontSize: '13px', cursor: 'pointer' }}
>
  Close
</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}