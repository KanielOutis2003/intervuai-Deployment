import { useState, useEffect, useCallback, useRef } from 'react'

const STEPS = [
  {
    target: '.dash-welcome',
    title: 'Welcome to IntervuAI!',
    content: 'This is your personal dashboard. Here you can track your progress, start interviews, and monitor your performance.',
    position: 'bottom',
  },
  {
    target: '.kpi-grid',
    title: 'Performance Metrics',
    content: 'Keep an eye on your total interviews, average score, completions, and personal best.',
    position: 'bottom',
  },
  {
    target: '.quick-actions',
    title: 'Quick Actions',
    content: 'Start a Chat or Video interview, view analytics, or explore resources \u2014 all in one place.',
    position: 'bottom',
  },
  {
    target: '.skills-panel',
    title: 'Skill Breakdown',
    content: 'Track your interview skills over time. Your scores update automatically after each completed session.',
    position: 'bottom',
  },
  {
    target: '.recent-section',
    title: 'Recent Sessions',
    content: 'View your past interviews, check scores, and resume any in-progress sessions. Click any session to see its full report.',
    position: 'top',
  },
]

export default function AppTour({ onComplete }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)
  const tooltipRef = useRef(null)

  const current = STEPS[step]

  const measureTarget = useCallback(() => {
    // Small delay to let scroll finish
    const el = document.querySelector(current.target)
    if (el) {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    } else {
      setRect(null)
    }
  }, [current.target])

  useEffect(() => {
    const el = document.querySelector(current.target)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Measure after scroll settles
      const timer = setTimeout(measureTarget, 350)
      return () => clearTimeout(timer)
    } else {
      setRect(null)
    }
  }, [step, current.target, measureTarget])

  useEffect(() => {
    window.addEventListener('resize', measureTarget)
    return () => window.removeEventListener('resize', measureTarget)
  }, [measureTarget])

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  const handlePrev = () => {
    if (step > 0) setStep(step - 1)
  }

  // Calculate tooltip position, clamped to viewport
  const getTooltipStyle = () => {
    if (!rect) return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10002 }

    const pad = 16
    const pos = current.position
    const style = { position: 'fixed', zIndex: 10002 }
    const tooltipWidth = 340

    if (pos === 'bottom') {
      style.top = rect.top + rect.height + pad
      style.left = Math.max(pad, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - pad))
    } else if (pos === 'top') {
      style.top = rect.top - pad - 220
      style.left = Math.max(pad, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - pad))
      // If tooltip would go above viewport, put it below instead
      if (style.top < pad) {
        style.top = rect.top + rect.height + pad
      }
    } else if (pos === 'left') {
      style.top = rect.top + rect.height / 2 - 100
      style.left = Math.max(pad, rect.left - tooltipWidth - pad)
      // If not enough space on left, put it below
      if (style.left < pad) {
        style.top = rect.top + rect.height + pad
        style.left = Math.max(pad, rect.left + rect.width / 2 - tooltipWidth / 2)
      }
    } else {
      style.top = rect.top + rect.height / 2 - 100
      style.left = rect.left + rect.width + pad
    }

    // Clamp vertical position
    style.top = Math.max(pad, Math.min(style.top, window.innerHeight - 280))

    return style
  }

  const isLast = step === STEPS.length - 1

  return (
    <>
      {/* Backdrop overlay - blocks interaction with page */}
      <div style={backdropStyle} onClick={onComplete} />

      {/* SVG mask with cutout */}
      <svg style={svgStyle} width="100%" height="100%">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - 8}
                y={rect.top - 8}
                width={rect.width + 16}
                height={rect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight border */}
      {rect && (
        <div style={{
          position: 'fixed',
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          border: '2px solid var(--coral, #e8566a)',
          borderRadius: 12,
          zIndex: 10001,
          pointerEvents: 'none',
          boxShadow: '0 0 0 4px rgba(232,86,106,0.2)',
        }} />
      )}

      {/* Tooltip */}
      <div ref={tooltipRef} style={{ ...getTooltipStyle(), ...tooltipStyle }}>
        {/* Progress */}
        <div style={progressRow}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? 'var(--coral, #e8566a)' : 'var(--border, #e0dcd4)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        <div style={stepLabel}>Step {step + 1} of {STEPS.length}</div>
        <h4 style={titleStyle}>{current.title}</h4>
        <p style={contentStyle}>{current.content}</p>

        <div style={navRow}>
          <button style={skipBtn} onClick={onComplete}>Skip Tour</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button style={secondaryBtn} onClick={handlePrev}>{'\u2190'} Back</button>
            )}
            <button style={primaryBtn} onClick={handleNext}>
              {isLast ? 'Get Started!' : 'Next \u2192'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Styles ──────────────────────────────────────────────────── */

const backdropStyle = {
  position: 'fixed', inset: 0, zIndex: 9999,
}

const svgStyle = {
  position: 'fixed', inset: 0, zIndex: 10000,
  pointerEvents: 'none',
}

const tooltipStyle = {
  background: 'var(--card, #fff)',
  borderRadius: 14,
  padding: '20px 24px',
  maxWidth: 340,
  width: '90vw',
  boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
}

const progressRow = {
  display: 'flex', gap: 4, marginBottom: 12,
}

const stepLabel = {
  fontSize: 11, fontWeight: 700, color: 'var(--coral, #e8566a)',
  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
}

const titleStyle = {
  fontSize: 17, fontWeight: 700, marginBottom: 8,
  color: 'var(--text, #2e2b27)',
}

const contentStyle = {
  fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted, #7a7265)',
  marginBottom: 20,
}

const navRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
}

const skipBtn = {
  background: 'none', border: 'none', fontSize: 13,
  color: 'var(--text-muted, #7a7265)', cursor: 'pointer',
  textDecoration: 'underline',
}

const primaryBtn = {
  background: 'var(--coral, #e8566a)', color: '#fff',
  border: 'none', borderRadius: 8, padding: '8px 18px',
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
}

const secondaryBtn = {
  background: 'none', border: '1px solid var(--border, #e0dcd4)',
  borderRadius: 8, padding: '8px 14px',
  fontSize: 14, color: 'var(--text, #2e2b27)', cursor: 'pointer',
}
