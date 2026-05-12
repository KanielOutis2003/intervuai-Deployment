import api from './api'

const testimonialService = {
  async listPublic() {
    const res = await api.get('/testimonials')
    return res.data?.data?.testimonials || []
  },

  async submit(payload) {
    const res = await api.post('/testimonials', payload)
    return res.data?.data
  },
}

export default testimonialService
