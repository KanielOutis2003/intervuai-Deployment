import { createContext, useContext, useState } from 'react'
import authService from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.getStoredUser())
  const [loading, setLoading] = useState(false)

  // rememberMe param is passed through to authService so the right storage is used
  const login = async (email, password, rememberMe = true) => {
    setLoading(true)
    try {
      const data = await authService.login(email, password, rememberMe)
      setUser(data.user)
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Login failed. Please check your credentials.',
      }
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
      return {
        success: false,
        error: err.response?.data?.error || 'Registration failed. Please try again.',
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await authService.logout()
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
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated, tryRefresh, updateUser, signInWithOAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
