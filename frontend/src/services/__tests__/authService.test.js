import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the api module before importing authService
vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import api from '../api'
import authService from '../authService'

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('login', () => {
    it('stores tokens in localStorage when rememberMe is true', async () => {
      api.post.mockResolvedValue({
        data: {
          data: {
            user: { id: 'u1', email: 'a@b.com' },
            session: { access_token: 'tok', refresh_token: 'ref' },
          },
        },
      })

      await authService.login('a@b.com', 'password', true)

      expect(localStorage.getItem('access_token')).toBe('tok')
      expect(localStorage.getItem('refresh_token')).toBe('ref')
      expect(sessionStorage.getItem('access_token')).toBeNull()
    })

    it('stores tokens in sessionStorage when rememberMe is false', async () => {
      api.post.mockResolvedValue({
        data: {
          data: {
            user: { id: 'u1', email: 'a@b.com' },
            session: { access_token: 'tok', refresh_token: 'ref' },
          },
        },
      })

      await authService.login('a@b.com', 'password', false)

      expect(sessionStorage.getItem('access_token')).toBe('tok')
      expect(localStorage.getItem('access_token')).toBeNull()
    })

    it('throws when api.post rejects', async () => {
      api.post.mockRejectedValue(new Error('Network error'))
      await expect(authService.login('a@b.com', 'pw')).rejects.toThrow('Network error')
    })
  })

  describe('logout', () => {
    it('clears tokens from both storages', async () => {
      localStorage.setItem('access_token', 'tok')
      sessionStorage.setItem('access_token', 'tok2')
      api.post.mockResolvedValue({})

      await authService.logout()

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(sessionStorage.getItem('access_token')).toBeNull()
    })

    it('clears tokens even if logout API call fails', async () => {
      localStorage.setItem('access_token', 'tok')
      api.post.mockRejectedValue(new Error('Server error'))

      await authService.logout()

      expect(localStorage.getItem('access_token')).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('returns true when localStorage has access_token', () => {
      localStorage.setItem('access_token', 'tok')
      expect(authService.isAuthenticated()).toBe(true)
    })

    it('returns true when sessionStorage has access_token', () => {
      sessionStorage.setItem('access_token', 'tok')
      expect(authService.isAuthenticated()).toBe(true)
    })

    it('returns false when no token in either storage', () => {
      expect(authService.isAuthenticated()).toBe(false)
    })
  })

  describe('getStoredUser', () => {
    it('parses user from localStorage', () => {
      const user = { id: 'u1', email: 'a@b.com' }
      localStorage.setItem('user', JSON.stringify(user))
      expect(authService.getStoredUser()).toEqual(user)
    })

    it('returns null when no user is stored', () => {
      expect(authService.getStoredUser()).toBeNull()
    })

    it('returns null when stored value is invalid JSON', () => {
      localStorage.setItem('user', 'not-json')
      expect(authService.getStoredUser()).toBeNull()
    })
  })

  describe('refreshToken', () => {
    it('stores new access_token from refresh response', async () => {
      // detectStorage() checks access_token first — set both to simulate a logged-in state
      localStorage.setItem('access_token', 'old-tok')
      localStorage.setItem('refresh_token', 'ref')
      api.post.mockResolvedValue({
        data: {
          data: {
            session: { access_token: 'new-tok' },
          },
        },
      })

      const result = await authService.refreshToken()

      expect(result.access_token).toBe('new-tok')
      expect(localStorage.getItem('access_token')).toBe('new-tok')
    })

    it('throws when no refresh token is available', async () => {
      await expect(authService.refreshToken()).rejects.toThrow('No refresh token available')
    })
  })
})
