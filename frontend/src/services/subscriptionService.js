import api from './api'

const subscriptionService = {
  async getPlans() {
    const res = await api.get('/subscriptions/plans')
    return res.data.data
  },

  async getMySubscription() {
    const res = await api.get('/subscriptions/my-subscription')
    return res.data.data
  },

  async subscribe(planId) {
    const res = await api.post('/subscriptions/subscribe', { planId })
    return res.data.data
  },

  async cancelSubscription() {
    const res = await api.post('/subscriptions/cancel')
    return res.data.data
  }
}

export default subscriptionService
