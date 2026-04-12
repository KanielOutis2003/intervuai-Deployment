import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import interviewService from '../services/interviewService'
import { startInterview, streamToFlowise } from '../services/flowiseService'
import ConfirmModal from '../components/ConfirmModal'

/* ── Phase-specific coaching tips ─────────────────────────────────────────── */
const PHASE_TIPS = {
  opening: [
    { icon: '👋', text: 'Keep your intro concise — 60–90 seconds max.' },
    { icon: '🎯', text: 'Mention your current role, key skills, and what excites you about this opportunity.' },
    { icon: '💡', text: 'Show enthusiasm — first impressions matter.' },
  ],
  technical: [
    { icon: '🔧', text: 'Walk through your reasoning step by step.' },
    { icon: '📊', text: 'Use specific examples from past projects.' },
    { icon: '💡', text: 'It\'s okay to think aloud — interviewers value your thought process.' },
  ],
  behavioral: [
    { icon: '⭐', text: 'Use the STAR method: Situation → Task → Action → Result.' },
    { icon: '📏', text: 'Be specific — dates, numbers, outcomes.' },
    { icon: '💡', text: 'Focus on YOUR contribution, not the team\'s.' },
  ],
  closing: [
    { icon: '❓', text: 'Ask thoughtful questions about the role or team.' },
    { icon: '🤝', text: 'Express your continued interest in the position.' },
    { icon: '💡', text: 'Avoid asking about salary at this stage.' },
  ],
}

/* ── Mini score trend component ───────────────────────────────────────────── */
const ScoreTrend = ({ scores }) => {
  if (!scores || scores.length < 2) return null
  const last = scores[scores.length - 1]
  const prev = scores[scores.length - 2]
  const diff = last - prev
  if (diff === 0) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, marginLeft: 6,
      color: diff > 0 ? '#16a34a' : '#e53e3e',
    }}>
      {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}
    </span>
  )
}

