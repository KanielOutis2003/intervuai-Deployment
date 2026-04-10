import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSubscription } from '../context/SubscriptionContext'
import interviewService from '../services/interviewService'
import userService from '../services/userService'
import UpgradeModal from '../components/UpgradeModal'
import AppTour from '../components/AppTour'

const LogoIcon = () => (
  <div className="nav-logo-icon">
    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
  </div>
)

// Fallback list used only when the admin has not added any job roles to the DB yet
const FALLBACK_ROLES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Mobile Developer', 'Data Scientist', 'Data Analyst', 'Machine Learning Engineer',
  'DevOps Engineer', 'Cloud Architect', 'Cybersecurity Analyst', 'QA Engineer',
  'Product Manager', 'UX/UI Designer', 'Scrum Master',
  'Registered Nurse', 'Doctor / Physician', 'Medical Assistant', 'Pharmacist',
  'Customer Service Representative', 'Call Center Agent', 'Technical Support Specialist',
  'Team Leader (BPO)', 'Account Manager',
  'Financial Analyst', 'Accountant', 'Auditor', 'Compliance Officer',
  'Business Analyst', 'Project Manager', 'Operations Manager',
  'Sales Executive', 'Marketing Manager', 'Digital Marketing Specialist',
  'HR Manager', 'Recruitment Specialist', 'Administrative Assistant',
  'Teacher', 'Graphic Designer', 'Content Writer', 'Mechanical Engineer', 'Civil Engineer',
]

const INTERVIEW_TYPES = [
  { value: 'general',     label: 'General',     icon: '🎯', desc: 'Mixed questions — any interview' },
  { value: 'technical',   label: 'Technical',   icon: '💻', desc: 'Skills, coding & system design' },
  { value: 'behavioral',  label: 'Behavioral',  icon: '🧠', desc: 'STAR method — past experiences' },
  { value: 'situational', label: 'Situational', icon: '⚡', desc: 'Hypothetical scenario testing' },
]

