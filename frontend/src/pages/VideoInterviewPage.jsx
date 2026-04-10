import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import interviewService from '../services/interviewService'
import api from '../services/api'
import { startInterview, sendToFlowise } from '../services/flowiseService'
import useTTS from '../hooks/useTTS'
import useVisionAI from '../hooks/useVisionAI'
import AvatarCanvas from '../components/AvatarCanvas'
import PreFlight from '../components/Interview/PreFlight'

/* ── Phase-specific coaching tips ─────────────────────────────────────────── */
const PHASE_TIPS = {
  opening: [
    { icon: '👋', text: 'Keep your intro concise — 60–90 seconds max.' },
    { icon: '🎯', text: 'Mention your current role, key skills, and what excites you.' },
  ],
  technical: [
    { icon: '🔧', text: 'Walk through your reasoning step by step.' },
    { icon: '📊', text: 'Use specific examples from past projects.' },
  ],
  behavioral: [
    { icon: '⭐', text: 'Use STAR: Situation → Task → Action → Result.' },
    { icon: '📏', text: 'Be specific — dates, numbers, outcomes.' },
  ],
  closing: [
    { icon: '❓', text: 'Ask thoughtful questions about the role or team.' },
    { icon: '🤝', text: 'Express your continued interest.' },
  ],
}

