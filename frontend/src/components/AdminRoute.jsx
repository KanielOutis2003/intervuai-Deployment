import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Route guard that allows only users with role === 'admin'.
 * Non-admins are redirected to /dashboard.
 */
export default function AdminRoute({ children }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />

  return children
}
