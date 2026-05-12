import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { usePDF } from 'react-to-pdf'
import interviewService from '../services/interviewService'
import { useSubscription } from '../context/SubscriptionContext'
import UpgradeModal from '../components/UpgradeModal'

const ScoreRing = ({ value, color, label }) => {
  // Treat 0 same as null — 0 means the score was never set (DB default, not a real score)
  const pct = (value != null && value > 0) ? Math.round(value) : null
  return (
    <div className="sk-score-ring" style={{ textAlign: 'center' }}>
      <div className="sk-score-ring-dial" style={{
        width: 72, height: 72, borderRadius: '50%',
        border: `5px solid ${pct != null ? color : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 8px',
        fontSize: 20, fontWeight: 800, color: pct != null ? color : 'var(--text-muted)',
        fontFamily: 'var(--font-head)',
      }}>
        {pct != null ? pct : '—'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
    </div>
  )
}

const isCoachFeedback = (text = '') => {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return false
  return /^(feedback|great job|excellent|strong answer|well done|nice work)\b/.test(normalized)
}

const cleanCoachText = (text = '') => (
  text.trim().replace(/^(feedback|suggested answer)\s*:\s*/i, '')
)

export default function InterviewReportPage() {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [messages, setMessages] = useState([])
  const [nonVerbalMetrics, setNonVerbalMetrics] = useState([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { isPremium } = useSubscription()
  const { toPDF, targetRef } = usePDF({ filename: 'IntervuAI_Report.pdf' })

  useEffect(() => {
    if (!interviewId) return
    setLoading(true)
    Promise.all([
      interviewService.getInterview(interviewId),
      interviewService.getMessages(interviewId),
      interviewService.getNonVerbalMetrics(interviewId),
    ])
      .then(([iv, msgData, nvData]) => {
        setInterview(iv)
        setMessages(msgData?.messages || [])
        setNonVerbalMetrics(nvData?.metrics || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [interviewId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--text-muted)', fontSize: 15 }}>
        Loading report…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ color: 'var(--coral)', fontSize: 15 }}>⚠ {error}</div>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>
    )
  }

  // Find the final summary from the last assistant message that has one
  const finalSummary = [...messages]
    .reverse()
    .find(m => m.role === 'assistant' && m.metadata?.final_summary)
    ?.metadata?.final_summary || null

  // Build Q&A rounds: each user message paired with the AI evaluation that follows
  const qaRounds = []
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      const questionMsg = messages[i - 1]  // AI message before = the question
      const evalMsg = messages[i + 1]      // AI message after = evaluation + next question
      const suggestedAnswer = evalMsg?.metadata?.evaluation?.suggested_answer || evalMsg?.metadata?.suggested_answer || ''
      qaRounds.push({
        questionNum: qaRounds.length + 1,
        question: questionMsg?.content || '',
        answer: messages[i].content,
        evaluation: evalMsg?.metadata?.evaluation || null,
        suggestedAnswer,
        isCoachFeedback: isCoachFeedback(suggestedAnswer),
        timestamp: messages[i].timestamp,
      })
    }
  }

  const formatDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  const scoreColor = (val) => {
    if (val == null) return 'var(--text-muted)'
    if (val >= 80) return '#16a34a'
    if (val >= 60) return 'var(--teal)'
    if (val >= 40) return '#d97706'
    return 'var(--coral)'
  }

  const latestNonVerbal = nonVerbalMetrics[0] || {}
  const eyeContactScore = latestNonVerbal.eye_contact_avg
    ?? (interview?.eye_contact_score != null ? interview.eye_contact_score : null)
  const postureScore = latestNonVerbal.posture_score
    ?? (interview?.posture_score != null ? interview.posture_score : null)
  const nonVerbalTips = []
  if (eyeContactScore != null && eyeContactScore < 55) {
    nonVerbalTips.push('Your eye contact looked inconsistent. Practice answering while looking at the camera lens, then glance back at notes only between thoughts.')
  } else if (eyeContactScore != null) {
    nonVerbalTips.push('Your eye contact was steady. Keep using the camera lens as your anchor during key points.')
  }
  if (postureScore != null && postureScore < 60) {
    nonVerbalTips.push('Your posture suggested tension or slouching. Relax your shoulders, sit tall, and keep your head centered before each answer.')
  } else if (postureScore != null) {
    nonVerbalTips.push('Your posture supported a confident presence. Keep your shoulders level and avoid leaning away during longer answers.')
  }
  if (interview?.non_verbal_score != null && interview.non_verbal_score < 60 && nonVerbalTips.length === 0) {
    nonVerbalTips.push('Your non-verbal presence needs a little polish. Focus on calm breathing, a steady expression, and a camera-height posture.')
  }

  const requirePremiumExport = (action) => {
    if (!isPremium) {
      setShowUpgradeModal(true)
      return
    }
    action()
  }

  const downloadCSV = () => {
    const esc = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const rows = [
      ['Question', 'User Answer', 'AI Coach Feedback / Suggested Answer', 'Overall Score', 'Feedback'],
      ...qaRounds.map(r => [
        r.question,
        r.answer,
        cleanCoachText(r.suggestedAnswer) || 'No specific feedback generated for this response.',
        r.evaluation?.overall_quality ?? '',
        r.evaluation?.feedback ?? '',
      ]),
    ]
    const csv = rows.map(row => row.map(esc).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `IntervuAI_Report_${interviewId}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page, #f8f5f0)' }}>
      {/* Nav */}
      <nav className="responsive-app-nav" style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none', color: 'var(--text-primary)',
          fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16 }}>
          ⚡ IntervuAI
        </Link>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Interview Report</span>
        <div className="responsive-nav-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm report-back-action" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <button
            className="btn btn-ghost btn-sm report-export-action"
            onClick={() => requirePremiumExport(() => toPDF())}
            title={isPremium ? 'Download PDF' : 'Premium export locked'}
            style={!isPremium ? { borderColor: 'var(--coral)', color: 'var(--coral)', fontWeight: 700 } : {}}
          >
            ↓ Download PDF
          </button>
          <button
            className="btn btn-ghost btn-sm report-export-action"
            onClick={() => requirePremiumExport(downloadCSV)}
            title={isPremium ? 'Export CSV' : 'Premium export locked'}
            style={!isPremium ? { borderColor: 'var(--coral)', color: 'var(--coral)', fontWeight: 700 } : {}}
          >
            Export CSV
          </button>
          <button className="btn btn-coral btn-sm report-new-action"
            onClick={() => navigate('/interview/chat')}>
            + New Interview
          </button>
        </div>
      </nav>

      <div className="report-mobile-action-bar">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => requirePremiumExport(() => toPDF())}
          title={isPremium ? 'Download PDF' : 'Premium export locked'}
          style={!isPremium ? { borderColor: 'var(--coral)', color: 'var(--coral)', fontWeight: 700 } : {}}
        >
          PDF
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => requirePremiumExport(downloadCSV)}
          title={isPremium ? 'Export CSV' : 'Premium export locked'}
          style={!isPremium ? { borderColor: 'var(--coral)', color: 'var(--coral)', fontWeight: 700 } : {}}
        >
          CSV
        </button>
      </div>

      {!isPremium && (
        <div style={{ maxWidth: 820, margin: '18px auto 0', padding: '0 20px' }}>
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            style={{
              width: '100%',
              textAlign: 'left',
              border: '1.5px solid #fed7aa',
              background: 'rgba(251,146,60,0.14)',
              color: 'var(--warning)',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <span style={{
              flexShrink: 0,
              borderRadius: 999,
              background: 'var(--coral)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              padding: '5px 9px',
              letterSpacing: 0.4,
            }}>
              LOCKED
            </span>
            <span style={{ fontSize: 13, lineHeight: 1.5 }}>
              PDF and CSV exports are a Premium feature. Upgrade to unlock detailed, shareable reports.
            </span>
          </button>
        </div>
      )}

      <div ref={targetRef} style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px' }}>

        {/* Header card */}
        <div className="sk-report-panel" style={{ background: 'var(--card)', color: 'var(--text)', borderRadius: 16, padding: 28,
          marginBottom: 20, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700,
                margin: '0 0 4px' }}>
                {interview?.job_role || 'Interview'} Report
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                {formatDate(interview?.created_at)} · {qaRounds.length} questions answered
              </p>
            </div>
            <span className={`tag ${interview?.status === 'completed' ? 'tag-teal' : 'tag-yellow'}`}
              style={{ fontSize: 12 }}>
              {interview?.status || 'unknown'}
            </span>
          </div>

          {/* Score rings */}
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center' }}>
            <ScoreRing value={interview?.overall_score} color="var(--coral)" label="Overall" />
            <ScoreRing value={interview?.verbal_score} color="var(--teal)" label="Verbal" />
            <ScoreRing value={interview?.non_verbal_score} color="var(--purple)" label="Non-Verbal" />
          </div>

          {interview?.overall_score == null && (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)',
              marginTop: 12, fontStyle: 'italic' }}>
              Scores are saved automatically when the interview completes all questions.
            </p>
          )}

          {/* ── Hiring Recommendation Hero Banner ───────────────────────── */}
          {(() => {
            // Prefer the DB-persisted value from weighted 70/30 formula;
            // fall back to Groq's final_summary recommendation
            const rec = interview?.hiring_recommendation
              || finalSummary?.hiring_recommendation
              || null
            if (!rec) return null

            const CONFIG = {
              strong_hire: {
                label: 'Strong Hire',
                icon: '🏆',
                bg: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
                badge: 'rgba(255,255,255,0.18)',
                desc: 'Exceptional candidate — highly recommended for the role.',
              },
              hire: {
                label: 'Hire',
                icon: '✅',
                bg: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                badge: 'rgba(255,255,255,0.18)',
                desc: 'Good fit — meets the requirements for this position.',
              },
              maybe: {
                label: 'Maybe',
                icon: '🤔',
                bg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                badge: 'rgba(255,255,255,0.18)',
                desc: 'Borderline — further evaluation or coaching recommended.',
              },
              no_hire: {
                label: 'No Hire',
                icon: '❌',
                bg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                badge: 'rgba(255,255,255,0.18)',
                desc: 'Does not meet the requirements for this role at this time.',
              },
            }
            const cfg = CONFIG[rec] || CONFIG.maybe
            return (
              <div style={{
                marginTop: 20, borderRadius: 14, padding: '18px 22px',
                background: cfg.bg,
                display: 'flex', alignItems: 'center', gap: 16,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: cfg.badge,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, flexShrink: 0,
                }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>
                    Hiring Recommendation
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff',
                    fontFamily: 'var(--font-head)', lineHeight: 1.1 }}>
                    {cfg.label}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                    {cfg.desc}
                  </div>
                </div>
                <div className="report-hero-scoremark" style={{
                  textAlign: 'right', flexShrink: 0,
                }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>
                    Overall Score
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#fff',
                    fontFamily: 'var(--font-head)' }}>
                    {interview?.overall_score != null ? `${Math.round(interview.overall_score)}` : '—'}
                    <span style={{ fontSize: 14, fontWeight: 500 }}>/100</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                    Groq 70% · MediaPipe 30%
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Final AI Summary */}
        {finalSummary && (
          <div style={{ background: 'var(--card)', color: 'var(--text)', borderRadius: 16, padding: 24,
            marginBottom: 20, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, margin: 0 }}>
                🎯 AI Assessment Summary
              </h3>
              {/* Hiring recommendation is shown as a full hero banner above — not repeated here */}
            </div>

            {/* Summary paragraph */}
            {(finalSummary.summary_paragraph || finalSummary.overall_assessment) && (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16,
                lineHeight: 1.7, padding: '12px 16px', background: 'var(--bg-page, #f8f5f0)',
                borderRadius: 10 }}>
                {finalSummary.summary_paragraph || finalSummary.overall_assessment}
              </p>
            )}

            {/* Readiness scores grid */}
            {(finalSummary.communication_score || finalSummary.technical_readiness || finalSummary.behavioral_readiness) && (
              <div className="responsive-three-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Communication', value: finalSummary.communication_score, color: 'var(--teal)' },
                  { label: 'Technical', value: finalSummary.technical_readiness, color: 'var(--coral)' },
                  { label: 'Behavioral', value: finalSummary.behavioral_readiness, color: 'var(--purple)' },
                ].map(s => s.value != null ? (
                  <div key={s.label} style={{
                    textAlign: 'center', padding: '14px 10px',
                    background: 'var(--bg-page, #f8f5f0)', borderRadius: 10,
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: scoreColor(s.value), fontFamily: 'var(--font-head)' }}>{s.value}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                  </div>
                ) : null)}
              </div>
            )}

            <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {finalSummary.top_strengths?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a',
                    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    ✓ Top Strengths
                  </div>
                  {finalSummary.top_strengths.map((s, i) => (
                    <div className="feedback-item good" key={i}>
                      <span className="feed-icon">✓</span>{s}
                    </div>
                  ))}
                </div>
              )}
              {finalSummary.areas_for_improvement?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706',
                    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    ⚠ Areas to Improve
                  </div>
                  {finalSummary.areas_for_improvement.map((a, i) => (
                    <div className="feedback-item warn" key={i}>
                      <span className="feed-icon">⚠</span>{a}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {finalSummary.key_observations?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
                  marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Key Observations
                </div>
                {finalSummary.key_observations.map((o, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--text-muted)',
                    padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    • {o}
                  </div>
                ))}
              </div>
            )}

            {/* Coaching Tips */}
            {finalSummary.coaching_tips?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)',
                  marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  💡 Coaching Tips
                </div>
                {finalSummary.coaching_tips.map((tip, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(139,92,246,0.16)', marginBottom: 6,
                    fontSize: 13, color: 'var(--purple)', lineHeight: 1.5,
                  }}>
                    <span style={{ flexShrink: 0 }}>💡</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {nonVerbalTips.length > 0 && (
          <div style={{ background: 'var(--card)', color: 'var(--text)', borderRadius: 16, padding: 24,
            marginBottom: 20, border: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700,
              margin: '0 0 14px' }}>
              Non-Verbal Coaching
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 14 }}>
              {[
                { label: 'Eye Contact', value: eyeContactScore },
                { label: 'Posture', value: postureScore },
                { label: 'Presence', value: interview?.non_verbal_score },
              ].map(item => (
                <div key={item.label} style={{ padding: '12px', borderRadius: 10,
                  background: 'var(--bg-page, #f8f5f0)', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(item.value),
                    fontFamily: 'var(--font-head)' }}>
                    {item.value != null ? Math.round(item.value) : '-'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
            {nonVerbalTips.map((tip, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text-muted)',
                lineHeight: 1.6, padding: '10px 12px', borderRadius: 9,
                background: i % 2 === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(251,146,60,0.14)',
                marginBottom: 8 }}>
                {tip}
              </div>
            ))}
          </div>
        )}

        {/* Action Plan card */}
        {finalSummary && (finalSummary.top_strengths?.length > 0 || finalSummary.areas_for_improvement?.length > 0) && (
          <div style={{ background: 'var(--card)', color: 'var(--text)', borderRadius: 16, padding: 24,
            marginBottom: 20, border: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700,
              margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              📋 Action Plan
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                — what to keep doing &amp; what to work on
              </span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
              {/* Strengths */}
              {finalSummary.top_strengths?.length > 0 && (
                <div style={{ background: 'rgba(34,197,94,0.12)', borderRadius: 12, padding: '14px 16px',
                  border: '1.5px solid #bbf7d0' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d',
                    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6,
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>✅</span> Keep Doing
                  </div>
                  {finalSummary.top_strengths.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(34,197,94,0.14)', marginBottom: 6,
                      fontSize: 13, color: 'var(--video-good, #166534)', lineHeight: 1.5,
                    }}>
                      <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {s}
                    </div>
                  ))}
                </div>
              )}
              {/* Improvements */}
              {finalSummary.areas_for_improvement?.length > 0 && (
                <div style={{ background: 'rgba(251,146,60,0.14)', borderRadius: 12, padding: '14px 16px',
                  border: '1.5px solid #fed7aa' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)',
                    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6,
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🎯</span> Work On Next
                  </div>
                  {finalSummary.areas_for_improvement.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(251,146,60,0.18)', marginBottom: 6,
                      fontSize: 13, color: 'var(--warning)', lineHeight: 1.5,
                    }}>
                      <span style={{ color: '#ea580c', fontWeight: 700, flexShrink: 0 }}>→</span>
                      {a}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {finalSummary.coaching_tips?.length > 0 && (
              <div style={{ marginTop: 14, background: 'rgba(139,92,246,0.14)', borderRadius: 12,
                padding: '14px 16px', border: '1.5px solid #ddd6fe' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9',
                  marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  💡 Next Steps
                </div>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  {finalSummary.coaching_tips.map((tip, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--purple)', lineHeight: 1.6,
                      marginBottom: 4 }}>
                      {tip}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Q&A Transcript */}
        <div className="sk-report-panel" style={{ background: 'var(--card)', color: 'var(--text)', borderRadius: 16, padding: 24,
          border: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>
            📝 Full Transcript
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)',
              marginLeft: 8 }}>
              ({qaRounds.length} Q&amp;A pairs)
            </span>
          </h3>

          {qaRounds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)',
              fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              No transcript saved for this interview.
              <br />
              <span style={{ fontSize: 12 }}>Transcripts are saved starting from the next interview.</span>
            </div>
          ) : (
            qaRounds.map((round, i) => (
              <div key={i} style={{
                marginBottom: i < qaRounds.length - 1 ? 24 : 0,
                paddingBottom: i < qaRounds.length - 1 ? 24 : 0,
                borderBottom: i < qaRounds.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                {/* Question */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#fff',
                      background: 'var(--coral)', borderRadius: 20, padding: '2px 8px',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      Q{round.questionNum}
                    </span>
                  </div>
                  {round.question && (
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600,
                      color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {round.question}
                    </p>
                  )}
                </div>

                {/* Answer comparison */}
                <div className="sk-dossier-compare" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12,
                  marginBottom: round.evaluation ? 12 : 0 }}>
                  <div className="sk-dossier-page user" style={{ padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.28)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)',
                      marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Your Actual Answer
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {round.answer}
                    </p>
                  </div>
                  <div className="sk-dossier-page coach" style={{ padding: '12px 14px', borderRadius: 10,
                    background: round.isCoachFeedback ? 'rgba(20,184,166,0.12)' : 'rgba(251,146,60,0.14)',
                    border: round.isCoachFeedback ? '1px solid rgba(20,184,166,0.28)' : '1px solid rgba(251,146,60,0.32)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: round.isCoachFeedback ? 'var(--teal)' : 'var(--warning)',
                      marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {round.isCoachFeedback ? 'AI Coach Feedback' : 'AI Coach Suggested Answer'}
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {cleanCoachText(round.suggestedAnswer) || 'No specific feedback generated for this response.'}
                    </p>
                  </div>
                </div>

                {/* Evaluation */}
                {round.evaluation && (
                  <div style={{ marginTop: 10, background: 'var(--bg-page, #f8f5f0)',
                    borderRadius: 10, padding: '12px 14px' }}>
                    {/* Score pills */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Grammar', val: round.evaluation.grammar_score },
                        { label: 'Relevance', val: round.evaluation.relevance_score },
                        { label: 'Clarity', val: round.evaluation.clarity_score },
                        { label: 'Confidence', val: round.evaluation.confidence_score },
                        { label: 'Structure', val: round.evaluation.structure_score },
                        { label: 'Overall', val: round.evaluation.overall_quality },
                      ].map(s => s.val != null ? (
                        <span key={s.label} style={{ fontSize: 12 }}>
                          <span style={{ color: 'var(--text-muted)' }}>{s.label}: </span>
                          <strong style={{ color: scoreColor(s.val) }}>{s.val}%</strong>
                        </span>
                      ) : null)}
                    </div>

                    {/* Feedback text */}
                    {round.evaluation.feedback && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px',
                        lineHeight: 1.5 }}>
                        {round.evaluation.feedback}
                      </p>
                    )}

                    {/* Answer quality badges */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {round.evaluation.star_usage && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(139,92,246,0.16)', color: 'var(--purple)', fontWeight: 600 }}>STAR ✓</span>
                      )}
                      {round.evaluation.used_examples && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(20,184,166,0.14)', color: 'var(--teal)', fontWeight: 600 }}>Examples ✓</span>
                      )}
                      {round.evaluation.answer_length_feedback && (
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                          background: round.evaluation.answer_length_feedback === 'good_length' ? 'rgba(20,184,166,0.14)' : 'rgba(245,158,11,0.16)',
                          color: round.evaluation.answer_length_feedback === 'good_length' ? 'var(--teal)' : 'var(--warning)',
                        }}>
                          {round.evaluation.answer_length_feedback === 'good_length' ? '✓ Good length'
                            : round.evaluation.answer_length_feedback === 'too_brief' ? '⚠ Too brief'
                            : '⚠ Too long'}
                        </span>
                      )}
                    </div>

                    {/* Strengths + improvements inline */}
                    {(round.evaluation.strengths?.length > 0 || round.evaluation.improvements?.length > 0) && (
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {round.evaluation.strengths?.map((s, j) => (
                          <span key={j} style={{ fontSize: 11, color: 'var(--teal)',
                            background: 'rgba(20,184,166,0.14)', borderRadius: 20, padding: '2px 8px' }}>
                            ✓ {s}
                          </span>
                        ))}
                        {round.evaluation.improvements?.map((s, j) => (
                          <span key={j} style={{ fontSize: 11, color: 'var(--warning)',
                            background: 'rgba(245,158,11,0.16)', borderRadius: 20, padding: '2px 8px' }}>
                            ⚠ {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn-coral"
            onClick={() => navigate('/interview/chat')}>
            + Start New Interview
          </button>
          <button className="btn btn-ghost"
            onClick={() => navigate('/analytics')}>
            View Analytics
          </button>
          <button className="btn btn-ghost"
            onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
        </div>
      </div>
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}