export default function VideoInterviewPage() {
  const navigate = useNavigate()
  const { interviewId } = useParams()
  const location = useLocation()
  const typeFromUrl = new URLSearchParams(location.search).get('type') || 'general'

  // Pre-flight gate — shown before interview starts
  const [showPreFlight, setShowPreFlight] = useState(true)
  const preFlyStreamRef = useRef(null)  // stream acquired during PreFlight

  // Session state
  const [elapsed, setElapsed] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [interview, setInterview] = useState(null)

  // Camera / media state
  const [isMuted, setIsMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [camError, setCamError] = useState(null)

  // AI / interview state
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [displayedQuestion, setDisplayedQuestion] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const tts = useTTS()
  const isSpeaking = tts.isSpeaking
  const [evaluation, setEvaluation] = useState(null)
  const [interviewPhase, setInterviewPhase] = useState('opening')
  const [isComplete, setIsComplete] = useState(false)
  const [finalSummary, setFinalSummary] = useState(null)
  const [answer, setAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(true)
  const [questionCount, setQuestionCount] = useState(0)

  // Avatar toggle
  const [showAvatar, setShowAvatar] = useState(() => localStorage.getItem('intervuai_show_avatar') !== 'false')

  // Difficulty & score history
  const [difficultyLevel, setDifficultyLevel] = useState('easy')
  const [scoreHistory, setScoreHistory] = useState({
    grammar: [], relevance: [], overall: [], confidence: [], clarity: [],
    structure: [], engagement: [],
  })

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState(120)
  const [timerActive, setTimerActive] = useState(false)

  // Voice input
  const [isListening, setIsListening] = useState(false)
  const [liveSpeech, setLiveSpeech] = useState('')

  // Behavioral analysis — comprehensive metrics
  const [behavioralMetrics, setBehavioralMetrics] = useState({
    eyeContactFrames: 0, totalFrames: 0, faceDetected: false,
  })
  const [audioMetrics, setAudioMetrics] = useState({
    volume: 0, avgVolume: 0, pace: 0, fillerCount: 0,
  })
  const [nonVerbalScore, setNonVerbalScore] = useState(null)

  // Refs — videoRef MUST be declared before useVisionAI below
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const answerRef = useRef(null)
  const recognitionRef = useRef(null)
  const behaviorIntervalRef = useRef(null)
  const metricsRef = useRef({ eyeContact: 0, total: 0 })
  const nonVerbalSavedRef = useRef(false)
  const lastFinalRef = useRef('')
  const evaluationsRef = useRef([])
  const typewriterRef = useRef(null)
  const countdownRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const audioIntervalRef = useRef(null)
  const volumeSamplesRef = useRef([])
  const wordTimestampsRef = useRef([])
  const fillerWordsRef = useRef(0)

  // Filler words to detect
  const FILLER_WORDS = ['um', 'uh', 'uhm', 'like', 'you know', 'basically', 'actually', 'literally', 'so yeah', 'i mean']

  useEffect(() => {
    return () => { try { recognitionRef.current?.abort?.() } catch {} }
  }, [])

  // ── MediaPipe Vision AI — edge-side non-verbal tracking ───────────────────
  // Must come AFTER videoRef is declared above
  const {
    visionMetrics,
    activeNudge,
    isInitialized: isVisionReady,
    initError: visionError,
    startTracking,
    stopTracking,
    getSessionAverages,
  } = useVisionAI(videoRef, isSpeaking)

  // ── Text-to-Speech (OpenAI TTS with browser fallback) ─────────────────────
  const speakQuestion = useCallback((text) => {
    if (!text || text.startsWith('⚠')) {
      setTimerActive(true)
      return
    }
    tts.stop()
    tts.speak(text, { onEnd: () => setTimerActive(true) })
  }, [tts])

  // ── Typewriter effect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentQuestion) return
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    setDisplayedQuestion('')
    setIsTyping(true)
    setTimerActive(false)
    setTimeLeft(120)
    let idx = 0
    typewriterRef.current = setInterval(() => {
      idx++
      setDisplayedQuestion(currentQuestion.slice(0, idx))
      if (idx >= currentQuestion.length) {
        clearInterval(typewriterRef.current)
        typewriterRef.current = null
        setIsTyping(false)
        if (currentQuestion.startsWith('⚠')) setTimerActive(true)
      }
    }, 22)
    speakQuestion(currentQuestion)
    return () => { if (typewriterRef.current) clearInterval(typewriterRef.current) }
  }, [currentQuestion]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Countdown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive || isComplete) return
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(countdownRef.current); countdownRef.current = null; setTimerActive(false); return 0 }
        return t - 1
      })
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [timerActive, isComplete])

  // ── Camera + Audio Analysis ────────────────────────────────────────────────
  const startCamera = useCallback(async (existingStream = null) => {
    try {
      setCamError(null)
      // Reuse the stream acquired during PreFlight to avoid a second permission prompt
      const stream = existingStream || await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      // Set up audio analysis for tone/volume
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8
        source.connect(analyser)
        audioContextRef.current = audioCtx
        analyserRef.current = analyser

        // Sample audio volume every 200ms
        audioIntervalRef.current = setInterval(() => {
          if (!analyserRef.current) return
          const data = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(data)
          const avg = data.reduce((a, b) => a + b, 0) / data.length
          const normalized = Math.min(100, Math.round((avg / 128) * 100))
          volumeSamplesRef.current.push(normalized)
          if (volumeSamplesRef.current.length > 150) volumeSamplesRef.current.shift()
          const overallAvg = volumeSamplesRef.current.length > 0
            ? Math.round(volumeSamplesRef.current.reduce((a, b) => a + b, 0) / volumeSamplesRef.current.length)
            : 0
          setAudioMetrics(prev => ({ ...prev, volume: normalized, avgVolume: overallAvg }))
        }, 200)
      } catch (audioErr) {
        console.warn('[Audio Analysis] Could not start:', audioErr)
      }

      // Face detection via skin-tone heuristic every 2s
      if (!behaviorIntervalRef.current) {
        behaviorIntervalRef.current = setInterval(() => {
          const video = videoRef.current
          const canvas = canvasRef.current
          if (!video || !canvas || video.readyState < 2) return
          canvas.width = video.videoWidth || 320
          canvas.height = video.videoHeight || 240
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const cx = Math.floor(canvas.width * 0.2)
            const cy = Math.floor(canvas.height * 0.05)
            const cw = Math.floor(canvas.width * 0.6)
            const ch = Math.floor(canvas.height * 0.6)
            const imageData = ctx.getImageData(cx, cy, cw, ch)
            const d = imageData.data
            let skinPx = 0
            const total = d.length / 4
            for (let i = 0; i < d.length; i += 4) {
              const r = d[i], g = d[i + 1], b = d[i + 2]
              if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) skinPx++
            }
            const ratio = skinPx / total
            const faceDetected = ratio > 0.08
            const goodFraming = ratio > 0.12
            metricsRef.current.total++
            if (faceDetected && goodFraming) metricsRef.current.eyeContact++
            setBehavioralMetrics({
              eyeContactFrames: metricsRef.current.eyeContact,
              totalFrames: metricsRef.current.total,
              faceDetected,
            })
          } catch (_) {}
        }, 2000)
      }
      // Start MediaPipe vision tracking once video element has a stream
      if (isVisionReady) {
        // Give the video element one frame to attach srcObject
        requestAnimationFrame(() => startTracking())
      }
    } catch (err) {
      console.error('[Camera]', err)
      setCamError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Allow camera in your browser settings.'
          : `Camera unavailable: ${err.message}`,
      )
      setIsCamOff(true)
    }
  }, [isVisionReady, startTracking])

  const stopCamera = useCallback(() => {
    stopTracking()  // flush MediaPipe session buffer before stopping
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
    if (behaviorIntervalRef.current) { clearInterval(behaviorIntervalRef.current); behaviorIntervalRef.current = null }
    if (audioIntervalRef.current) { clearInterval(audioIntervalRef.current); audioIntervalRef.current = null }
    if (audioContextRef.current) { try { audioContextRef.current.close() } catch {} audioContextRef.current = null }
    analyserRef.current = null
  }, [stopTracking])

  // ── Voice input ────────────────────────────────────────────────────────────
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input is not supported in this browser. Please use Chrome or Edge.'); return }
    if (isListening) {
      try { recognitionRef.current?.stop?.() } catch {}
      setIsListening(false)
      setLiveSpeech('')
      return
    }
    try { recognitionRef.current?.abort?.() } catch {}
    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      try { tts.stop() } catch {}
      setIsListening(true)
      setLiveSpeech('')
      lastFinalRef.current = ''
    }
    recognition.onend = () => {
      try {
        const leftover = (liveSpeech || '').trim()
        if (leftover) { setLiveSpeech(''); setAnswer(prev => prev ? `${prev} ${leftover}` : leftover) }
      } catch {}
      if (!isComplete) {
        setTimeout(() => { try { recognition.start() } catch {} }, 150)
      } else { setIsListening(false); setLiveSpeech('') }
    }
    recognition.onerror = (e) => {
      const reason = e?.error || ''
      if (reason === 'not-allowed') {
        setIsListening(false); setLiveSpeech('')
        alert('Microphone permission is blocked. Please allow mic access.')
        return
      }
      if (!isComplete) setTimeout(() => { try { recognition.start() } catch {} }, 200)
      else { setIsListening(false); setLiveSpeech('') }
    }
    recognition.onresult = e => {
      try {
        let interimCombined = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]
          const txt = res[0]?.transcript?.trim() || ''
          if (!txt) continue
          if (res.isFinal) {
            if (txt && txt !== lastFinalRef.current) {
              const words = txt.split(/\s+/).length
              wordTimestampsRef.current.push({ words, time: Date.now() })
              const lower = txt.toLowerCase()
              for (const filler of FILLER_WORDS) {
                const regex = new RegExp(`\\b${filler}\\b`, 'gi')
                const matches = lower.match(regex)
                if (matches) fillerWordsRef.current += matches.length
              }
              setAudioMetrics(prev => ({ ...prev, fillerCount: fillerWordsRef.current }))
              const stamps = wordTimestampsRef.current
              if (stamps.length >= 2) {
                const totalWords = stamps.reduce((a, s) => a + s.words, 0)
                const elapsedMs = (stamps[stamps.length - 1].time - stamps[0].time) / 60000
                const wpm = elapsedMs > 0 ? Math.round(totalWords / elapsedMs) : 0
                setAudioMetrics(prev => ({ ...prev, pace: wpm }))
              }
              setAnswer(prev => prev ? `${prev} ${txt}` : txt)
              lastFinalRef.current = txt
              answerRef.current?.focus()
            }
            setLiveSpeech('')
          } else {
            interimCombined = interimCombined ? `${interimCombined} ${txt}` : txt
          }
        }
        if (interimCombined) setLiveSpeech(interimCombined)
      } catch {}
    }
    recognitionRef.current = recognition
    try { recognition.start() } catch { alert('Unable to start voice input.') }
  }

  // ── Toggle mute / camera ───────────────────────────────────────────────────
  const toggleMute = () => {
    if (streamRef.current) streamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted })
    setIsMuted(m => !m)
  }
  const toggleCamera = () => {
    if (isCamOff) { setIsCamOff(false); startCamera() }
    else { setIsCamOff(true); stopCamera() }
  }

  // ── Non-verbal composite score ─────────────────────────────────────────────
  const calcNonVerbalScore = useCallback(() => {
    const { eyeContact, total } = metricsRef.current
    if (total === 0) return null
    const eyeContactScore = Math.min(100, Math.round((eyeContact / total) * 100))
    const vol = audioMetrics.avgVolume
    const volumeScore = vol < 10 ? 30 : vol < 20 ? 55 : vol > 85 ? 60 : vol > 70 ? 75 : 90
    const pace = audioMetrics.pace
    const paceScore = pace === 0 ? 70 : pace < 80 ? 50 : pace < 120 ? 70 : pace > 200 ? 55 : pace > 160 ? 75 : 90
    const fillerPenalty = Math.min(30, fillerWordsRef.current * 2)
    return Math.max(0, Math.min(100, Math.round(
      eyeContactScore * 0.35 + volumeScore * 0.25 + paceScore * 0.25 + (100 - fillerPenalty) * 0.15
    )))
  }, [audioMetrics.avgVolume, audioMetrics.pace])

  // ── Init: camera + interview ───────────────────────────────────────────────
  useEffect(() => {
    startCamera()
    if (!interviewId) return
    interviewService.getInterview(interviewId)
      .then(data => {
        setInterview(data)
        return interviewService.startSession(interviewId).then(s => {
          setSessionId(s.id)
          return startInterview({ jobRole: data.job_role || 'General', sessionId: interviewId, interviewType: data.interview_type || typeFromUrl })
        })
      })
      .then(data => {
        setCurrentQuestion(data.next_question || 'Good morning! Please introduce yourself and tell me a bit about your background.')
        setInterviewPhase(data.interview_phase || 'opening')
        setAiLoading(false)
        setQuestionCount(1)
      })
      .catch(err => {
        console.error('[AI] startInterview error:', err)
        setCurrentQuestion(`⚠ Could not connect to AI: ${err.message}. Make sure the Flask backend is running and GROQ_API_KEY is set.`)
        setAiLoading(false)
      })
    const timer = setInterval(() => setElapsed(p => p + 1), 1000)
    return () => {
      clearInterval(timer)
      tts.stop()
      if (typewriterRef.current) clearInterval(typewriterRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
      if (behaviorIntervalRef.current) { clearInterval(behaviorIntervalRef.current); behaviorIntervalRef.current = null }
      if (audioIntervalRef.current) { clearInterval(audioIntervalRef.current); audioIntervalRef.current = null }
      if (audioContextRef.current) { try { audioContextRef.current.close() } catch {} }
      recognitionRef.current?.stop()
    }
  }, [interviewId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isCamOff && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current
  }, [isCamOff])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ── Submit answer ──────────────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!answer.trim() || aiLoading || isComplete) return
    tts.stop()
    setTimerActive(false)
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
    if (isListening) {
      try { recognitionRef.current?.stop?.() } catch {}
      setIsListening(false)
      setLiveSpeech('')
    }
    const userAnswer = answer.trim()
    setAnswer('')
    setLiveSpeech('')
    setAiLoading(true)
    wordTimestampsRef.current = []
    fillerWordsRef.current = 0

    try {
      const data = await sendToFlowise({
        userMessage: userAnswer,
        jobRole: interview?.job_role || 'General',
        sessionId: interviewId,
      })
      setCurrentQuestion(data.next_question || currentQuestion)
      setInterviewPhase(data.interview_phase || interviewPhase)
      setQuestionCount(q => q + 1)
      if (data.evaluation) {
        setEvaluation(data.evaluation)
        evaluationsRef.current.push(data.evaluation)
        setScoreHistory(prev => ({
          grammar: [...prev.grammar, data.evaluation.grammar_score].filter(v => v != null),
          relevance: [...prev.relevance, data.evaluation.relevance_score].filter(v => v != null),
          overall: [...prev.overall, data.evaluation.overall_quality].filter(v => v != null),
          confidence: [...prev.confidence, data.evaluation.confidence_score].filter(v => v != null),
          clarity: [...prev.clarity, data.evaluation.clarity_score].filter(v => v != null),
          structure: [...prev.structure, data.evaluation.structure_score].filter(v => v != null),
          engagement: [...prev.engagement, data.evaluation.engagement_score].filter(v => v != null),
        }))
      }
      if (data.difficulty_level) setDifficultyLevel(data.difficulty_level)
      if (data.is_complete) {
        setIsComplete(true)
        setFinalSummary(data.final_summary || null)
        const nvScore = calcNonVerbalScore()
        setNonVerbalScore(nvScore)
        if (!nonVerbalSavedRef.current) {
          nonVerbalSavedRef.current = true
          const summary = data.final_summary || {}
          const allEvals = evaluationsRef.current
          const avg = (arr) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
          const overalls   = allEvals.map(e => e.overall_quality).filter(v => v != null)
          const grammars   = allEvals.map(e => e.grammar_score).filter(v => v != null)
          const relevances = allEvals.map(e => e.relevance_score).filter(v => v != null)
          const confidences = allEvals.map(e => e.confidence_score).filter(v => v != null)
          const clarities  = allEvals.map(e => e.clarity_score).filter(v => v != null)
          const structures = allEvals.map(e => e.structure_score).filter(v => v != null)
          const engagements = allEvals.map(e => e.engagement_score).filter(v => v != null)

          // Compute Groq 7-dimension verbal average
          const allGroqScores = [...overalls, ...grammars, ...relevances, ...confidences, ...clarities, ...structures, ...engagements]
          const groqVerbalAvg = allGroqScores.length > 0 ? avg(allGroqScores) : null

          // Merge MediaPipe non-verbal data from useVisionAI
          const visionAvg = getSessionAverages()

          // ── POST /api/feedback/record — weighted scoring on backend ────────
          // Formula: TotalScore = (GroqVerbalAvg × 0.7) + (MediaPipeNonVerbalAvg × 0.3)
          api.post('/feedback/record', {
            interviewId:     interviewId,
            eyeContactRatio: visionAvg.sampleCount > 0 ? visionAvg.eyeContactRatio : null,
            postureScore:    visionAvg.sampleCount > 0 ? visionAvg.postureScore : null,
            sampleCount:     visionAvg.sampleCount,
            groqVerbalAvg:   groqVerbalAvg,
            sessionBuffer:   visionMetrics.sessionBuffer,
          }).catch(err => console.warn('[VideoInterview] /feedback/record failed:', err))

          // Also keep the lightweight interviewService.updateScores for immediate report display
          const overallScore = summary.overall_readiness_score ?? avg(overalls)
          const verbalScore  = groqVerbalAvg ?? avg(overalls)
          if (overallScore != null || verbalScore != null || nvScore != null) {
            const scores = {}
            if (overallScore != null) scores.overallScore = overallScore
            if (verbalScore != null)  scores.verbalScore  = verbalScore
            if (nvScore != null)      scores.nonVerbalScore = nvScore
            interviewService.updateScores(interviewId, scores).catch(() => {})
          }
        }
      }
      interviewService.persistMessage(interviewId, 'user', userAnswer).catch(() => {})
      interviewService.persistMessage(interviewId, 'assistant', data.next_question || '', {
        evaluation: data.evaluation || null,
        interview_phase: data.interview_phase,
        is_complete: data.is_complete || false,
        final_summary: data.final_summary || null,
      }).catch(() => {})
    } catch (err) {
      console.error('[AI] submitAnswer error:', err)
      setCurrentQuestion(`⚠ AI error: ${err.message}. Check that the Flask backend is running and GROQ_API_KEY is configured.`)
    } finally {
      setAiLoading(false)
      answerRef.current?.focus()
    }
  }

  // ── End / Back ─────────────────────────────────────────────────────────────
  const handleEnd = async () => {
    if (!isComplete) {
      if (!window.confirm("You are in an active interview. Are you sure you want to end it?")) return
    }
    tts.stop()
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    stopCamera()
    try { recognitionRef.current?.stop?.() } catch {}
    interviewService.clearAISession(interviewId).catch(() => {})
    if (isComplete) await new Promise(r => setTimeout(r, 600))
    if (sessionId) await interviewService.endSession(sessionId).catch(() => {})
    navigate(isComplete ? `/interview/${interviewId}/report` : '/dashboard')
  }

  const handleBack = () => {
    if (!isComplete && !window.confirm("Leaving now will end the session. Continue?")) return
    tts.stop()
    stopCamera()
    try { recognitionRef.current?.stop?.() } catch {}
    navigate('/dashboard')
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const eyeContactPct = behavioralMetrics.totalFrames > 0
    ? Math.round((behavioralMetrics.eyeContactFrames / behavioralMetrics.totalFrames) * 100) : null

  const grammarScore = evaluation?.grammar_score ?? null
  const relevanceScore = evaluation?.relevance_score ?? null
  const overallScore = evaluation?.overall_quality ?? null
  const confidenceScore = evaluation?.confidence_score ?? null
  const clarityScore = evaluation?.clarity_score ?? null
  const structureScore = evaluation?.structure_score ?? null
  const engagementScore = evaluation?.engagement_score ?? null
  const answerLengthFeedback = evaluation?.answer_length_feedback
  const usedStar = evaluation?.star_usage
  const usedExamples = evaluation?.used_examples

  const phaseLabel = { opening: 'Opening', technical: 'Technical', behavioral: 'Behavioral', closing: 'Closing', unknown: '—' }[interviewPhase] || interviewPhase
  const phaseIcon = { opening: '👋', technical: '💻', behavioral: '🧠', closing: '🤝' }[interviewPhase] || '📋'
  const canSubmit = answer.trim().length > 0 && !aiLoading && !isComplete

  const difficultyLabel = { easy: 'Easy', moderate: 'Moderate', challenging: 'Challenging' }[difficultyLevel] || difficultyLevel
  const difficultyColor = { easy: '#16a34a', moderate: '#d97706', challenging: '#e53e3e' }[difficultyLevel] || 'rgba(255,255,255,.4)'

  const currentWordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0
  const tips = PHASE_TIPS[interviewPhase] || PHASE_TIPS.opening

  const scoreTrend = (key) => {
    const arr = scoreHistory[key]
    if (!arr || arr.length < 2) return null
    const diff = arr[arr.length - 1] - arr[arr.length - 2]
    if (diff === 0) return null
    return { diff, color: diff > 0 ? 'var(--teal)' : '#e53e3e', arrow: diff > 0 ? '▲' : '▼' }
  }

  const volumeLabel = audioMetrics.volume < 10 ? 'Too quiet' : audioMetrics.volume < 25 ? 'Quiet' : audioMetrics.volume > 80 ? 'Too loud' : audioMetrics.volume > 60 ? 'Loud' : 'Good'
  const volumeColor = audioMetrics.volume < 10 ? '#e53e3e' : audioMetrics.volume < 25 ? '#d97706' : audioMetrics.volume > 80 ? '#e53e3e' : 'var(--teal)'
  const paceLabel = audioMetrics.pace === 0 ? '—' : audioMetrics.pace < 100 ? 'Slow' : audioMetrics.pace > 180 ? 'Too fast' : audioMetrics.pace > 160 ? 'Fast' : 'Good'
  const paceColor = audioMetrics.pace === 0 ? 'rgba(255,255,255,.4)' : audioMetrics.pace < 100 ? '#d97706' : audioMetrics.pace > 180 ? '#e53e3e' : 'var(--teal)'
  const sc = (v) => v == null ? 'rgba(255,255,255,.4)' : v >= 80 ? 'var(--teal)' : v >= 60 ? '#d97706' : '#e53e3e'

  // ── PreFlight start handler ────────────────────────────────────────────────
  const handlePreFlightStart = useCallback((preFlyStream) => {
    preFlyStreamRef.current = preFlyStream
    setShowPreFlight(false)
    // Start camera using the already-acquired stream (no second permission prompt)
    startCamera(preFlyStream)
  }, [startCamera])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="video-page-wrapper">
      {/* PreFlight gate */}
      {showPreFlight && (
        <PreFlight
          isVisionReady={isVisionReady}
          visionError={visionError}
          onStart={handlePreFlightStart}
          onClose={() => navigate('/dashboard')}
        />
      )}

      <style>{`
        @keyframes soundBar { 0% { transform: scaleY(0.15); } 100% { transform: scaleY(1); } }
        @keyframes nudgeFadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes recBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.15; } }
        @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes stagePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(0,200,140,0); } 50% { box-shadow: 0 0 0 6px rgba(0,200,140,0.12); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .sound-bar { animation: soundBar 0.5s ease-in-out infinite alternate; transform-origin: bottom center; }
        .rec-dot-anim { animation: recBlink 1.2s ease-in-out infinite; }
        .cursor-blink { animation: cursorBlink 0.7s step-end infinite; }
        .stage-speaking { animation: stagePulse 2s ease-in-out infinite; }
        .submit-btn-pulse { animation: pulse 2s ease-in-out infinite; }
        .volume-indicator { transition: height 0.15s ease-out; }
      `}</style>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ── Top bar ── */}
      <div className="video-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div className="video-logo-text">IntervuAI</div>
            <div className="video-logo-sub">{interview?.job_role || 'Video Interview'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="video-timer">⏱ {formatTime(elapsed)}</div>
          <div className="video-live">
            <div className="live-dot" style={{ background: isComplete ? 'var(--teal)' : '#e53e3e' }} />
            {isComplete ? 'DONE' : 'LIVE'}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleBack} style={{ fontSize: 12 }}>← Back</button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="video-layout" style={{ flex: 1 }}>
        <div className="video-main">

          {/* ══ SIMULATION STAGE ══ */}
          <div
            className={isSpeaking ? 'stage-speaking' : ''}
            style={{
              position: 'relative',
              background: 'linear-gradient(160deg, #0c0f1a 0%, #13192b 60%, #0b0f1e 100%)',
              borderRadius: 16, minHeight: 440, overflow: 'hidden', marginBottom: 16,
              border: `1px solid ${isSpeaking ? 'rgba(0,200,140,0.25)' : 'rgba(255,255,255,0.06)'}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)', transition: 'border-color 0.4s',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }} />

            {/* Top-left: REC */}
            <div style={{
              position: 'absolute', top: 14, left: 14, zIndex: 10,
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
              borderRadius: 20, padding: '5px 12px',
              fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.6,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div className={isComplete ? '' : 'rec-dot-anim'} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isComplete ? 'var(--teal)' : '#e53e3e', flexShrink: 0,
              }} />
              {isComplete ? 'SESSION COMPLETE' : 'REC'}
            </div>

            {/* Top-right: phase + timer */}
            <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                background: 'rgba(0,200,140,0.12)', border: '1px solid rgba(0,200,140,0.3)',
                borderRadius: 20, padding: '4px 11px',
                fontSize: 11, color: 'var(--teal)', fontWeight: 600, letterSpacing: 0.5,
              }}>{phaseIcon} {phaseLabel} · Q{questionCount}</span>
              <span style={{
                background: difficultyColor + '22', border: `1px solid ${difficultyColor}55`,
                borderRadius: 20, padding: '4px 11px',
                fontSize: 10, color: difficultyColor, fontWeight: 700, letterSpacing: 0.5,
              }}>{difficultyLabel}</span>
              <span style={{
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                borderRadius: 20, padding: '4px 11px',
                fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>{formatTime(elapsed)}</span>
            </div>

            {/* Main content: AI Avatar + PiP */}
            <div style={{
              display: 'flex', alignItems: 'stretch', minHeight: 440,
              padding: '48px 0 56px 0', position: 'relative', zIndex: 1,
            }}>
              {/* Left: AI Avatar (main focus) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
                {showAvatar ? (
                  <AvatarCanvas audioRef={tts.audioRef} isSpeaking={isSpeaking} style={{
                    width: '100%', maxWidth: 340, height: 300, borderRadius: 20,
                    border: `2px solid ${isSpeaking ? 'rgba(0,200,140,0.35)' : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: isSpeaking ? '0 0 40px rgba(0,200,140,0.12)' : '0 4px 24px rgba(0,0,0,0.4)',
                    transition: 'border-color 0.4s, box-shadow 0.4s',
                  }} />
                ) : (
                  <div style={{
                    width: 100, height: 100, borderRadius: '50%',
                    background: isSpeaking
                      ? 'radial-gradient(circle at 40% 40%, rgba(0,200,140,0.25) 0%, rgba(0,200,140,0.06) 100%)'
                      : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${isSpeaking ? 'rgba(0,200,140,0.55)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 42,
                    boxShadow: isSpeaking ? '0 0 28px rgba(0,200,140,0.22)' : 'none',
                    transition: 'all 0.4s ease',
                  }}>👤</div>
                )}

                {/* Status */}
                <div style={{
                  marginTop: 14,
                  fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600,
                  color: isSpeaking ? 'var(--teal)' : aiLoading ? 'rgba(255,255,255,0.3)' : isComplete ? 'var(--teal)' : 'rgba(255,255,255,0.35)',
                }}>
                  {isSpeaking ? '● Interviewer Speaking'
                    : aiLoading && !currentQuestion ? '● Connecting…'
                    : aiLoading ? '● Reviewing your answer…'
                    : isComplete ? '● Interview Complete'
                    : '● Waiting for your answer'}
                </div>

                {/* Question text */}
                <div style={{
                  marginTop: 14, color: '#fff', fontSize: 16, lineHeight: 1.7,
                  fontFamily: 'var(--font-head)', maxWidth: 520, minHeight: 60, textAlign: 'center',
                }}>
                  {aiLoading && !currentQuestion ? (
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', fontSize: 15 }}>Setting up your interview…</span>
                  ) : (
                    <>
                      {displayedQuestion || (aiLoading ? '' : currentQuestion)}
                      {isTyping && <span className="cursor-blink" style={{ color: 'var(--teal)', fontWeight: 300, marginLeft: 1 }}>|</span>}
                    </>
                  )}
                </div>

                {!isTyping && !isSpeaking && !aiLoading && !isComplete && currentQuestion && interviewPhase === 'behavioral' && (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
                    💡 Use the STAR method — Situation, Task, Action, Result
                  </div>
                )}
              </div>

              {/* PiP camera */}
              <div style={{ width: 210, flexShrink: 0, paddingRight: 14, alignSelf: 'flex-end', paddingBottom: 54 }}>
                {/* Nudge toast — floats above PiP camera when MediaPipe fires a coaching nudge */}
                {activeNudge && (
                  <div style={{
                    marginBottom: 8, background: 'rgba(245,158,11,0.95)',
                    borderRadius: 10, padding: '8px 12px',
                    fontSize: 11, fontWeight: 600, color: '#fff',
                    display: 'flex', alignItems: 'flex-start', gap: 7,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    animation: 'nudgeFadeIn 0.3s ease',
                    lineHeight: 1.4,
                  }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                    {activeNudge}
                  </div>
                )}
                <div style={{
                  width: '100%', height: 148, borderRadius: 10,
                  border: `2px solid ${behavioralMetrics.faceDetected ? 'rgba(0,200,140,0.5)' : isCamOff ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.18)'}`,
                  overflow: 'hidden', background: '#000',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.6)', position: 'relative', transition: 'border-color 0.3s',
                }}>
                  {isCamOff ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.35)', gap: 6 }}>
                      <div style={{ fontSize: 24 }}>📷</div>
                      {camError ? (
                        <>
                          <div style={{ fontSize: 10, textAlign: 'center', padding: '0 8px', color: 'rgba(255,120,120,0.7)', lineHeight: 1.4 }}>{camError}</div>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, marginTop: 2 }}
                            onClick={() => { setCamError(null); setIsCamOff(false); startCamera() }}>Retry</button>
                        </>
                      ) : <div style={{ fontSize: 11 }}>Camera off</div>}
                    </div>
                  ) : (
                    <video ref={videoRef} autoPlay muted playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                  )}
                  {!isCamOff && behavioralMetrics.totalFrames > 0 && (
                    <div style={{
                      position: 'absolute', top: 5, right: 5,
                      background: behavioralMetrics.faceDetected ? 'rgba(0,170,110,0.88)' : 'rgba(200,55,55,0.88)',
                      borderRadius: 8, padding: '2px 6px', fontSize: 9, color: '#fff', fontWeight: 700,
                    }}>{behavioralMetrics.faceDetected ? '👁 OK' : '⚠ Face?'}</div>
                  )}
                  {!isCamOff && isListening && (
                    <div style={{
                      position: 'absolute', left: 4, bottom: 4, top: 4, width: 4,
                      background: 'rgba(0,0,0,0.4)', borderRadius: 3, overflow: 'hidden',
                      display: 'flex', flexDirection: 'column-reverse',
                    }}>
                      <div className="volume-indicator" style={{
                        width: '100%', background: volumeColor, borderRadius: 3,
                        height: `${Math.min(100, audioMetrics.volume)}%`,
                      }} />
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 5, left: 12,
                    fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 600,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}>You</div>
                </div>
              </div>
            </div>

            {/* Countdown */}
            {timerActive && !isComplete && (
              <div style={{
                position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
                background: timeLeft < 30 ? 'rgba(210,55,55,0.88)' : 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)', borderRadius: 20, padding: '5px 18px',
                fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'monospace', letterSpacing: 1,
                border: timeLeft < 30 ? '1px solid rgba(210,80,80,0.6)' : '1px solid rgba(255,255,255,0.1)',
                zIndex: 10,
              }}>{timeLeft < 30 ? '⚠' : '⏳'} {formatTime(timeLeft)} remaining</div>
            )}

            {isComplete && (
              <div style={{
                position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,160,100,0.88)', backdropFilter: 'blur(6px)',
                borderRadius: 20, padding: '6px 20px',
                fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 0.5,
                border: '1px solid rgba(0,200,140,0.4)', whiteSpace: 'nowrap', zIndex: 10,
              }}>✓ Interview complete — click &quot;View Report&quot; to see your results</div>
            )}
          </div>

          {/* ── Answer input ── */}
          {!isComplete ? (
            <div style={{ marginBottom: 12 }}>
              {isListening && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                  padding: '8px 14px', background: 'rgba(0,200,140,0.08)',
                  borderRadius: 10, border: '1px solid rgba(0,200,140,0.2)',
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e53e3e', animation: 'recBlink 1s ease-in-out infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>Listening</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>
                    {liveSpeech ? `"${liveSpeech}"` : 'Speak now...'}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>Vol: {volumeLabel}</span>
                </div>
              )}

              {/* Answer length coaching */}
              {currentWordCount > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                  padding: '5px 12px', borderRadius: 8,
                  background: currentWordCount > 200 ? 'rgba(229,62,62,0.12)' : currentWordCount < 20 ? 'rgba(217,119,6,0.12)' : 'transparent',
                }}>
                  {currentWordCount > 200 && (
                    <span style={{ fontSize: 11, color: '#e53e3e', fontWeight: 600 }}>
                      ⚠ Your answer is getting long — focus on key points.
                    </span>
                  )}
                  {currentWordCount > 0 && currentWordCount < 20 && (
                    <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>
                      💡 Elaborate more — aim for 50-150 words with examples.
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  ref={answerRef}
                  className="chat-input"
                  placeholder={
                    isSpeaking ? '🔊 Interviewer is speaking — prepare your answer...'
                      : aiLoading ? '⏳ Processing...'
                      : isListening ? '🎤 Speaking... your words appear here'
                      : 'Type your answer or click 🎙️ to speak...'
                  }
                  value={isListening && liveSpeech ? `${answer}${answer ? ' ' : ''}${liveSpeech}` : answer}
                  onChange={e => { setAnswer(e.target.value); if (isListening) setLiveSpeech('') }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && canSubmit) { e.preventDefault(); submitAnswer() } }}
                  disabled={aiLoading || isSpeaking}
                  rows={3}
                  style={{
                    flex: 1, resize: 'vertical', minHeight: 72,
                    borderRadius: 10, padding: '10px 14px',
                    borderColor: isListening ? 'var(--teal)' : undefined,
                    transition: 'border-color .2s',
                    opacity: (aiLoading || isSpeaking) ? 0.5 : 1,
                  }}
                />
                <button
                  className={canSubmit ? 'submit-btn-pulse' : ''}
                  onClick={submitAnswer}
                  disabled={!canSubmit}
                  title="Submit your answer (Enter)"
                  style={{
                    width: 56, height: 56, borderRadius: 12,
                    background: canSubmit ? 'var(--teal)' : 'rgba(255,255,255,0.08)',
                    color: canSubmit ? '#fff' : 'rgba(255,255,255,0.3)',
                    border: canSubmit ? '1px solid rgba(0,200,140,0.6)' : '1px solid rgba(255,255,255,0.1)',
                    fontSize: 22, cursor: canSubmit ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: canSubmit ? '0 4px 16px rgba(0,200,140,0.3)' : 'none',
                  }}
                >➤</button>
              </div>

              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>Press Enter to submit · Shift+Enter for new line</span>
                {answer.trim().length > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{answer.trim().split(/\s+/).length} words</span>
                )}
              </div>
            </div>
          ) : (
            finalSummary && (
              <div style={{
                background: 'rgba(0,200,140,0.06)', border: '1px solid rgba(0,200,140,0.2)',
                borderRadius: 14, padding: 20, marginBottom: 12,
              }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#fff' }}>📋 Interview Summary</h3>
                {finalSummary.summary_paragraph && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: '0 0 12px' }}>{finalSummary.summary_paragraph}</p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {finalSummary.overall_readiness_score != null && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: sc(finalSummary.overall_readiness_score) }}>{finalSummary.overall_readiness_score}%</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Readiness Score</div>
                    </div>
                  )}
                  {finalSummary.hiring_recommendation && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--teal)', textTransform: 'capitalize' }}>{finalSummary.hiring_recommendation.replace('_', ' ')}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Recommendation</div>
                    </div>
                  )}
                </div>
                {finalSummary.top_strengths?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)', marginBottom: 4 }}>Strengths</div>
                    {finalSummary.top_strengths.map((s, i) => <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', padding: '2px 0' }}>✓ {s}</div>)}
                  </div>
                )}
                {finalSummary.areas_for_improvement?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#d97706', marginBottom: 4 }}>Areas to Improve</div>
                    {finalSummary.areas_for_improvement.map((s, i) => <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', padding: '2px 0' }}>💡 {s}</div>)}
                  </div>
                )}
              </div>
            )
          )}

          {/* ── Controls ── */}
          <div className="video-controls">
            <button className={`vid-ctrl-btn ${isMuted ? 'red' : 'gray'}`} onClick={toggleMute} title={isMuted ? 'Unmute mic' : 'Mute mic'}>{isMuted ? '🔇' : '🎤'}</button>
            <button className={`vid-ctrl-btn ${isCamOff ? 'red' : 'gray'}`} onClick={toggleCamera} title={isCamOff ? 'Turn camera on' : 'Turn camera off'}>{isCamOff ? '📷' : '🎥'}</button>
            <button className={`vid-ctrl-btn ${isListening ? 'active' : 'gray'}`} onClick={toggleVoice} disabled={aiLoading || isComplete}
              title={isListening ? 'Stop voice input' : 'Start voice input'}
              style={isListening ? { background: 'rgba(0,200,140,0.25)', border: '2px solid var(--teal)', boxShadow: '0 0 12px rgba(0,200,140,0.3)' } : {}}>
              {isListening ? '⏹' : '🎙️'}
            </button>
            <button className="vid-ctrl-btn gray" onClick={() => { tts.stop(); if (currentQuestion && !currentQuestion.startsWith('⚠')) speakQuestion(currentQuestion) }}
              title="Replay question" style={{ fontSize: 16 }}>🔊</button>
            <button className={`vid-ctrl-btn ${showAvatar ? 'active' : 'gray'}`}
              onClick={() => { setShowAvatar(v => { const next = !v; localStorage.setItem('intervuai_show_avatar', String(next)); return next }) }}
              title={showAvatar ? 'Hide AI Avatar' : 'Show AI Avatar'}
              style={{ fontSize: 14 }}>{showAvatar ? '🧑‍💼' : '👤'}</button>
            <div style={{ flex: 1 }} />
            <button className="vid-end" onClick={handleEnd} title={isComplete ? 'View Report' : 'End interview'}
              style={isComplete ? { background: 'var(--teal)', color: '#fff' } : {}}>
              {isComplete ? '📊 View Report' : '✕ End'}
            </button>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="video-sidebar">
          <div className="vid-sidebar-card">
            <h4>📊 Answer Quality</h4>
            {[
              { label: 'Grammar', score: grammarScore, cls: 'teal', key: 'grammar' },
              { label: 'Relevance', score: relevanceScore, cls: 'coral', key: 'relevance' },
              { label: 'Clarity', score: clarityScore, cls: 'purple', key: 'clarity' },
              { label: 'Confidence', score: confidenceScore, cls: 'teal', key: 'confidence' },
              { label: 'Structure', score: structureScore, cls: 'coral', key: 'structure' },
              { label: 'Engagement', score: engagementScore, cls: 'purple', key: 'engagement' },
              { label: 'Overall', score: overallScore, cls: 'teal', key: 'overall' },
            ].map(p => {
              const trend = scoreTrend(p.key)
              return (
                <div className="vid-perf-row" key={p.label}>
                  <div className="vid-perf-top">
                    <span>
                      {p.label}
                      {trend && <span style={{ fontSize: 9, fontWeight: 700, marginLeft: 4, color: trend.color }}>{trend.arrow}{Math.abs(trend.diff)}</span>}
                    </span>
                    <span className="vid-perf-pct" style={{ color: sc(p.score) }}>{p.score !== null ? `${p.score}%` : '—'}</span>
                  </div>
                  <div className="vid-prog-wrap">
                    <div className={`vid-prog-bar ${p.cls}`} style={{ width: p.score !== null ? `${p.score}%` : '0%' }} />
                  </div>
                </div>
              )
            })}

            {/* Answer coaching badges */}
            {evaluation && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                  background: answerLengthFeedback === 'good_length' ? 'rgba(0,200,140,0.15)' : answerLengthFeedback === 'too_brief' ? 'rgba(217,119,6,0.15)' : 'rgba(229,62,62,0.15)',
                  color: answerLengthFeedback === 'good_length' ? 'var(--teal)' : answerLengthFeedback === 'too_brief' ? '#d97706' : '#e53e3e',
                }}>
                  {answerLengthFeedback === 'good_length' ? '✓ Good length' : answerLengthFeedback === 'too_brief' ? '⚠ Too brief' : answerLengthFeedback === 'too_long' ? '⚠ Too long' : '—'}
                </span>
                {usedStar && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: 'rgba(139,92,246,0.15)', color: 'var(--purple)' }}>STAR ✓</span>}
                {usedExamples && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: 'rgba(0,200,140,0.15)', color: 'var(--teal)' }}>Examples ✓</span>}
              </div>
            )}
          </div>

          <div className="vid-sidebar-card">
            <h4>🧠 Behavioral Analysis</h4>
            {isCamOff ? (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', margin: 0, fontStyle: 'italic' }}>Enable camera for behavioral tracking.</p>
            ) : (
              <>
                <div className="vid-perf-row">
                  <div className="vid-perf-top">
                    <span>👁 Eye Contact {isVisionReady ? <span style={{fontSize:9,color:'rgba(0,200,140,0.7)',marginLeft:3}}>AI</span> : null}</span>
                    {/* Prefer MediaPipe iris tracking; fall back to heuristic */}
                    {isVisionReady ? (
                      <span className="vid-perf-pct" style={{ color: sc(Math.round(visionMetrics.eyeContactRatio * 100)) }}>
                        {Math.round(visionMetrics.eyeContactRatio * 100)}%
                      </span>
                    ) : (
                      <span className="vid-perf-pct" style={{ color: sc(eyeContactPct) }}>{eyeContactPct !== null ? `${eyeContactPct}%` : '…'}</span>
                    )}
                  </div>
                  <div className="vid-prog-wrap">
                    <div className="vid-prog-bar teal" style={{
                      width: isVisionReady
                        ? `${Math.round(visionMetrics.eyeContactRatio * 100)}%`
                        : (eyeContactPct !== null ? `${eyeContactPct}%` : '0%'),
                    }} />
                  </div>
                </div>
                {/* MediaPipe posture score row */}
                {isVisionReady && (
                  <div className="vid-perf-row" style={{ marginTop: 6 }}>
                    <div className="vid-perf-top">
                      <span>🪑 Posture <span style={{fontSize:9,color:'rgba(0,200,140,0.7)',marginLeft:3}}>AI</span></span>
                      <span className="vid-perf-pct" style={{ color: sc(visionMetrics.postureScore) }}>
                        {visionMetrics.postureScore}
                      </span>
                    </div>
                    <div className="vid-prog-wrap">
                      <div className="vid-prog-bar teal" style={{ width: `${visionMetrics.postureScore}%` }} />
                    </div>
                  </div>
                )}
                <div className="vid-perf-row" style={{ marginTop: 6 }}>
                  <div className="vid-perf-top">
                    <span>🔊 Voice Volume</span>
                    <span className="vid-perf-pct" style={{ color: volumeColor }}>{volumeLabel}</span>
                  </div>
                  <div className="vid-prog-wrap">
                    <div className="vid-prog-bar teal" style={{ width: `${Math.min(100, audioMetrics.avgVolume)}%`, background: volumeColor }} />
                  </div>
                </div>
                <div className="vid-perf-row" style={{ marginTop: 6 }}>
                  <div className="vid-perf-top">
                    <span>⚡ Speech Pace</span>
                    <span className="vid-perf-pct" style={{ color: paceColor }}>{audioMetrics.pace > 0 ? `${audioMetrics.pace} wpm` : '—'}</span>
                  </div>
                  <div style={{ fontSize: 10, color: paceColor, marginTop: 2 }}>{paceLabel}</div>
                </div>
                <div className="vid-perf-row" style={{ marginTop: 6 }}>
                  <div className="vid-perf-top">
                    <span>🚫 Filler Words</span>
                    <span className="vid-perf-pct" style={{ color: audioMetrics.fillerCount === 0 ? 'var(--teal)' : audioMetrics.fillerCount < 5 ? '#d97706' : '#e53e3e' }}>{audioMetrics.fillerCount}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{audioMetrics.fillerCount === 0 ? 'None detected' : 'Detected: um, uh, like, etc.'}</div>
                </div>
                {isComplete && nonVerbalScore !== null && (
                  <div style={{ marginTop: 10, padding: 10, background: 'rgba(0,200,140,0.08)', borderRadius: 8, border: '1px solid rgba(0,200,140,0.15)' }}>
                    <div className="vid-perf-top">
                      <span style={{ fontWeight: 700 }}>Non-Verbal Score</span>
                      <span className="vid-perf-pct" style={{ color: sc(nonVerbalScore), fontWeight: 700 }}>{nonVerbalScore}%</span>
                    </div>
                    <div className="vid-prog-wrap" style={{ marginTop: 4 }}>
                      <div className="vid-prog-bar teal" style={{ width: `${nonVerbalScore}%` }} />
                    </div>
                  </div>
                )}
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', margin: '8px 0 0', lineHeight: 1.4 }}>
                  {behavioralMetrics.totalFrames === 0 ? 'Calibrating…'
                    : behavioralMetrics.faceDetected ? '✓ Face detected — maintain eye contact with the camera.'
                    : '⚠ Position your face in the camera frame.'}
                </p>
              </>
            )}
          </div>

          <div className="vid-sidebar-card">
            <h4>💬 Live Feedback</h4>
            {evaluation?.feedback ? (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', margin: 0, lineHeight: 1.5 }}>{evaluation.feedback}</p>
            ) : (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', margin: 0, fontStyle: 'italic' }}>Feedback appears after your first answer.</p>
            )}
            {evaluation?.strengths?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {evaluation.strengths.map((s, i) => <div className="vid-tip" key={i}><span className="vid-tip-icon">✓</span>{s}</div>)}
              </div>
            )}
            {evaluation?.improvements?.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {evaluation.improvements.map((imp, i) => <div className="vid-tip" key={i} style={{ opacity: .75 }}><span className="vid-tip-icon">💡</span>{imp}</div>)}
              </div>
            )}
          </div>

          <div className="vid-sidebar-card">
            <h4>{phaseIcon} {phaseLabel} Tips</h4>
            {tips.map((tip, i) => (
              <div className="vid-tip" key={i}><span className="vid-tip-icon">{tip.icon}</span>{tip.text}</div>
            ))}
            <div className="vid-tip"><span className="vid-tip-icon">✓</span>Look at the camera for eye contact</div>
            <div className="vid-tip"><span className="vid-tip-icon">✓</span>Avoid filler words (um, uh, like)</div>
            <div className="vid-tip"><span className="vid-tip-icon">💡</span>Use 🎙️ for voice · 🔊 to replay question</div>
          </div>

          <div className="vid-sidebar-card">
            <h4>📋 Progress</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,.7)', marginBottom: 4 }}>
              <span>Questions</span>
              <span style={{ color: '#fff', fontWeight: 700 }}>{aiLoading && questionCount === 0 ? '…' : questionCount}{isComplete ? ' ✓' : ' / ~10'}</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>
              Phase: <strong style={{ color: '#fff' }}>{phaseIcon} {phaseLabel}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>
              Difficulty: <strong style={{ color: difficultyColor }}>{difficultyLabel}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>Duration: {formatTime(elapsed)}</div>
            <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: 'var(--teal)', transition: 'width 0.5s', width: `${Math.min(100, (questionCount / 10) * 100)}%` }} />
            </div>
            {isComplete && (
              <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 10 }} onClick={handleEnd}>View Report 📊</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
