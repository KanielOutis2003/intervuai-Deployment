import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import api from '../api'
import interviewService from '../interviewService'

const MOCK_INTERVIEW = {
  id: 'iid-1',
  job_role: 'Software Engineer',
  status: 'pending',
}

describe('interviewService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('createInterview', () => {
    it('returns interview data on success', async () => {
      api.post.mockResolvedValue({ data: { data: MOCK_INTERVIEW } })
      const result = await interviewService.createInterview('Software Engineer')
      expect(result.id).toBe('iid-1')
    })

    it('throws structured error with message and status on API failure', async () => {
      const axiosErr = { response: { data: { error: 'Validation failed' }, status: 400 }, message: 'Request failed' }
      api.post.mockRejectedValue(axiosErr)

      await expect(interviewService.createInterview('Engineer')).rejects.toMatchObject({
        message: 'Validation failed',
        status: 400,
      })
    })
  })

  describe('getInterviews', () => {
    it('returns list of interviews', async () => {
      api.get.mockResolvedValue({ data: { data: [MOCK_INTERVIEW] } })
      const result = await interviewService.getInterviews()
      expect(result).toHaveLength(1)
    })

    it('throws structured error on network failure', async () => {
      api.get.mockRejectedValue({ message: 'Network Error', response: undefined })
      await expect(interviewService.getInterviews()).rejects.toMatchObject({
        message: 'Network Error',
      })
    })
  })

  describe('getQuestions', () => {
    it('returns empty array when no questions exist', async () => {
      api.get.mockResolvedValue({ data: { data: null } })
      const result = await interviewService.getQuestions('iid-1')
      expect(result).toEqual([])
    })
  })

  describe('endSession', () => {
    it('calls correct endpoint with session id', async () => {
      api.post.mockResolvedValue({ data: { data: { ended: true } } })
      await interviewService.endSession('session-uuid')
      expect(api.post).toHaveBeenCalledWith(
        '/sessions/session-uuid/end',
        { sessionId: 'session-uuid' }
      )
    })
  })
})
