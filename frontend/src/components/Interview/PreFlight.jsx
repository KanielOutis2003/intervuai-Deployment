/**
 * PreFlight — Interview readiness check gate.
 *
 * Checks (in order):
 *   1. getUserMedia permission  → mic + camera access granted
 *   2. Live mic volume meter    → user can verify their audio
 *   3. MediaPipe init           → spinner until FaceLandmarker + PoseLandmarker ready
 *
 * Only enables the "Start Interview" button once ALL three are satisfied.
 *
 * Props:
 *   isVisionReady   — bool (isInitialized from useVisionAI)
 *   visionError     — string | null (initError from useVisionAI)
 *   onStart         — callback fired when user clicks "Start"
 *   onClose         — callback to cancel / go back
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export default function PreFlight({ isVisionReady, visionError, onStart, onClose }) {
  const [permissionStatus, setPermissionStatus] = useState('pending')  // pending | granted | denied
  const [volume, setVolume]                     = useState(0)           // 0-100
  const [stream, setStream]                     = useState(null)

  const audioCtxRef   = useRef(null)
  const analyserRef   = useRef(null)
  const rafRef        = useRef(null)
  const streamRef     = useRef(null)

  /* ─── Request mic + camera permission ──────────────────────────────────── */
  const requestPermission = useCallback(async () => {
    setPermissionStatus('pending')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = s
      setStream(s)
      setPermissionStatus('granted')

      // Set up audio analyser for live volume meter
      const ctx      = new (window.AudioContext || window.webkitAudioContext)()
      const source   = ctx.createMediaStreamSource(s)
      const analyser = ctx.createAnalyser()
      analyser.fftSize              = 256
      analyser.smoothingTimeConstant = 0.7
      source.connect(analyser)
      audioCtxRef.current  = ctx
      analyserRef.current  = analyser

      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(data)
        const avg        = data.reduce((a, b) => a + b, 0) / data.length
        const normalized = Math.min(100, Math.round((avg / 128) * 100 * 2.5))
        setVolume(normalized)
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (err) {
      setPermissionStatus(err.name === 'NotAllowedError' ? 'denied' : 'error')
    }
  }, [])

  /* ─── Cleanup on unmount ───────────────────────────────────────────────── */
  useEffect(() => {
    requestPermission()
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (audioCtxRef.current) { try { audioCtxRef.current.close() } catch {} }
      // Do NOT stop tracks here — the interview page will reuse the same stream
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Handle Start ──────────────────────────────────────────────────────── */
  const handleStart = () => {
    // Stop the RAF meter — interview page will set up its own analyser
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (audioCtxRef.current) { try { audioCtxRef.current.close() } catch {} }
    // Pass the already-acquired stream so the page doesn't need a second prompt
    onStart(streamRef.current)
  }

  // Ready if permissions granted AND (vision loaded OR vision errored — voice-only mode)
  const allReady = permissionStatus === 'granted' && (isVisionReady || !!visionError)

  /* ─── Volume bar colour ─────────────────────────────────────────────────── */
  const volColor = volume < 15 ? '#ef4444' : volume > 80 ? '#f59e0b' : '#00c88c'

  /* ─── MediaPipe status ───────────────────────────────────────────────────── */
  const mediaPipeStatus = visionError
    ? { icon: '✕', color: '#ef4444', label: `AI Vision error — ${visionError}` }
    : isVisionReady
      ? { icon: '✓', color: '#00c88c', label: 'AI Vision ready (FaceLandmarker + PoseLandmarker)' }
      : { icon: null,  color: '#6b7280', label: 'Loading AI Vision models…' }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: 'var(--card, #1a2332)', borderRadius: 20, padding: 40,
        width: 480, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 22, margin: 0, color: 'var(--text, #fff)' }}>
              Pre-Interview Check
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Verify your setup before starting
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '6px 12px', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            Back
          </button>
        </div>

        {/* Check rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>

          {/* 1. Camera + Mic */}
          <CheckRow
            label="Camera & Microphone"
            description={
              permissionStatus === 'granted' ? 'Access granted'
              : permissionStatus === 'denied' ? 'Access denied — allow in browser settings and refresh'
              : permissionStatus === 'error'  ? 'Could not access media devices'
              : 'Requesting permission…'
            }
            status={
              permissionStatus === 'granted' ? 'ok'
              : permissionStatus === 'pending' ? 'loading'
              : 'error'
            }
            action={permissionStatus !== 'granted' && permissionStatus !== 'pending' ? (
              <button
                onClick={requestPermission}
                style={{
                  background: 'rgba(0,200,140,0.15)', border: '1px solid rgba(0,200,140,0.35)',
                  borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#00c88c', cursor: 'pointer',
                }}
              >
                Retry
              </button>
            ) : null}
          />

          {/* 2. Mic volume meter */}
          {permissionStatus === 'granted' && (
            <div style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 12,
              padding: '14px 16px', border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #fff)' }}>
                  Microphone Level
                </span>
                <span style={{ fontSize: 12, color: volColor, fontWeight: 600 }}>
                  {volume < 15 ? 'Too quiet' : volume > 80 ? 'Too loud' : 'Good'}
                </span>
              </div>
              {/* Volume bar */}
              <div style={{
                height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${volume}%`,
                  background: `linear-gradient(90deg, ${volColor} 0%, ${volColor}aa 100%)`,
                  borderRadius: 4, transition: 'width 0.08s ease',
                }} />
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                Speak normally to test — aim for the green zone
              </p>
            </div>
          )}

          {/* 3. MediaPipe AI Vision */}
          <CheckRow
            label="AI Vision (MediaPipe)"
            description={mediaPipeStatus.label}
            status={visionError ? 'error' : isVisionReady ? 'ok' : 'loading'}
            note={visionError ? 'Eye contact and posture tracking will be disabled' : null}
          />

        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={!allReady}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12,
            background: allReady
              ? 'linear-gradient(135deg, #00c88c 0%, #00a370 100%)'
              : 'rgba(255,255,255,0.08)',
            border: 'none', color: allReady ? '#fff' : 'rgba(255,255,255,0.3)',
            fontWeight: 700, fontSize: 15, cursor: allReady ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            boxShadow: allReady ? '0 4px 20px rgba(0,200,140,0.3)' : 'none',
          }}
        >
          {!allReady
            ? (permissionStatus !== 'granted' ? 'Waiting for permissions…' : 'Loading AI models…')
            : visionError
              ? 'Start Interview (Voice-only mode)'
              : 'Start Interview'
          }
        </button>

        {visionError && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 12, color: '#fbbf24', lineHeight: 1.5 }}>
              <strong>AI Vision failed to load.</strong> Continuing in Voice-only mode —
              eye contact and posture tracking will be unavailable for this session.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── CheckRow sub-component ────────────────────────────────────────────── */
function CheckRow({ label, description, status, action, note }) {
  const icons = {
    ok:      { char: '✓', color: '#00c88c', bg: 'rgba(0,200,140,0.12)' },
    error:   { char: '✕', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    loading: { char: null, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  }
  const ic = icons[status] || icons.loading

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      background: 'rgba(255,255,255,0.04)', borderRadius: 12,
      padding: '14px 16px', border: `1px solid ${status === 'ok' ? 'rgba(0,200,140,0.15)' : status === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)'}`,
    }}>
      {/* Status icon */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: ic.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
      }}>
        {ic.char ? (
          <span style={{ color: ic.color, fontWeight: 700, fontSize: 14 }}>{ic.char}</span>
        ) : (
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.2)',
            borderTopColor: '#00c88c',
            animation: 'preflightSpin 0.8s linear infinite',
          }} />
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text, #fff)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: status === 'error' ? '#f87171' : 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
          {description}
        </div>
        {note && (
          <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>{note}</div>
        )}
      </div>

      {action && <div style={{ flexShrink: 0 }}>{action}</div>}

      <style>{`
        @keyframes preflightSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
