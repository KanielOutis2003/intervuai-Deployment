import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Photorealistic AI Interviewer Avatar
 *
 * Uses a high-quality portrait image with CSS animations for:
 * - Idle breathing (subtle scale pulse)
 * - Speaking state (audio-reactive glow + waveform)
 * - Professional office background
 * - Status indicator overlay
 */

/* ─── Audio amplitude hook for speaking animation ──────────────────────── */
function useAudioAmplitude(audioRef, isSpeaking) {
  const [amplitude, setAmplitude] = useState(0)
  const ctxRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const connectedRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!isSpeaking) {
      setAmplitude(0)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    const audio = audioRef?.current
    if (!audio) {
      // Simulate amplitude when no audio element (browser TTS fallback)
      let frame
      const simulate = () => {
        const t = Date.now()
        const simAmp = 0.3 + Math.sin(t * 0.012) * 0.2 + Math.sin(t * 0.019) * 0.15 + Math.sin(t * 0.007) * 0.1
        setAmplitude(Math.max(0, Math.min(1, simAmp)))
        frame = requestAnimationFrame(simulate)
      }
      simulate()
      return () => cancelAnimationFrame(frame)
    }

    // Real audio analysis
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = ctxRef.current

    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser()
      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = 0.6
    }

    if (connectedRef.current !== audio) {
      try {
        if (sourceRef.current) sourceRef.current.disconnect()
        sourceRef.current = ctx.createMediaElementSource(audio)
        sourceRef.current.connect(analyserRef.current)
        analyserRef.current.connect(ctx.destination)
        connectedRef.current = audio
      } catch { /* already connected */ }
    }

    if (ctx.state === 'suspended') ctx.resume()

    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    const tick = () => {
      analyserRef.current.getByteFrequencyData(data)
      let sum = 0
      const count = Math.min(32, data.length)
      for (let i = 0; i < count; i++) sum += data[i]
      setAmplitude(Math.min(1, (sum / count / 255) * 2.5))
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [audioRef, isSpeaking])

  return amplitude
}

/* ─── Waveform bars component ──────────────────────────────────────────── */
function WaveformBars({ amplitude, isSpeaking }) {
  const barCount = 32
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 1.5, height: 24, opacity: isSpeaking ? 1 : 0, transition: 'opacity 0.4s',
    }}>
      {Array.from({ length: barCount }, (_, i) => {
        const phase = i / barCount * Math.PI * 2
        const h = isSpeaking
          ? 4 + amplitude * 18 * (0.5 + 0.5 * Math.sin(Date.now() * 0.008 + phase))
          : 2
        return (
          <div key={i} style={{
            width: 2.5, borderRadius: 2,
            height: h,
            background: `rgba(0,200,140,${0.4 + amplitude * 0.5})`,
            transition: 'height 0.06s ease',
          }} />
        )
      })}
    </div>
  )
}

