import api from './api'

const analyticsService = {
  async getPerformance(period = 'all') {
    const res = await api.get(`/analytics/performance?period=${period}`)
    return res.data.data
  },

  async getProgress() {
    const res = await api.get('/analytics/progress')
    return res.data.data
  },

  async getTrends() {
    const res = await api.get('/analytics/trends')
    return res.data.data
  },

  async getScoreDistribution() {
    const res = await api.get('/analytics/visualization/scores')
    return res.data.data
  },

  async getTimeline(limit = 20) {
    const res = await api.get(`/analytics/visualization/timeline?limit=${limit}`)
    return res.data.data
  },
}

export default analyticsService
