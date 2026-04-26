import api from './api'

const userService = {
  async getProfile() {
    const res = await api.get('/users/me')
    return res.data.data
  },

  async updateProfile(data) {
    const res = await api.patch('/users/me', data)
    return res.data.data
  },

  async getPreferences() {
    const res = await api.get('/users/me/preferences')
    return res.data.data
  },

  async updatePreferences(preferences) {
    const res = await api.patch('/users/me/preferences', { preferences })
    return res.data.data
  },

  async uploadResume(file, onProgress) {
    const form = new FormData()
    form.append('resume', file)
    const res = await api.post('/users/me/resume', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    })
    return res.data.data
  },

  async getDashboard() {
    const res = await api.get('/users/me/dashboard')
    return res.data.data
  }
}

export default userService
