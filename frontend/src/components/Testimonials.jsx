const TESTIMONIALS = [
  {
    init: 'J',
    name: 'John Doe',
    role: 'Software Engineer',
    color: '#e8566a',
    rating: 5,
    text: 'IntervuAI helped me prepare for FAANG-style interviews. The feedback was specific, practical, and made my technical answers much clearer.',
  },
  {
    init: 'M',
    name: 'Michael Chen',
    role: 'Product Manager',
    color: '#3ecfbf',
    rating: 5,
    text: 'The coaching felt personal. After a few weeks of practice, I went from nervous and scattered to confident and structured.',
  },
  {
    init: 'E',
    name: 'Emily Parker',
    role: 'Marketing Director',
    color: '#f59e0b',
    rating: 4.8,
    text: 'Best investment in my career prep. It found my weak points quickly and helped me turn them into stronger interview stories.',
  },
]

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

export default function Testimonials() {
  return (
    <section className="testi-section">
      <div className="testi-inner">
        <div className="testi-header">
          <div className="testi-proof-pill">4.9/5 average rating from 50K+ candidates</div>
          <h2 className="section-title">Loved by Job Seekers</h2>
          <p className="section-sub">Realistic practice, clearer answers, stronger interview confidence</p>
        </div>
        <div className="testi-cards">
          {TESTIMONIALS.map(t => (
            <div className="testi-card" key={t.name}>
              <div className="testi-card-top">
                <div className="testi-avatar" style={{ background: t.color }}>{t.init}</div>
                <div>
                  <div className="testi-name">{t.name}</div>
                  <div className="testi-role">{t.role}</div>
                </div>
              </div>
              <Stars rating={t.rating} />
              <p className="testi-text">"{t.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
