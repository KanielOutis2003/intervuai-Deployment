import { useEffect, useMemo, useState } from 'react'
import testimonialService from '../services/testimonialService'

const SAMPLE_TESTIMONIALS = [
  {
    id: 'sample-katherine-aplacador',
    displayName: 'Katherine Aplacador',
    roleTitle: 'Premium Candidate',
    rating: 5,
    quote: 'IntervuAI Premium helped me organize my answers and sound more confident during high-pressure interview practice.',
    featured: true,
    sample: true,
  },
  {
    id: 'sample-emman-rivera',
    displayName: 'Emman Rivera',
    roleTitle: 'Premium Candidate',
    rating: 5,
    quote: 'The AI feedback made every session feel purposeful. I could see exactly where my answers needed more structure.',
    featured: true,
    sample: true,
  },
  {
    id: 'sample-ed-lester-pillejera',
    displayName: 'Ed Lester Pillejera',
    roleTitle: 'Premium Candidate',
    rating: 5,
    quote: 'The post-interview report helped me turn scattered answers into stronger stories I could actually use.',
    featured: false,
    sample: true,
  },
]

const AVATAR_COLORS = ['#e8566a', '#3ecfbf', '#f59e0b', '#8b5cf6']

function Stars({ rating }) {
  return (
    <div className="testi-stars" aria-label={`${rating} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map(i => (
        <span key={i} className={i < Math.round(rating) ? 'filled' : ''}>&#9733;</span>
      ))}
      <strong>{rating}/5</strong>
    </div>
  )
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'P'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'P'
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    testimonialService.listPublic()
      .then(data => {
        if (active) setTestimonials(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (active) setTestimonials([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const cards = useMemo(() => testimonials.length > 0 ? testimonials : SAMPLE_TESTIMONIALS, [testimonials])
  const usingSamples = testimonials.length === 0

  return (
    <section className="testi-section">
      <div className="testi-inner">
        <div className="testi-header">
          <div className="testi-proof-pill">Feedback from candidates using IntervuAI Premium</div>
          <h2 className="section-title">Loved by Job Seekers</h2>
          <p className="section-sub">Realistic practice, clearer answers, stronger interview confidence</p>
        </div>
        <div className="testi-cards">
          {cards.map((t, idx) => (
            <div className="testi-card" key={t.id || `${t.displayName}-${idx}`}>
              <div className="testi-card-top">
                <div className="testi-avatar" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                  {getInitials(t.displayName)}
                </div>
                <div>
                  <div className="testi-name">{t.displayName}</div>
                  <div className="testi-role">{t.roleTitle}</div>
                </div>
              </div>
              <Stars rating={Number(t.rating) || 5} />
              <p className="testi-text">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
