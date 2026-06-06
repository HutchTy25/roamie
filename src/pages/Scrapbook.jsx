import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, Camera, ChevronLeft, Send, Trash2, ImagePlus } from 'lucide-react'
import { supabase } from '../supabase'

export default function Scrapbook({ session, profile, partnerProfile }) {
  const navigate = useNavigate()
  const myName = profile?.display_name || session?.user?.user_metadata?.full_name?.split(' ')[0] || 'You'
  const partnerName = partnerProfile?.display_name || 'Partner'
  const partnerPresent = !!partnerProfile

  const [destinations, setDestinations] = useState([])
  const [selectedDestination, setSelectedDestination] = useState(null)
  const [cardPositions, setCardPositions] = useState({})
  const [tableOffset, setTableOffset] = useState({ x: 0, y: 0 })
  const [isDraggingTable, setIsDraggingTable] = useState(false)
  const [isDraggingCard, setIsDraggingCard] = useState(false)
  const [sparkles, setSparkles] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showAddCard, setShowAddCard] = useState(false)
  const [newCardName, setNewCardName] = useState('')
  const [newCardDate, setNewCardDate] = useState('')
  const chatEndRef = useRef(null)
  const longPressTimer = useRef(null)
  const lastTapTime = useRef({})
  const coverPhotoInputRef = useRef(null)
  const memoryPhotoInputRef = useRef(null)

  const TABLE_SIZE = 900
  const CARD_WIDTH = 150

  useEffect(() => {
    if (!profile?.couple_id) return
    async function fetchDestinations() {
      const { data: dests } = await supabase
        .from('destinations')
        .select('id, name, cover_photo, visit_date')
        .eq('couple_id', profile.couple_id)
        .order('created_at', { ascending: false })

      if (!dests) return

      const enriched = await Promise.all(dests.map(async (d) => {
        const [{ data: photos, error: photoError }, { data: messages, error: msgError }] = await Promise.all([
          supabase.from('destination_photos').select('url').eq('destination_id', d.id),
          supabase.from('destination_messages').select('id, text, sender, timestamp').eq('destination_id', d.id).order('created_at', { ascending: true })
        ])
        if (photoError) console.error('Photos error:', photoError)
        if (msgError) console.error('Messages error:', msgError)
        return {
          id: d.id,
          name: d.name,
          coverPhoto: d.cover_photo,
          visitDate: d.visit_date || 'Date TBD',
          photos: (photos || []).map(p => p.url),
          chatMessages: (messages || []).map(m => ({ id: m.id, text: m.text, sender: m.sender, timestamp: m.timestamp }))
        }
      }))

      setDestinations(enriched)
    }
    fetchDestinations()
  }, [profile?.couple_id])

  const initialPositions = useMemo(() => {
    const positions = {}
    destinations.forEach((dest, index) => {
      const gridCol = index % 3
      const gridRow = Math.floor(index / 3)
      const baseX = (gridCol - 1) * 180 + (Math.random() - 0.5) * 100
      const baseY = (gridRow - 0.5) * 200 + (Math.random() - 0.5) * 80
      positions[dest.id] = {
        x: baseX,
        y: baseY,
        rotation: (Math.random() - 0.5) * 30,
        zIndex: Math.floor(Math.random() * destinations.length),
      }
    })
    return positions
  }, [destinations])

  const activePositions = Object.keys(cardPositions).length > 0 ? cardPositions : initialPositions

  const triggerSparkles = useCallback(() => {
    if (!partnerPresent) return
    const newSparkles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 40 - 20,
      y: Math.random() * 40 - 20,
    }))
    setSparkles(newSparkles)
    setTimeout(() => setSparkles([]), 800)
  }, [partnerPresent])

  const handleCardTap = useCallback((destination) => {
    const now = Date.now()
    const lastTap = lastTapTime.current[destination.id] || 0
    const timeSinceLastTap = now - lastTap
    if (timeSinceLastTap < 300) {
      triggerSparkles()
      setSelectedDestination(destination)
      lastTapTime.current[destination.id] = 0
    } else {
      lastTapTime.current[destination.id] = now
      setCardPositions((prev) => {
        const maxZ = Math.max(
          ...Object.values(prev).map(p => p.zIndex),
          ...Object.values(initialPositions).map(p => p.zIndex),
          0
        )
        return {
          ...prev,
          [destination.id]: {
            ...(prev[destination.id] || initialPositions[destination.id]),
            zIndex: maxZ + 1,
          },
        }
      })
    }
  }, [initialPositions, triggerSparkles])

  const handleCardDragStart = useCallback(() => {
    setIsDraggingCard(true)
  }, [])

  const handleCardDragEnd = useCallback((destinationId, _, info) => {
    setIsDraggingCard(false)
    const friction = 0.05
    const finalX = info.offset.x + info.velocity.x * friction
    const finalY = info.offset.y + info.velocity.y * friction
    const spinAmount = info.velocity.x * 0.003
    const currentPos = activePositions[destinationId] || initialPositions[destinationId]
    setCardPositions((prev) => ({
      ...prev,
      [destinationId]: {
        ...currentPos,
        x: currentPos.x + finalX,
        y: currentPos.y + finalY,
        rotation: Math.max(-25, Math.min(25, currentPos.rotation + spinAmount)),
      },
    }))
  }, [activePositions, initialPositions])

  const handleTableDragStart = useCallback(() => {
    if (!isDraggingCard) setIsDraggingTable(true)
  }, [isDraggingCard])

  const handleTableDrag = useCallback((_, info) => {
    if (isDraggingCard) return
    const damping = 0.4
    const maxOffset = TABLE_SIZE / 4
    setTableOffset({
      x: Math.max(-maxOffset, Math.min(maxOffset, info.offset.x * damping)),
      y: Math.max(-maxOffset, Math.min(maxOffset, info.offset.y * damping)),
    })
  }, [isDraggingCard])

  const handleTableDragEnd = useCallback((_, info) => {
    setIsDraggingTable(false)
    if (isDraggingCard) return
    const damping = 0.4
    const maxOffset = TABLE_SIZE / 4
    setTableOffset((prev) => ({
      x: Math.max(-maxOffset, Math.min(maxOffset, prev.x + info.offset.x * damping)),
      y: Math.max(-maxOffset, Math.min(maxOffset, prev.y + info.offset.y * damping)),
    }))
  }, [isDraggingCard])

  const handleCloseDetail = useCallback(() => {
    setSelectedDestination(null)
  }, [])

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedDestination) return
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const { data, error } = await supabase
      .from('destination_messages')
      .insert({ destination_id: selectedDestination.id, text: newMessage.trim(), sender: myName, timestamp })
      .select()
      .single()
    if (error || !data) return
    const newMsg = { id: data.id, text: data.text, sender: data.sender, timestamp: data.timestamp }
    setDestinations((prev) =>
      prev.map((d) =>
        d.id === selectedDestination.id ? { ...d, chatMessages: [...d.chatMessages, newMsg] } : d
      )
    )
    setSelectedDestination((prev) =>
      prev ? { ...prev, chatMessages: [...prev.chatMessages, newMsg] } : null
    )
    triggerSparkles()
    setNewMessage('')
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [newMessage, selectedDestination, myName, triggerSparkles])

  const handleLongPressStart = useCallback((destinationId) => {
    longPressTimer.current = setTimeout(() => {
      setDeleteConfirm(destinationId)
    }, 600)
  }, [])

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleDelete = useCallback(async (destinationId) => {
    await supabase.from('destinations').delete().eq('id', destinationId)
    setDestinations((prev) => prev.filter((d) => d.id !== destinationId))
    setDeleteConfirm(null)
    setSelectedDestination(null)
  }, [])

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(null)
  }, [])

  const handleAddCard = useCallback(async () => {
    if (!newCardName.trim() || !profile?.couple_id) return
    const { data, error } = await supabase
      .from('destinations')
      .insert({
        couple_id: profile.couple_id,
        name: newCardName.trim(),
        visit_date: newCardDate.trim() || 'Date TBD',
        cover_photo: null,
      })
      .select()
      .single()
    if (error || !data) return
    const newCard = {
      id: data.id,
      name: data.name,
      coverPhoto: data.cover_photo,
      visitDate: data.visit_date,
      photos: [],
      chatMessages: [],
    }
    setDestinations((prev) => [...prev, newCard])
    setNewCardName('')
    setNewCardDate('')
    setShowAddCard(false)
    setCardPositions((prev) => ({
      ...prev,
      [newCard.id]: {
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100,
        rotation: (Math.random() - 0.5) * 20,
        zIndex: destinations.length + 1,
      },
    }))
  }, [newCardName, newCardDate, profile?.couple_id, destinations.length])

  const handleCoverPhotoUpload = useCallback(() => {
    coverPhotoInputRef.current?.click()
  }, [])

  const handleCoverPhotoChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedDestination || !profile?.couple_id) return
    const ext = file.name.split('.').pop()
    const path = `${profile.couple_id}/${selectedDestination.id}/cover.${ext}`
    const { error } = await supabase.storage.from('scrapbook').upload(path, file, { upsert: true })
    if (error) return
    const { data: { publicUrl } } = supabase.storage.from('scrapbook').getPublicUrl(path)
    await supabase.from('destinations').update({ cover_photo: publicUrl }).eq('id', selectedDestination.id)
    setDestinations(prev => prev.map(d => d.id === selectedDestination.id ? { ...d, coverPhoto: publicUrl } : d))
    setSelectedDestination(prev => prev ? { ...prev, coverPhoto: publicUrl } : null)
    e.target.value = ''
  }, [selectedDestination, profile?.couple_id])

  const handleAddMemoryPhoto = useCallback(() => {
    memoryPhotoInputRef.current?.click()
  }, [])

  const handleMemoryPhotoChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedDestination || !profile?.couple_id) return
    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}.${ext}`
    const path = `${profile.couple_id}/${selectedDestination.id}/${filename}`
    const { error } = await supabase.storage.from('scrapbook').upload(path, file)
    if (error) return
    const { data: { publicUrl } } = supabase.storage.from('scrapbook').getPublicUrl(path)
    await supabase.from('destination_photos').insert({ destination_id: selectedDestination.id, url: publicUrl })
    setDestinations(prev => prev.map(d => d.id === selectedDestination.id ? { ...d, photos: [...d.photos, publicUrl] } : d))
    setSelectedDestination(prev => prev ? { ...prev, photos: [...prev.photos, publicUrl] } : null)
    e.target.value = ''
  }, [selectedDestination, profile?.couple_id])

  const handleDeletePhoto = useCallback(async (photoUrl) => {
    if (!selectedDestination) return
    // Optimistic removal
    setSelectedDestination(prev =>
      prev ? { ...prev, photos: prev.photos.filter(p => p !== photoUrl) } : null
    )
    setDestinations(prev =>
      prev.map(d =>
        d.id === selectedDestination.id
          ? { ...d, photos: d.photos.filter(p => p !== photoUrl) }
          : d
      )
    )
    // Derive storage path from public URL (everything after /scrapbook/)
    const storagePath = photoUrl.split('/scrapbook/')[1]
    if (storagePath) await supabase.storage.from('scrapbook').remove([storagePath])
    await supabase.from('destination_photos').delete().eq('url', photoUrl)
  }, [selectedDestination])

  const handleSetCover = useCallback(async (photoUrl) => {
    if (!selectedDestination) return
    await supabase.from('destinations').update({ cover_photo: photoUrl }).eq('id', selectedDestination.id)
    setDestinations(prev =>
      prev.map(d => d.id === selectedDestination.id ? { ...d, coverPhoto: photoUrl } : d)
    )
    setSelectedDestination(prev => prev ? { ...prev, coverPhoto: photoUrl } : null)
  }, [selectedDestination])

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#0A0A0C' }}>
      {/* Hidden file inputs */}
      <input ref={coverPhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverPhotoChange} />
      <input ref={memoryPhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMemoryPhotoChange} />

      {/* Ambient light */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 100% 60% at 50% -10%, rgba(124,106,239,0.08) 0%, transparent 50%)' }} />

      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)' }} />

      {/* Partner presence */}
      {partnerPresent && (
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 30, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{partnerName} is here</span>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px #22C55E' }} />
            <div style={{ position: 'absolute', inset: 0, width: '10px', height: '10px', borderRadius: '50%', background: '#22C55E', opacity: 0.4, animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
            <AnimatePresence>
              {sparkles.map((sparkle) => (
                <motion.div
                  key={sparkle.id}
                  initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                  animate={{ scale: 1, opacity: 0, x: sparkle.x, y: sparkle.y }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{ position: 'absolute', width: '4px', height: '4px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 4px #22C55E', left: '50%', top: '50%' }}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Title + back button */}
      <div style={{ paddingTop: '24px', paddingBottom: '12px', paddingLeft: '24px', paddingRight: '24px', position: 'relative', zIndex: 10 }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: 0, marginBottom: '8px' }}
        >
          <ChevronLeft size={14} />
          Dashboard
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: '500', color: 'rgba(255,255,255,0.9)', fontFamily: 'Georgia, serif', margin: 0 }}>Our Adventures</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Double-tap to open, hold to delete</p>
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowAddCard(true)}
        style={{ position: 'absolute', top: '64px', right: '20px', zIndex: 30, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7C6AEF, #F472B6)', boxShadow: '0 4px 16px rgba(124,106,239,0.35)', border: 'none', cursor: 'pointer' }}
      >
        <Plus size={16} color="white" />
      </button>

      <style>{`@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }`}</style>

      {/* Pannable table */}
      <motion.div
        style={{ flex: 1, position: 'relative', cursor: 'grab' }}
        drag={!isDraggingCard}
        dragMomentum={false}
        dragElastic={0.01}
        dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        onDragStart={handleTableDragStart}
        onDrag={handleTableDrag}
        onDragEnd={handleTableDragEnd}
      >
        <motion.div
          style={{
            position: 'absolute',
            width: TABLE_SIZE,
            height: TABLE_SIZE,
            left: `calc(50% - ${TABLE_SIZE / 2}px)`,
            top: `calc(50% - ${TABLE_SIZE / 2}px)`,
            x: tableOffset.x,
            y: tableOffset.y,
          }}
        >
          {/* Table surface */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '24px', background: '#0F0F12', boxShadow: 'inset 0 0 200px rgba(0,0,0,0.5)' }} />

          {/* Grain texture */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.02, backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)' }} />

          {/* Empty state */}
          {destinations.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', margin: '0 auto 16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(124,106,239,0.1)', border: '2px dashed rgba(124,106,239,0.3)' }}>
                  <ImagePlus size={32} color="rgba(124,106,239,0.5)" />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>No adventures yet</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginTop: '4px' }}>Tap + to add your first memory</p>
              </div>
            </div>
          )}

          {/* Cards */}
          {destinations.map((destination) => {
            const pos = activePositions[destination.id] || initialPositions[destination.id]
            if (!pos) return null
            const displayPhoto = destination.coverPhoto || destination.photos?.[0] || null
            return (
              <motion.div
                key={destination.id}
                style={{ position: 'absolute', left: TABLE_SIZE / 2, top: TABLE_SIZE / 2, zIndex: pos.zIndex, touchAction: 'none' }}
                initial={false}
                animate={{ x: pos.x, y: pos.y, rotate: pos.rotation }}
                transition={{ type: 'spring', stiffness: 180, damping: 26, mass: 1 }}
                drag
                dragMomentum={false}
                dragElastic={0.03}
                onDragStart={handleCardDragStart}
                onDragEnd={(e, info) => handleCardDragEnd(destination.id, e, info)}
                onClick={(e) => { e.stopPropagation(); handleCardTap(destination) }}
                onTouchStart={() => handleLongPressStart(destination.id)}
                onTouchEnd={handleLongPressEnd}
                onTouchMove={handleLongPressEnd}
                onMouseDown={() => handleLongPressStart(destination.id)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                whileDrag={{ scale: 1.05, zIndex: 200 }}
              >
                {/* Polaroid card */}
                <div style={{ width: CARD_WIDTH, background: '#FAFAF8', padding: '8px 8px 35px 8px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.4)', transform: 'translate(-50%, -50%)', cursor: 'grab' }}>
                  <div style={{ aspectRatio: '4/3', borderRadius: '4px', overflow: 'hidden', position: 'relative', background: '#e5e5e5' }}>
                    {displayPhoto ? (
                      <img src={displayPhoto} alt={destination.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" draggable={false} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #E5E5E5, #D1D1D1)' }}>
                        <Camera size={32} color="#9ca3af" />
                      </div>
                    )}

                    {/* Visited badge */}
                    <div style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,211,238,0.9)', boxShadow: '0 2px 8px rgba(34,211,238,0.5)' }}>
                      <Check size={14} color="white" />
                    </div>

                    {/* Memory count */}
                    {destination.chatMessages.length > 0 && (
                      <div style={{ position: 'absolute', bottom: '6px', left: '6px', padding: '2px 8px', borderRadius: '100px', fontSize: '10px', fontWeight: '500', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', color: 'white' }}>
                        {destination.chatMessages.length}
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div style={{ paddingTop: '12px', paddingLeft: '4px', paddingRight: '4px' }}>
                    <p style={{ fontSize: '16px', color: '#1f2937', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-handwriting), cursive', margin: 0 }}>
                      {destination.name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', fontFamily: 'var(--font-handwriting), cursive' }}>
                      {destination.visitDate}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Pan hint */}
        {destinations.length > 0 && (
          <div style={{ position: 'absolute', bottom: '24px', left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
            <motion.div
              animate={{ x: [0, 6, 0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ padding: '8px 16px', borderRadius: '100px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)' }}
            >
              <span>Drag to explore</span>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Detail view */}
      <AnimatePresence>
        {selectedDestination && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column', background: '#0A0A0C' }}
          >
            {/* Cover photo header */}
            <div style={{ position: 'relative', height: '200px', flexShrink: 0 }}>
              {selectedDestination.coverPhoto ? (
                <img src={selectedDestination.coverPhoto} alt={selectedDestination.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.1)' }} crossOrigin="anonymous" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1A1B26, #2D2D3A)' }}>
                  <button onClick={handleCoverPhotoUpload} style={{ width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', background: 'rgba(124,106,239,0.15)', border: '2px dashed rgba(124,106,239,0.4)', cursor: 'pointer' }}>
                    <Camera size={28} color="rgba(124,106,239,0.6)" />
                  </button>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Add cover photo</p>
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,12,0.3) 0%, rgba(10,10,12,1) 100%)' }} />

              <button onClick={handleCloseDetail} style={{ position: 'absolute', top: '16px', left: '16px', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer' }}>
                <ChevronLeft size={20} color="white" />
              </button>

              <button onClick={() => setDeleteConfirm(selectedDestination.id)} style={{ position: 'absolute', top: '16px', right: '64px', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.2)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={16} color="#f87171" />
              </button>

              <div style={{ position: 'absolute', top: '16px', right: '16px', padding: '6px 12px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34,211,238,0.25)', backdropFilter: 'blur(8px)', border: '1px solid rgba(34,211,238,0.5)' }}>
                <Check size={14} color="#22D3EE" />
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#22D3EE' }}>Visited</span>
              </div>

              <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px' }}>
                <h1 style={{ fontSize: '24px', color: 'white', fontFamily: 'Georgia, serif', margin: 0 }}>{selectedDestination.name}</h1>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Visited: {selectedDestination.visitDate}</p>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {/* Photo grid */}
              <div style={{ padding: '16px 20px', flexShrink: 0 }}>
                <h3 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Photos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {selectedDestination.photos.map((photo, i) => (
                    <div key={i} style={{ aspectRatio: '1', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '12px', overflow: 'hidden' }}>
                        <img src={photo} alt={`Memory ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                      </div>
                      <button
                        onClick={() => handleDeletePhoto(photo)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          zIndex: 1,
                        }}
                      >
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                          <line x1="1" y1="1" x2="9" y2="9" />
                          <line x1="9" y1="1" x2="1" y2="9" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleSetCover(photo)}
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          left: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: photo === selectedDestination.coverPhoto ? 'rgba(251,191,36,0.9)' : 'rgba(0,0,0,0.6)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          zIndex: 1,
                        }}
                      >
                        <span style={{ fontSize: '10px', lineHeight: 1, color: photo === selectedDestination.coverPhoto ? '#1A1B26' : 'white' }}>★</span>
                      </button>
                    </div>
                  ))}
                  <button onClick={handleAddMemoryPhoto} style={{ aspectRatio: '1', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'rgba(30,32,48,0.5)', border: '1px dashed rgba(124,106,239,0.3)', cursor: 'pointer' }}>
                    <Camera size={20} color="rgba(255,255,255,0.3)" />
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Add</span>
                  </button>
                </div>
              </div>

              <div style={{ margin: '0 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

              {/* Chat timeline */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                <h3 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Your memories together</h3>
                {selectedDestination.chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>No memories yet</p>
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '4px' }}>Add your first memory below</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedDestination.chatMessages.map((message) => {
                      const isMine = message.sender === myName
                      return (
                        <div key={message.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                          <div style={{ maxWidth: '80%', borderRadius: '18px', padding: '10px 16px', background: isMine ? 'rgba(124,106,239,0.3)' : 'rgba(244,114,182,0.25)', borderBottomRightRadius: isMine ? '6px' : '18px', borderBottomLeftRadius: isMine ? '18px' : '6px' }}>
                            <p style={{ fontSize: '14px', lineHeight: 1.5, fontFamily: 'var(--font-handwriting), cursive', color: isMine ? '#E8E4DE' : '#F5D0E0', margin: 0 }}>
                              {message.text}
                            </p>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                              {message.sender} - {message.timestamp}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Message input */}
            <div style={{ flexShrink: 0, padding: '12px 16px', background: 'rgba(15,15,18,0.98)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Add a memory..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-handwriting), cursive' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7C6AEF, #F472B6)', boxShadow: newMessage.trim() ? '0 0 16px rgba(124,106,239,0.4)' : 'none', border: 'none', cursor: 'pointer', opacity: newMessage.trim() ? 1 : 0.4, transition: 'opacity 0.2s' }}
                >
                  <Send size={20} color="white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add card modal */}
      <AnimatePresence>
        {showAddCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowAddCard(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ width: '100%', maxWidth: '384px', borderRadius: '16px', padding: '24px', background: '#1A1B26', border: '1px solid rgba(124,106,239,0.3)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '500', color: 'white', marginBottom: '16px' }}>New Adventure</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Destination</label>
                  <input
                    type="text"
                    placeholder="e.g. Paris"
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>When did you visit?</label>
                  <input
                    type="text"
                    placeholder="e.g. March 2024"
                    value={newCardDate}
                    onChange={(e) => setNewCardDate(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button onClick={() => setShowAddCard(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleAddCard} disabled={!newCardName.trim()} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500', color: 'white', background: 'linear-gradient(135deg, #7C6AEF, #F472B6)', border: 'none', cursor: 'pointer', opacity: newCardName.trim() ? 1 : 0.4 }}>
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={handleCancelDelete}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ width: '100%', maxWidth: '384px', borderRadius: '16px', padding: '24px', background: '#1A1B26', border: '1px solid rgba(239,68,68,0.3)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', background: 'rgba(239,68,68,0.15)' }}>
                  <Trash2 size={24} color="#f87171" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '500', color: 'white', marginBottom: '8px' }}>Delete this memory?</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
                  This will permanently remove this destination and all its memories.
                </p>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <button onClick={handleCancelDelete} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500', color: 'white', background: 'rgba(239,68,68,0.8)', border: 'none', cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
