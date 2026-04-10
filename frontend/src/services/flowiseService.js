import api from './api'

/**
 * Parse Groq's raw response text into a structured object.
 * Handles plain JSON, markdown-fenced JSON, and JSON embedded in prose.
 */
function parseGroqResponse(rawText) {
  if (!rawText) return { next_question: '', evaluation: null, interview_phase: 'unknown', is_complete: false }
  try {
    const cleaned = rawText.replace(/```json\s*|```/g, '').trim()

    // Try parsing the whole thing first (most common case)
    try { return JSON.parse(cleaned) } catch {}

    // Extract all top-level JSON objects by finding balanced braces
    const objects = []
    let depth = 0, start = -1
    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === '{') { if (depth === 0) start = i; depth++ }
      else if (cleaned[i] === '}') {
        depth--
        if (depth === 0 && start !== -1) {
          objects.push(cleaned.slice(start, i + 1))
          start = -1
        }
      }
    }

    // Try parsing from last to first (most recent AI response)
    for (let i = objects.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(objects[i])
        if (parsed.next_question) return parsed
      } catch {}
    }

    // Last resort: first { to last }
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
    }

    return JSON.parse(cleaned)
  } catch {
    return {
      next_question: rawText,
      evaluation: null,
      interview_phase: 'unknown',
      is_complete: false,
      parse_error: true,
    }
  }
}

/**
 * Send a message to the Flask AI endpoint and get evaluation + next question.
 * Uses the shared `api` instance so the JWT access token is automatically attached.
 * Falls back gracefully if the response is not valid JSON.
 */
export async function sendToFlowise({ userMessage, sessionId }) {
  const payload = { question: userMessage, overrideConfig: { sessionId } }
  const response = await api.post('/ai/predict', payload)

  // Flask returns { success: true, data: { text: "..." } }
  const rawText = response.data?.data?.text ?? response.data?.text ?? JSON.stringify(response.data)
  return parseGroqResponse(rawText)
}

/**
 * Stream a message to the Flask SSE endpoint.
 * Tokens arrive as they are generated — giving near-instant first-word latency.
 *
 * @param {object}   options
 * @param {string}   options.userMessage  The user's answer / message text
 * @param {string}   options.sessionId    Interview/session UUID
 * @param {function} options.onChunk      Called with accumulated raw text on each token chunk
 * @param {function} options.onDone       Called with the parsed structured response when complete
 * @param {function} [options.onError]    Called with error message string on failure
 */
export async function streamToFlowise({ userMessage, sessionId, onChunk, onDone, onError }) {
  // Read auth token from storage (mirrors api.js interceptor logic)
  const token =
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token') ||
    ''

  const baseUrl = import.meta.env.VITE_API_URL || '/api'

  let response
  try {
    response = await fetch(`${baseUrl}/ai/predict/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ question: userMessage, overrideConfig: { sessionId } }),
    })
  } catch (networkErr) {
    onError?.(networkErr.message || 'Network error')
    return
  }

  // Attempt a one-time silent refresh on 401, then retry the stream
  if (response.status === 401) {
    try {
      const storedRefresh =
        localStorage.getItem('refresh_token') ||
        sessionStorage.getItem('refresh_token') ||
        ''
      if (storedRefresh) {
        const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: storedRefresh }),
        })
        const refreshJson = await refreshRes.json().catch(() => ({}))
        const newAccess =
          refreshJson?.data?.session?.access_token ||
          refreshJson?.access_token ||
          null
        const newRefresh =
          refreshJson?.data?.session?.refresh_token ||
          refreshJson?.refresh_token ||
          null
        if (newAccess) {
          if (localStorage.getItem('refresh_token')) {
            localStorage.setItem('access_token', newAccess)
            if (newRefresh) localStorage.setItem('refresh_token', newRefresh)
          } else {
            sessionStorage.setItem('access_token', newAccess)
            if (newRefresh) sessionStorage.setItem('refresh_token', newRefresh)
          }
          response = await fetch(`${baseUrl}/ai/predict/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${newAccess}`,
            },
            body: JSON.stringify({ question: userMessage, overrideConfig: { sessionId } }),
          })
        }
      }
    } catch (_) {}
  }

  if (!response.ok) {
    onError?.(`Server error: ${response.status}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError?.('Streaming not supported in this browser. Falling back.')
    return
  }

  const decoder = new TextDecoder()
  let accumulated = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE messages are separated by '\n\n'
      const lines = buffer.split('\n\n')
      buffer = lines.pop() // keep incomplete last chunk in buffer

      for (const block of lines) {
        for (const line of block.split('\n')) {
          if (!line.startsWith('data:')) continue
          const raw = line.slice(5).trim()
          if (!raw) continue

          let payload
          try { payload = JSON.parse(raw) } catch { continue }

          if (payload.error) {
            onError?.(payload.error)
            return
          }
          if (payload.chunk) {
            accumulated += payload.chunk
            onChunk?.(accumulated)
          }
          if (payload.done) {
            onDone?.(parseGroqResponse(payload.full_text))
            return
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Start a new interview session — sends START_INTERVIEW trigger with job role and type.
 * Uses the standard (non-streaming) endpoint since the first question is short.
 * The backend uses Role + Type to build an enhanced system prompt with question bank seeds.
 */
export async function startInterview({ jobRole, sessionId, interviewType = 'general' }) {
  return sendToFlowise({
    userMessage: `START_INTERVIEW. Role: ${jobRole}. Type: ${interviewType}`,
    sessionId,
  })
}
