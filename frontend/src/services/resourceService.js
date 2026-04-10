import api from './api'

const resourceService = {
  async listResources(params = {}) {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString()
    const res = await api.get(`/resources${query ? `?${query}` : ''}`)
    return res.data.data
  },

  async getResource(id) {
    const res = await api.get(`/resources/${id}`)
    return res.data.data
  },

  async createResource(data) {
    const res = await api.post('/resources', data)
    return res.data.data
  },

  async updateResource(id, data) {
    const res = await api.patch(`/resources/${id}`, data)
    return res.data.data
  },

  async deleteResource(id) {
    const res = await api.delete(`/resources/${id}`)
    return res.data.data
  },

  async getTips(params = {}) {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString()
    const res = await api.get(`/resources/tips${query ? `?${query}` : ''}`)
    return res.data.data
  },

  async getPersonalizedTips() {
    const res = await api.get('/resources/tips/personalized')
    return res.data.data
  },

  // Track that a user opened/read a resource (increments read_count)
  async trackRead(id) {
    try {
      const res = await api.post(`/resources/${id}/read`)
      return res.data.data
    } catch {
      // Non-critical — silently ignore failures
    }
  },

  async getSubscriptionPlans() {
    const res = await api.get('/subscriptions/plans')
    return res.data.data
  },
}

export default resourceService