export default function ChatInterviewPage() {
  const navigate = useNavigate()
  const { interviewId } = useParams()
  const location = useLocation()
  const typeFromUrl = new URLSearchParams(location.search).get('type') || 'general'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [interview, setInterview] = useState(null)
  const [isListening, setIsListening] = useState(false)

  // Live evaluation from AI (Groq)
  const [evaluation, setEvaluation] = useState(null)
  const [interviewPhase, setInterviewPhase] = useState('opening')
  const [isComplete, setIsComplete] = useState(false)
  const [difficultyLevel, setDifficultyLevel] = useState('easy')

  // Score history for trend tracking
  const [scoreHistory, setScoreHistory] = useState({
    grammar: [], relevance: [], overall: [], confidence: [], clarity: [],
    structure: [], engagement: [],
  })

  // Modal state for beautiful confirms/alerts
  const [modal, setModal] = useState({ open: false, type: null })

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const inputRef = useRef(null)
  const evaluationsRef = useRef([])
  const speechBufferRef = useRef('')
  const stopRequestedRef = useRef(false)

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort?.()
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (!interviewId) return

    interviewService.getInterview(interviewId)
      .then(data => {
        setInterview(data)
        return interviewService.startSession(interviewId).then(s => {
          setSessionId(s.id)
          return startInterview({
            jobRole: data.job_role || 'General',
            sessionId: interviewId,
            interviewType: data.interview_type || typeFromUrl,
          })
        })
      })
      .then(data => {
        const firstQuestion = data.next_question
          || `Hello! I'm your AI interview coach. Let's begin — could you briefly introduce yourself?`
        setInterviewPhase(data.interview_phase || 'opening')
        if (data.difficulty_level) setDifficultyLevel(data.difficulty_level)

        setMessages([{
          role: 'ai',
          content: firstQuestion,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }])

        interviewService.persistMessage(interviewId, 'assistant', firstQuestion, {
          interview_phase: data.interview_phase || 'opening',
          is_opening: true,
        }).catch(() => {})
      })
      .catch((err) => {
        console.error('[AI] startInterview error:', err)
        setMessages([{
          role: 'error',
          content: `⚠ Could not connect to AI: ${err.message}. Make sure the Flask backend is running and GROQ_API_KEY is set in backend/.env.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }])
      })

    const timer = setInterval(() => setElapsed(p => p + 1), 1000)
    return () => clearInterval(timer)
  }, [interviewId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const _saveScores = (data) => {
    const summary = data.final_summary || {}
    const allEvals = evaluationsRef.current
    const avg = (arr) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null

    let overallScore = summary.overall_readiness_score ?? null
    let verbalScore = null

    if (allEvals.length > 0) {
      const overalls   = allEvals.map(e => e.overall_quality).filter(v => v != null)
      const grammars   = allEvals.map(e => e.grammar_score).filter(v => v != null)
      const relevances = allEvals.map(e => e.relevance_score).filter(v => v != null)
      if (overallScore == null) overallScore = avg(overalls)
      if (grammars.length > 0 && relevances.length > 0) verbalScore = Math.round((avg(grammars) + avg(relevances)) / 2)
    }

    if (overallScore != null || verbalScore != null) {
      const scores = {}
      if (overallScore != null) scores.overallScore = overallScore
      if (verbalScore != null) scores.verbalScore = verbalScore
      interviewService.updateScores(interviewId, scores).catch(() => {})
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || sending || isComplete) return
    const content = input.trim()
    setInput('')
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const wordCount = content.split(/\s+/).length

    setMessages(prev => [...prev, { role: 'user', content, time: now, wordCount }])
    setMessages(prev => [...prev, { role: 'ai', content: '', time: now, streaming: true }])
    setSending(true)

    interviewService.persistMessage(interviewId, 'user', content).catch(() => {})

    await streamToFlowise({
      userMessage: content,
      sessionId: interviewId,

      onChunk: (accumulated) => {
        setMessages(prev => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last?.streaming) copy[copy.length - 1] = { ...last, content: accumulated }
          return copy
        })
      },

      onDone: (data) => {
        if (data.evaluation) {
          setEvaluation(data.evaluation)
          evaluationsRef.current.push(data.evaluation)
          // Track score history for trend
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
        if (data.interview_phase) setInterviewPhase(data.interview_phase)
        if (data.difficulty_level) setDifficultyLevel(data.difficulty_level)
        if (data.is_complete) setIsComplete(true)

        const aiContent = data.is_complete
          ? (data.next_question || 'Great job completing the interview! Click "End & View Report" to see your detailed results.')
          : (data.next_question || 'Thank you for your response. Could you tell me more?')

        setMessages(prev => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last?.streaming) {
            copy[copy.length - 1] = {
              role: 'ai',
              content: aiContent,
              evaluation: data.evaluation || null,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          }
          return copy
        })

        interviewService.persistMessage(interviewId, 'assistant', aiContent, {
          evaluation: data.evaluation || null,
          interview_phase: data.interview_phase,
          is_complete: data.is_complete || false,
          final_summary: data.final_summary || null,
        }).catch(() => {})

        if (data.is_complete) _saveScores(data)
        setSending(false)
      },

      onError: (errMsg) => {
        console.error('[AI] stream error:', errMsg)
        setMessages(prev => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last?.streaming) {
            copy[copy.length - 1] = {
              role: 'error',
              content: `⚠ AI unavailable: ${errMsg}. Check that the Flask backend is running and GROQ_API_KEY is configured.`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          }
          return copy
        })
        setSending(false)
      },
    })
  }

  // ── Voice input (Web Speech API) ─────────────────────────────────────────────
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setModal({ open: true, type: 'alert', title: 'Browser Not Supported', message: 'Voice input is not supported in this browser. Please use Chrome or Edge.', variant: 'warning' })
      return
    }
    if (isListening) {
      stopRequestedRef.current = true
      try { recognitionRef.current?.stop?.() } catch {}
      setIsListening(false)
      return
    }
    try {
      recognitionRef.current?.abort?.()
    } catch {}
    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1
    let interim = ''
    recognition.onstart = () => { speechBufferRef.current = ''; stopRequestedRef.current = false; interim = ''; setIsListening(true) }
    recognition.onend = () => {
      const leftover = interim.trim()
      if (leftover) {
        setInput(prev => prev ? `${prev} ${leftover}` : leftover)
        interim = ''
      }
      if (!stopRequestedRef.current) {
        setTimeout(() => { try { recognition.start() } catch {} }, 150)
      } else {
        setIsListening(false)
        speechBufferRef.current = ''
        interim = ''
      }
    }
    recognition.onerror = (e) => {
      const reason = e?.error || ''
      if (reason === 'not-allowed') {
        setIsListening(false)
        setModal({ open: true, type: 'alert', title: 'Microphone Blocked', message: 'Microphone permission is blocked. Please allow mic access in your browser settings and try again.', variant: 'danger' })
        return
      }
      if (!stopRequestedRef.current) {
        setTimeout(() => { try { recognition.start() } catch {} }, 200)
      } else {
        setIsListening(false)
      }
    }
    recognition.onresult = e => {
      try {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]
          const txt = res[0]?.transcript?.trim() || ''
          if (!txt) continue
          if (res.isFinal) {
            setInput(prev => prev ? `${prev} ${txt}` : txt)
            interim = ''
            inputRef.current?.focus()
          } else {
            interim = interim ? `${interim} ${txt}` : txt
          }
        }
      } catch {}
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (err) {
      setModal({ open: true, type: 'alert', title: 'Voice Input Error', message: 'Unable to start voice input. Make sure no other app is using the mic and you are on a supported browser.', variant: 'warning' })
    }
  }

  const doEnd = useCallback(async () => {
    interviewService.clearAISession(interviewId).catch(() => {})
    if (isComplete) await new Promise(r => setTimeout(r, 600))
    if (sessionId) await interviewService.endSession(sessionId).catch(() => {})
    navigate(isComplete ? `/interview/${interviewId}/report` : '/dashboard')
  }, [interviewId, sessionId, isComplete, navigate])

  const handleEnd = () => {
    if (!isComplete) {
      setModal({ open: true, type: 'endSession' })
    } else {
      doEnd()
    }
  }

  const handleBack = () => {
    if (!isComplete) {
      setModal({ open: true, type: 'leaveSession' })
    } else {
      navigate('/dashboard')
    }
  }

  // ── Derived display values ──────────────────────────────────────────────────
  const grammarScore    = evaluation?.grammar_score    ?? null
  const relevanceScore  = evaluation?.relevance_score  ?? null
  const overallScore    = evaluation?.overall_quality  ?? null
  const confidenceScore = evaluation?.confidence_score ?? null
  const clarityScore    = evaluation?.clarity_score    ?? null
  const structureScore  = evaluation?.structure_score  ?? null
  const engagementScore = evaluation?.engagement_score ?? null

  const sc = (v) => v == null ? 'var(--text-muted)' : v >= 80 ? '#16a34a' : v >= 60 ? 'var(--teal)' : v >= 40 ? '#d97706' : '#e53e3e'

  const phaseLabel = {
    opening: 'Opening',
    technical: 'Technical',
    behavioral: 'Behavioral',
    closing: 'Closing',
    unknown: '—',
  }[interviewPhase] || interviewPhase

  const phaseIcon = { opening: '👋', technical: '💻', behavioral: '🧠', closing: '🤝' }[interviewPhase] || '📋'

  const difficultyLabel = { easy: 'Easy', moderate: 'Moderate', challenging: 'Challenging' }[difficultyLevel] || difficultyLevel
  const difficultyColor = { easy: '#16a34a', moderate: '#d97706', challenging: '#e53e3e' }[difficultyLevel] || 'var(--text-muted)'

  const currentWordCount = input.trim() ? input.trim().split(/\s+/).length : 0
  const wordCountColor = currentWordCount === 0 ? 'var(--text-muted)'
    : currentWordCount < 20 ? '#d97706'
    : currentWordCount > 200 ? '#e53e3e'
    : currentWordCount > 150 ? '#d97706'
    : 'var(--teal)'
  const wordCountLabel = currentWordCount === 0 ? ''
    : currentWordCount < 20 ? ' (too brief)'
    : currentWordCount > 200 ? ' (rambling)'
    : currentWordCount > 150 ? ' (getting long)'
    : ''

  const tips = PHASE_TIPS[interviewPhase] || PHASE_TIPS.opening
  const userResponseCount = messages.filter(m => m.role === 'user').length
  const aiQuestionCount = messages.filter(m => m.role === 'ai').length

  // Answer length feedback from AI
  const answerLengthFeedback = evaluation?.answer_length_feedback
  const usedStar = evaluation?.star_usage
  const usedExamples = evaluation?.used_examples

  return (
    <div className="chat-page-wrapper">
      {/* Confirm / Alert modals */}
      <ConfirmModal
        isOpen={modal.open && modal.type === 'endSession'}
        title="End Interview Session?"
        message="Your progress will be saved but you won't get a full evaluation. Are you sure you want to end it?"
        confirmLabel="End Session"
        cancelLabel="Keep Going"
        variant="warning"
        icon="⏹️"
        onConfirm={() => { setModal({ open: false }); doEnd() }}
        onCancel={() => setModal({ open: false })}
      />
      <ConfirmModal
        isOpen={modal.open && modal.type === 'leaveSession'}
        title="Leave Interview?"
        message="You are in an active interview session. Leaving now will end the session."
        confirmLabel="Leave"
        cancelLabel="Stay"
        variant="danger"
        icon="🚪"
        onConfirm={() => { setModal({ open: false }); navigate('/dashboard') }}
        onCancel={() => setModal({ open: false })}
      />
      <ConfirmModal
        isOpen={modal.open && modal.type === 'alert'}
        title={modal.title || 'Notice'}
        message={modal.message || ''}
        confirmLabel="Got it"
        variant={modal.variant || 'info'}
        alertOnly
        onConfirm={() => setModal({ open: false })}
        onCancel={() => setModal({ open: false })}
      />

      {/* Top bar */}
      <div className="chat-topbar">
        <button className="chat-back" onClick={handleBack}>
          ← Back to Dashboard
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="chat-timer">⏱ {formatTime(elapsed)}</div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: difficultyColor + '18', color: difficultyColor, border: `1px solid ${difficultyColor}40`,
          }}>{difficultyLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="live-badge">
            <div className="live-dot"></div>
            {isComplete ? 'Complete' : 'LIVE'}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleEnd}>
            {isComplete ? 'End & View Report' : 'End Session'}
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="chat-layout" style={{ flex: 1 }}>
        {/* Main chat area */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="chat-main" style={{ flex: 1, overflowY: 'auto' }}>
            {/* AI header */}
            <div className="chat-ai-header">
              <div className="ai-avatar">👤</div>
              <div>
                <div className="ai-name">IntervuAI Interviewer</div>
                <div className="ai-status">
                  {interview?.job_role
                    ? `${interview.job_role} · ${phaseIcon} ${phaseLabel}`
                    : 'AI Interview Session'}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="live-badge">
                  <div className="live-dot"></div>
                  {isComplete ? 'Done' : 'Active'}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-wrap">
              {messages.map((m, i) => (
                <div className={`msg ${m.role === 'ai' || m.role === 'error' ? 'ai' : 'user'}`} key={i}>
                  <div className="msg-bubble" style={m.role === 'error'
                    ? { background: '#fff3f3', color: '#c0392b', border: '1px solid #f5c6cb' }
                    : {}}>
                    {m.content || (m.streaming ? (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>▌</span>
                    ) : '')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="msg-time">{m.time}</div>
                    {/* Inline score badge for user messages */}
                    {m.role === 'user' && m.wordCount && (
                      <span style={{
                        fontSize: 10, color: 'var(--text-light)', fontWeight: 500,
                      }}>{m.wordCount} words</span>
                    )}
                  </div>
                  {/* Per-answer score pills after AI evaluation messages */}
                  {m.role === 'ai' && m.evaluation && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {[
                        { label: 'Quality', val: m.evaluation.overall_quality },
                        { label: 'Relevance', val: m.evaluation.relevance_score },
                        { label: 'Clarity', val: m.evaluation.clarity_score },
                      ].map(s => s.val != null ? (
                        <span key={s.label} style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 12,
                          background: s.val >= 80 ? '#e0f7f5' : s.val >= 60 ? '#fef3c7' : '#fde8eb',
                          color: s.val >= 80 ? '#1a7a6e' : s.val >= 60 ? '#92400e' : '#c93e52',
                          fontWeight: 600,
                        }}>{s.label}: {s.val}%</span>
                      ) : null)}
                      {m.evaluation.star_usage && (
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 12,
                          background: '#ede9fe', color: '#7c3aed', fontWeight: 600,
                        }}>STAR ✓</span>
                      )}
                      {m.evaluation.used_examples && (
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 12,
                          background: '#e0f7f5', color: '#1a7a6e', fontWeight: 600,
                        }}>Examples ✓</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="chat-input-area">
            {/* Answer length coaching bar */}
            {currentWordCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                padding: '6px 12px', borderRadius: 8,
                background: currentWordCount > 200 ? '#fde8eb' : currentWordCount < 20 && currentWordCount > 0 ? '#fef3c7' : 'transparent',
              }}>
                {currentWordCount > 200 && (
                  <span style={{ fontSize: 11, color: '#c93e52', fontWeight: 600 }}>
                    ⚠ Your answer is getting long — focus on key points and be concise.
                  </span>
                )}
                {currentWordCount > 0 && currentWordCount < 20 && (
                  <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>
                    💡 Try to elaborate more — aim for 50-150 words with specific examples.
                  </span>
                )}
              </div>
            )}

            <div className="chat-input-wrap">
              <input
                ref={inputRef}
                className="chat-input"
                placeholder={
                  isListening
                    ? '🎤 Listening… speak now'
                    : isComplete
                      ? 'Interview complete — click "End & View Report".'
                      : 'Type your answer or click the mic…'
                }
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={isComplete}
                style={isListening ? { borderColor: 'var(--teal)' } : {}}
              />
              <button
                className="chat-mic"
                title={isListening ? 'Stop listening' : 'Voice input (click to speak)'}
                onClick={toggleVoice}
                disabled={isComplete}
                style={isListening
                  ? { background: 'rgba(0, 0, 0, 0.2)', color: 'var(--teal)', border: '1px solid var(--teal)' }
                  : {}}
              >
                {isListening ? '⏹' : '🎤'}
              </button>
              <button
                className="chat-send"
                onClick={sendMessage}
                disabled={sending || !input.trim() || isComplete}
              >
                ➤
              </button>
            </div>
            <div className="chat-hint">
              <span>Press Enter to send</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {currentWordCount > 0 && (
                  <span style={{ color: wordCountColor, fontWeight: 600 }}>
                    {currentWordCount} words{wordCountLabel}
                  </span>
                )}
                <span>{userResponseCount} responses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="chat-sidebar">
          {/* Response Quality — expanded with all 7 metrics */}
          <div className="sidebar-card">
            <h4>📊 Response Quality</h4>
            {[
              { label: 'Grammar',    score: grammarScore,    cls: 'prog-teal',   key: 'grammar' },
              { label: 'Relevance',  score: relevanceScore,  cls: 'prog-coral',  key: 'relevance' },
              { label: 'Clarity',    score: clarityScore,    cls: 'prog-purple', key: 'clarity' },
              { label: 'Confidence', score: confidenceScore, cls: 'prog-teal',   key: 'confidence' },
              { label: 'Structure',  score: structureScore,  cls: 'prog-coral',  key: 'structure' },
              { label: 'Engagement', score: engagementScore, cls: 'prog-purple', key: 'engagement' },
              { label: 'Overall',    score: overallScore,    cls: 'prog-teal',   key: 'overall' },
            ].map(r => (
              <div className="resp-row" key={r.label}>
                <div className="resp-row-top">
                  <span style={{ fontSize: 13 }}>
                    {r.label}
                    <ScoreTrend scores={scoreHistory[r.key]} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: sc(r.score) }}>
                    {r.score !== null ? `${r.score}%` : '—'}
                  </span>
                </div>
                <div className="prog-wrap">
                  <div className={`prog-bar ${r.cls}`}
                    style={{ width: r.score !== null ? `${r.score}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Answer Coaching Indicators */}
          {evaluation && (
            <div className="sidebar-card">
              <h4>🎯 Answer Analysis</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Answer length feedback */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 8,
                  background: answerLengthFeedback === 'good_length' ? '#e0f7f5'
                    : answerLengthFeedback === 'too_brief' ? '#fef3c7'
                    : answerLengthFeedback === 'too_long' ? '#fde8eb' : 'var(--bg)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Answer Length</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                    color: answerLengthFeedback === 'good_length' ? '#1a7a6e'
                      : answerLengthFeedback === 'too_brief' ? '#92400e' : '#c93e52',
                  }}>
                    {answerLengthFeedback === 'good_length' ? '✓ Good'
                      : answerLengthFeedback === 'too_brief' ? '⚠ Too Brief'
                      : answerLengthFeedback === 'too_long' ? '⚠ Too Long' : '—'}
                  </span>
                </div>

                {/* STAR usage */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 8, background: 'var(--bg)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>STAR Method</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                    color: usedStar ? '#1a7a6e' : 'var(--text-muted)',
                    background: usedStar ? '#e0f7f5' : 'transparent',
                  }}>
                    {usedStar ? '✓ Used' : interviewPhase === 'behavioral' ? '— Not detected' : '— N/A'}
                  </span>
                </div>

                {/* Examples usage */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 8, background: 'var(--bg)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Specific Examples</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                    color: usedExamples ? '#1a7a6e' : '#d97706',
                    background: usedExamples ? '#e0f7f5' : '#fef3c7',
                  }}>
                    {usedExamples ? '✓ Yes' : '⚠ Missing'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Live Feedback */}
          <div className="sidebar-card">
            <h4>💡 Live Feedback</h4>
            {evaluation?.feedback ? (
              <p style={{ fontSize: 12, margin: '0 0 8px', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                {evaluation.feedback}
              </p>
            ) : (
              <p style={{ fontSize: 12, margin: 0, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Feedback appears after your first answer.
              </p>
            )}
            {evaluation?.strengths?.map((s, i) => (
              <div className="feedback-item good" key={i}>
                <span className="feed-icon">✓</span>{s}
              </div>
            ))}
            {evaluation?.improvements?.map((imp, i) => (
              <div className="feedback-item warn" key={i}>
                <span className="feed-icon">⚠</span>{imp}
              </div>
            ))}
          </div>

          {/* Phase-specific coaching tips */}
          <div className="sidebar-card">
            <h4>{phaseIcon} {phaseLabel} Tips</h4>
            {tips.map((tip, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '8px 10px', borderRadius: 8,
                background: 'var(--bg)', marginBottom: 6, fontSize: 12,
                color: 'var(--text-muted)', lineHeight: 1.5,
              }}>
                <span style={{ flexShrink: 0 }}>{tip.icon}</span>
                <span>{tip.text}</span>
              </div>
            ))}
          </div>

          {/* Session Stats */}
          <div className="sidebar-card">
            <h4>📋 Session Stats</h4>
            <div className="stat-row">
              <span>Questions Asked</span>
              <span className="stat-badge coral">{aiQuestionCount}</span>
            </div>
            <div className="stat-row">
              <span>Responses Given</span>
              <span className="stat-badge teal">{userResponseCount}</span>
            </div>
            <div className="stat-row">
              <span>Phase</span>
              <span className="stat-badge purple">{phaseIcon} {phaseLabel}</span>
            </div>
            <div className="stat-row">
              <span>Difficulty</span>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: difficultyColor + '18', color: difficultyColor,
              }}>{difficultyLabel}</span>
            </div>
            <div className="stat-row">
              <span>Duration</span>
              <span className="stat-badge purple">{formatTime(elapsed)}</span>
            </div>
            {/* Progress bar */}
            <div style={{
              marginTop: 8, background: 'var(--bg2)', borderRadius: 4, height: 6, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 4, background: 'var(--teal)',
                transition: 'width 0.5s',
                width: `${Math.min(100, (userResponseCount / 10) * 100)}%`,
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
              {userResponseCount} / ~10 questions
            </div>
          </div>

          <div className="sidebar-card">
            <h4>🔗 Quick Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-ghost btn-sm btn-full" onClick={handleEnd}>
                {isComplete ? 'End & View Report' : 'End & Get Report'}
              </button>
              <Link to="/resources" className="btn btn-outline btn-sm btn-full">Interview Tips</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
