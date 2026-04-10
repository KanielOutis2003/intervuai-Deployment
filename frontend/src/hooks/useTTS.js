import { useState, useRef, useCallback } from 'react'
import api from '../services/api'

/**
 * useTTS — High-quality Text-to-Speech hook using OpenAI TTS API.
 *
 * Falls back to browser speechSynthesis if the API call fails.
 *
 * Returns:
 *   speak(text)   — synthesize and play text
 *   stop()        — stop current playback
 *   isSpeaking    — whether audio is currently playing
 *   audioRef      — ref to the HTMLAudioElement (for avatar lip sync)
 */
export default function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef(null)
  const blobUrlRef = useRef(null)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
      audioRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }, [])

  /** Browser fallback using Web Speech API */
  const speakFallback = useCallback((text, onEnd) => {
    if (!window.speechSynthesis || !text) {
      onEnd?.()
      return
    }
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 0.92
    utter.pitch = 1.0
    utter.volume = 1.0
    utter.lang = 'en-US'
    utter.onstart = () => setIsSpeaking(true)
    utter.onend = () => { setIsSpeaking(false); onEnd?.() }
    utter.onerror = () => { setIsSpeaking(false); onEnd?.() }
    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      const voice = voices.find(v => v.lang === 'en-US' && !v.localService)
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0]
      if (voice) utter.voice = voice
      window.speechSynthesis.speak(utter)
    }
    if (window.speechSynthesis.getVoices().length > 0) doSpeak()
    else {
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; doSpeak() }
      setTimeout(doSpeak, 300)
    }
  }, [])

  /** Speak text using OpenAI TTS API with browser fallback */
  const speak = useCallback(async (text, { voice = 'onyx', speed = 1.0, onEnd } = {}) => {
    if (!text || text.startsWith('⚠')) {
      onEnd?.()
      return
    }

    cleanup()

    try {
      const response = await api.post('/tts/synthesize', { text, voice, speed }, {
        responseType: 'blob',
        timeout: 15000,
      })

      const blob = response.data
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      audio.onplay = () => setIsSpeaking(true)
      audio.onended = () => {
        setIsSpeaking(false)
        cleanup()
        onEnd?.()
      }
      audio.onerror = () => {
        setIsSpeaking(false)
        cleanup()
        // Fallback to browser TTS on audio playback error
        speakFallback(text, onEnd)
      }

      await audio.play()
    } catch {
      // API failed — fall back to browser speechSynthesis
      cleanup()
      speakFallback(text, onEnd)
    }
  }, [cleanup, speakFallback])

  /** Stop current playback */
  const stop = useCallback(() => {
    cleanup()
    setIsSpeaking(false)
    // Also cancel any browser fallback speech
    try { window.speechSynthesis?.cancel() } catch {}
  }, [cleanup])

  return { speak, stop, isSpeaking, audioRef }
}
