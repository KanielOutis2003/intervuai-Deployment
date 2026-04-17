import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, tryRefresh } = useAuth()
  const location = useLocation()
  const [checking, setChecking] = useState(!isAuthenticated())
  const [allowed, setAllowed] = useState(isAuthenticated())

  useEffect(() => {
    if (isAuthenticated()) {
      setAllowed(true)
      setChecking(false)
      return
    }

    // No token — reset state and attempt a silent refresh before redirecting
    setAllowed(false)
    setChecking(true)
    tryRefresh().then((ok) => {
      setAllowed(ok)
      setChecking(false)
    })
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        color: '#6b7280',
        fontSize: 14,
        gap: 10,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
          </path>
        </svg>
        Checking session…
      </div>
    )
  }

  return allowed ? children : <Navigate to="/login" replace />
}
