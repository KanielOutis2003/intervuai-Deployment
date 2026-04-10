import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  {
    icon: '\uD83C\uDFAF',
    title: 'Choose Your Role',
    description: 'Select your target job role and industry. IntervuAI tailors every question to match real interviews for your specific career path.',
  },
  {
    icon: '\uD83E\uDD16',
    title: 'Practice with AI',
    description: 'Engage in realistic mock interviews powered by advanced AI. Answer questions naturally \u2014 our AI adapts in real-time to challenge you appropriately.',
  },
  {
    icon: '\uD83D\uDCCA',
    title: 'Get Instant Feedback',
    description: 'Receive detailed scoring on communication, technical accuracy, and problem-solving. See exactly where you excelled and where to improve.',
  },
  {
    icon: '\uD83D\uDE80',
    title: 'Track Your Progress',
    description: 'Monitor your improvement over time with analytics dashboards. Watch your scores rise as you practice and refine your interview skills.',
  },
]

export default function DemoModal({ onClose }) {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <button style={closeBtn} onClick={onClose}>{'\u2715'}</button>

        {/* Progress dots */}
        <div style={dotsRow}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i === step ? 'var(--coral, #e8566a)' : 'var(--border, #e0dcd4)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div style={iconWrap}>{current.icon}</div>
        <h3 style={titleStyle}>{current.title}</h3>
        <p style={descStyle}>{current.description}</p>

        {/* Step indicator */}
        <div style={stepIndicator}>Step {step + 1} of {STEPS.length}</div>

        {/* Navigation */}
        <div style={navRow}>
          {step > 0 ? (
            <button style={secondaryBtn} onClick={() => setStep(step - 1)}>
              {'\u2190'} Back
            </button>
          ) : (
            <div />
          )}

          {isLast ? (
            <button
              style={primaryBtn}
              onClick={() => { onClose(); navigate('/register') }}
            >
              Get Started Free {'\u2192'}
            </button>
          ) : (
            <button style={primaryBtn} onClick={() => setStep(step + 1)}>
              Next {'\u2192'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Inline styles ─────────────────────────────────────────────── */

const overlay = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const modal = {
  background: 'var(--card, #fff)', borderRadius: 16,
  padding: '40px 36px 32px', maxWidth: 480, width: '90%',
  position: 'relative', textAlign: 'center',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
}

const closeBtn = {
  position: 'absolute', top: 14, right: 14,
  background: 'none', border: 'none', fontSize: 20,
  cursor: 'pointer', color: 'var(--text-muted, #7a7265)',
  lineHeight: 1, padding: 4,
}

const dotsRow = {
  display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28,
}

const iconWrap = {
  fontSize: 64, lineHeight: 1, marginBottom: 16,
}

const titleStyle = {
  fontSize: 22, fontWeight: 700, marginBottom: 12,
  color: 'var(--text, #2e2b27)',
}

const descStyle = {
  fontSize: 15, lineHeight: 1.6, color: 'var(--text-muted, #7a7265)',
  marginBottom: 20, minHeight: 72,
}

const stepIndicator = {
  fontSize: 13, color: 'var(--text-muted, #7a7265)', marginBottom: 24,
}

const navRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
}

const primaryBtn = {
  background: 'var(--coral, #e8566a)', color: '#fff',
  border: 'none', borderRadius: 8, padding: '10px 24px',
  fontSize: 15, fontWeight: 600, cursor: 'pointer',
}

const secondaryBtn = {
  background: 'none', border: '1px solid var(--border, #e0dcd4)',
  borderRadius: 8, padding: '10px 20px',
  fontSize: 15, color: 'var(--text, #2e2b27)', cursor: 'pointer',
}
