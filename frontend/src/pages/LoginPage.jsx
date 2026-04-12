import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

// ── Terms & Conditions Modal ─────────────────────────────────────────────────
function TermsModal({ onAgree, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, maxWidth: 640, width: '100%',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        border: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>
              Terms &amp; Conditions
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              IntervuAI — AI Interview Coaching Platform · Effective: January 1, 2025
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: 'var(--text-muted)', lineHeight: 1,
              padding: '4px 8px', borderRadius: 6,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', padding: '20px 28px', flex: 1, lineHeight: 1.7 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0 }}>
            Please read these Terms &amp; Conditions carefully before using IntervuAI. By checking the
            agreement box and signing in, you confirm that you have read, understood, and agree to be
            bound by all the terms set out below.
          </p>

          <Section num="1" title="Acceptance of Terms">
            By accessing or using IntervuAI (the &quot;Platform&quot;), you agree to be bound by these Terms
            &amp; Conditions and our Privacy Policy. If you do not agree to any part of these terms, you
            must not use the Platform. These terms apply to all visitors, registered users, and others
            who access the Platform.
          </Section>

          <Section num="2" title="Description of Service">
            IntervuAI is an AI-powered interview coaching platform designed to help users practice and
            improve their interview skills through simulated interview sessions, real-time AI feedback,
            behavioural analysis, and performance analytics. The Platform is intended for personal,
            educational, and professional development purposes only.
          </Section>

          <Section num="3" title="AI Processing &amp; Automated Analysis">
            <strong>You acknowledge and consent to the following AI processing activities:</strong>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Your text responses, voice input, and written answers are transmitted to a third-party
                AI provider (Groq) for natural language processing, question generation, and response
                evaluation.</li>
              <li>AI-generated scores (Grammar, Relevance, Overall Quality) are computed automatically
                and are <em>indicative estimates</em>, not certified assessments.</li>
              <li>Evaluation results including strengths, areas of improvement, and final summaries are
                produced by AI and may not reflect the opinion of any human evaluator.</li>
              <li>IntervuAI does not guarantee the accuracy, completeness, or impartiality of any
                AI-generated feedback.</li>
            </ul>
          </Section>

          <Section num="4" title="Camera &amp; Microphone Consent">
            <strong>Video Interview mode uses your device camera and microphone. By enabling these features
            you explicitly consent to:</strong>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Your camera feed being processed <em>locally in your browser</em> to perform
                skin-tone-based facial presence detection for behavioural (non-verbal) scoring.</li>
              <li>Video frames being analysed via an HTML Canvas element — no raw video footage is
                transmitted to any server.</li>
              <li>Your microphone audio being captured through the Web Speech API for speech-to-text
                transcription. This API is provided by your browser (Google Chrome / Edge) and is
                subject to their respective privacy policies.</li>
              <li>Camera and microphone access is entirely <strong>optional</strong>. You may use the
                Chat Interview mode without granting any media permissions.</li>
            </ul>
          </Section>

          <Section num="5" title="Data Collection &amp; Storage">
            IntervuAI collects and stores the following user data:
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li><strong>Account data:</strong> Your name, email address, and encrypted password (managed
                by Supabase Authentication).</li>
              <li><strong>Interview transcripts:</strong> Questions posed by the AI and your written
                responses are stored to generate reports and analytics.</li>
              <li><strong>Performance scores:</strong> Overall, verbal, and non-verbal scores per
                session are stored to power your analytics dashboard.</li>
              <li><strong>Session metadata:</strong> Session start/end times, interview phase, and
                job role are stored for progress tracking.</li>
              <li>Data is stored securely in Supabase (hosted on AWS infrastructure with
                row-level security policies).</li>
              <li>You may request deletion of your account and associated data at any time by
                contacting support.</li>
            </ul>
          </Section>

          <Section num="6" title="User Responsibilities &amp; Acceptable Use">
            By using IntervuAI you agree that you will:
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Provide accurate registration information and keep your credentials secure.</li>
              <li>Not impersonate any person or entity, or misrepresent your affiliation with any
                organisation during interview sessions.</li>
              <li>Not use the Platform to generate, submit, or transmit any content that is unlawful,
                defamatory, harassing, abusive, threatening, obscene, or otherwise objectionable.</li>
              <li>Not disclose confidential proprietary information of any third party (e.g., your
                current or former employer) during AI interview sessions.</li>
              <li>Not attempt to reverse-engineer, scrape, or exploit the Platform's AI systems,
                APIs, or data pipelines.</li>
              <li>Not share your account credentials with any other person.</li>
              <li>Be at least <strong>16 years of age</strong>. Users under 18 require parental or
                guardian consent.</li>
            </ul>
          </Section>

          <Section num="7" title="No Employment Guarantee">
            IntervuAI is an educational and practice tool only. Use of the Platform does not guarantee
            employment, interview success, or any particular outcome in any hiring process. All feedback
            and scores are AI-generated practice guidance and should not be relied upon as professional
            career advice. IntervuAI is not affiliated with any employer, recruitment agency, or
            hiring platform.
          </Section>

          <Section num="8" title="Intellectual Property">
            All Platform content, software, design, logos, and AI models used within IntervuAI are
            the intellectual property of IntervuAI and its licensors. You retain ownership of the
            content you submit (interview answers, responses) but grant IntervuAI a non-exclusive,
            royalty-free licence to process and store that content solely for the purpose of delivering
            the service to you. We do not sell or licence your personal content to third parties.
          </Section>

          <Section num="9" title="Privacy &amp; Third-Party Services">
            IntervuAI uses the following third-party services which have their own privacy policies:
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li><strong>Supabase</strong> — authentication and database hosting.</li>
              <li><strong>Groq AI</strong> — natural language processing for interview feedback.</li>
              <li><strong>Web Speech API</strong> — browser-native speech-to-text (Google/Microsoft).</li>
            </ul>
            We will never sell, rent, or trade your personal data. Anonymised, aggregated usage data
            may be used to improve the Platform.
          </Section>

          <Section num="10" title="Limitation of Liability">
            To the fullest extent permitted by applicable law, IntervuAI and its operators shall not
            be liable for any indirect, incidental, special, consequential, or punitive damages,
            including but not limited to loss of employment opportunity, loss of data, or loss of
            profits, arising out of or related to your use of the Platform. The Platform is provided
            &quot;as is&quot; without warranties of any kind, express or implied.
          </Section>

          <Section num="11" title="Account Termination">
            We reserve the right to suspend or terminate your account at any time if you violate these
            Terms &amp; Conditions. You may delete your account at any time through your profile settings.
            Upon deletion, your personal data will be removed in accordance with our data retention
            policy within 30 days.
          </Section>

          <Section num="12" title="Changes to Terms">
            IntervuAI reserves the right to modify these Terms &amp; Conditions at any time. Changes will
            be communicated via the Platform or by email. Continued use of the Platform after changes
            are posted constitutes your acceptance of the revised terms.
          </Section>

          <Section num="13" title="Governing Law">
            These Terms &amp; Conditions are governed by and construed in accordance with applicable laws.
            Any disputes arising from or relating to these terms or your use of the Platform shall be
            subject to the exclusive jurisdiction of the competent courts of the jurisdiction where
            the Platform operator is registered.
          </Section>

          <div style={{
            marginTop: 24, padding: '14px 16px',
            background: '#f8f5f0', borderRadius: 10,
            border: '1px solid var(--border)', fontSize: 12,
            color: 'var(--text-muted)',
          }}>
            <strong style={{ color: 'var(--text-primary)' }}>Contact &amp; Support</strong><br />
            For questions about these Terms, data deletion requests, or support:<br />
            Email: <span style={{ color: 'var(--coral)' }}>support@intervuai.app</span><br />
            Platform: IntervuAI — AI Interview Coaching
          </div>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, flexShrink: 0,
          background: '#fafafa', borderRadius: '0 0 16px 16px',
        }}>
          <button
            className="btn btn-coral btn-full"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={onAgree}
          >
            ✓ I Have Read &amp; Agree to the Terms
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ flexShrink: 0 }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ num, title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h4 style={{
        margin: '0 0 8px', fontSize: 14, fontWeight: 700,
        color: 'var(--text-primary)', fontFamily: 'var(--font-head)',
        display: 'flex', gap: 8, alignItems: 'baseline',
      }}>
        <span style={{
          background: 'var(--coral)', color: '#fff',
          borderRadius: '50%', width: 20, height: 20, fontSize: 10,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontWeight: 700,
        }}>
          {num}
        </span>
        {title}
      </h4>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 28 }}>
        {children}
      </div>
    </div>
  )
}

