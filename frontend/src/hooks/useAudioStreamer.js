import { useEffect, useRef, useState } from 'react'

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2)
  const view = new DataView(buffer)
  let offset = 0
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

export default function useAudioStreamer({ onChunk, chunkMs = 100, onSpeakingStart, onSpeakingEnd, levelThreshold = 0.02 }) {
  const [streaming, setStreaming] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const streamRef = useRef(null)
  const ctxRef = useRef(null)
  const procRef = useRef(null)
  const ringRef = useRef([])
  const timerRef = useRef(null)
  const speakingRef = useRef(false)
  const lastSpeechAtRef = useRef(0)

  useEffect(() => {
    return () => {
      try { clearInterval(timerRef.current) } catch {}
      try { procRef.current?.disconnect() } catch {}
      try { ctxRef.current?.close() } catch {}
      try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
      setStreaming(false)
      setSpeaking(false)
    }
  }, [])

  const start = async () => {
    if (streaming) return
    const ms = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 48000 }, video: false })
    streamRef.current = ms
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 })
    ctxRef.current = ctx
    const src = ctx.createMediaStreamSource(ms)
    const proc = ctx.createScriptProcessor(4096, 1, 1)
    proc.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const rms = Math.sqrt(input.reduce((a, v) => a + v * v, 0) / input.length)
      ringRef.current.push(new Float32Array(input))
      if (!speakingRef.current && rms > levelThreshold) {
        speakingRef.current = true
        lastSpeechAtRef.current = Date.now()
        setSpeaking(true)
        onSpeakingStart && onSpeakingStart()
      } else if (speakingRef.current) {
        if (rms > levelThreshold) lastSpeechAtRef.current = Date.now()
        if (Date.now() - lastSpeechAtRef.current > 600) {
          speakingRef.current = false
          setSpeaking(false)
          onSpeakingEnd && onSpeakingEnd()
        }
      }
    }
    src.connect(proc)
    proc.connect(ctx.destination)
    procRef.current = proc
    timerRef.current = setInterval(() => {
      if (ringRef.current.length === 0) return
      const merged = new Float32Array(ringRef.current.reduce((n, b) => n + b.length, 0))
      let off = 0
      for (const b of ringRef.current) { merged.set(b, off); off += b.length }
      ringRef.current = []
      const pcm16 = floatTo16BitPCM(merged)
      onChunk && onChunk(pcm16)
    }, chunkMs)
    setStreaming(true)
  }

  const stop = () => {
    try { clearInterval(timerRef.current) } catch {}
    timerRef.current = null
    try { procRef.current?.disconnect() } catch {}
    try { ctxRef.current?.close() } catch {}
    try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
    streamRef.current = null
    ctxRef.current = null
    procRef.current = null
    ringRef.current = []
    setStreaming(false)
    speakingRef.current = false
    setSpeaking(false)
  }

  return { start, stop, streaming, speaking }
}
