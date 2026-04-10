import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

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

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState(null)
  const [tokenError, setTokenError] = useState(false)

  useEffect(() => {
    // Supabase redirects with hash fragment: #access_token=...&type=recovery
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const type = params.get('type')

    if (accessToken && type === 'recovery') {
      setToken(accessToken)
    } else {
      setTokenError(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Password is required.')
      setTimeout(() => setError(''), 5000)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setTimeout(() => setError(''), 5000)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      setTimeout(() => setError(''), 5000)
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token: token,
        newPassword: password,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.')
      setTimeout(() => setError(''), 5000)
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
      </nav>

      <div className="auth-body-center">
        <div className="auth-card">
          {tokenError ? (
            <>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: 28, color: '#fff',
              }}>
                !
              </div>
              <h2 style={{ textAlign: 'center' }}>Invalid Reset Link</h2>
              <p style={{
                textAlign: 'center', color: 'var(--text-muted)',
                fontSize: 14, lineHeight: 1.6, marginBottom: 24,
              }}>
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link to="/forgot-password" className="btn btn-coral btn-full btn-lg" style={{ textAlign: 'center', display: 'block' }}>
                Request New Reset Link
              </Link>
            </>
          ) : success ? (
            <>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: 28, color: '#fff',
              }}>
                ✓
              </div>
              <h2 style={{ textAlign: 'center' }}>Password Reset!</h2>
              <p style={{
                textAlign: 'center', color: 'var(--text-muted)',
                fontSize: 14, lineHeight: 1.6, marginBottom: 24,
              }}>
                Your password has been updated successfully. Redirecting you to sign in...
              </p>
              <Link to="/login" className="btn btn-coral btn-full btn-lg" style={{ textAlign: 'center', display: 'block' }}>
                Sign In Now
              </Link>
            </>
          ) : (
            <>
              <h2>Reset Your Password</h2>
              <p className="auth-sub">Enter your new password below.</p>

              {error && <div className="error-msg">{error}</div>}

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <div className="form-label">New Password</div>
                  <div className="pw-wrap">
                    <input
                      className="form-input"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="pw-toggle"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <div className="form-label">Confirm New Password</div>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Repeat password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                <button
                  className="btn btn-coral btn-full btn-lg"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