/* ─── Main Avatar Component ────────────────────────────────────────────── */
export default function AvatarCanvas({ audioRef, isSpeaking, style }) {
  const amplitude = useAudioAmplitude(audioRef, isSpeaking)
  const [imageLoaded, setImageLoaded] = useState(false)
  const waveformRef = useRef(null)

  // Force waveform re-render when speaking
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isSpeaking) return
    const id = setInterval(() => setTick(t => t + 1), 60)
    return () => clearInterval(id)
  }, [isSpeaking])

  // Professional AI interviewer portrait URL
  // Using thispersondoesnotexist-style AI-generated face via UI Faces / generated.photos
  const avatarUrl = 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=600&fit=crop&crop=face'

  const glowIntensity = isSpeaking ? 0.15 + amplitude * 0.35 : 0
  const breathScale = isSpeaking ? 1 : 1 + Math.sin(Date.now() * 0.002) * 0.003

  return (
    <div className="avatar-container" style={{
      position: 'relative', overflow: 'hidden',
      background: '#0c1117',
      ...style,
    }}>
      {/* Office background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #1a2332 0%, #0f1923 40%, #162130 100%)',
        zIndex: 0,
      }}>
        {/* Subtle office bokeh lights */}
        <div style={{
          position: 'absolute', top: '15%', left: '10%', width: 60, height: 60,
          borderRadius: '50%', background: 'rgba(255,200,100,0.06)', filter: 'blur(20px)',
        }} />
        <div style={{
          position: 'absolute', top: '8%', right: '15%', width: 80, height: 80,
          borderRadius: '50%', background: 'rgba(100,180,255,0.05)', filter: 'blur(25px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', left: '20%', width: 100, height: 100,
          borderRadius: '50%', background: 'rgba(0,200,140,0.04)', filter: 'blur(30px)',
        }} />
      </div>

      {/* Green accent glow when speaking */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        boxShadow: isSpeaking ? `inset 0 0 60px rgba(0,200,140,${glowIntensity})` : 'none',
        transition: 'box-shadow 0.3s ease',
        borderRadius: 'inherit',
      }} />

      {/* Avatar portrait */}
      <div style={{
        position: 'relative', zIndex: 2, width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'relative',
          transform: `scale(${breathScale})`,
          transition: isSpeaking ? 'none' : 'transform 2s ease-in-out',
        }}>
          {/* Portrait image with circular crop */}
          <div style={{
            width: 140, height: 140, borderRadius: '50%', overflow: 'hidden',
            border: `3px solid ${isSpeaking ? 'rgba(0,200,140,0.6)' : 'rgba(255,255,255,0.12)'}`,
            boxShadow: isSpeaking
              ? `0 0 30px rgba(0,200,140,${0.15 + amplitude * 0.25}), 0 4px 20px rgba(0,0,0,0.5)`
              : '0 4px 20px rgba(0,0,0,0.5)',
            transition: 'border-color 0.4s, box-shadow 0.3s',
            position: 'relative',
          }}>
            {!imageLoaded && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #2a3442, #1a2332)',
                color: 'rgba(255,255,255,0.3)', fontSize: 40,
              }}>👤</div>
            )}
            <img
              src={avatarUrl}
              alt="AI Interviewer"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(false)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                display: imageLoaded ? 'block' : 'none',
                filter: isSpeaking ? 'brightness(1.05)' : 'brightness(0.95)',
                transition: 'filter 0.5s',
              }}
            />

            {/* Speaking pulse ring */}
            {isSpeaking && (
              <>
                <div className="avatar-pulse-ring" style={{
                  position: 'absolute', inset: -4, borderRadius: '50%',
                  border: '2px solid rgba(0,200,140,0.4)',
                  animation: 'avatarPulse 1.5s ease-in-out infinite',
                }} />
                <div className="avatar-pulse-ring" style={{
                  position: 'absolute', inset: -10, borderRadius: '50%',
                  border: '1px solid rgba(0,200,140,0.2)',
                  animation: 'avatarPulse 1.5s ease-in-out infinite 0.3s',
                }} />
              </>
            )}
          </div>

          {/* Status badge */}
          <div style={{
            position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
            background: isSpeaking ? 'rgba(0,200,140,0.9)' : 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            borderRadius: 12, padding: '3px 10px',
            fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
            color: isSpeaking ? '#fff' : 'rgba(255,255,255,0.5)',
            border: `1px solid ${isSpeaking ? 'rgba(0,200,140,0.5)' : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.4s ease', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: isSpeaking ? '#fff' : 'rgba(255,255,255,0.4)',
              animation: isSpeaking ? 'avatarDot 1s ease-in-out infinite' : 'none',
            }} />
            {isSpeaking ? 'Speaking' : 'Connected'}
          </div>
        </div>

        {/* Audio waveform */}
        <div ref={waveformRef} style={{ marginTop: 12, height: 24, width: '80%' }}>
          <WaveformBars amplitude={amplitude} isSpeaking={isSpeaking} />
        </div>

        {/* Name plate */}
        <div style={{
          marginTop: 6, fontSize: 11, fontWeight: 600,
          color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5,
        }}>
          AI Interviewer
        </div>
      </div>
    </div>
  )
}