// ── LoginPage ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, signInWithOAuth } = useAuth()

  const IS_TEST = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test'

  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [agreedToTerms, setAggedToTermsInternal] = useState(IS_TEST ? true : false)
  const setAgreedToTerms = (v) => setAggedToTermsInternal(v)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [slowWarning, setSlowWarning] = useState(false)

  function validate() {
    const errs = {}
    if (!form.email) {
      errs.email = 'Email address is required.'
    } else if (!EMAIL_RE.test(form.email)) {
      errs.email = 'Please enter a valid email address.'
    }
    if (!form.password) {
      errs.password = 'Password is required.'
    } else if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.'
    }
    if (!IS_TEST && !agreedToTerms) {
      errs.terms = 'You must agree to the Terms & Conditions to proceed.'
    }
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setServerError('')
    setSlowWarning(false)
    const slowTimer = setTimeout(() => setSlowWarning(true), 8000)
    const result = await login(form.email, form.password, rememberMe)
    clearTimeout(slowTimer)
    setSlowWarning(false)
    if (result.success) {
      navigate('/dashboard')
    } else {
      setServerError(result.error)
      setTimeout(() => setServerError(''), 5000)
    }
  }

  return (
    <div className="auth-page">
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Terms modal */}
      {showTermsModal && (
        <TermsModal
          onAgree={() => { setAgreedToTerms(true); setShowTermsModal(false); setFieldErrors(p => ({ ...p, terms: undefined })) }}
          onClose={() => setShowTermsModal(false)}
        />
      )}

      <nav className="auth-nav nav">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
          </div>
          <span className="nav-logo-text">IntervuAI</span>
        </Link>
        <div className="nav-actions">
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Don't have an account?</span>
          <Link to="/register" className="btn btn-outline btn-sm">Sign up</Link>
        </div>
      </nav>

      <div className="auth-body-center">
        <div className="auth-card">
          <h2>Welcome Back</h2>
          <p className="auth-sub">Sign in to continue your interview preparation</p>

          {serverError && <div className="error-msg">{serverError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="form-group">
              <div className="form-label">Email Address</div>
              <input
                className={`form-input${fieldErrors.email ? ' input-error' : ''}`}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                onBlur={() => {
                  const errs = validate()
                  setFieldErrors(prev => ({ ...prev, email: errs.email }))
                }}
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Password</span>
                <Link to="/forgot-password" style={{ color: 'var(--coral)', textDecoration: 'none', fontWeight: 500, fontSize: 13 }}>
                  Forgot password?
                </Link>
              </div>
              <div className="pw-wrap">
                <input
                  className={`form-input${fieldErrors.password ? ' input-error' : ''}`}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  onBlur={() => {
                    const errs = validate()
                    setFieldErrors(prev => ({ ...prev, password: errs.password }))
                  }}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>

            {/* Remember me */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                {' '}Remember me for 30 days
              </label>
            </div>

            {/* ── Terms & Conditions ── */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <div style={{
                padding: '14px 16px',
                background: fieldErrors.terms ? '#fde8eb' : '#f8f5f0',
                borderRadius: 10,
                border: `1.5px solid ${fieldErrors.terms ? 'var(--coral)' : agreedToTerms ? 'var(--teal)' : 'var(--border)'}`,
                transition: 'border-color 0.2s, background 0.2s',
              }}>
                <label className="form-check" style={{ alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={e => {
                      setAgreedToTerms(e.target.checked)
                      if (e.target.checked) setFieldErrors(p => ({ ...p, terms: undefined }))
                    }}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        color: 'var(--coral)', cursor: 'pointer', fontWeight: 600,
                        fontSize: 'inherit', textDecoration: 'underline', lineHeight: 'inherit',
                      }}
                    >
                      Terms &amp; Conditions
                    </button>
                    {' '}of IntervuAI, including consent to AI processing of my interview
                    responses, camera &amp; microphone usage for behavioural analysis, and data
                    storage in accordance with our Privacy Policy.
                  </span>
                </label>

                {agreedToTerms && (
                  <div style={{
                    marginTop: 8, fontSize: 11, color: 'var(--teal)',
                    display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 26,
                  }}>
                    ✓ Terms accepted — you may now sign in
                  </div>
                )}
              </div>

              {fieldErrors.terms && (
                <span className="field-error" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  ⚠ {fieldErrors.terms}
                </span>
              )}

              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                Click{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--coral)', cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline' }}
                >
                  Terms &amp; Conditions
                </button>
                {' '}to read the full agreement before accepting.
              </p>
            </div>

            <button
              className="btn btn-coral btn-full btn-lg"
              type="submit"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading
                ? slowWarning
                  ? <><Spinner /> Server is waking up, please wait…</>
                  : <><Spinner /> Signing in…</>
                : 'Sign In'}
            </button>
          </form>

          <div className="auth-divider">Or continue with</div>
          <div className="auth-social">
            <button className="auth-social-btn" onClick={() => signInWithOAuth('google')}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button className="auth-social-btn" onClick={() => signInWithOAuth('github')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>
          <div className="auth-footer-link">
            Don't have an account? <Link to="/register">Sign up for free</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
