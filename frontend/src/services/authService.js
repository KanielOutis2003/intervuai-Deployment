import api from './api'

// Helper: resolve which storage is currently holding tokens
function detectStorage() {
  return localStorage.getItem('access_token') ? localStorage : sessionStorage
}

const authService = {
  async register(email, password, fullName) {
    const res = await api.post('/auth/register', { email, password, fullName })
    return res.data
  },

  // rememberMe=true  → localStorage (survives browser close)
  // rememberMe=false → sessionStorage (cleared on tab close)
  async login(email, password, rememberMe = true) {
    const res = await api.post('/auth/login', { email, password })
    const { session, user } = res.data.data
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem('access_token', session.access_token)
    storage.setItem('refresh_token', session.refresh_token)
    storage.setItem('user', JSON.stringify(user))
    return res.data.data
  },

  async refreshToken() {
    const storage = detectStorage()
    const refreshTok = storage.getItem('refresh_token')
    if (!refreshTok) throw new Error('No refresh token available')

    const res = await api.post('/auth/refresh', { refresh_token: refreshTok })
    const newAccessToken =
      res.data?.data?.session?.access_token || res.data?.access_token
    const newRefreshToken =
      res.data?.data?.session?.refresh_token || res.data?.refresh_token

    if (!newAccessToken) throw new Error('Refresh returned no access token')

    storage.setItem('access_token', newAccessToken)
    if (newRefreshToken) {
      storage.setItem('refresh_token', newRefreshToken)
    }
    if (res.data?.data?.user) {
      storage.setItem('user', JSON.stringify(res.data.data.user))
    }
    return { access_token: newAccessToken, user: res.data?.data?.user || null }
  },

  async logout() {
    try {
      await api.post('/auth/logout')
    } catch (_) {}
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('user')
  },

  async forgotPassword(email) {
    const res = await api.post('/auth/forgot-password', { email })
    return res.data
  },

  async changePassword(newPassword) {
    const res = await api.post('/auth/change-password', { newPassword })
    return res.data
  },

  getStoredUser() {
    try {
      const raw =
        localStorage.getItem('user') || sessionStorage.getItem('user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  isAuthenticated() {
    return !!(
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token')
    )
  },
}

export default authService
