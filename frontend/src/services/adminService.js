import api from './api'

const adminService = {
  // ── Dashboard ──────────────────────────────────────────────────────
  async getDashboard() {
    const res = await api.get('/admin/dashboard')
    return res.data.data
  },

  // ── System Config ──────────────────────────────────────────────────
  async getConfig() {
    const res = await api.get('/admin/config')
    return res.data.data
  },

  // ── Platform Analytics ─────────────────────────────────────────────
  async getPlatformAnalytics() {
    const res = await api.get('/admin/analytics')
    return res.data.data
  },
  async getPlatformTimeseries({ role, range, startDate, endDate } = {}) {
    const params = new URLSearchParams()
    if (role)      params.append('role', role)
    if (range)     params.append('range', range)
    if (startDate) params.append('startDate', startDate)
    if (endDate)   params.append('endDate', endDate)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await api.get(`/admin/analytics/timeseries${qs}`)
    return res.data.data
  },

  // ── Users ──────────────────────────────────────────────────────────
  async getUsers(limit = 100, offset = 0) {
    const res = await api.get(`/admin/users?limit=${limit}&offset=${offset}`)
    return res.data.data
  },

  async updateUserRole(userId, role) {
    const res = await api.patch(`/admin/users/${userId}/role`, { role })
    return res.data.data
  },

  async toggleBlockUser(userId, blocked) {
    const res = await api.patch(`/admin/users/${userId}/block`, { blocked })
    return res.data.data
  },

  async deleteUser(userId) {
    const res = await api.delete(`/admin/users/${userId}`)
    return res.data
  },

  async updateUserDetails(userId, data) {
    const res = await api.patch(`/admin/users/${userId}`, data)
    return res.data.data
  },

  // ── Interviews ─────────────────────────────────────────────────────
  async getInterviews({ status, jobRole, limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit, offset })
    if (status)  params.append('status',  status)
    if (jobRole) params.append('jobRole', jobRole)
    const res = await api.get(`/admin/interviews?${params}`)
    return res.data.data
  },

  async deleteInterview(interviewId) {
    const res = await api.delete(`/admin/interviews/${interviewId}`)
    return res.data
  },

  // ── Question Bank ──────────────────────────────────────────────────
  async getQuestions({ category, difficulty, jobRole, limit = 100, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit, offset })
    if (category)   params.append('category',   category)
    if (difficulty) params.append('difficulty', difficulty)
    if (jobRole)    params.append('jobRole',    jobRole)
    const res = await api.get(`/admin/questions?${params}`)
    return res.data.data
  },

  async addQuestion(data) {
    const res = await api.post('/admin/questions', data)
    return res.data.data
  },

  async updateQuestion(questionId, data) {
    const res = await api.patch(`/admin/questions/${questionId}`, data)
    return res.data.data
  },

  async deleteQuestion(questionId) {
    const res = await api.delete(`/admin/questions/${questionId}`)
    return res.data
  },

  // ── Job Roles ──────────────────────────────────────────────────────
  async getJobRoles(category) {
    const params = category ? `?category=${encodeURIComponent(category)}` : ''
    const res = await api.get(`/admin/job-roles${params}`)
    return res.data.data
  },

  async createJobRole(data) {
    const res = await api.post('/admin/job-roles', data)
    return res.data.data
  },

  async updateJobRole(roleId, data) {
    const res = await api.patch(`/admin/job-roles/${roleId}`, data)
    return res.data.data
  },

  async deleteJobRole(roleId) {
    const res = await api.delete(`/admin/job-roles/${roleId}`)
    return res.data
  },

  // ── Subscription Plans ─────────────────────────────────────────────
  async getPlans() {
    const res = await api.get('/admin/plans')
    return res.data.data
  },

  async createPlan(data) {
    const res = await api.post('/admin/plans', data)
    return res.data.data
  },

  async updatePlan(planId, data) {
    const res = await api.patch(`/admin/plans/${planId}`, data)
    return res.data.data
  },

  async deletePlan(planId) {
    const res = await api.delete(`/admin/plans/${planId}`)
    return res.data
  },

  // ── Audit Logs ─────────────────────────────────────────────────────
  async getAuditLogs({ userId, action, resourceType, limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit, offset })
    if (userId)       params.append('userId',       userId)
    if (action)       params.append('action',       action)
    if (resourceType) params.append('resourceType', resourceType)
    const res = await api.get(`/admin/audit-logs?${params}`)
    return res.data.data
  },
}

export default adminService
