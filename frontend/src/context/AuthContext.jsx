import { createContext, useContext, useState } from 'react'
import authService from '../services/authService'

const AuthContext = createContext(null)

function normalizeLoginError(err) {
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return 'Server is waking up — please wait a moment and try again.'
  }
  if (!err.response) {
    return 'Unable to reach the server. Please check your connection and try again.'
  }
  if (err.response.status === 429) {
    return 'Too many failed attempts. Please wait a moment and try again.'
  }
  const raw = (err.response?.data?.error || '').toLowerCase()
  if (raw.includes('invalid login credentials') || raw.includes('invalid credentials')) {
    return 'Invalid email or password. Please try again.'
  }
  if (raw.includes('email not confirmed') || raw.includes('not confirmed')) {
    return 'Please verify your email address before signing in.'
  }
  if (raw.includes('too many requests') || raw.includes('rate limit') || raw.includes('after')) {
    return 'Too many failed attempts. Please wait a moment and try again.'
  }
  if (raw.includes('user not found') || raw.includes('no user found')) {
    return 'No account found with this email address.'
  }
  return 'Login failed. Please check your credentials and try again.'
}

function normalizeRegisterError(err) {
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return 'Server is waking up — please wait a moment and try again.'
  }
  if (!err.response) {
    return 'Registration failed. Please check your connection and try again.'
  }
  const raw = (err.response?.data?.error || '').toLowerCase()
  if (raw.includes('already registered') || raw.includes('already exists') || raw.includes('duplicate')) {
    return 'An account with this email already exists. Please sign in instead.'
  }
  return 'Registration failed. Please try again later.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.getStoredUser())
  const [loading, setLoading] = useState(false)

  const login = async (email, password, rememberMe = true) => {
    setLoading(true)
    try {
      const data = await authService.login(email, password, rememberMe)
      setUser(data.user)
      return { success: true }
    } catch (err) {
      return { success: false, error: normalizeLoginError(err) }
    } finally {
      setLoading(false)
    }
  }

  const register = async (email, password, fullName) => {
    setLoading(true)
    try {
      const data = await authService.register(email, password, fullName)
      return { success: true, data }
    } catch (err) {
      return { success: false, error: normalizeRegisterError(err) }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  // Clears local session without hitting the API — safe to call from LoginPage
  // mount where there may be no valid token (avoids 401 retry loops)
  const clearSession = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('user')
    setUser(null)
  }

  // Silently try to refresh the token; returns true on success, false on failure
  const tryRefresh = async () => {
    try {
      const result = await authService.refreshToken()
      if (result?.user) setUser(result.user)
      else setUser(authService.getStoredUser())
      return true
    } catch {
      return false
    }
  }

  const isAuthenticated = () => authService.isAuthenticated()

  const updateUser = (newData) => {
    const updatedUser = { ...user, ...newData }
    setUser(updatedUser)
    const storage = localStorage.getItem('user') ? localStorage : sessionStorage
    storage.setItem('user', JSON.stringify(updatedUser))
  }

  // OAuth sign-in — redirects to provider
  const signInWithOAuth = async (provider) => {
    try {
      await authService.signInWithOAuth(provider)
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err.message || `${provider} sign-in failed. Please try again.`,
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, clearSession, isAuthenticated, tryRefresh, updateUser, signInWithOAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
