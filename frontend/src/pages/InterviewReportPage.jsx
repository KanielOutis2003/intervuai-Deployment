import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import interviewService from '../services/interviewService'

const ScoreRing = ({ value, color, label }) => {
  // Treat 0 same as null — 0 means the score was never set (DB default, not a real score)
  const pct = (value != null && value > 0) ? Math.round(value) : null
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
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

export default function InterviewReportPage() {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!interviewId) return
    setLoading(true)
    Promise.all([
      interviewService.getInterview(interviewId),
      interviewService.getMessages(interviewId),
    ])
      .then(([iv, msgData]) => {
        setInterview(iv)
        setMessages(msgData?.messages || [])
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
      qaRounds.push({
        questionNum: qaRounds.length + 1,
        question: questionMsg?.content || '',
        answer: messages[i].content,
        evaluation: evalMsg?.metadata?.evaluation || null,
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page, #f8f5f0)' }}>
      {/* Nav */}
      <nav style={{
        background: '#fff', borderBottom: '1px solid var(--border)',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none', color: 'var(--text-primary)',
          fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16 }}>
          ⚡ IntervuAI
        </Link>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Interview Report</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <button className="btn btn-coral btn-sm"
            onClick={() => navigate('/interview/chat')}>
            + New Interview
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px' }}>

        {/* Header card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 28,
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
                <div style={{
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
          <div style={{ background: '#fff', borderRadius: 16, padding: 24,
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                    background: '#ede9fe', marginBottom: 6,
                    fontSize: 13, color: '#6d28d9', lineHeight: 1.5,
                  }}>
                    <span style={{ flexShrink: 0 }}>💡</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Q&A Transcript */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24,
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

                {/* Answer */}
                <div style={{ marginBottom: round.evaluation ? 12 : 0,
                  paddingLeft: 12, borderLeft: '3px solid var(--teal)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)',
                    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Your Answer
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {round.answer}
                  </p>
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
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: '#ede9fe', color: '#7c3aed', fontWeight: 600 }}>STAR ✓</span>
                      )}
                      {round.evaluation.used_examples && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: '#e0f7f5', color: '#1a7a6e', fontWeight: 600 }}>Examples ✓</span>
                      )}
                      {round.evaluation.answer_length_feedback && (
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                          background: round.evaluation.answer_length_feedback === 'good_length' ? '#e0f7f5' : '#fef3c7',
                          color: round.evaluation.answer_length_feedback === 'good_length' ? '#1a7a6e' : '#92400e',
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
                          <span key={j} style={{ fontSize: 11, color: '#16a34a',
                            background: '#f0fdf4', borderRadius: 20, padding: '2px 8px' }}>
                            ✓ {s}
                          </span>
                        ))}
                        {round.evaluation.improvements?.map((s, j) => (
                          <span key={j} style={{ fontSize: 11, color: '#d97706',
                            background: '#fffbeb', borderRadius: 20, padding: '2px 8px' }}>
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
    </div>
  )
}
