import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // 60s — Render free tier can take up to 50s to cold-start
})

// Attach token on every request (checks both storages to support rememberMe)
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Token refresh queue — prevents multiple simultaneous refresh calls
let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

function clearAuthAndRedirect() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('access_token')
  sessionStorage.removeItem('refresh_token')
  sessionStorage.removeItem('user')
  window.location.href = '/login'
}

// Handle 401 globally with refresh-then-retry queue pattern
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config

    // Auth endpoints return 401 for wrong credentials — let the caller handle it
    const isAuthEndpoint = /\/auth\/(login|register|refresh)/.test(originalRequest.url || '')

    if (err.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue this request until the ongoing refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((queueErr) => Promise.reject(queueErr))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken =
        localStorage.getItem('refresh_token') ||
        sessionStorage.getItem('refresh_token')

      if (!refreshToken) {
        isRefreshing = false
        clearAuthAndRedirect()
        return Promise.reject(err)
      }

      try {
        const { data } = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken,
        })

        const newAccessToken =
          data?.data?.session?.access_token || data?.access_token
        const newRefreshToken =
          data?.data?.session?.refresh_token || data?.refresh_token

        if (!newAccessToken) throw new Error('No access token in refresh response')

        // Persist in whichever storage originally held the token
        if (localStorage.getItem('refresh_token')) {
          localStorage.setItem('access_token', newAccessToken)
          if (newRefreshToken) localStorage.setItem('refresh_token', newRefreshToken)
        } else {
          sessionStorage.setItem('access_token', newAccessToken)
          if (newRefreshToken) sessionStorage.setItem('refresh_token', newRefreshToken)
        }

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
        processQueue(null, newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        
        // Wait a tiny bit before retrying to let state sync if needed
        await new Promise(r => setTimeout(r, 50))
        return api(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        // Only redirect if it's a real auth error, not a network error
        if (refreshErr.response?.status === 401 || refreshErr.response?.status === 400) {
          clearAuthAndRedirect()
        }
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

export default api
