import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Plus } from 'lucide-react'
import { supabase } from '../supabase'

const THEME = {
  bg: '#1A1B26',
  primary: '#7C6AEF',
  accent: '#F472B6',
  cyan: '#22D3EE',
  text: '#E8E8ED',
  muted: '#8B8FA3',
  border: 'rgba(124, 106, 239, 0.2)',
}

export default function Orbit({ session }) {
  const [planets, setPlanets] = useState([])
  const [coupleId, setCoupleId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlanet, setSelectedPlanet] = useState(null)
  const [selectedMoon, setSelectedMoon] = useState(null)
  const [showAddPlanet, setShowAddPlanet] = useState(false)
  const [newPlanetName, setNewPlanetName] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!session) return
    fetchCoupleAndPlanets()
  }, [session])

  async function fetchCoupleAndPlanets() {
    try {
      // Get couple_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id')
        .eq('id', session.user.id)
        .single()

      if (!profile?.couple_id) {
        setLoading(false)
        return
      }

      setCoupleId(profile.couple_id)

      // Fetch planets with their moons
      const { data: planetsData } = await supabase
        .from('planets')
        .select('*, moons(*)')
        .eq('couple_id', profile.couple_id)
        .order('created_at', { ascending: true })

      if (planetsData) setPlanets(planetsData)
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
        .insert({
          couple_id: coupleId,
          display_name: newPlanetName.trim(),
        })
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

  // Map planets to V0 visual format
  const planetColors = [
    { base: '#1E3A5F', accent: '#2E5A8F', highlight: '#4A90C2', glow: 'rgba(74,144,194,0.5)' },
    { base: '#8B2942', accent: '#C44569', highlight: '#F472B6', glow: 'rgba(244,114,182,0.5)' },
    { base: '#4C3575', accent: '#6B4F9E', highlight: '#9F7AEA', glow: 'rgba(159,122,234,0.5)' },
    { base: '#1A4731', accent: '#2D7A52', highlight: '#34D399', glow: 'rgba(52,211,153,0.5)' },
    { base: '#7A3A1A', accent: '#C4693A', highlight: '#FB923C', glow: 'rgba(251,146,60,0.5)' },
  ]

  const orbitRadii = [140, 190, 230, 160, 210]
  const orbitDurations = [55, 75, 95, 45, 85]

  const visualPlanets = planets.map((p, i) => ({
    ...p,
    texture: planetColors[i % planetColors.length],
    glow: planetColors[i % planetColors.length].glow,
    orbitRadius: orbitRadii[i % orbitRadii.length],
    orbitDuration: orbitDurations[i % orbitDurations.length],
    startAngle: (i * 137) % 360, // golden angle distribution
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
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#050505' }}>
      {/* Starfield */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(80)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={{
            width: Math.random() * 2 + 1,
            height: Math.random() * 2 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.5 + 0.2,
            animation: `twinkle ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }} />
        ))}
      </div>

      {/* Add Planet Button */}
      <button
        onClick={() => setShowAddPlanet(true)}
        className="absolute top-6 right-6 z-30 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Plus className="w-5 h-5 text-white/70" />
      </button>

      {/* Galaxy Container */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Orbit Paths */}
        {visualPlanets.map((planet) => (
          <div key={`orbit-${planet.id}`} className="absolute rounded-full pointer-events-none" style={{
            width: planet.orbitRadius * 2,
            height: planet.orbitRadius * 2,
            border: '1px solid rgba(255,255,255,0.06)'
          }} />
        ))}

        {/* Sun */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: 110, height: 110,
            background: 'radial-gradient(circle at 35% 35%, #FFF8E7, #FFD93D 30%, #FF9500 60%, #FF6B00 80%, #E85D00)',
            boxShadow: '0 0 80px rgba(255,180,50,0.7), 0 0 150px rgba(255,140,50,0.5), 0 0 200px rgba(255,100,50,0.3)'
          }}
        >
          <span className="relative z-10 text-xs font-semibold text-white text-center px-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            Our<br/>Galaxy
          </span>
        </motion.div>

        {/* Empty state */}
        {visualPlanets.length === 0 && (
          <div className="absolute" style={{ top: '60%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: THEME.muted }}>No planets yet — add your first trip destination</div>
          </div>
        )}

        {/* Planets */}
        {visualPlanets.map((planet, index) => (
          <div key={planet.id} className="absolute" style={{
            width: planet.orbitRadius * 2,
            height: planet.orbitRadius * 2,
            animation: `orbit ${planet.orbitDuration}s linear infinite`,
            animationDelay: `${-(planet.startAngle / 360) * planet.orbitDuration}s`
          }}>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.15, duration: 0.5 }}
              className="absolute"
              style={{
                right: -24, top: '50%',
                transform: 'translateY(-50%)',
                animation: `counter-orbit ${planet.orbitDuration}s linear infinite`,
                animationDelay: `${-(planet.startAngle / 360) * planet.orbitDuration}s`
              }}
            >
              {/* Moons */}
              {planet.moons && planet.moons.length > 0 && (
                <div className="absolute" style={{ width: 90, height: 90, left: -21, top: -21, animation: 'orbit 12s linear infinite' }}>
                  {planet.moons.map((moon, mi) => {
                    const moonAngle = (mi * (360 / planet.moons.length)) * (Math.PI / 180)
                    const moonX = Math.cos(moonAngle) * 38
                    const moonY = Math.sin(moonAngle) * 38
                    return (
                      <button
                        key={moon.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedMoon(moon) }}
                        className="absolute transition-transform hover:scale-150"
                        style={{
                          width: 10, height: 10, borderRadius: '50%',
                          left: `calc(50% + ${moonX}px - 5px)`,
                          top: `calc(50% + ${moonY}px - 5px)`,
                          background: `radial-gradient(circle at 25% 25%, #fff, ${planet.texture.highlight} 60%)`,
                          boxShadow: `0 0 8px ${planet.texture.highlight}`,
                          animation: 'counter-orbit 12s linear infinite'
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
                className="relative rounded-full overflow-hidden"
                style={{
                  width: 48, height: 48,
                  background: `radial-gradient(circle at 25% 25%, ${planet.texture.highlight} 0%, transparent 50%), radial-gradient(circle at 70% 60%, ${planet.texture.accent} 0%, transparent 40%), radial-gradient(circle at 50% 50%, ${planet.texture.base} 0%, ${planet.texture.base} 100%)`,
                  boxShadow: `0 0 24px ${planet.glow}, 0 0 48px ${planet.glow}, inset -8px -8px 20px rgba(0,0,0,0.4)`
                }}
              />
            </motion.div>
          </div>
        ))}
      </div>

      {/* Crystallize Button */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-white"
          style={{ background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.accent})`, boxShadow: '0 0 30px rgba(124,106,239,0.4)' }}
        >
          <Sparkles className="w-4 h-4" />
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
            className="absolute inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowAddPlanet(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="w-full max-w-sm rounded-3xl p-6"
              style={{ background: 'rgba(25,25,30,0.95)', border: `1px solid ${THEME.border}` }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: THEME.text }}>Add a destination</h2>
                <button onClick={() => setShowAddPlanet(false)}>
                  <X className="w-5 h-5 text-white/50" />
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
                  marginBottom: '16px', fontFamily: 'Inter, sans-serif'
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
                  opacity: !newPlanetName.trim() ? 0.4 : 1
                }}
              >
                {adding ? 'Adding...' : 'Add to Galaxy'}
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
            className="absolute inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
            onClick={() => setSelectedPlanet(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="w-full max-w-sm rounded-3xl p-6"
              style={{ background: 'rgba(25,25,30,0.95)', border: `1px solid ${selectedPlanet.texture.highlight}33`, boxShadow: `0 0 80px ${selectedPlanet.glow}` }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full" style={{
                  background: `radial-gradient(circle at 25% 25%, ${selectedPlanet.texture.highlight} 0%, transparent 50%), radial-gradient(circle at 50% 50%, ${selectedPlanet.texture.base} 0%, ${selectedPlanet.texture.base} 100%)`,
                  boxShadow: `0 0 40px ${selectedPlanet.glow}`
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
                      <div key={moon.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                          background: `radial-gradient(circle at 25% 25%, #fff, ${selectedPlanet.texture.highlight} 60%)`,
                          boxShadow: `0 0 8px ${selectedPlanet.texture.highlight}`
                        }} />
                        <span style={{ fontSize: '13px', color: THEME.text }}>{moon.trip_label}</span>
                        {moon.is_side_quest && (
                          <span style={{ fontSize: '10px', color: THEME.muted, marginLeft: 'auto' }}>side quest</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedPlanet(null)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: THEME.muted, fontSize: '13px', cursor: 'pointer'
                }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.8; } }
        @keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes counter-orbit { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(-360deg); } }
      `}</style>
    </div>
  )
}