import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useSubscription } from '../context/SubscriptionContext'
import analyticsService from '../services/analyticsService'
import UpgradeModal from '../components/UpgradeModal'

const LogoIcon = () => (
  <div className="nav-logo-icon">
    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
  </div>
)

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { isPremium } = useSubscription()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [period, setPeriod] = useState('all')
  const [performance, setPerformance] = useState(null)
  const [progress, setProgress] = useState(null)
  const [trends, setTrends] = useState(null)
  const [distribution, setDistribution] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      analyticsService.getPerformance(period),
      analyticsService.getProgress(),
      analyticsService.getTrends(),
      analyticsService.getScoreDistribution(),
      analyticsService.getTimeline(),
    ]).then(([perf, prog, tr, dist, tl]) => {
      setPerformance(perf)
      setProgress(prog)
      setTrends(tr)
      setDistribution(dist)
      setTimeline(tl)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [period])

  const scores = performance?.scoresOverTime || []
  const maxScore = Math.max(...scores.map(s => Math.max(s.overallScore || 0, s.verbalScore || 0, s.nonVerbalScore || 0)), 100)

  const distData = distribution?.distribution || {}
  const distMax = Math.max(...Object.values(distData), 1)

  const handleDownloadReport = () => {
    window.print()
  }

  return (
    <div>
      {/* Nav */}
      <nav className="analytics-nav">
        <Link to="/" className="nav-logo">
          <LogoIcon />
          <span className="nav-logo-text">IntervuAI</span>
        </Link>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link to="/dashboard" className="btn btn-ghost btn-sm">&larr; Dashboard</Link>
          <Link to="/resources" className="btn btn-ghost btn-sm">Resources</Link>
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
        </div>
      </nav>

      <div className="analytics-body">
        {/* Header */}
        <div className="analytics-header">
          <div>
            <h2>Performance Analytics</h2>
            <p>Track your interview improvement over time</p>
          </div>
          <div className="analytics-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => isPremium ? handleDownloadReport() : setShowUpgradeModal(true)}>
              <span>{isPremium ? '📥' : '🔒'}</span> Download Report
            </button>
            <select className="chart-select" value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button className="btn btn-coral btn-sm" onClick={() => navigate('/interview/chat')}>+ New Interview</button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="an-kpi-grid">
          <div className="an-kpi">
            <div className="an-kpi-label">Total Sessions</div>
            <div className="an-kpi-val coral">{performance?.totalCompleted ?? 0}</div>
            <div className="an-kpi-trend">Completed interviews</div>
          </div>
          <div className="an-kpi">
            <div className="an-kpi-label">Average Score</div>
            <div className="an-kpi-val teal">{Math.round(performance?.averageScore ?? 0)}</div>
            <div className="an-kpi-trend">Out of 100</div>
          </div>
          <div className="an-kpi">
            <div className="an-kpi-label">Best Score</div>
            <div className="an-kpi-val yellow">{Math.round(performance?.bestScore ?? 0)}</div>
            <div className="an-kpi-trend">Personal best</div>
          </div>
          <div className="an-kpi">
            <div className="an-kpi-label">Improvement</div>
            <div className="an-kpi-val purple">
              {(progress?.improvement ?? 0) > 0 ? '+' : ''}{Math.round(progress?.improvement ?? 0)}
            </div>
            <div className="an-kpi-trend" style={{color: (progress?.improvement ?? 0) > 0 ? 'var(--teal-dark)' : (progress?.improvement ?? 0) < 0 ? 'var(--coral)' : 'var(--text-muted)'}}>
              {(progress?.improvement ?? 0) > 0 ? '↑ Trending up' : (progress?.improvement ?? 0) < 0 ? '↓ Trending down' : progress?.trend === 'insufficient_data' ? 'Need more data' : 'Stable'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="an-tabs">
          {['overview', 'progress', 'skills', 'history'].map(tab => {
            const locked = !isPremium && (tab === 'progress' || tab === 'skills')
            return (
              <button key={tab} className={`an-tab ${activeTab === tab ? 'active' : ''}`}
                style={locked ? {opacity:0.6} : {}}
                onClick={() => locked ? setShowUpgradeModal(true) : setActiveTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {locked && ' \uD83D\uDD12'}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>Loading analytics...</div>
        ) : (
          <>
            {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <>
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>Score Over Time</h3>
                    <select className="chart-select" value={period} onChange={e => setPeriod(e.target.value)}>
                      <option value="all">All Time</option>
                      <option value="30d">30 Days</option>
                      <option value="7d">7 Days</option>
                    </select>
                  </div>
                  {scores.length > 0 ? (
                    <div className="line-chart">
                      <svg className="chart-svg" viewBox={`0 0 ${Math.max(scores.length * 80, 400)} 220`} preserveAspectRatio="none">
                        {[0,25,50,75,100].map(y => (
                          <g key={y}>
                            <line x1="32" y1={200 - (y/100)*180} x2="100%" y2={200 - (y/100)*180} stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4"/>
                            <text x="0" y={204 - (y/100)*180} fontSize="9" fill="var(--text-muted)">{y}</text>
                          </g>
                        ))}
                        {scores.length > 1 && (
                          <polyline points={scores.map((s, i) => `${i * 80 + 40},${200 - ((s.overallScore||0)/maxScore)*180}`).join(' ')} fill="none" stroke="var(--coral)" strokeWidth="2.5" strokeLinejoin="round"/>
                        )}
                        {scores.some(s => s.verbalScore) && scores.length > 1 && (
                          <polyline points={scores.map((s, i) => `${i * 80 + 40},${200 - ((s.verbalScore||0)/maxScore)*180}`).join(' ')} fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="5,3"/>
                        )}
                        {scores.some(s => s.nonVerbalScore) && scores.length > 1 && (
                          <polyline points={scores.map((s, i) => `${i * 80 + 40},${200 - ((s.nonVerbalScore||0)/maxScore)*180}`).join(' ')} fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="3,3"/>
                        )}
                        {scores.map((s, i) => (
                          <g key={i}>
                            <circle cx={i * 80 + 40} cy={200 - ((s.overallScore||0)/maxScore)*180} r="4" fill="var(--coral)" stroke="var(--card)" strokeWidth="2">
                              <title>{s.jobRole || 'Interview'}: Overall {Math.round(s.overallScore||0)}</title>
                            </circle>
                            {s.verbalScore > 0 && (
                              <circle cx={i * 80 + 40} cy={200 - ((s.verbalScore||0)/maxScore)*180} r="3" fill="var(--teal)" stroke="var(--card)" strokeWidth="1.5">
                                <title>Verbal: {Math.round(s.verbalScore)}</title>
                              </circle>
                            )}
                            <text x={i * 80 + 40} y="215" textAnchor="middle" fontSize="9" fill="var(--text-muted)">
                              {s.jobRole ? s.jobRole.split(' ')[0] : `#${i+1}`}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  ) : (
                    <div style={{height:220,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',gap:8}}>
                      <div style={{fontSize:32}}>📈</div>
                      <div style={{fontWeight:600}}>No data yet</div>
                      <div style={{fontSize:13}}>Complete at least one interview to see your score trend.</div>
                    </div>
                  )}
                  <div className="chart-legend">
                    <div className="legend-item"><div className="legend-dot" style={{background:'var(--coral)'}}></div>Overall Score</div>
                    <div className="legend-item"><div className="legend-dot" style={{background:'var(--teal)'}}></div>Verbal Score</div>
                    <div className="legend-item"><div className="legend-dot" style={{background:'var(--purple)'}}></div>Non-Verbal Score</div>
                  </div>
                </div>

                <div className="insights-card">
                  <h3>AI Insights</h3>
                  {performance?.totalCompleted > 0 ? (
                    <>
                      <div className={`insight-item ${(trends?.averageVerbal ?? 0) >= 60 ? 'green' : 'yellow'}`}>
                        <div className={`insight-title ${(trends?.averageVerbal ?? 0) >= 60 ? 'green' : 'yellow'}`}>
                          {(trends?.averageVerbal ?? 0) >= 60 ? '\u2713' : '\u26A0'} Verbal Skills
                        </div>
                        <div className="insight-text">
                          {(trends?.averageVerbal ?? 0) > 0
                            ? `Avg verbal score: ${Math.round(trends.averageVerbal)}%. ${trends.averageVerbal >= 75 ? 'Excellent \u2014 keep elaborating with examples.' : 'Focus on clear, structured answers using the STAR method.'}`
                            : 'Complete video interviews to track verbal scores.'}
                        </div>
                      </div>
                      <div className="insight-item purple">
                        <div className="insight-title purple">Best Role</div>
                        <div className="insight-text">
                          {Object.keys(trends?.rolePerformance || {}).length > 0
                            ? `You perform best as ${Object.entries(trends.rolePerformance).sort((a,b) => b[1]-a[1])[0]?.[0]} \u2014 consider specialising here.`
                            : 'Practice multiple roles to discover where you excel.'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{textAlign:'center',padding:'20px 0',color:'var(--text-muted)',fontSize:13}}>
                      Insights appear after you complete your first interview.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── PROGRESS TAB ─────────────────────────────────────────── */}
            {activeTab === 'progress' && (
              <>
                <div className="an-bottom">
                  <div className="chart-card" style={{marginBottom:0}}>
                    <h3 style={{fontFamily:'var(--font-head)',fontSize:16,fontWeight:700,marginBottom:16}}>Improvement Trend</h3>
                    {scores.length >= 2 ? (
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
                        <div style={{textAlign:'center',padding:20,background:'var(--bg)',borderRadius:12}}>
                          <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}>First Session</div>
                          <div style={{fontFamily:'var(--font-head)',fontSize:28,fontWeight:700,color:'var(--coral)'}}>
                            {Math.round(scores[0]?.overallScore || 0)}
                          </div>
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>{scores[0]?.jobRole || 'Interview'}</div>
                        </div>
                        <div style={{textAlign:'center',padding:20,background:'var(--bg)',borderRadius:12,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                          <div style={{fontSize:32,marginBottom:4}}>
                            {(progress?.improvement ?? 0) > 0 ? '\u2191' : (progress?.improvement ?? 0) < 0 ? '\u2193' : '\u2192'}
                          </div>
                          <div style={{fontFamily:'var(--font-head)',fontSize:18,fontWeight:700,color:(progress?.improvement ?? 0) > 0 ? 'var(--teal-dark)' : (progress?.improvement ?? 0) < 0 ? 'var(--coral)' : 'var(--text-muted)'}}>
                            {(progress?.improvement ?? 0) > 0 ? '+' : ''}{Math.round(progress?.improvement ?? 0)} pts
                          </div>
                        </div>
                        <div style={{textAlign:'center',padding:20,background:'var(--bg)',borderRadius:12}}>
                          <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}>Latest Session</div>
                          <div style={{fontFamily:'var(--font-head)',fontSize:28,fontWeight:700,color:'var(--teal-dark)'}}>
                            {Math.round(scores[scores.length - 1]?.overallScore || 0)}
                          </div>
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>{scores[scores.length - 1]?.jobRole || 'Interview'}</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{textAlign:'center',padding:'32px 0',color:'var(--text-muted)',fontSize:13}}>
                        Complete at least 2 interviews to see your improvement trend.
                      </div>
                    )}
                  </div>

                  <div className="chart-card" style={{marginBottom:0}}>
                    <h3 style={{fontFamily:'var(--font-head)',fontSize:16,fontWeight:700,marginBottom:16}}>Skill Averages</h3>
                    {[
                      { name: 'Overall Score', val: performance?.averageScore ?? 0, cls: 'prog-coral' },
                      { name: 'Verbal Score', val: trends?.averageVerbal ?? 0, cls: 'prog-teal' },
                      { name: 'Non-Verbal Score', val: trends?.averageNonVerbal ?? 0, cls: 'prog-purple' },
                    ].map(s => (
                      <div className="skill-row" key={s.name} style={{marginBottom:14}}>
                        <div className="skill-row-top">
                          <span className="skill-name">{s.name}</span>
                          <span className="skill-pct">{s.val > 0 ? `${Math.round(s.val)}%` : '\u2014'}</span>
                        </div>
                        <div className="prog-wrap">
                          <div className={`prog-bar ${s.cls}`} style={{width:`${Math.min(s.val,100)}%`}}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── SKILLS TAB ───────────────────────────────────────────── */}
            {activeTab === 'skills' && (
              <div className="an-bottom">
                <div className="chart-card" style={{marginBottom:0}}>
                  <div className="chart-card-header">
                    <h3>Score Distribution</h3>
                  </div>
                  <div className="bar-chart">
                    {Object.entries(distData).map(([range, count]) => (
                      <div className="bar-group" key={range}>
                        <div className="bar" style={{height:`${Math.max((count/distMax)*160,4)}px`}}></div>
                        <div className="bar-label">{range}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="insights-card">
                  <h3>AI Insights</h3>
                  {performance?.totalCompleted > 0 ? (
                    <>
                      <div className={`insight-item ${(trends?.averageVerbal ?? 0) >= 60 ? 'green' : 'yellow'}`}>
                        <div className={`insight-title ${(trends?.averageVerbal ?? 0) >= 60 ? 'green' : 'yellow'}`}>
                          {(trends?.averageVerbal ?? 0) >= 60 ? '\u2713' : '\u26A0'} Verbal Skills
                        </div>
                        <div className="insight-text">
                          {(trends?.averageVerbal ?? 0) > 0
                            ? `Avg verbal score: ${Math.round(trends.averageVerbal)}%. ${trends.averageVerbal >= 75 ? 'Excellent!' : 'Focus on clear, structured answers.'}`
                            : 'Complete video interviews to track verbal scores.'}
                        </div>
                      </div>
                      <div className={`insight-item ${(trends?.averageNonVerbal ?? 0) >= 60 ? 'green' : 'yellow'}`}>
                        <div className={`insight-title ${(trends?.averageNonVerbal ?? 0) >= 60 ? 'green' : 'yellow'}`}>
                          {(trends?.averageNonVerbal ?? 0) >= 60 ? '\u2713' : '\u26A0'} Non-Verbal / Eye Contact
                        </div>
                        <div className="insight-text">
                          {(trends?.averageNonVerbal ?? 0) > 0
                            ? `Non-verbal avg: ${Math.round(trends.averageNonVerbal)}%. ${trends.averageNonVerbal >= 75 ? 'Great eye contact and presence.' : 'Practice looking directly at the camera.'}`
                            : 'Enable camera in Video Interview to track non-verbal scores.'}
                        </div>
                      </div>
                      <div className="insight-item purple">
                        <div className="insight-title purple">Best Role</div>
                        <div className="insight-text">
                          {Object.keys(trends?.rolePerformance || {}).length > 0
                            ? `You perform best as ${Object.entries(trends.rolePerformance).sort((a,b) => b[1]-a[1])[0]?.[0]}.`
                            : 'Practice multiple roles to discover where you excel.'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{textAlign:'center',padding:'20px 0',color:'var(--text-muted)',fontSize:13}}>
                      Insights appear after you complete your first interview.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── HISTORY TAB ──────────────────────────────────────────── */}
            {activeTab === 'history' && (
              <div className="chart-card">
                <div className="chart-card-header"><h3>Interview History</h3></div>
                {timeline.length > 0 ? (
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                    <thead>
                      <tr style={{borderBottom:'2px solid var(--border)',textAlign:'left'}}>
                        {['Role','Overall','Verbal','Non-Verbal','Status','Date'].map(h => (
                          <th key={h} style={{padding:'8px 12px',fontFamily:'var(--font-head)',fontSize:12,color:'var(--text-muted)',fontWeight:600}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.map(item => (
                        <tr key={item.id} style={{borderBottom:'1px solid var(--border)'}}>
                          <td style={{padding:'10px 12px',fontWeight:600}}>{item.jobRole || '\u2014'}</td>
                          <td style={{padding:'10px 12px',color:'var(--coral)',fontWeight:700}}>{item.overallScore ? Math.round(item.overallScore) : '\u2014'}</td>
                          <td style={{padding:'10px 12px',color:'var(--teal)'}}>{item.verbalScore ? Math.round(item.verbalScore) : '\u2014'}</td>
                          <td style={{padding:'10px 12px',color:'var(--purple)'}}>{item.nonVerbalScore ? Math.round(item.nonVerbalScore) : '\u2014'}</td>
                          <td style={{padding:'10px 12px'}}><span className={`tag ${item.status === 'completed' ? 'tag-teal' : 'tag-yellow'}`}>{item.status}</span></td>
                          <td style={{padding:'10px 12px',color:'var(--text-muted)'}}>{new Date(item.date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)',fontSize:13}}>
                    <div style={{fontSize:32,marginBottom:8}}>📋</div>
                    <div style={{fontWeight:600}}>No interview history yet</div>
                    <div>Complete your first interview to see your history here.</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}
