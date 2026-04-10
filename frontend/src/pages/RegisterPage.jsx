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
  const { register, loading } = useAuth()

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    const errs = validate()
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    const result = await register(form.email, form.password, form.fullName)
    if (result.success) {
      setSuccess('Account created! Please check your email to verify, then sign in.')
      setTimeout(() => navigate('/login'), 3000)
    } else {
      setServerError(result.error)
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
                <input type="checkbox" required /> I agree to the <a href="#" className="terms-link">Terms of Service</a> and <a href="#" className="terms-link">Privacy Policy</a>
              </label>
            </div>

            <button className="btn btn-coral btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Free Account →'}
            </button>
          </form>

          <div className="auth-divider">Or sign up with</div>
          <div className="auth-social">
            <button className="auth-social-btn">G Google</button>
            <button className="auth-social-btn">⌥ GitHub</button>
          </div>
          <div className="auth-footer-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
