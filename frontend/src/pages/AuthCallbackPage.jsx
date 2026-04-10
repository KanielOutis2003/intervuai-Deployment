import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import authService from '../services/authService'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    async function handleCallback() {
      try {
        const { user } = await authService.handleOAuthCallback()
        updateUser(user)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('OAuth callback error:', err)
        setError(err.message || 'Authentication failed. Please try again.')
        setTimeout(() => navigate('/login', { replace: true }), 3000)
      }
    }

    handleCallback()
  }, [navigate, updateUser])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      fontFamily: 'var(--font-body)',
    }}>
      {error ? (
        <>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: '#fde8eb', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: '#ef4444',
          }}>!</div>
          <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Redirecting to sign in...</p>
        </>
      ) : (
        <>
          <div style={{
            width: 40, height: 40, border: '3px solid var(--border)',
            borderTopColor: 'var(--coral)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Signing you in...</p>
        </>
      )}
    </div>
  )
}