// Returns the correct time-of-day greeting
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { isPremium, subscription, cancel: cancelSubscription } = useSubscription()
  const [dashboard, setDashboard] = useState(null)
  const [stats, setStats] = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [interviews, setInterviews] = useState([])
  const [deletingId, setDeletingId] = useState(null)
  const [showJobModal, setShowJobModal] = useState(false)
  const [jobRole, setJobRole] = useState('')
  const [interviewType, setInterviewType] = useState('chat')   // 'chat' or 'video'
  const [questionCategory, setQuestionCategory] = useState('general') // interview focus type
  const [creating, setCreating] = useState(false)
  const [fetchedRoles, setFetchedRoles] = useState([])   // from admin-managed job_roles table

  // Module search state
  const [moduleSearch, setModuleSearch] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchContainerRef = useRef(null)

  const modules = [
    { name: 'Dashboard', path: '/dashboard', icon: '🏠' },
    { name: 'Analytics', path: '/analytics', icon: '📊' },
    { name: 'Resource Hub', path: '/resources', icon: '📚' },
    { name: 'Chat Interview', path: '/interview/chat', icon: '💬' },
    { name: 'Video Interview', path: '/interview/video', icon: '🎥' },
    { name: 'Admin Panel', path: '/admin', icon: '🛡️', adminOnly: true },
  ]

  const filteredModules = modules.filter(m => 
    (!m.adminOnly || user?.role === 'admin') &&
    m.name.toLowerCase().includes(moduleSearch.toLowerCase())
  )

  // Searchable dropdown state
  const [roleSearch, setRoleSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)

  // User dropdown and settings state
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsTab, setSettingsTab] = useState('profile')
  const [preferences, setPreferences] = useState({
    highContrast: false,
    largeFont: false,
    reducedMotion: false,
    emailNotifications: true,
  })
  const userDropdownRef = useRef(null)

  useEffect(() => {
    interviewService.getDashboard().then(setDashboard).catch(() => {})
    interviewService.getInterviews().then(d => setInterviews(d?.interviews || [])).catch(() => {})
    interviewService.getStats().then(setStats).catch(() => {})
    userService.getPreferences().then(p => {
      if (p) {
        setPreferences(prev => ({ ...prev, ...p }))
        if (!p.hasSeenTour) setShowTour(true)
      } else {
        setShowTour(true)
      }
    }).catch(() => {})
    // Load admin-managed job roles (falls back to FALLBACK_ROLES if table is empty)
    interviewService.getJobRoles().then(roles => {
      if (roles && roles.length > 0) {
        // Deduplicate by title to prevent React key warnings
        const seen = new Set()
        const unique = roles.map(r => r.title).filter(t => { if (seen.has(t)) return false; seen.add(t); return true })
        setFetchedRoles(unique)
      }
    }).catch(() => {})
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false)
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleUpdatePreference = async (key, val) => {
    const newPrefs = { ...preferences, [key]: val }
    setPreferences(newPrefs)
    try {
      await userService.updatePreferences(newPrefs)
    } catch (err) {
      console.error('Failed to update preferences', err)
    }
  }

  const handleStartInterview = async () => {
    if (!jobRole.trim()) return
    setCreating(true)
    try {
      const interview = await interviewService.createInterview(jobRole, questionCategory)
      const path = interviewType === 'video'
        ? `/interview/video/${interview.id}?type=${questionCategory}`
        : `/interview/chat/${interview.id}?type=${questionCategory}`
      navigate(path)
    } catch (err) {
      const status = err.response?.status || err.status
      if (status === 403) {
        closeModal()
        setShowUpgradeModal(true)
      } else {
        alert(err.response?.data?.error || err.message || 'Failed to create interview. Please try again.')
      }
    } finally {
      setCreating(false)
    }
  }

  const openModal = (type, presetRole = '') => {
    setInterviewType(type)
    setJobRole(presetRole)
    setRoleSearch(presetRole)
    setDropdownOpen(false)
    setQuestionCategory('general')
    setShowJobModal(true)
  }

  const closeModal = () => {
    setShowJobModal(false)
    setJobRole('')
    setRoleSearch('')
    setDropdownOpen(false)
    setQuestionCategory('general')
  }

  const selectRole = (role) => {
    setJobRole(role)
    setRoleSearch(role)
    setDropdownOpen(false)
  }

  // Use admin-managed roles when available, fall back to hardcoded list
  const ACTIVE_ROLES = fetchedRoles.length > 0 ? fetchedRoles : FALLBACK_ROLES
  const filteredRoles = roleSearch.trim()
    ? ACTIVE_ROLES.filter(r => r.toLowerCase().includes(roleSearch.toLowerCase()))
    : ACTIVE_ROLES

  // Admins go directly to admin panel — they should not see the user dashboard
  if (user?.role === 'admin') return <Navigate to="/admin" replace />

  const handleDeleteInterview = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this interview session? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await interviewService.deleteInterview(id)
      setInterviews(prev => prev.filter(iv => iv.id !== id))
      // Refresh dashboard KPIs
      interviewService.getDashboard().then(setDashboard).catch(() => {})
    } catch {
      alert('Failed to delete. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const initials = user?.email ? user.email[0].toUpperCase() : 'U'
  const fullName = user?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const firstName = fullName.split(' ')[0]

  // Extended profile fields state (loaded once settings modal opens)
  const [profileExt, setProfileExt] = useState({ targetIndustry: '', experienceLevel: '', resumeUrl: '' })
  const [profileExtSaving, setProfileExtSaving] = useState(false)
  const [profileExtSaved, setProfileExtSaved] = useState(false)

  const loadProfileExt = () => {
    userService.getProfile().then(p => {
      if (p) setProfileExt({
        targetIndustry:  p.targetIndustry  || '',
        experienceLevel: p.experienceLevel || '',
        resumeUrl:       p.resumeUrl       || '',
      })
    }).catch(() => {})
  }

  const saveProfileExt = async () => {
    setProfileExtSaving(true)
    setProfileExtSaved(false)
    try {
      await userService.updateProfile({
        targetIndustry:  profileExt.targetIndustry  || null,
        experienceLevel: profileExt.experienceLevel || null,
        resumeUrl:       profileExt.resumeUrl       || null,
      })
      setProfileExtSaved(true)
      setTimeout(() => setProfileExtSaved(false), 2500)
    } catch { /* ignore */ }
    finally { setProfileExtSaving(false) }
  }

  return (
    <div className={`${preferences.highContrast ? 'high-contrast' : ''} ${preferences.largeFont ? 'large-font' : ''} ${preferences.reducedMotion ? 'reduced-motion' : ''}`}>
      {/* Nav */}
      <nav className="dash-nav">
        <Link to="/" className="nav-logo">
          <LogoIcon />
          <span className="nav-logo-text">IntervuAI</span>
        </Link>

        {/* Global Search Bar */}
        <div style={{ flex: 1, maxWidth: 400, margin: '0 32px', position: 'relative' }} ref={searchContainerRef}>
          <div className="search-bar" style={{ maxWidth: '100%', margin: 0 }}>
            <span className="search-icon">🔍</span>
            <input
              placeholder="Search modules (Dashboard, Analytics, Resources...)"
              value={moduleSearch}
              onChange={e => {
                setModuleSearch(e.target.value)
                setShowSearchDropdown(true)
              }}
              onFocus={() => setShowSearchDropdown(true)}
            />
          </div>
          {showSearchDropdown && moduleSearch.trim() && (
            <div className="user-dropdown" style={{ width: '100%', top: 'calc(100% + 8px)', left: 0 }}>
              {filteredModules.length > 0 ? (
                filteredModules.map(m => (
                  <button key={m.path} className="user-dropdown-item" onClick={() => { navigate(m.path); setShowSearchDropdown(false); setModuleSearch(''); }}>
                    <span>{m.icon}</span> {m.name}
                  </button>
                ))
              ) : (
                <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>No modules found</div>
              )}
            </div>
          )}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <Link to="/analytics" className="btn btn-ghost btn-sm">Analytics</Link>
          <Link to="/resources" className="btn btn-ghost btn-sm">Resources</Link>
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>

          <div className="dash-user-wrap" ref={userDropdownRef}>
            <div className="dash-user" onClick={() => setUserDropdownOpen(!userDropdownOpen)}>
              <div className="dash-avatar">{initials}</div>
              <span className="dash-username">{firstName}</span>
            </div>

            {userDropdownOpen && (
              <div className="user-dropdown">
                {user?.role === 'admin' && (
                  <button className="user-dropdown-item" onClick={() => { navigate('/admin'); setUserDropdownOpen(false); }}>
                    <span>🛡️</span> Admin Panel
                  </button>
                )}
                <button className="user-dropdown-item" onClick={() => { setShowSettingsModal(true); setUserDropdownOpen(false); loadProfileExt(); }}>
                  <span>⚙️</span> Settings
                </button>
                <button className="user-dropdown-item logout" onClick={handleLogout}>
                  <span>👋</span> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="dash-body">
        {/* Welcome */}
        <div className="dash-welcome">
          <h2>{getGreeting()}, {firstName}! 👋</h2>
          <p>
            {!dashboard || dashboard.completedInterviews === 0
              ? "Ready to start? Complete your first interview to unlock analytics and score tracking."
              : (dashboard.avgScore ?? 0) > 75
                ? `You're performing great with an avg score of ${Math.round(dashboard.avgScore)}! Keep pushing.`
                : `You've completed ${dashboard.completedInterviews ?? 0} interview${(dashboard.completedInterviews ?? 0) !== 1 ? 's' : ''}. Keep practicing to improve!`}
          </p>
        </div>


        {/* Upgrade Banner for Free Users */}
        {!isPremium && stats && stats.monthlyLimit != null && (
          <div className="upgrade-banner">
            <div>
              <div style={{fontFamily:'var(--font-head)',fontSize:14,fontWeight:700,marginBottom:2}}>
                {stats.monthlyInterviewCount >= stats.monthlyLimit
                  ? 'Monthly limit reached!'
                  : stats.monthlyInterviewCount >= stats.monthlyLimit - 1
                    ? 'Almost at your limit!'
                    : `${stats.monthlyInterviewCount}/${stats.monthlyLimit} interviews used this month`}
              </div>
              <div style={{fontSize:12,color:'var(--text-muted)'}}>
                {stats.monthlyInterviewCount >= stats.monthlyLimit
                  ? 'Upgrade to Premium for unlimited interviews.'
                  : 'Free plan includes 5 interviews per month.'}
              </div>
            </div>
            <button className="btn btn-coral btn-sm" onClick={() => setShowUpgradeModal(true)}>Upgrade</button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon coral">🎯</div>
            <div className="kpi-val">{dashboard?.totalInterviews ?? 0}</div>
            <div className="kpi-label">Total Interviews</div>
            <div className="kpi-trend">
              {isPremium ? 'Unlimited' : stats ? `${stats.monthlyInterviewCount ?? 0}/${stats.monthlyLimit ?? 5} this month` : ''}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon teal">📊</div>
            <div className="kpi-val">{dashboard?.avgScore ? Math.round(dashboard.avgScore) : 0}</div>
            <div className="kpi-label">Avg Score</div>
            <div className="kpi-trend">↑ Great progress</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon yellow">⏱️</div>
            <div className="kpi-val">{dashboard?.completedInterviews ?? 0}</div>
            <div className="kpi-label">Completed</div>
            <div className="kpi-trend">Sessions done</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon purple">🏆</div>
            <div className="kpi-val">{dashboard?.bestScore ? Math.round(dashboard.bestScore) : 0}</div>
            <div className="kpi-label">Best Score</div>
            <div className="kpi-trend">Personal best</div>
          </div>
        </div>

        {/* Quick Actions + Skills */}
        <div className="mid-grid">
          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="qa-grid">
              <div className="qa-tile coral" onClick={() => openModal('chat')}>
                <div className="qa-tile-icon">💬</div>
                <h4>Chat Interview</h4>
                <p>Practice with text-based AI</p>
              </div>
              <div className="qa-tile purple" style={!isPremium ? {opacity:0.7} : {}} onClick={() => isPremium ? openModal('video') : setShowUpgradeModal(true)}>
                <div className="qa-tile-icon">🎥</div>
                <h4>Video Interview</h4>
                <p>{isPremium ? 'Full video mock session' : 'Premium feature'}</p>
                {!isPremium && <span style={{fontSize:10,fontWeight:700,color:'var(--coral)',marginTop:4,display:'block'}}>UPGRADE</span>}
              </div>
              <div className="qa-tile teal" onClick={() => navigate('/analytics')}>
                <div className="qa-tile-icon">📈</div>
                <h4>View Analytics</h4>
                <p>Track your progress</p>
              </div>
              <div className="qa-tile yellow" onClick={() => navigate('/resources')}>
                <div className="qa-tile-icon">📚</div>
                <h4>Resources</h4>
                <p>Tips and guides</p>
              </div>
            </div>
          </div>

          <div className="skills-panel">
            <h3>Skill Breakdown</h3>
            {(dashboard?.completedInterviews ?? 0) > 0 ? (
              <>
                {[
                  { name: 'Answer Quality', pct: dashboard?.avgVerbal ?? 0, cls: 'prog-coral', tip: 'Based on grammar & relevance scores' },
                  { name: 'Non-Verbal', pct: dashboard?.avgNonVerbal ?? 0, cls: 'prog-teal', tip: 'Based on camera behavioral analysis' },
                  { name: 'Overall Score', pct: dashboard?.avgScore ?? 0, cls: 'prog-purple', tip: 'Combined average across all sessions' },
                ].map(s => (
                  <div className="skill-row" key={s.name} title={s.tip}>
                    <div className="skill-row-top">
                      <span className="skill-name">{s.name}</span>
                      <span className="skill-pct">
                        {s.pct > 0 ? `${Math.round(s.pct)}%` : '—'}
                      </span>
                    </div>
                    <div className="prog-wrap">
                      <div className={`prog-bar ${s.cls}`} style={{width:`${Math.min(s.pct,100)}%`}}></div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{textAlign:'center',padding:'24px 0',color:'var(--text-muted)',fontSize:13}}>
                <div style={{fontSize:28,marginBottom:8}}>📊</div>
                Complete your first interview to see skill scores here.
              </div>
            )}
            <Link to="/analytics" className="view-analytics">View detailed analytics →</Link>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="recent-section">
          <div className="recent-header">
            <h3>Recent Sessions</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => openModal('chat')}>+ New Interview</button>
          </div>
          {interviews.slice(0, 8).map((iv) => (
            <div
              className="session-item"
              key={iv.id}
              onClick={() => navigate(
                iv.status === 'completed'
                  ? `/interview/${iv.id}/report`
                  : `/interview/chat/${iv.id}`
              )}
              style={{cursor:'pointer', position:'relative'}}
            >
              <div className="session-left">
                <div className="session-icon">
                  {iv.status === 'completed' ? '✅' : iv.status === 'in_progress' ? '⏳' : '💼'}
                </div>
                <div>
                  <div className="session-name">{iv.job_role || 'Interview'}</div>
                  <div className="session-meta">
                    {new Date(iv.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                    {' · '}
                    <span style={{
                      color: iv.status === 'completed' ? 'var(--teal)' : iv.status === 'in_progress' ? 'var(--yellow)' : 'var(--text-muted)',
                      fontWeight: 600
                    }}>
                      {iv.status === 'completed' ? 'Completed · View Report →' : iv.status === 'in_progress' ? 'In Progress · Resume →' : iv.status}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div className="session-score">
                  {iv.overall_score ? Math.round(iv.overall_score) : '—'}
                  <span>/100</span>
                </div>
                <button
                  title="Delete this session"
                  onClick={e => handleDeleteInterview(e, iv.id)}
                  disabled={deletingId === iv.id}
                  style={{
                    background:'none', border:'none', cursor:'pointer',
                    color:'var(--text-muted)', fontSize:14, padding:'4px 6px',
                    borderRadius:6, lineHeight:1,
                    opacity: deletingId === iv.id ? 0.4 : 0.6,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => { if (deletingId !== iv.id) e.currentTarget.style.opacity = 0.6 }}
                >
                  {deletingId === iv.id ? '…' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
          {interviews.length === 0 && (
            <div style={{textAlign:'center',padding:'32px 0',color:'var(--text-muted)'}}>
              <div style={{fontSize:32,marginBottom:10}}>🎯</div>
              <div style={{fontWeight:600,marginBottom:6}}>No interviews yet</div>
              <div style={{fontSize:13}}>Start your first practice session to track your progress.</div>
              <button className="btn btn-coral btn-sm" style={{marginTop:16}} onClick={() => openModal('chat')}>
                Start First Interview →
              </button>
            </div>
          )}
        </div>

        {/* Practice Categories */}
        <h3 style={{fontFamily:'var(--font-head)',fontSize:16,fontWeight:700,marginBottom:16}}>Practice by Category</h3>
        <div className="cat-grid">
          {[
            {cls:'hr',    icon:'👥', title:'HR Interview',  desc:'Behavioral & culture questions', role:'HR Manager'},
            {cls:'tech',  icon:'💻', title:'Technical',     desc:'Coding & system design',        role:'Software Engineer'},
            {cls:'behav', icon:'🧠', title:'Behavioral',    desc:'STAR method practice',           role:'Team Lead'},
            {cls:'stress',icon:'⚡', title:'Stress Test',   desc:'Pressure interview practice',   role:'Senior Manager'},
          ].map(c => (
            <div className={`cat-card ${c.cls}`} key={c.cls}
              style={{cursor:'pointer'}}
              onClick={() => openModal('chat', c.role)}>
              <div style={{fontSize:24,marginBottom:8}}>{c.icon}</div>
              <h4>{c.title}</h4>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Job Role Modal */}
      {showJobModal && (
        <div
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{background:'var(--card)',borderRadius:18,padding:36,width:460,boxShadow:'0 8px 40px rgba(0,0,0,0.2)',maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
            <h3 style={{fontFamily:'var(--font-head)',fontSize:22,fontWeight:700,marginBottom:6}}>
              {interviewType === 'video' ? '🎥 Start Video Interview' : '💬 Start Chat Interview'}
            </h3>
            <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>
              Search or select the job role you want to practice for.
            </p>

            {/* Searchable dropdown */}
            <div ref={dropdownRef} style={{position:'relative',marginBottom:16}}>
              <div style={{position:'relative'}}>
                <input
                  ref={searchRef}
                  className="form-input"
                  placeholder="Search job roles… (e.g. Software Engineer)"
                  value={roleSearch}
                  autoFocus
                  onChange={e => {
                    setRoleSearch(e.target.value)
                    setJobRole(e.target.value)   // allow custom role via typing
                    setDropdownOpen(true)
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (filteredRoles.length > 0 && dropdownOpen) selectRole(filteredRoles[0])
                      else handleStartInterview()
                    }
                    if (e.key === 'Escape') setDropdownOpen(false)
                  }}
                  style={{paddingRight:36}}
                />
                <span
                  onClick={() => { setDropdownOpen(o => !o); searchRef.current?.focus() }}
                  style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:12,color:'var(--text-muted)',userSelect:'none'}}
                >
                  {dropdownOpen ? '▲' : '▼'}
                </span>
              </div>

              {dropdownOpen && (
                <div style={{
                  position:'absolute',top:'calc(100% + 4px)',left:0,right:0,
                  background:'var(--card)',border:'1.5px solid #e5e7eb',borderRadius:10,
                  boxShadow:'0 4px 20px rgba(0,0,0,0.12)',zIndex:10,
                  maxHeight:220,overflowY:'auto',
                }}>
                  {filteredRoles.length === 0 ? (
                    <div style={{padding:'10px 14px',fontSize:13,color:'var(--text-muted)',fontStyle:'italic'}}>
                      No match — press Enter to use "{roleSearch}"
                    </div>
                  ) : (
                    filteredRoles.map((role, i) => (
                      <div
                        key={`${role}-${i}`}
                        onMouseDown={() => selectRole(role)}
                        style={{
                          padding:'9px 14px',fontSize:13,cursor:'pointer',
                          background: role === jobRole ? 'var(--coral-light)' : 'transparent',
                          fontWeight: role === jobRole ? 600 : 400,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = role === jobRole ? 'var(--coral-light, #fff5f3)' : 'transparent'}
                      >
                        {role}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {jobRole && (
              <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>
                Selected: <strong style={{color:'var(--text-primary, #111)'}}>{jobRole}</strong>
              </div>
            )}

            {/* Interview Type Selector */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>
                Interview Focus
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {INTERVIEW_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setQuestionCategory(t.value)}
                    style={{
                      padding:'10px 12px', borderRadius:10, border: questionCategory === t.value
                        ? '2px solid var(--coral)' : '1.5px solid var(--border)',
                      background: questionCategory === t.value ? 'var(--coral-light, #fff5f3)' : '#fff',
                      cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all 0.15s',
                    }}
                  >
                    <div style={{fontSize:16,marginBottom:2}}>{t.icon}</div>
                    <div style={{fontSize:12,fontWeight:700,color: questionCategory === t.value ? 'var(--coral)' : 'var(--text-primary)'}}>{t.label}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.3,marginTop:1}}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:'flex',gap:12,marginTop:'auto'}}>
              <button
                className="btn btn-coral btn-full"
                onClick={handleStartInterview}
                disabled={creating || !jobRole.trim()}
              >
                {creating ? 'Starting...' : `Start ${INTERVIEW_TYPES.find(t=>t.value===questionCategory)?.label || 'General'} Interview →`}
              </button>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

      {/* First-time user tour */}
      {showTour && (
        <AppTour onComplete={() => {
          setShowTour(false)
          userService.updatePreferences({ hasSeenTour: true }).catch(() => {})
        }} />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}
          onClick={e => { if (e.target === e.currentTarget) setShowSettingsModal(false) }}
        >
          <div style={{background:'var(--card)',borderRadius:18,padding:36,width:560,boxShadow:'0 8px 40px rgba(0,0,0,0.2)',maxHeight:'85vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <h3 style={{fontFamily:'var(--font-head)',fontSize:24,fontWeight:700}}>Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--text-muted)'}}>✕</button>
            </div>

            <div className="settings-tabs">
              <div className={`settings-tab ${settingsTab === 'profile' ? 'active' : ''}`} onClick={() => setSettingsTab('profile')}>Profile</div>
              <div className={`settings-tab ${settingsTab === 'subscription' ? 'active' : ''}`} onClick={() => setSettingsTab('subscription')}>Subscription</div>
              <div className={`settings-tab ${settingsTab === 'accessibility' ? 'active' : ''}`} onClick={() => setSettingsTab('accessibility')}>Accessibility</div>
              <div className={`settings-tab ${settingsTab === 'system' ? 'active' : ''}`} onClick={() => setSettingsTab('system')}>System</div>
            </div>

            <div style={{overflowY:'auto',flex:1}}>
              {settingsTab === 'profile' && (
                <div>
                  <div className="settings-row">
                    <div className="settings-info">
                      <h4>Full Name</h4>
                      <p>{fullName}</p>
                    </div>
                    <button className="btn btn-ghost btn-sm">Edit</button>
                  </div>
                  <div className="settings-row">
                    <div className="settings-info">
                      <h4>Email Address</h4>
                      <p>{user?.email}</p>
                    </div>
                  </div>
                  <div className="settings-row">
                    <div className="settings-info">
                      <h4>Account Type</h4>
                      <p style={{textTransform:'capitalize'}}>{isPremium ? 'Premium' : user?.role || 'Free'}</p>
                    </div>
                    {!isPremium && (
                      <button className="btn btn-teal btn-sm" onClick={() => { setShowSettingsModal(false); setShowUpgradeModal(true) }}>Upgrade</button>
                    )}
                  </div>

                  {/* Extended profile fields */}
                  <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginTop:8,display:'flex',flexDirection:'column',gap:14}}>
                    <p style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5,color:'var(--text-muted)',margin:0}}>Career Profile</p>

                    {/* Target Industry */}
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5}}>Target Industry</label>
                      <input
                        type="text"
                        placeholder="e.g. Software Engineering, Healthcare, Finance…"
                        value={profileExt.targetIndustry}
                        onChange={e => setProfileExt(p => ({...p, targetIndustry: e.target.value}))}
                        style={{width:'100%',padding:'9px 12px',borderRadius:9,fontSize:13,
                          border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text)',
                          outline:'none',boxSizing:'border-box'}}
                      />
                    </div>

                    {/* Experience Level */}
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5}}>Experience Level</label>
                      <select
                        value={profileExt.experienceLevel}
                        onChange={e => setProfileExt(p => ({...p, experienceLevel: e.target.value}))}
                        style={{width:'100%',padding:'9px 12px',borderRadius:9,fontSize:13,
                          border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text)',
                          outline:'none',boxSizing:'border-box',cursor:'pointer'}}
                      >
                        <option value="">Select level…</option>
                        <option value="entry">Entry Level (0–2 yrs)</option>
                        <option value="mid">Mid Level (3–5 yrs)</option>
                        <option value="senior">Senior (6–10 yrs)</option>
                        <option value="executive">Executive (10+ yrs)</option>
                      </select>
                    </div>

                    {/* Resume URL */}
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5}}>Resume URL <span style={{fontWeight:400}}>(Google Drive, Notion, etc.)</span></label>
                      <input
                        type="url"
                        placeholder="https://…"
                        value={profileExt.resumeUrl}
                        onChange={e => setProfileExt(p => ({...p, resumeUrl: e.target.value}))}
                        style={{width:'100%',padding:'9px 12px',borderRadius:9,fontSize:13,
                          border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text)',
                          outline:'none',boxSizing:'border-box'}}
                      />
                    </div>

                    <button
                      className="btn btn-teal btn-sm"
                      onClick={saveProfileExt}
                      disabled={profileExtSaving}
                      style={{alignSelf:'flex-start',minWidth:100}}
                    >
                      {profileExtSaving ? 'Saving…' : profileExtSaved ? '✓ Saved' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'subscription' && (
                <div>
                  {/* Current plan */}
                  <div className="settings-row" style={{flexDirection:'column',alignItems:'flex-start',gap:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',width:'100%',alignItems:'center'}}>
                      <div className="settings-info">
                        <h4>Current Plan</h4>
                        <p style={{textTransform:'capitalize',fontWeight:600,color: isPremium ? 'var(--teal)' : 'inherit'}}>
                          {isPremium ? `Premium${subscription?.plan?.name ? ` — ${subscription.plan.name}` : ''}` : 'Free'}
                        </p>
                      </div>
                      {!isPremium && (
                        <button className="btn btn-teal btn-sm" onClick={() => { setShowSettingsModal(false); setShowUpgradeModal(true) }}>
                          Upgrade to Premium
                        </button>
                      )}
                    </div>

                    {isPremium && subscription?.plan && (
                      <div style={{
                        background:'rgba(0,200,140,0.06)',border:'1px solid rgba(0,200,140,0.18)',
                        borderRadius:10,padding:'12px 14px',width:'100%',boxSizing:'border-box',
                      }}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 20px',fontSize:13}}>
                          <div><span style={{color:'var(--text-muted)'}}>Plan</span><br/><strong>{subscription.plan.name}</strong></div>
                          <div><span style={{color:'var(--text-muted)'}}>Price</span><br/><strong>${subscription.plan.price}/mo</strong></div>
                          {subscription.startedAt && (
                            <div><span style={{color:'var(--text-muted)'}}>Started</span><br/><strong>{new Date(subscription.startedAt).toLocaleDateString()}</strong></div>
                          )}
                          {subscription.expiresAt && (
                            <div><span style={{color:'var(--text-muted)'}}>Renews</span><br/><strong>{new Date(subscription.expiresAt).toLocaleDateString()}</strong></div>
                          )}
                        </div>
                        {subscription.plan.features?.length > 0 && (
                          <div style={{marginTop:10}}>
                            <p style={{fontSize:12,color:'var(--text-muted)',margin:'0 0 6px'}}>Included features</p>
                            <ul style={{margin:0,paddingLeft:16,fontSize:13,lineHeight:1.6}}>
                              {subscription.plan.features.map((f,i) => <li key={i}>{f}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Upgrade CTA for free users */}
                  {!isPremium && (
                    <div className="settings-row" style={{flexDirection:'column',alignItems:'flex-start',gap:6}}>
                      <div className="settings-info">
                        <h4>Usage</h4>
                        <p>Free plan: 5 interviews/month. Upgrade for unlimited access, AI feedback, and full resource library.</p>
                      </div>
                    </div>
                  )}

                  {/* Cancel subscription */}
                  {isPremium && (
                    <div className="settings-row" style={{borderTop:'1px solid var(--border)',paddingTop:16,marginTop:8}}>
                      <div className="settings-info">
                        <h4 style={{color:'#e53e3e'}}>Cancel Subscription</h4>
                        <p>Your account will revert to Free tier immediately.</p>
                      </div>
                      <button
                        className="btn btn-sm"
                        style={{
                          background:'rgba(229,62,62,0.1)',border:'1px solid rgba(229,62,62,0.35)',
                          color:'#e53e3e',borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:600,whiteSpace:'nowrap',
                        }}
                        onClick={async () => {
                          if (!window.confirm('Cancel your Premium subscription? You will lose access to premium features immediately.')) return
                          try {
                            await cancelSubscription()
                            setShowSettingsModal(false)
                          } catch {
                            alert('Failed to cancel subscription. Please try again.')
                          }
                        }}
                      >
                        Cancel Plan
                      </button>
                    </div>
                  )}
                </div>
              )}

              {settingsTab === 'accessibility' && (
                <div>
                  <div className="settings-row">
                    <div className="settings-info">
                      <h4>Dark Mode</h4>
                      <p>Switch between light and dark color scheme</p>
                    </div>
                    <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                  </div>
                  <div className="settings-row">
                    <div className="settings-info">
                      <h4>High Contrast</h4>
                      <p>Increase contrast for better readability</p>
                    </div>
                    <input type="checkbox" checked={preferences.highContrast} onChange={e => handleUpdatePreference('highContrast', e.target.checked)} />
                  </div>
                  <div className="settings-row">
                    <div className="settings-info">
                      <h4>Large Font Size</h4>
                      <p>Scale up text throughout the application</p>
                    </div>
                    <input type="checkbox" checked={preferences.largeFont} onChange={e => handleUpdatePreference('largeFont', e.target.checked)} />
                  </div>
                  <div className="settings-row">
                    <div className="settings-info">
                      <h4>Reduced Motion</h4>
                      <p>Minimize animations and transitions</p>
                    </div>
                    <input type="checkbox" checked={preferences.reducedMotion} onChange={e => handleUpdatePreference('reducedMotion', e.target.checked)} />
                  </div>
                </div>
              )}

              {settingsTab === 'system' && (
                <div>
                  <div className="settings-row">
                    <div className="settings-info">
                      <h4>Email Notifications</h4>
                      <p>Receive weekly progress reports and interview tips</p>
                    </div>
                    <input type="checkbox" checked={preferences.emailNotifications} onChange={e => handleUpdatePreference('emailNotifications', e.target.checked)} />
                  </div>
                  <div className="settings-row">
                    <div className="settings-info">
                      <h4>Data Privacy</h4>
                      <p>Manage how your interview data is used for AI training</p>
                    </div>
                    <button className="btn btn-ghost btn-sm">Manage</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{marginTop:32,display:'flex',justifyContent:'flex-end'}}>
              <button className="btn btn-coral" onClick={() => setShowSettingsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
