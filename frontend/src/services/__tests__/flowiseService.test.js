import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the shared api instance instead of bare axios
vi.mock('../api', () => ({
  default: { post: vi.fn() },
}))

import api from '../api'
import { sendToFlowise, startInterview } from '../flowiseService'

describe('flowiseService (Claude backend)', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('sendToFlowise', () => {
    it('parses JSON from Claude text response', async () => {
      const payload = {
        next_question: 'Tell me about yourself.',
        evaluation: null,
        interview_phase: 'opening',
        is_complete: false,
      }
      api.post.mockResolvedValue({ data: { data: { text: JSON.stringify(payload) } } })

      const result = await sendToFlowise({ userMessage: 'Hello', sessionId: 'sess-1' })

      expect(result.next_question).toBe('Tell me about yourself.')
      expect(result.interview_phase).toBe('opening')
    })

    it('strips markdown code fences before parsing', async () => {
      const payload = { next_question: 'Q?', evaluation: null, interview_phase: 'opening', is_complete: false }
      api.post.mockResolvedValue({
        data: { data: { text: '```json\n' + JSON.stringify(payload) + '\n```' } },
      })

      const result = await sendToFlowise({ userMessage: 'Hello', sessionId: 'sess-1' })

      expect(result.next_question).toBe('Q?')
    })

    it('falls back gracefully when Claude returns plain text', async () => {
      api.post.mockResolvedValue({ data: { data: { text: 'Plain text question' } } })

      const result = await sendToFlowise({ userMessage: 'Hello', sessionId: 'sess-1' })

      expect(result.next_question).toBe('Plain text question')
      expect(result.parse_error).toBe(true)
    })

    it('throws when the API request fails', async () => {
      api.post.mockRejectedValue(new Error('Network error'))
      await expect(
        sendToFlowise({ userMessage: 'Hi', sessionId: 'sess-1' })
      ).rejects.toThrow('Network error')
    })

    it('posts to /ai/predict with correct payload shape', async () => {
      api.post.mockResolvedValue({
        data: { data: { text: '{"next_question":"Q","evaluation":null,"interview_phase":"opening","is_complete":false}' } },
      })

      await sendToFlowise({ userMessage: 'Hello', sessionId: 'sess-42' })

      expect(api.post).toHaveBeenCalledWith('/ai/predict', {
        question: 'Hello',
        overrideConfig: { sessionId: 'sess-42' },
      })
    })
  })

  describe('startInterview', () => {
    it('sends START_INTERVIEW trigger with job role embedded in message', async () => {
      api.post.mockResolvedValue({
        data: { data: { text: '{"next_question":"Hello!","evaluation":null,"interview_phase":"opening","is_complete":false}' } },
      })

      await startInterview({ jobRole: 'Software Engineer', sessionId: 'sess-1' })

      const callPayload = api.post.mock.calls[0][1]
      expect(callPayload.question).toBe('START_INTERVIEW. Role: Software Engineer')
    })
  })
})
