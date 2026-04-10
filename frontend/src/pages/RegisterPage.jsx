import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: 'transparent' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444', pct: 25 }
  if (score <= 3) return { score, label: 'Fair', color: '#f59e0b', pct: 55 }
  return { score, label: 'Strong', color: '#10b981', pct: 100 }
}

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

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, loading, signInWithOAuth } = useAuth()

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const strength = getPasswordStrength(form.password)

  function validate() {
    const errs = {}
    if (!form.fullName.trim()) errs.fullName = 'Full name is required.'
    if (!form.email) {
      errs.email = 'Email address is required.'
    } else if (!EMAIL_RE.test(form.email)) {
      errs.email = 'Please enter a valid email address.'
    }
    if (!form.password) {
      errs.password = 'Password is required.'
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.'
    }
    if (!form.confirm) {
      errs.confirm = 'Please confirm your password.'
    } else if (form.password !== form.confirm) {
      errs.confirm = 'Passwords do not match.'
    }
    if (!agreedToTerms) {
      errs.terms = 'You must agree to the Terms of Service to create an account.'
    }
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      if (!agreedToTerms) {
        setServerError('Please agree to the Terms of Service before creating your account.')
        setTimeout(() => setServerError(''), 5000)
      }
      return
    }
    setFieldErrors({})
    setServerError('')
    const result = await register(form.email, form.password, form.fullName)
    if (result.success) {
      setSuccess('Account created! Please check your email to verify, then sign in.')
      setTimeout(() => navigate('/login'), 3000)
    } else {
      setServerError(result.error)
      setTimeout(() => setServerError(''), 5000)
    }
  }

  return (
    <div className="reg-page">
      <nav className="auth-nav nav">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
          </div>
          <span className="nav-logo-text">IntervuAI</span>
        </Link>
        <div className="nav-actions">
          <span style={{fontSize:14,color:'var(--text-muted)'}}>Already have an account?</span>
          <Link to="/login" className="btn btn-outline btn-sm">Sign In</Link>
        </div>
      </nav>

      <div className="reg-body">
        {/* Left column */}
        <div className="reg-left">
          <h2>Start Your Journey to Interview Success</h2>
          <ul className="reg-benefits">
            {[
              ['Unlimited Practice Interviews', 'Practice with AI for as long as you need, whenever you want.'],
              ['Personalized AI Feedback', 'Receive detailed, actionable feedback after every session.'],
              ['Progress Analytics', 'Track your improvement with comprehensive performance dashboards.'],
              ['Industry Question Bank', 'Access thousands of real interview questions across all industries.'],
            ].map(([h, p]) => (
              <li className="reg-benefit" key={h}>
                <div className="reg-check">✓</div>
                <div><h4>{h}</h4><p>{p}</p></div>
              </li>
            ))}
          </ul>
          <div className="reg-social-proof">
            <strong>🎉 Join 50,000+ professionals</strong> who've already improved their interview performance with IntervuAI.
          </div>
        </div>

        {/* Right column - form */}
        <div className="reg-card">
          <h2>Create Your Account</h2>
          <p className="auth-sub">Start your free trial — no credit card required</p>

          {serverError && <div className="error-msg">{serverError}</div>}
          {success && <div className="success-msg">{success}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className="form-group">
              <div className="form-label">Full Name</div>
              <input
                className={`form-input${fieldErrors.fullName ? ' input-error' : ''}`}
                type="text"
                placeholder="John Doe"
                value={form.fullName}
                onChange={e => setForm({...form, fullName: e.target.value})}
                onBlur={() => {
                  const errs = validate()
                  setFieldErrors(prev => ({ ...prev, fullName: errs.fullName }))
                }}
              />
              {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
            </div>

            {/* Email */}
            <div className="form-group">
              <div className="form-label">Email Address</div>
              <input
                className={`form-input${fieldErrors.email ? ' input-error' : ''}`}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                onBlur={() => {
                  const errs = validate()
                  setFieldErrors(prev => ({ ...prev, email: errs.email }))
                }}
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <div className="form-label">Password</div>
              <div className="pw-wrap">
                <input
                  className={`form-input${fieldErrors.password ? ' input-error' : ''}`}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  onBlur={() => {
                    const errs = validate()
                    setFieldErrors(prev => ({ ...prev, password: errs.password }))
                  }}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  <EyeIcon open={showPw} />
                </button>
              </div>
              {/* Password strength bar */}
              {form.password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ background: '#e5e7eb', borderRadius: 2, height: 4 }}>
                    <div
                      className="password-strength"
                      style={{ width: `${strength.pct}%`, background: strength.color }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                </div>
              )}
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <div className="form-label">Confirm Password</div>
              <div className="pw-wrap">
                <input
                  className={`form-input${fieldErrors.confirm ? ' input-error' : ''}`}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={form.confirm}
                  onChange={e => setForm({...form, confirm: e.target.value})}
                  onBlur={() => {
                    const errs = validate()
                    setFieldErrors(prev => ({ ...prev, confirm: errs.confirm }))
                  }}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {fieldErrors.confirm && <span className="field-error">{fieldErrors.confirm}</span>}
            </div>

            {/* Terms */}
            <div className="form-group">
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => {
                    setAgreedToTerms(e.target.checked)
                    if (e.target.checked) setFieldErrors(p => ({ ...p, terms: undefined }))
                  }}
                />
                {' '}I agree to the <a href="#" className="terms-link">Terms of Service</a> and <a href="#" className="terms-link">Privacy Policy</a>
              </label>
              {fieldErrors.terms && <span className="field-error">{fieldErrors.terms}</span>}
            </div>

            <button className="btn btn-coral btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Free Account →'}
            </button>
          </form>

          <div className="auth-divider">Or sign up with</div>
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
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
