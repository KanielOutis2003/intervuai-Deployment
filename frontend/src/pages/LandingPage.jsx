import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import DemoModal from '../components/DemoModal'

export default function LandingPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { clearSession } = useAuth()
  const [showDemo, setShowDemo] = useState(false)

  // Clear any active session when the landing page mounts so that the browser
  // forward button cannot bypass authentication back to a protected route.
  useEffect(() => {
    clearSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Navbar */}
      <nav className="nav">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
          </div>
          <span className="nav-logo-text">IntervuAI</span>
        </Link>
        <div className="nav-actions">
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>Login</button>
          <button className="btn btn-coral btn-sm" onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-label">⚡ AI-Powered Interview Coaching</div>
          <h1>Master Your Next Interview with AI</h1>
          <p className="hero-desc">Practice with our AI interview coach, get instant feedback, and land your dream job. Personalized coaching that adapts to your career goals.</p>
          <div className="hero-actions">
            <button className="btn btn-coral btn-lg" onClick={() => navigate('/register')}>Start Free Trial</button>
            <button className="btn btn-outline btn-lg" onClick={() => setShowDemo(true)}>{'\u25B6'} Watch Demo</button>
          </div>
          <div className="hero-stats">
            <div><div className="hero-stat-val">50K+</div><div className="hero-stat-label">Interview Candidates</div></div>
            <div><div className="hero-stat-val">95%</div><div className="hero-stat-label">Success Rate</div></div>
            <div><div className="hero-stat-val">4.9/5</div><div className="hero-stat-label">User Rating</div></div>
          </div>
        </div>
        <div className="hero-img">
          <div className="hero-img-inner">
            <div style={{textAlign:'center',color:'#6a5a48'}}>
              <div style={{fontSize:100,lineHeight:1}}>🤝</div>
              <div style={{fontSize:14,fontWeight:600,marginTop:8}}>Interview Success</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="why-section">
        <div className="why-inner">
          <div className="why-header">
            <h2 className="section-title">Why Choose IntervuAI?</h2>
            <p className="section-sub">Everything you need to ace your next interview</p>
          </div>
          <div className="why-cards">
            <div className="why-card">
              <div className="why-icon coral">🎯</div>
              <h3>AI-Powered Feedback</h3>
              <p>Get real-time, personalized feedback on your answers, body language, and communication skills.</p>
            </div>
            <div className="why-card">
              <div className="why-icon teal">💼</div>
              <h3>Industry-Specific Questions</h3>
              <p>Practice with questions tailored to your industry, role, and experience level.</p>
            </div>
            <div className="why-card">
              <div className="why-icon yellow">📈</div>
              <h3>Track Your Progress</h3>
              <p>Monitor your improvement over time with detailed analytics and performance metrics.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <div className="how-inner">
          <div className="how-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-sub">Get interview-ready in three simple steps</p>
          </div>
          <div className="how-steps">
            <div className="how-step">
              <div className="how-num n1">1</div>
              <h3>Set Your Goal</h3>
              <p>Tell us about your target role, industry, and experience level.</p>
            </div>
            <div className="how-step">
              <div className="how-num n2">2</div>
              <h3>Practice with AI</h3>
              <p>Engage in realistic mock interviews with our AI coach.</p>
            </div>
            <div className="how-step">
              <div className="how-num n3">3</div>
              <h3>Get Feedback &amp; Improve</h3>
              <p>Receive detailed feedback and iterate until you're confident.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Way */}
      <section className="smart-section">
        <div className="smart-inner">
          <div className="smart-img">🧠</div>
          <div className="smart-content">
            <h2>The Smart Way to Prepare</h2>
            <ul className="smart-list">
              {[
                ['Practice Anytime, Anywhere', 'No scheduling needed. Practice on your own pace, 24/7.'],
                ['Personalized Learning Path', 'AI adapts to your strengths and weaknesses for targeted improvement.'],
                ['Build Confidence', 'Reduce anxiety through repeated practice in a safe environment.'],
                ['Cost-Effective', 'Fraction of the cost of traditional interview coaching.'],
              ].map(([title, desc]) => (
                <li key={title}>
                  <div className="smart-check">✓</div>
                  <div><h4>{title}</h4><p>{desc}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testi-section">
        <div className="testi-inner">
          <div className="testi-header">
            <h2 className="section-title">Loved by Job Seekers</h2>
            <p className="section-sub">Join thousands who landed their dream jobs</p>
          </div>
          <div className="testi-cards">
            {[
              {init:'J', name:'John Doe', role:'Software Engineer', color:'#e8566a', text:'"IntervuAI helped me prepare for FAANG interviews. The AI feedback was spot-on and helped me improve my technical communication skills."'},
              {init:'M', name:'Michael Chen', role:'Product Manager', color:'#3ecfbf', text:'"The personalized feedback is incredible. I went from nervous to confident in just five weeks. Got three job offers!"'},
              {init:'E', name:'Emily Parker', role:'Marketing Director', color:'#f59e0b', text:'"Best investment in my career. The platform identified my weak points and helped me turn them into strengths."'},
            ].map(t => (
              <div className="testi-card" key={t.name}>
                <div className="testi-avatar" style={{background:t.color}}>{t.init}</div>
                <div className="testi-name">{t.name}</div>
                <div className="testi-role">{t.role}</div>
                <p className="testi-text">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>Ready to Land Your Dream Job?</h2>
          <p>Start your free 7-day trial today. No credit card required.</p>
          <button className="btn btn-coral btn-lg" onClick={() => navigate('/register')}>Start Free Trial →</button>
        </div>
      </section>
      <footer className="footer">{'\u00A9'} 2025 IntervuAI. All rights reserved.</footer>

      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
    </div>
  )
}
