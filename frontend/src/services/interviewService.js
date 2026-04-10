import api from './api'

// Normalise Axios errors into { message, status } so callers don't need to
// dig into err.response themselves.
function wrap(err) {
  const message =
    err.response?.data?.error ||
    err.response?.data?.message ||
    err.message ||
    'An unexpected error occurred. Please try again.'
  const status = err.response?.status || 0
  const error = new Error(message)
  error.status = status
  throw error
}

const interviewService = {
  async createInterview(jobRole, interviewType = 'general') {
    try {
      const res = await api.post('/interviews', { jobRole, interviewType })
      return res.data.data
    } catch (err) { wrap(err) }
  },

  async getJobRoles() {
    try {
      const res = await api.get('/interviews/job-roles')
      return res.data.data?.roles || []
    } catch (_) { return [] }
  },

  async getInterviews() {
    try {
      const res = await api.get('/interviews')
      return res.data.data
    } catch (err) { wrap(err) }
  },

  async getInterview(id) {
    try {
      const res = await api.get(`/interviews/${id}`)
      return res.data.data
    } catch (err) { wrap(err) }
  },

  async startSession(interviewId) {
    try {
      const res = await api.post('/sessions/start', { interviewId })
      return res.data.data
    } catch (err) { wrap(err) }
  },

  async sendMessage(interviewId, content) {
    try {
      const res = await api.post(`/sessions/${interviewId}/message`, {
        interviewId, role: 'user', content,
      })
      return res.data.data
    } catch (err) { wrap(err) }
  },

  async getMessages(interviewId) {
    try {
      const res = await api.get(`/sessions/${interviewId}/messages`)
      return res.data.data
    } catch (err) { wrap(err) }
  },

  async endSession(sessionId) {
    try {
      const res = await api.post(`/sessions/${sessionId}/end`, { sessionId })
      return res.data.data
    } catch (err) { wrap(err) }
  },

  async getQuestions(interviewId) {
    try {
      const res = await api.get(`/questions/interview/${interviewId}`)
      return res.data.data || []
    } catch (err) { wrap(err) }
  },

  async getDashboard() {
    try {
      const res = await api.get('/users/me/dashboard')
      return res.data.data
    } catch (err) { wrap(err) }
  },

  // Save a message to DB without triggering AI generation.
  // For 'user' role, sends persist_only=true to skip Groq.
  // For 'assistant' role, pass evaluation data in metadata.
  async persistMessage(interviewId, role, content, metadata = null) {
    try {
      const body = { interviewId, role, content }
      if (role === 'user') body.persist_only = true
      if (metadata) body.metadata = metadata
      const res = await api.post(`/sessions/${interviewId}/message`, body)
      return res.data.data
    } catch (err) { /* best-effort */ }
  },

  async updateScores(interviewId, scores) {
    try {
      const res = await api.patch(`/interviews/${interviewId}/scores`, scores)
      return res.data.data
    } catch (err) { /* best-effort */ }
  },

  async deleteInterview(interviewId) {
    try {
      await api.delete(`/interviews/${interviewId}`)
    } catch (err) { wrap(err) }
  },

  async clearAISession(interviewId) {
    try {
      await api.delete(`/ai/session/${interviewId}`)
    } catch (err) { /* best-effort */ }
  },

  async getStats() {
    try {
      const res = await api.get('/interviews/stats/summary')
      return res.data.data
    } catch (err) { return null }
  },
}

export default interviewService
