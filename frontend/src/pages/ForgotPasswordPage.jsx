import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Email address is required.')
      return
    }
    if (!EMAIL_RE.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <nav className="auth-nav nav">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
          </div>
          <span className="nav-logo-text">IntervuAI</span>
        </Link>
        <div className="nav-actions">
          <Link to="/login" className="btn btn-outline btn-sm">Back to Sign In</Link>
        </div>
      </nav>

      <div className="auth-body-center">
        <div className="auth-card">
          {success ? (
            <>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: 28, color: '#fff',
              }}>
                ✓
              </div>
              <h2 style={{ textAlign: 'center' }}>Check Your Email</h2>
              <p style={{
                textAlign: 'center', color: 'var(--text-muted)',
                fontSize: 14, lineHeight: 1.6, marginBottom: 24,
              }}>
                We've sent a password reset link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                Please check your inbox and click the link to reset your password.
              </p>
              <div style={{
                padding: '14px 16px', background: '#f8f5f0',
                borderRadius: 10, border: '1px solid var(--border)',
                fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6,
                marginBottom: 20,
              }}>
                <strong style={{ color: 'var(--text-primary)' }}>Didn't receive the email?</strong><br />
                Check your spam folder, or wait a few minutes and try again.
              </div>
              <button
                className="btn btn-coral btn-full btn-lg"
                onClick={() => { setSuccess(false); setEmail('') }}
              >
                Send Again
              </button>
              <div className="auth-footer-link" style={{ marginTop: 16 }}>
                <Link to="/login">Back to Sign In</Link>
              </div>
            </>
          ) : (
            <>
              <h2>Forgot Password?</h2>
              <p className="auth-sub">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {error && <div className="error-msg">{error}</div>}

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <div className="form-label">Email Address</div>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                </div>

                <button
                  className="btn btn-coral btn-full btn-lg"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="auth-footer-link" style={{ marginTop: 16 }}>
                Remember your password? <Link to="/login">Sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
