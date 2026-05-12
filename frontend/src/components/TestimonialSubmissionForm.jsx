import { useState } from 'react'
import { useSubscription } from '../context/SubscriptionContext'
import testimonialService from '../services/testimonialService'

const initialForm = {
  rating: 5,
  displayName: '',
  roleTitle: '',
  quote: '',
  consentPublicDisplay: false,
}

export default function TestimonialSubmissionForm() {
  const { isPremium, loading } = useSubscription()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  if (loading || !isPremium) return null

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.displayName.trim() || !form.roleTitle.trim() || !form.quote.trim()) {
      setError('Please complete your name, role, and testimonial.')
      return
    }
    if (!form.consentPublicDisplay) {
      setError('Public display consent is required before submitting a testimonial.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await testimonialService.submit({
        rating: form.rating,
        displayName: form.displayName.trim(),
        roleTitle: form.roleTitle.trim(),
        quote: form.quote.trim(),
        consentPublicDisplay: form.consentPublicDisplay,
      })
      setSubmitted(true)
      setForm(initialForm)
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to submit testimonial right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 18, marginTop: 8 }}>
      <div className="settings-info">
        <h4>Premium Testimonial</h4>
        <p>Share a short review for public display after admin approval.</p>
      </div>

      {submitted ? (
        <div className="success-msg" style={{ margin: 0 }}>
          Thank you! Your testimonial has been submitted for review.
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="form-label">Rating</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => update('rating', star)}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    border: '1px solid var(--border)',
                    background: star <= form.rating ? 'rgba(245,158,11,0.16)' : 'var(--sk-button-bg)',
                    color: star <= form.rating ? '#f59e0b' : 'var(--text-muted)',
                    boxShadow: star <= form.rating ? 'inset 1px 1px 3px rgba(0,0,0,0.12)' : 'var(--sk-button-shadow)',
                    cursor: 'pointer',
                    fontSize: 18,
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div className="form-label">Display Name</div>
              <input
                className="form-input"
                value={form.displayName}
                onChange={e => update('displayName', e.target.value)}
                maxLength={100}
                placeholder="Your public name"
              />
            </div>
            <div>
              <div className="form-label">Role / Title</div>
              <input
                className="form-input"
                value={form.roleTitle}
                onChange={e => update('roleTitle', e.target.value)}
                maxLength={120}
                placeholder="e.g. Product Manager"
              />
            </div>
          </div>

          <div>
            <div className="form-label">Quote</div>
            <textarea
              className="form-input"
              rows={4}
              value={form.quote}
              onChange={e => update('quote', e.target.value)}
              maxLength={700}
              placeholder="What changed after using IntervuAI Premium?"
              style={{ resize: 'vertical' }}
            />
          </div>

          <label className="form-check" style={{ alignItems: 'flex-start', lineHeight: 1.45 }}>
            <input
              type="checkbox"
              checked={form.consentPublicDisplay}
              onChange={e => update('consentPublicDisplay', e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>I consent to IntervuAI publicly displaying this testimonial with my display name, role, and rating.</span>
          </label>

          {error && <div className="error-msg" style={{ margin: 0 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-coral btn-sm" type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
