import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import adminService from '../services/adminService'
import resourceService from '../services/resourceService'
import userService from '../services/userService'
import authService from '../services/authService'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLES        = ['user', 'premium', 'admin']
const DIFFICULTIES = ['easy', 'medium', 'hard']
const CATEGORIES   = ['behavioral', 'technical', 'situational', 'general']
const STATUSES     = ['pending', 'active', 'completed', 'cancelled']
const JOB_CATEGORIES = [
  'Technology', 'Healthcare', 'BPO / Customer Service', 'Finance',
  'Business & Management', 'Sales & Marketing', 'HR & Administration',
  'Education', 'Creative & Media', 'Legal', 'Engineering', 'Supply Chain', 'Other',
]
const CATEGORY_META = {
  behavioral:  { label: 'Behavioral',  icon: '🧠', cls: 'tag-teal' },
  technical:   { label: 'Technical',   icon: '💻', cls: 'tag-purple' },
  situational: { label: 'Situational', icon: '⚡', cls: 'tag-yellow' },
  general:     { label: 'General',     icon: '🎯', cls: 'tag-coral' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(dateStr, includeTime = false) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (!includeTime) return date
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

function scoreColor(v) {
  if (v == null) return 'var(--text-muted)'
  if (v >= 80) return 'var(--teal-dark)'
  if (v >= 60) return 'var(--teal)'
  if (v >= 40) return 'var(--yellow)'
  return 'var(--coral)'
}

function RoleBadge({ role }) {
  const cls = role === 'admin' ? 'tag-purple' : role === 'premium' ? 'tag-teal' : 'tag-yellow'
  return <span className={`tag ${cls}`} style={{ fontWeight: 600 }}>{role}</span>
}

function StatusBadge({ status }) {
  const cls = status === 'completed' ? 'tag-teal' : status === 'active' ? 'tag-purple' : 'tag-yellow'
  return <span className={`tag ${cls}`}>{status}</span>
}

function DiffBadge({ diff }) {
  const cls = diff === 'hard' ? 'tag-coral' : diff === 'medium' ? 'tag-teal' : 'tag-purple'
  return <span className={`tag ${cls}`}>{diff}</span>
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
const inputStyle = {
  padding: '7px 11px', borderRadius: 7, border: '1px solid var(--border)',
  fontSize: 13, background: 'var(--card)', minWidth: 160, color: 'var(--text)',
}

function Modal({ title, onClose, children, maxWidth = 520 }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--card)', borderRadius: 14, padding: 28, width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>
        {(title || onClose) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: title ? 20 : 0 }}>
            {title ? <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text)' }}>{title}</h3> : <div />}
            {onClose && <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

function ConfirmModal({ title, message, onConfirm, onClose, confirmText = 'Confirm', cancelText = 'Cancel', type = 'coral' }) {
  return (
    <Modal onClose={onClose} maxWidth={400}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ 
          width: 56, height: 56, borderRadius: '50%', background: `var(--${type}-light)`, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' 
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={`var(--${type})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {type === 'coral' ? (
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
            ) : (
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
            )}
          </svg>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text)' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>{message}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button className="btn btn-outline" style={{ padding: '10px' }} onClick={onClose}>{cancelText}</button>
        <button className={`btn btn-${type}`} style={{ padding: '10px' }} onClick={onConfirm}>{confirmText}</button>
      </div>
    </Modal>
  )
}

function KpiCard({ icon, val, label, color, sub }) {
  return (
    <div style={{
      background: 'var(--card)', borderRadius: 12, padding: '20px 22px',
      border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: `var(--${color})`, fontFamily: 'var(--font-head)', lineHeight: 1.1 }}>{val}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function SectionCard({ title, action, children, style }) {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', ...style }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text)' }}>{title}</h3>
        {action}
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

function EmptyState({ icon, message }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{message}</div>
    </div>
  )
}

function Loading({ message = 'Loading...', size = 32 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
      <div className="spinner" style={{ 
        width: size, height: size, border: '3px solid var(--border)', borderTopColor: 'var(--coral)', 
        borderRadius: '50%', marginBottom: 16 
      }} />
      <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.02em' }}>{message}</div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  )
}

function Skeleton({ height = 20, width = '100%', borderRadius = 6, marginBottom = 0 }) {
  return (
    <div style={{ 
      height, width, borderRadius, marginBottom, 
      background: 'linear-gradient(90deg, var(--bg2) 25%, var(--border) 50%, var(--bg2) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-loading 1.5s infinite linear'
    }}>
      <style>{`
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ metrics, config, analytics }) {
  const kpis = [
    { icon: '👥', color: 'coral',  val: metrics?.totalUsers          ?? '—', label: 'Total Users',       sub: 'Registered accounts' },
    { icon: '🎯', color: 'teal',   val: metrics?.totalInterviews     ?? '—', label: 'Total Interviews',  sub: 'All sessions' },
    { icon: '🏆', color: 'purple', val: metrics?.completedInterviews ?? '—', label: 'Completed',         sub: 'Finished sessions' },
    { icon: '📊', color: 'yellow', val: metrics?.avgScore != null ? `${Math.round(metrics.avgScore)}` : '—', label: 'Avg Score', sub: 'Platform average' },
    { icon: '📅', color: 'coral',  val: metrics?.interviewsThisWeek  ?? '—', label: 'This Week',         sub: 'Last 7 days' },
  ]

  const distData    = analytics?.scoreDistribution || {}
  const distMax     = Math.max(...Object.values(distData), 1)
  const topRoles    = analytics?.topRoles || []
  const topRoleMax  = Math.max(...topRoles.map(r => r.count), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12 }}>
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Score Distribution */}
        <SectionCard title="📈 Score Distribution">
          {Object.keys(distData).length === 0 ? (
            <EmptyState icon="📊" message="No completed interviews yet." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(distData).map(([range, count]) => (
                <div key={range}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{range}</span>
                    <span style={{ fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${(count / distMax) * 100}%`, background: 'var(--coral)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Top Job Roles */}
        <SectionCard title="💼 Top Interview Roles">
          {topRoles.length === 0 ? (
            <EmptyState icon="💼" message="No interview data yet." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topRoles.map(({ role, count }) => (
                <div key={role}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} session{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${(count / topRoleMax) * 100}%`, background: 'var(--teal)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* System status */}
      <SectionCard title="⚙️ System Status">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
          {[
            ['Environment',  config?.environment ?? '—'],
            ['Groq AI',      config?.hasGroqKey     ? '✅ Connected' : config ? '❌ Not configured' : '—'],
            ['Supabase',     config?.hasSupabaseConfig ? '✅ Connected' : config ? '❌ Not set' : '—'],
            ['CORS Origins', (config?.corsOrigins ?? []).slice(0, 2).join(', ') || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: '10px 14px', background: 'var(--bg2)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function SystemAnalyticsTab({ analytics, timeseries }) {
  const distData = analytics?.scoreDistribution || {}
  const distMax = Math.max(...Object.values(distData), 1)
  const topRoles = analytics?.topRoles || []
  const topRoleMax = Math.max(...topRoles.map(r => r.count), 1)
  const [roleFilter, setRoleFilter] = useState('all')
  const [rangeFilter, setRangeFilter] = useState('30d')
  const [ts, setTs] = useState(timeseries || null)

  useEffect(() => {
    adminService.getPlatformTimeseries({
      role: roleFilter === 'all' ? undefined : roleFilter,
      range: rangeFilter,
    }).then(setTs).catch(() => setTs(null))
  }, [roleFilter, rangeFilter])

  const perDay = ts?.interviewsPerDay || []
  const activeUsers = ts?.activeUsersPerWeek || []
  const completion = ts?.completionRateByWeek || []
  const hours = ts?.hourHistogram || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="admin-card" style={{ padding: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 6 }}>Role</label>
          <select className="chart-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All</option>
            {topRoles.map(r => <option key={r.role} value={r.role}>{r.role}</option>)}
          </select>
        </div>
        <div className="admin-card" style={{ padding: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 6 }}>Range</label>
          <select className="chart-select" value={rangeFilter} onChange={e => setRangeFilter(e.target.value)}>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <div className="admin-card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Average Score</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{analytics?.avgScore ?? '—'}</div>
        </div>
        <div className="admin-card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Completed Interviews</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{analytics?.totalCompleted ?? '—'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0 }}>Score Distribution</h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 180, gap: 10, padding: '10px 0' }}>
            {Object.entries(distData).map(([range, count]) => (
              <div key={range} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    height: `${Math.max((count / distMax) * 160, 4)}px`,
                    background: 'linear-gradient(180deg, var(--coral), #ffb3b3)',
                    borderRadius: 8,
                  }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{range}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0 }}>Top Roles</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {topRoles.map(r => (
              <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 120, fontSize: 13 }}>{r.role}</div>
                <div style={{ flex: 1, height: 12, background: '#efeae2', borderRadius: 6, position: 'relative' }}>
                  <div
                    style={{
                      width: `${Math.max((r.count / topRoleMax) * 100, 6)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--teal), #baf5e5)',
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div style={{ width: 28, textAlign: 'right', fontSize: 12 }}>{r.count}</div>
              </div>
            ))}
            {topRoles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No role data yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        {/* Interviews per day (last 30 days) */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0 }}>Interviews per Day</h4>
          </div>
          {perDay.length > 0 ? (
            <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
              <svg className="chart-svg" viewBox={`0 0 ${Math.max(perDay.length * 20, 400)} 220`} style={{ width: '100%', height: 240 }}>
                {[0, 5, 10, 15, 20].map(y => (
                  <g key={y}>
                    <line x1="32" y1={200 - (y/20)*180} x2="100%" y2={200 - (y/20)*180}
                      stroke="#e8e3da" strokeWidth="1" strokeDasharray="4,4"/>
                    <text x="0" y={204 - (y/20)*180} fontSize="9" fill="#aaa">{y}</text>
                  </g>
                ))}
                {perDay.map((d, i) => {
                  const x = 40 + i * 18
                  const h = Math.min(180, (d.count / 20) * 180)
                  return (
                    <g key={d.date}>
                      <rect x={x} y={200 - h} width="12" height={h} fill="var(--coral)" rx="3" />
                    </g>
                  )
                })}
              </svg>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding: 20, color: 'var(--text-muted)' }}>No data</div>
          )}
        </div>

        {/* Active users per week (10 weeks) */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0 }}>Active Users / Week (10w)</h4>
          </div>
          {activeUsers.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', height: 180, gap: 8, padding: '10px 0' }}>
              {(() => {
                const max = Math.max(...activeUsers.map(a => a.count), 1)
                return activeUsers.map(a => (
                  <div key={a.week} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      height: `${Math.max((a.count / max) * 160, 4)}px`,
                      background: 'linear-gradient(180deg, var(--teal), #baf5e5)',
                      borderRadius: 8
                    }} />
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{a.week.slice(-2)}</div>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding: 20, color: 'var(--text-muted)' }}>No data</div>
          )}
        </div>
      </div>

      {/* Peak hours histogram */}
      <div className="admin-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0 }}>Peak Hours (UTC)</h4>
        </div>
        {hours.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 160, gap: 6, padding: '10px 0' }}>
            {(() => {
              const max = Math.max(...hours.map(h => h.count), 1)
              return hours.map(h => (
                <div key={h.hour} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    height: `${Math.max((h.count / max) * 140, 3)}px`,
                    background: 'linear-gradient(180deg, #9f7aea, #d8c9ff)',
                    borderRadius: 6,
                  }} />
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{String(h.hour).padStart(2, '0')}</div>
                </div>
              ))
            })()}
          </div>
        ) : (
          <div style={{ textAlign:'center', padding: 20, color: 'var(--text-muted)' }}>No data</div>
        )}
      </div>

      {/* Completion rate trend */}
      <div className="admin-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0 }}>Completion Rate by Week</h4>
        </div>
        {completion.length > 0 ? (
          <svg className="chart-svg" viewBox={`0 0 ${Math.max(completion.length * 80, 400)} 220`} style={{ width: '100%', height: 240 }}>
            {[0,25,50,75,100].map(y => (
              <g key={y}>
                <line x1="32" y1={200 - (y/100)*180} x2="100%" y2={200 - (y/100)*180}
                  stroke="#e8e3da" strokeWidth="1" strokeDasharray="4,4"/>
                <text x="0" y={204 - (y/100)*180} fontSize="9" fill="#aaa">{y}%</text>
              </g>
            ))}
            {completion.map((p, i) => {
              const x = 40 + i * 60
              const y = 200 - (p.rate / 100) * 180
              return (
                <g key={p.week}>
                  <circle cx={x} cy={y} r="4" fill="var(--purple)" />
                  {i > 0 && (() => {
                    const prev = completion[i - 1]
                    const x2 = 40 + (i - 1) * 60
                    const y2 = 200 - (prev.rate / 100) * 180
                    return <line x1={x2} y1={y2} x2={x} y2={y} stroke="var(--purple)" strokeWidth="2" />
                  })()}
                  <text x={x - 8} y={y - 8} fontSize="9" fill="#666">{p.rate}%</text>
                  <text x={x - 10} y={212} fontSize="9" fill="#aaa">{p.week.slice(-2)}</text>
                </g>
              )
            })}
          </svg>
        ) : (
          <div style={{ textAlign:'center', padding: 20, color: 'var(--text-muted)' }}>No data</div>
        )}
      </div>
    </div>
  )
}
// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab({ setGlobalLoading }) {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [pendingRoles, setPendingRoles] = useState({})
  const [saving, setSaving]     = useState({})
  const [deleting, setDeleting] = useState({})
  const [msg, setMsg]           = useState({ type: '', text: '' })
  const [selectedIds, setSelectedIds] = useState([])

  // Edit user state
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({ fullName: '', email: '', password: '' })
  const [isEditing, setIsEditing] = useState(false)

  const fetchUsers = () => {
    setLoading(true)
    adminService.getUsers()
      .then(data => {
        const list = data?.users || data || []
        setUsers(list)
        // Always re-initialise pendingRoles from fresh server data
        const init = {}
        list.forEach(u => { init[u.id] = u.role })
        setPendingRoles(init)
      })
      .catch(() => setMsg({ type: 'error', text: 'Failed to load users.' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()

    // Auto-refresh whenever the admin switches back to this browser tab
    const onVisible = () => { if (document.visibilityState === 'visible') fetchUsers() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 3500) }

  const handleSaveRole = async (u) => {
    setSaving(s => ({ ...s, [u.id]: true }))
    try {
      await adminService.updateUserRole(u.userId, pendingRoles[u.id])
      setUsers(us => us.map(x => x.id === u.id ? { ...x, role: pendingRoles[u.id] } : x))
      flash('success', `Role updated to "${pendingRoles[u.id]}" for ${u.fullName || u.email}.`)
    } catch { flash('error', 'Failed to update role.') }
    finally { setSaving(s => ({ ...s, [u.id]: false })) }
  }

  const handleToggleBlock = async (u) => {
    const newBlocked = !u.isBlocked
    try {
      await adminService.toggleBlockUser(u.userId, newBlocked)
      setUsers(us => us.map(x => x.id === u.id ? { ...x, isBlocked: newBlocked } : x))
      flash('success', `User ${newBlocked ? 'blocked' : 'unblocked'} successfully.`)
    } catch { flash('error', 'Failed to update block status.') }
  }

  const handleOpenEdit = (u) => {
    setEditingUser(u)
    setEditForm({ fullName: u.fullName || '', email: u.email || '', password: '' })
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editForm.fullName.trim() || !editForm.email.trim()) {
      return flash('error', 'Name and Email are required.')
    }
    setSaving(s => ({ ...s, [editingUser.id]: true }))
    try {
      const payload = {
        fullName: editForm.fullName,
        email: editForm.email
      }
      if (editForm.password) payload.password = editForm.password

      await adminService.updateUserDetails(editingUser.userId, payload)
      
      setUsers(us => us.map(x => x.id === editingUser.id ? { 
        ...x, 
        fullName: editForm.fullName, 
        email: editForm.email 
      } : x))
      
      flash('success', 'User updated successfully.')
      setIsEditing(false)
    } catch (err) {
      flash('error', err?.response?.data?.error || 'Failed to update user.')
    } finally {
      setSaving(s => ({ ...s, [editingUser.id]: false }))
    }
  }

  const handleDelete = async (u) => {
    if (!window.confirm(`Permanently delete "${u.fullName || u.email}"? This cannot be undone.`)) return
    setDeleting(d => ({ ...d, [u.id]: true }))
    try {
      await adminService.deleteUser(u.userId)
      setUsers(us => us.filter(x => x.id !== u.id))
      flash('success', 'User deleted successfully.')
    } catch { flash('error', 'Failed to delete user.') }
    finally { setDeleting(d => ({ ...d, [u.id]: false })) }
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map(u => u.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Permanently delete ${selectedIds.length} users? This cannot be undone.`)) return
    const count = selectedIds.length
    let success = 0
    setGlobalLoading({ message: `Deleting ${count} users...`, progress: 0 })
    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i]
      const u = users.find(x => x.id === id)
      if (u) {
        try {
          await adminService.deleteUser(u.userId)
          success++
        } catch (e) { console.error(`Failed to delete user ${id}`, e) }
      }
      setGlobalLoading(prev => ({ ...prev, progress: ((i + 1) / count) * 100 }))
    }
    setUsers(us => us.filter(x => !selectedIds.includes(x.id)))
    setSelectedIds([])
    setGlobalLoading(null)
    flash('success', `Successfully deleted ${success} of ${count} users.`)
  }

  const handleBulkBlock = async (blocked) => {
    const count = selectedIds.length
    let success = 0
    setGlobalLoading({ message: `${blocked ? 'Blocking' : 'Unblocking'} ${count} users...`, progress: 0 })
    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i]
      const u = users.find(x => x.id === id)
      if (u) {
        try {
          await adminService.toggleBlockUser(u.userId, blocked)
          success++
        } catch (e) { console.error(`Failed to block/unblock user ${id}`, e) }
      }
      setGlobalLoading(prev => ({ ...prev, progress: ((i + 1) / count) * 100 }))
    }
    setUsers(us => us.map(x => selectedIds.includes(x.id) ? { ...x, isBlocked: blocked } : x))
    setSelectedIds([])
    setGlobalLoading(null)
    flash('success', `Successfully ${blocked ? 'blocked' : 'unblocked'} ${success} of ${count} users.`)
  }

  const handleExportCSV = () => {
    const reportTitle = "IntervuAI - Users Report"
    const timestamp = new Date().toLocaleString()
    const metadata = [
      [reportTitle],
      [`Generated on: ${timestamp}`],
      [`Total Records: ${filtered.length}`],
      [] // Empty line
    ]
    const headers = ['FullName', 'Email', 'Role', 'Status', 'Interviews', 'LastActive', 'Joined']
    const rows = filtered.map(u => [
      `"${u.fullName || ''}"`,
      `"${u.email || ''}"`,
      `"${u.role}"`,
      `"${u.isBlocked ? 'Blocked' : 'Active'}"`,
      u.interviewCount || 0,
      `"${u.lastActiveAt || ''}"`,
      `"${u.createdAt || ''}"`
    ])
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + metadata.map(r => r.join(',')).join("\n")
      + [headers.join(','), ...rows.map(r => r.join(','))].join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `users_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || (u.fullName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    const matchRole   = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  if (loading) return (
    <SectionCard title="👥 User Management">
      <div style={{ padding: '20px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <Skeleton height={40} width={40} borderRadius="50%" />
            <div style={{ flex: 1 }}>
              <Skeleton height={18} width="30%" marginBottom={8} />
              <Skeleton height={14} width="20%" />
            </div>
            <Skeleton height={32} width={100} />
          </div>
        ))}
      </div>
    </SectionCard>
  )

  return (
    <SectionCard
      title={`👥 User Management — ${filtered.length} of ${users.length}`}
      action={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginRight: 12, paddingRight: 12, borderRight: '1px solid var(--border)' }}>
              <button className="btn btn-sm btn-ghost" style={{ color: 'var(--coral)' }} onClick={handleBulkDelete}>Delete ({selectedIds.length})</button>
              <button className="btn btn-sm btn-ghost" onClick={() => handleBulkBlock(true)}>Block</button>
              <button className="btn btn-sm btn-ghost" onClick={() => handleBulkBlock(false)}>Unblock</button>
            </div>
          )}
          <button className="btn btn-outline btn-sm" onClick={fetchUsers} title="Refresh user list">🔄 Refresh</button>
          <button className="btn btn-outline btn-sm" onClick={handleExportCSV}>📥 Export CSV</button>
          <input style={inputStyle} placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          <select style={inputStyle} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      }
    >
      {msg.text && <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginBottom: 12 }}>{msg.text}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', width: 40 }}>
                <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === filtered.length} onChange={handleSelectAll} />
              </th>
              {['User', 'Status', 'Role', 'Change Role', 'Interviews', 'Last Active', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: selectedIds.includes(u.id) ? 'var(--bg2)' : 'transparent' }}>
                <td style={{ padding: '12px 14px' }}>
                  <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => handleSelectOne(u.id)} />
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600 }}>{u.fullName || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{u.email || u.userId}</div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span className={`tag ${u.isBlocked ? 'tag-coral' : 'tag-teal'}`} style={{ fontWeight: 600 }}>
                    {u.isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }}><RoleBadge role={u.role} /></td>
                <td style={{ padding: '12px 14px' }}>
                  <select
                    value={pendingRoles[u.id] ?? u.role}
                    onChange={e => setPendingRoles(r => ({ ...r, [u.id]: e.target.value }))}
                    style={{ ...inputStyle, minWidth: 110 }}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{u.interviewCount ?? 0}</td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{fmt(u.lastActiveAt, true)}</td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{fmt(u.createdAt)}</td>
                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleOpenEdit(u)}
                    style={{ minWidth: 60 }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-coral btn-sm"
                    onClick={() => handleSaveRole(u)}
                    disabled={saving[u.id] || pendingRoles[u.id] === u.role}
                    style={{ minWidth: 60 }}
                  >
                    {saving[u.id] ? '…' : 'Save'}
                  </button>
                  <button
                    className={`btn btn-sm ${u.isBlocked ? 'btn-outline' : 'btn-ghost'}`}
                    onClick={() => handleToggleBlock(u)}
                    style={{ minWidth: 70, color: u.isBlocked ? 'var(--teal)' : 'var(--coral)' }}
                  >
                    {u.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(u)}
                    disabled={deleting[u.id]}
                    style={{ color: 'var(--coral)', minWidth: 60 }}
                  >
                    {deleting[u.id] ? '…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon="👤" message={search || roleFilter ? 'No users match the filter.' : 'No users found.'} />}
      </div>

      {isEditing && (
        <Modal title={`Edit User: ${editingUser?.email}`} onClose={() => setIsEditing(false)} maxWidth={480}>
          <div className="form-group">
            <div className="form-label">Full Name</div>
            <input 
              className="form-input" 
              value={editForm.fullName} 
              onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} 
              placeholder="Full name"
            />
          </div>
          <div className="form-group">
            <div className="form-label">Email Address</div>
            <input 
              className="form-input" 
              value={editForm.email} 
              onChange={e => setEditForm({ ...editForm, email: e.target.value })} 
              placeholder="Email address"
            />
          </div>
          <div className="form-group">
            <div className="form-label">New Password (leave blank to keep current)</div>
            <input 
              type="password"
              className="form-input" 
              value={editForm.password} 
              onChange={e => setEditForm({ ...editForm, password: e.target.value })} 
              placeholder="Min 6 characters"
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
            <button 
              className="btn btn-coral btn-sm" 
              onClick={handleSaveEdit} 
              disabled={saving[editingUser?.id]}
            >
              {saving[editingUser?.id] ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </SectionCard>
  )
}

// ── Interviews Tab ────────────────────────────────────────────────────────────
function InterviewsTab({ setGlobalLoading }) {
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading]       = useState(true)
  const [total, setTotal]           = useState(0)
  const [filter, setFilter]         = useState({ status: '', jobRole: '' })
  const [deleting, setDeleting]     = useState({})
  const [msg, setMsg]               = useState({ type: '', text: '' })
  const [page, setPage]             = useState(0)
  const [selectedIds, setSelectedIds] = useState([])
  const PAGE = 20

  const load = useCallback(() => {
    setLoading(true)
    adminService.getInterviews({ ...filter, limit: PAGE, offset: page * PAGE })
      .then(data => { setInterviews(data?.interviews || []); setTotal(data?.total || 0) })
      .catch(() => setMsg({ type: 'error', text: 'Failed to load interviews.' }))
      .finally(() => setLoading(false))
  }, [filter, page])

  useEffect(() => { load() }, [load])

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 3500) }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this interview and all its data? This cannot be undone.')) return
    setDeleting(d => ({ ...d, [id]: true }))
    try {
      await adminService.deleteInterview(id)
      setInterviews(iv => iv.filter(x => x.id !== id))
      setTotal(t => t - 1)
      flash('success', 'Interview deleted.')
    } catch { flash('error', 'Failed to delete interview.') }
    finally { setDeleting(d => ({ ...d, [id]: false })) }
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(interviews.map(iv => iv.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} interviews? This cannot be undone.`)) return
    const count = selectedIds.length
    let success = 0
    setGlobalLoading({ message: `Deleting ${count} interviews...`, progress: 0 })
    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i]
      try {
        await adminService.deleteInterview(id)
        success++
      } catch (e) { console.error(`Failed to delete interview ${id}`, e) }
      setGlobalLoading(prev => ({ ...prev, progress: ((i + 1) / count) * 100 }))
    }
    setInterviews(iv => iv.filter(x => !selectedIds.includes(x.id)))
    setTotal(t => t - success)
    setSelectedIds([])
    setGlobalLoading(null)
    flash('success', `Successfully deleted ${success} of ${count} interviews.`)
  }

  const handleExportCSV = () => {
    const reportTitle = "IntervuAI - Interview Reports"
    const timestamp = new Date().toLocaleString()
    const metadata = [
      [reportTitle],
      [`Generated on: ${timestamp}`],
      [`Total Records: ${interviews.length}`],
      [] // Empty line
    ]
    const headers = ['InterviewID', 'UserID', 'JobRole', 'Status', 'OverallScore', 'VerbalScore', 'NonVerbalScore', 'CreatedAt']
    const rows = interviews.map(iv => [
      `"${iv.id}"`,
      `"${iv.userId}"`,
      `"${iv.jobRole}"`,
      `"${iv.status}"`,
      iv.overallScore ?? '',
      iv.verbalScore ?? '',
      iv.nonVerbalScore ?? '',
      `"${iv.createdAt}"`
    ])
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + metadata.map(r => r.join(',')).join("\n")
      + [headers.join(','), ...rows.map(r => r.join(','))].join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `interview_reports_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <SectionCard
      title={`🎯 All Interviews — ${total} total`}
      action={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginRight: 12, paddingRight: 12, borderRight: '1px solid var(--border)' }}>
              <button className="btn btn-sm btn-ghost" style={{ color: 'var(--coral)' }} onClick={handleBulkDelete}>Delete ({selectedIds.length})</button>
            </div>
          )}
          <button className="btn btn-outline btn-sm" onClick={handleExportCSV}>📥 Export CSV</button>
          <select style={inputStyle} value={filter.status} onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(0) }}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input style={inputStyle} placeholder="Filter by role…" value={filter.jobRole}
            onChange={e => { setFilter(f => ({ ...f, jobRole: e.target.value })); setPage(0) }} />
          <button className="btn btn-outline btn-sm" onClick={() => { setPage(0); load() }}>↺ Refresh</button>
        </div>
      }
    >
      {msg.text && <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginBottom: 12 }}>{msg.text}</div>}
      {loading ? (
        <div style={{ padding: '20px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <Skeleton height={32} width={32} />
              <div style={{ flex: 1 }}>
                <Skeleton height={16} width="40%" marginBottom={6} />
                <Skeleton height={12} width="20%" />
              </div>
              <Skeleton height={24} width={80} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '9px 12px', width: 40 }}>
                    <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === interviews.length} onChange={handleSelectAll} />
                  </th>
                  {['User', 'Job Role', 'Status', 'Overall', 'Verbal', 'Non-Verbal', 'Date', ''].map(h => (
                    <th key={h} style={{ padding: '9px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {interviews.map(iv => (
                  <tr key={iv.id} style={{ borderBottom: '1px solid var(--border)', background: selectedIds.includes(iv.id) ? 'var(--bg2)' : 'transparent' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <input type="checkbox" checked={selectedIds.includes(iv.id)} onChange={() => handleSelectOne(iv.id)} />
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{iv.userId}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, maxWidth: 160 }}>{iv.jobRole}</td>
                    <td style={{ padding: '10px 12px' }}><StatusBadge status={iv.status} /></td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: scoreColor(iv.overallScore) }}>{iv.overallScore ?? '—'}</td>
                    <td style={{ padding: '10px 12px', color: scoreColor(iv.verbalScore) }}>{iv.verbalScore ?? '—'}</td>
                    <td style={{ padding: '10px 12px', color: scoreColor(iv.nonVerbalScore) }}>{iv.nonVerbalScore ?? '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{fmt(iv.createdAt)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--coral)', fontSize: 12 }}
                        onClick={() => handleDelete(iv.id)}
                        disabled={deleting[iv.id]}
                      >
                        {deleting[iv.id] ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {interviews.length === 0 && <EmptyState icon="🎯" message="No interviews found for this filter." />}
          </div>
          {/* Pagination */}
          {total > PAGE && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Showing {page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <button className="btn btn-ghost btn-sm" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </SectionCard>
  )
}

// ── Questions Tab ─────────────────────────────────────────────────────────────
function QuestionsTab() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState({ category: '', difficulty: '', jobRole: '' })
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState({ questionText: '', category: 'general', difficulty: 'medium', jobRole: '', expectedKeywords: '' })
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState({ type: '', text: '' })

  const load = useCallback(() => {
    setLoading(true)
    adminService.getQuestions(filter)
      .then(data => setQuestions(data?.questions || data || []))
      .catch(() => setMsg({ type: 'error', text: 'Failed to load questions.' }))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 3500) }

  const openAdd = () => {
    setEditing(null)
    setForm({ questionText: '', category: 'general', difficulty: 'medium', jobRole: '', expectedKeywords: '' })
    setMsg({ type: '', text: '' })
    setShowModal(true)
  }
  const openEdit = (q) => {
    setEditing(q)
    setForm({
      questionText: q.questionText || '',
      category: q.category || 'general',
      difficulty: q.difficulty || 'medium',
      jobRole: q.jobRole || '',
      expectedKeywords: (q.expectedKeywords || []).join(', '),
    })
    setMsg({ type: '', text: '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.questionText.trim() || !form.category) {
      setMsg({ type: 'error', text: 'Question text and interview type are required.' })
      return
    }
    setSaving(true)
    const payload = {
      questionText: form.questionText.trim(),
      category: form.category,
      difficulty: form.difficulty,
      jobRole: form.jobRole.trim() || null,
      expectedKeywords: form.expectedKeywords
        ? form.expectedKeywords.split(',').map(k => k.trim()).filter(Boolean)
        : [],
    }
    try {
      editing ? await adminService.updateQuestion(editing.id, payload) : await adminService.addQuestion(payload)
      setShowModal(false)
      load()
      flash('success', editing ? 'Question updated.' : 'Question added to bank.')
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || 'Failed to save question.' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question from the bank?')) return
    try {
      await adminService.deleteQuestion(id)
      setQuestions(qs => qs.filter(q => q.id !== id))
      flash('success', 'Question deleted.')
    } catch { flash('error', 'Failed to delete.') }
  }

  // Counts per category for the filter bar
  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c] = questions.filter(q => q.category === c).length
    return acc
  }, {})

  return (
    <SectionCard
      title={`❓ Question Bank — ${questions.length} question${questions.length !== 1 ? 's' : ''}`}
      action={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select style={inputStyle} value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
            <option value="">All Types</option>
            {CATEGORIES.map(c => {
              const m = CATEGORY_META[c] || {}
              return <option key={c} value={c}>{m.icon} {m.label || c}</option>
            })}
          </select>
          <select style={inputStyle} value={filter.difficulty} onChange={e => setFilter(f => ({ ...f, difficulty: e.target.value }))}>
            <option value="">All Difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
          <input style={{ ...inputStyle, minWidth: 140 }} placeholder="Filter by role…" value={filter.jobRole}
            onChange={e => setFilter(f => ({ ...f, jobRole: e.target.value }))} />
          <button className="btn btn-coral btn-sm" onClick={openAdd}>+ Add Question</button>
        </div>
      }
    >
      {/* Info banner */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#166534' }}>
        <strong>How it works:</strong> Questions here are injected as seed questions into the AI's system prompt when users start an interview matching the same job role and interview type. The AI uses these as reference questions to ask.
      </div>

      {/* Category summary pills */}
      {!loading && questions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {CATEGORIES.map(c => {
            const m = CATEGORY_META[c] || {}
            return counts[c] > 0 ? (
              <button
                key={c}
                onClick={() => setFilter(f => ({ ...f, category: filter.category === c ? '' : c }))}
                className={`tag ${filter.category === c ? 'tag-coral' : m.cls || 'tag-teal'}`}
                style={{ cursor: 'pointer', border: 'none', padding: '4px 10px' }}
              >
                {m.icon} {m.label || c} ({counts[c]})
              </button>
            ) : null
          })}
        </div>
      )}

      {msg.text && <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginBottom: 12 }}>{msg.text}</div>}
      {loading ? <EmptyState icon="⏳" message="Loading questions…" /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                {['Question', 'Interview Type', 'Difficulty', 'Job Role', 'Keywords', ''].map(h => (
                  <th key={h} style={{ padding: '9px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {questions.map(q => {
                const meta = CATEGORY_META[q.category] || { label: q.category, icon: '❓', cls: 'tag-teal' }
                return (
                  <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 12px', maxWidth: 300, lineHeight: 1.5 }}>{q.questionText}</td>
                    <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                      <span className={`tag ${meta.cls}`}>{meta.icon} {meta.label}</span>
                    </td>
                    <td style={{ padding: '11px 12px' }}><DiffBadge diff={q.difficulty} /></td>
                    <td style={{ padding: '11px 12px', color: 'var(--text-muted)', fontSize: 12 }}>{q.jobRole || '—'}</td>
                    <td style={{ padding: '11px 12px', maxWidth: 140 }}>
                      {q.expectedKeywords?.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {q.expectedKeywords.slice(0, 3).map(k => (
                            <span key={k} style={{ fontSize: 10, background: '#f3f4f6', borderRadius: 4, padding: '2px 5px', color: 'var(--text-muted)' }}>{k}</span>
                          ))}
                          {q.expectedKeywords.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{q.expectedKeywords.length - 3}</span>}
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm" style={{ marginRight: 6 }} onClick={() => openEdit(q)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--coral)' }} onClick={() => handleDelete(q.id)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {questions.length === 0 && (
            <EmptyState icon="❓" message="No questions yet. Add questions to build the bank — they'll be used to guide AI interviews." />
          )}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Question' : 'Add Question to Bank'} onClose={() => setShowModal(false)} maxWidth={560}>
          {msg.text && <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginBottom: 12 }}>{msg.text}</div>}
          <div className="form-group">
            <div className="form-label">Question Text *</div>
            <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} value={form.questionText}
              onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))} placeholder="Enter interview question…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <div className="form-label">Interview Type *</div>
              <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => {
                  const m = CATEGORY_META[c] || {}
                  return <option key={c} value={c}>{m.icon} {m.label || c}</option>
                })}
              </select>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {form.category === 'behavioral' && 'Used in Behavioral interviews (STAR method)'}
                {form.category === 'technical' && 'Used in Technical interviews (skills & problem-solving)'}
                {form.category === 'situational' && 'Used in Situational interviews (hypothetical scenarios)'}
                {form.category === 'general' && 'Used in General interviews (any type)'}
              </div>
            </div>
            <div className="form-group">
              <div className="form-label">Difficulty</div>
              <select className="form-input" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <div className="form-label">Job Role (optional — leave blank for any role)</div>
            <input className="form-input" value={form.jobRole} onChange={e => setForm(f => ({ ...f, jobRole: e.target.value }))}
              placeholder="e.g. Software Engineer" />
          </div>
          <div className="form-group">
            <div className="form-label">Expected Keywords (optional, comma-separated)</div>
            <input className="form-input" value={form.expectedKeywords} onChange={e => setForm(f => ({ ...f, expectedKeywords: e.target.value }))}
              placeholder="e.g. REST API, microservices, scalability" />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Keywords the AI uses to evaluate answer quality.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-coral btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update Question' : 'Add Question'}</button>
          </div>
        </Modal>
      )}
    </SectionCard>
  )
}

// ── Job Roles Tab ─────────────────────────────────────────────────────────────
function JobRolesTab() {
  const [roles, setRoles]           = useState([])
  const [questions, setQuestions]   = useState([])   // to compute Q counts per role
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [form, setForm]             = useState({ title: '', category: '', description: '', requiredSkills: '' })
  const [saving, setSaving]         = useState(false)
  const [catFilter, setCatFilter]   = useState('')
  const [msg, setMsg]               = useState({ type: '', text: '' })

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 3500) }

  useEffect(() => {
    Promise.all([
      adminService.getJobRoles(),
      adminService.getQuestions({ limit: 500 }),
    ])
      .then(([rolesData, qData]) => {
        setRoles(rolesData?.roles || rolesData || [])
        setQuestions(qData?.questions || qData || [])
      })
      .catch(() => flash('error', 'Failed to load data.'))
      .finally(() => setLoading(false))
  }, [])

  // Count questions per role title (partial match on question.jobRole)
  const getQCount = (title) =>
    questions.filter(q => q.jobRole && q.jobRole.toLowerCase().includes(title.toLowerCase())).length

  const openAdd = () => {
    setEditingRole(null)
    setForm({ title: '', category: '', description: '', requiredSkills: '' })
    setMsg({ type: '', text: '' })
    setShowModal(true)
  }

  const openEdit = (r) => {
    setEditingRole(r)
    setForm({
      title: r.title || '',
      category: r.category || '',
      description: r.description || '',
      requiredSkills: (r.requiredSkills || []).join(', '),
    })
    setMsg({ type: '', text: '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { setMsg({ type: 'error', text: 'Title is required.' }); return }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      category: form.category || null,
      description: form.description.trim() || null,
      requiredSkills: form.requiredSkills
        ? form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean)
        : [],
    }
    try {
      if (editingRole) {
        await adminService.updateJobRole(editingRole.id, payload)
        setRoles(rs => rs.map(r => r.id === editingRole.id ? { ...r, ...payload, requiredSkills: payload.requiredSkills } : r))
        flash('success', `Job role "${payload.title}" updated.`)
      } else {
        const created = await adminService.createJobRole(payload)
        setRoles(rs => [...rs, { ...created, requiredSkills: payload.requiredSkills, description: payload.description, category: payload.category }])
        flash('success', `Job role "${created.title}" created.`)
      }
      setShowModal(false)
    } catch (e) { setMsg({ type: 'error', text: e?.response?.data?.error || 'Failed to save.' }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete job role "${title}"? This won't delete linked questions.`)) return
    try {
      await adminService.deleteJobRole(id)
      setRoles(rs => rs.filter(x => x.id !== id))
      flash('success', 'Job role deleted.')
    } catch { flash('error', 'Failed to delete.') }
  }

  const filteredRoles = catFilter ? roles.filter(r => r.category === catFilter) : roles

  // Group categories for the filter
  const activeCats = [...new Set(roles.map(r => r.category).filter(Boolean))].sort()

  return (
    <SectionCard
      title={`💼 Job Roles — ${filteredRoles.length}${catFilter ? ` in "${catFilter}"` : ` of ${roles.length} active`}`}
      action={
        <div style={{ display: 'flex', gap: 8 }}>
          <select style={inputStyle} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-coral btn-sm" onClick={openAdd}>+ Add Role</button>
        </div>
      }
    >
      {/* Info banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#1e40af' }}>
        <strong>How it works:</strong> Job roles added here populate the interview selection dropdown for users. Add specific questions to the Question Bank linked to each role — the AI will use them during interviews.
      </div>

      {msg.text && <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginBottom: 12 }}>{msg.text}</div>}
      {loading ? <EmptyState icon="⏳" message="Loading…" /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                {['Title', 'Category', 'Required Skills', 'Questions', 'Description', ''].map(h => (
                  <th key={h} style={{ padding: '9px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map(r => {
                const qCount = getQCount(r.title)
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 12px', fontWeight: 700 }}>{r.title}</td>
                    <td style={{ padding: '11px 12px' }}>
                      {r.category ? <span className="tag tag-teal">{r.category}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 12px', maxWidth: 160 }}>
                      {(r.requiredSkills || []).length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {(r.requiredSkills || []).slice(0, 3).map(s => (
                            <span key={s} style={{ fontSize: 10, background: '#f3f4f6', borderRadius: 4, padding: '2px 5px', color: 'var(--text-muted)' }}>{s}</span>
                          ))}
                          {(r.requiredSkills || []).length > 3 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{r.requiredSkills.length - 3}</span>}
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <span className={`tag ${qCount > 0 ? 'tag-teal' : 'tag-yellow'}`} style={{ fontSize: 11 }}>
                        {qCount > 0 ? `${qCount} Q` : 'No Qs'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px', color: 'var(--text-muted)', maxWidth: 220, fontSize: 12 }}>{r.description || '—'}</td>
                    <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm" style={{ marginRight: 6 }} onClick={() => openEdit(r)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--coral)' }} onClick={() => handleDelete(r.id, r.title)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredRoles.length === 0 && (
            <EmptyState icon="💼" message={catFilter ? `No roles in "${catFilter}" category.` : 'No job roles yet. Add roles to populate the user interview dropdown.'} />
          )}
        </div>
      )}
      {showModal && (
        <Modal title={editingRole ? `Edit "${editingRole.title}"` : 'Add Job Role'} onClose={() => setShowModal(false)} maxWidth={540}>
          {msg.type === 'error' && msg.text && <div className="error-msg" style={{ marginBottom: 12 }}>{msg.text}</div>}
          <div className="form-group">
            <div className="form-label">Title *</div>
            <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Software Engineer" />
          </div>
          <div className="form-group">
            <div className="form-label">Industry Category</div>
            <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">Select category…</option>
              {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <div className="form-label">Required Skills (comma-separated)</div>
            <input className="form-input" value={form.requiredSkills} onChange={e => setForm(f => ({ ...f, requiredSkills: e.target.value }))}
              placeholder="e.g. React, Node.js, SQL" />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>These will be shown to users and help the AI tailor questions.</div>
          </div>
          <div className="form-group">
            <div className="form-label">Description (optional)</div>
            <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of the role…" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-coral btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingRole ? 'Update Role' : 'Add Role'}
            </button>
          </div>
        </Modal>
      )}
    </SectionCard>
  )
}

// ── Resources Tab ─────────────────────────────────────────────────────────────
function ResourcesTab() {
  const [resources, setResources]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [msg, setMsg]               = useState({ type: '', text: '' })
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [catFilter, setCatFilter]   = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [saving, setSaving]         = useState(false)
  const [form, setForm] = useState({
    title: '', category: '', resourceType: '', description: '', content: '', tags: '', difficulty: '',
  })

  const TYPES = ['article', 'video', 'tip', 'guide', 'template']
  const RES_DIFFICULTIES = ['beginner', 'intermediate', 'advanced']

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 3500) }

  const load = useCallback(() => {
    setLoading(true)
    resourceService.listResources({ limit: 200 })
      .then(data => setResources(data?.resources || data || []))
      .catch(() => setMsg({ type: 'error', text: 'Failed to load resources.' }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ title: '', category: '', resourceType: '', description: '', content: '', tags: '', difficulty: '' })
    setMsg({ type: '', text: '' })
    setShowModal(true)
  }

  const openEdit = (r) => {
    setEditing(r)
    setForm({
      title: r.title || '',
      category: r.category || '',
      resourceType: r.resourceType || '',
      description: r.description || '',
      content: r.content || '',
      tags: (r.tags || []).join(', '),
      difficulty: r.difficulty || '',
    })
    setMsg({ type: '', text: '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.resourceType) { setMsg({ type: 'error', text: 'Title and Type are required.' }); return }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      category: form.category || 'general',
      resourceType: form.resourceType,
      description: form.description?.trim() || null,
      content: form.content || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      difficulty: form.difficulty || null,
    }
    try {
      if (editing) {
        const updated = await resourceService.updateResource(editing.id, payload)
        setResources(rs => rs.map(r => r.id === editing.id ? { ...r, ...updated } : r))
        flash('success', `Resource "${payload.title}" updated.`)
      } else {
        const created = await resourceService.createResource(payload)
        setResources(rs => [...rs, created])
        flash('success', `Resource "${payload.title}" created.`)
      }
      setShowModal(false)
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || 'Failed to save resource.' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete resource "${title}"?`)) return
    try {
      await resourceService.deleteResource(id)
      setResources(rs => rs.filter(r => r.id !== id))
      flash('success', 'Resource deleted.')
    } catch {
      flash('error', 'Failed to delete resource.')
    }
  }

  const filtered = resources.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || (r.title || '').toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q)
    const matchType = !typeFilter || r.resourceType === typeFilter
    const matchCat  = !catFilter || r.category === catFilter
    return matchSearch && matchType && matchCat
  })

  const activeCats = [...new Set(resources.map(r => r.category).filter(Boolean))].sort()

  return (
    <SectionCard
      title={`📚 Resources — ${filtered.length} of ${resources.length}`}
      action={
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={inputStyle} placeholder="Search title or description…" value={search} onChange={e => setSearch(e.target.value)} />
          <select style={inputStyle} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select style={inputStyle} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-coral btn-sm" onClick={openAdd}>+ New Resource</button>
        </div>
      }
    >
      {msg.text && <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginBottom: 12 }}>{msg.text}</div>}
      {loading ? <EmptyState icon="⏳" message="Loading resources…" /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                {['Title', 'Type', 'Category', 'Difficulty', 'Reads', 'Created', ''].map(h => (
                  <th key={h} style={{ padding: '9px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 12px', fontWeight: 700, maxWidth: 280 }}>{r.title}</td>
                  <td style={{ padding: '11px 12px' }}>
                    <span className="tag tag-coral">{r.resourceType}</span>
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    {r.category ? <span className="tag tag-teal">{r.category}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    {r.difficulty ? <span className={`tag ${r.difficulty === 'advanced' ? 'tag-coral' : r.difficulty === 'intermediate' ? 'tag-yellow' : 'tag-teal'}`}>{r.difficulty}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 12px', color: 'var(--text-muted)' }}>{r.readCount || 0}</td>
                  <td style={{ padding: '11px 12px', color: 'var(--text-muted)' }}>{fmt(r.createdAt)}</td>
                  <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" style={{ marginRight: 6 }} onClick={() => openEdit(r)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--coral)' }} onClick={() => handleDelete(r.id, r.title)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState icon="📚" message="No resources match your filters." />}
        </div>
      )}
      {showModal && (
        <Modal title={editing ? `Edit Resource` : 'New Resource'} onClose={() => setShowModal(false)} maxWidth={680}>
          {msg.type === 'error' && msg.text && <div className="error-msg" style={{ marginBottom: 12 }}>{msg.text}</div>}
          <div className="form-group">
            <div className="form-label">Title *</div>
            <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. STAR Method Guide" />
          </div>
          <div className="form-group">
            <div className="form-label">Type *</div>
            <select className="form-input" value={form.resourceType} onChange={e => setForm(f => ({ ...f, resourceType: e.target.value }))}>
              <option value="">Select type…</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <div className="form-label">Category</div>
            <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <div className="form-label">Difficulty</div>
            <select className="form-input" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
              <option value="">—</option>
              {RES_DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <div className="form-label">Short Description</div>
            <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="One or two sentences…" />
          </div>
          <div className="form-group">
            <div className="form-label">Content</div>
            <textarea className="form-input" rows={6} style={{ resize: 'vertical' }} value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="For videos, you can prefix with YOUTUBE:VIDEO_ID or YOUTUBE_SEARCH:query" />
          </div>
          <div className="form-group">
            <div className="form-label">Tags (comma-separated)</div>
            <input className="form-input" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. STAR, communication, leadership" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-coral btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update Resource' : 'Create Resource'}</button>
          </div>
        </Modal>
      )}
    </SectionCard>
  )
}

// ── Plans Tab ─────────────────────────────────────────────────────────────────
function PlansTab() {
  const [plans, setPlans]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState({ name: '', price: '', description: '', features: '' })
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState({ type: '', text: '' })

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 3500) }

  useEffect(() => {
    adminService.getPlans()
      .then(data => setPlans(Array.isArray(data) ? data : data?.plans || []))
      .catch(() => flash('error', 'Failed to load plans (table may not exist yet).'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.price) { setMsg({ type: 'error', text: 'Name and price are required.' }); return }
    setSaving(true)
    try {
      const created = await adminService.createPlan({
        name: form.name,
        price: parseFloat(form.price),
        description: form.description,
        features: form.features ? form.features.split('\n').map(f => f.trim()).filter(Boolean) : [],
      })
      setPlans(p => [...p, created])
      setShowModal(false)
      setForm({ name: '', price: '', description: '', features: '' })
      flash('success', `Plan "${form.name}" created.`)
    } catch (e) { setMsg({ type: 'error', text: e?.response?.data?.error || 'Failed to create plan.' }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete plan "${name}"?`)) return
    try { await adminService.deletePlan(id); setPlans(p => p.filter(x => x.id !== id)); flash('success', 'Plan deleted.') }
    catch { flash('error', 'Failed to delete plan.') }
  }

  return (
    <SectionCard
      title={`💳 Subscription Plans — ${plans.length} plans`}
      action={<button className="btn btn-coral btn-sm" onClick={() => { setMsg({ type: '', text: '' }); setShowModal(true) }}>+ New Plan</button>}
    >
      {msg.text && <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginBottom: 12 }}>{msg.text}</div>}
      {loading ? <EmptyState icon="⏳" message="Loading plans…" /> : (
        <>
          {plans.length === 0 ? (
            <EmptyState icon="💳" message="No subscription plans yet. Create one to get started." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
              {plans.map(p => (
                <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', background: 'var(--bg2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-head)' }}>{p.name}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--coral)', marginTop: 2 }}>
                        ${p.price}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--coral)', fontSize: 12 }} onClick={() => handleDelete(p.id, p.name)}>Delete</button>
                  </div>
                  {p.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.5 }}>{p.description}</p>}
                  {Array.isArray(p.features) && p.features.length > 0 && (
                    <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                      {p.features.map((f, i) => <li key={i} style={{ marginBottom: 3 }}>{f}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {showModal && (
        <Modal title="Create Subscription Plan" onClose={() => setShowModal(false)}>
          {msg.type === 'error' && msg.text && <div className="error-msg" style={{ marginBottom: 12 }}>{msg.text}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <div className="form-label">Plan Name *</div>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pro" />
            </div>
            <div className="form-group">
              <div className="form-label">Price ($/mo) *</div>
              <input className="form-input" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="9.99" />
            </div>
          </div>
          <div className="form-group">
            <div className="form-label">Description</div>
            <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short plan description…" />
          </div>
          <div className="form-group">
            <div className="form-label">Features (one per line)</div>
            <textarea className="form-input" rows={4} style={{ resize: 'vertical' }} value={form.features}
              onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
              placeholder={'Unlimited interviews\nVideo interview mode\nAI feedback report'} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-coral btn-sm" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create Plan'}</button>
          </div>
        </Modal>
      )}
    </SectionCard>
  )
}

// ── Audit Logs Tab ────────────────────────────────────────────────────────────
function AuditLogsTab() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal]     = useState(0)
  const [filter, setFilter]   = useState({ action: '', resourceType: '' })
  const [page, setPage]       = useState(0)
  const [msg, setMsg]         = useState('')
  const PAGE = 30

  const load = useCallback(() => {
    setLoading(true)
    adminService.getAuditLogs({ ...filter, limit: PAGE, offset: page * PAGE })
      .then(data => { setLogs(data?.logs || []); setTotal(data?.total || 0) })
      .catch(() => setMsg('Failed to load audit logs.'))
      .finally(() => setLoading(false))
  }, [filter, page])

  useEffect(() => { load() }, [load])

  const actionColor = (a) => {
    if (!a) return 'tag-purple'
    if (a.includes('delete')) return 'tag-coral'
    if (a.includes('create') || a.includes('add')) return 'tag-teal'
    if (a.includes('update')) return 'tag-yellow'
    return 'tag-purple'
  }

  return (
    <SectionCard
      title={`📋 Audit Logs — ${total} entries`}
      action={
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={inputStyle} placeholder="Filter by action…" value={filter.action}
            onChange={e => { setFilter(f => ({ ...f, action: e.target.value })); setPage(0) }} />
          <input style={inputStyle} placeholder="Resource type…" value={filter.resourceType}
            onChange={e => { setFilter(f => ({ ...f, resourceType: e.target.value })); setPage(0) }} />
          <button className="btn btn-outline btn-sm" onClick={() => { setPage(0); load() }}>↺</button>
        </div>
      }
    >
      {msg && <div className="error-msg" style={{ marginBottom: 12 }}>{msg}</div>}
      {loading ? <EmptyState icon="⏳" message="Loading logs…" /> : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  {['Action', 'Resource', 'User', 'IP Address', 'Timestamp'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 12px' }}>
                      <span className={`tag ${actionColor(l.action)}`}>{l.action || '—'}</span>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span className="tag tag-teal" style={{ fontSize: 10 }}>{l.resourceType || '—'}</span>
                      {l.resourceId && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4, fontFamily: 'monospace' }}>
                          #{(l.resourceId || '').slice(0, 6)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {l.userId ? `${l.userId.slice(0, 8)}…` : '—'}
                    </td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{l.ipAddress || '—'}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmt(l.createdAt, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <EmptyState icon="📋" message="No audit logs match the filter." />}
          </div>
          {total > PAGE && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Showing {page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <button className="btn btn-ghost btn-sm" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </SectionCard>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ config }) {
  const { theme, toggleTheme } = useTheme()
  const { user, updateUser } = useAuth()
  const [msg, setMsg] = useState({ type: '', text: '' })

  // Profile states
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  // Password states
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 3500)
  }

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) return flash('error', 'Name cannot be empty.')
    setUpdatingProfile(true)
    try {
      const updated = await userService.updateProfile({ fullName })
      updateUser({ full_name: updated.fullName }) // Supabase returns full_name, but userService returns fullName
      flash('success', 'Profile updated successfully.')
    } catch (err) {
      flash('error', err?.response?.data?.error || 'Failed to update profile.')
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) return flash('error', 'Password must be at least 6 characters.')
    if (newPassword !== confirmPassword) return flash('error', 'Passwords do not match.')
    
    setUpdatingPassword(true)
    try {
      await authService.changePassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      flash('success', 'Password updated successfully.')
    } catch (err) {
      flash('error', err?.response?.data?.error || 'Failed to update password.')
    } finally {
      setUpdatingPassword(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {msg.text && <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginBottom: 12 }}>{msg.text}</div>}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Profile Settings */}
        <SectionCard title="👤 Profile Settings">
          <div className="form-group">
            <div className="form-label">Full Name</div>
            <input 
              className="form-input" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              placeholder="Your full name"
            />
          </div>
          <button 
            className="btn btn-coral btn-sm" 
            onClick={handleUpdateProfile}
            disabled={updatingProfile || fullName === user?.full_name}
          >
            {updatingProfile ? 'Updating…' : 'Update Name'}
          </button>
        </SectionCard>

        {/* Security Settings */}
        <SectionCard title="🔒 Security Settings">
          <div className="form-group">
            <div className="form-label">New Password</div>
            <input 
              type="password"
              className="form-input" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="At least 6 characters"
            />
          </div>
          <div className="form-group">
            <div className="form-label">Confirm New Password</div>
            <input 
              type="password"
              className="form-input" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Repeat new password"
            />
          </div>
          <button 
            className="btn btn-coral btn-sm" 
            onClick={handleChangePassword}
            disabled={updatingPassword || !newPassword}
          >
            {updatingPassword ? 'Updating…' : 'Change Password'}
          </button>
        </SectionCard>
      </div>

      <SectionCard title="🎨 Theme & Appearance">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Dark Mode</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Toggle between light and dark visual themes.</div>
          </div>
          <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            style={{ padding: '8px 16px', fontSize: 14 }}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="⚙️ System Configuration">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {[
            ['Environment', config?.environment || '—', 'Current deployment environment'],
            ['CORS Origins', (config?.corsOrigins || []).join(', ') || '—', 'Allowed cross-origin requests'],
            ['Groq AI Status', config?.hasGroqKey ? 'Connected' : 'Missing Key', 'Used for AI interview generation'],
            ['Supabase Status', config?.hasSupabaseConfig ? 'Connected' : 'Not Configured', 'Main database & auth provider'],
            ['Data Retention', config?.retentionDays ? `${config.retentionDays} days` : 'Unlimited', 'How long interview data is stored'],
          ].map(([k, v, d]) => (
            <div key={k} style={{ padding: '16px', background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="🚀 Quick Actions">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => flash('success', 'System cache cleared.')}>🧹 Clear Cache</button>
          <button className="btn btn-outline btn-sm" onClick={() => flash('success', 'Maintenance mode scheduled.')}>🛠️ Maintenance Mode</button>
          <button className="btn btn-outline btn-sm" onClick={() => flash('success', 'System health check completed.')}>🩺 Run Health Check</button>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: '📊 Overview' },
  { id: 'sysanalytics', label: '📈 System Analytics' },
  { id: 'users',      label: '👥 Users' },
  { id: 'interviews', label: '🎯 Interviews' },
  { id: 'questions',  label: '❓ Questions' },
  { id: 'jobroles',   label: '💼 Job Roles' },
  { id: 'resources',  label: '📚 Resources' },
  { id: 'plans',      label: '💳 Plans' },
  { id: 'audit',      label: '📋 Audit Logs' },
  { id: 'settings',   label: '⚙️ Settings' },
]

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [metrics,   setMetrics]   = useState(null)
  const [config,    setConfig]    = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [timeseries, setTimeseries] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loggingOut, setLoggingOut] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [globalLoading, setGlobalLoading] = useState(null) // { message: string, progress: number }
  const [error, setError] = useState('')

  // Notifications state
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'error', text: 'Database latency spike detected (2.4s)', time: '10m ago', unread: true },
    { id: 2, type: 'success', text: 'New Premium Subscription: john@example.com', time: '45m ago', unread: true },
    { id: 3, type: 'warning', text: 'High failed login attempts from IP 192.168.1.45', time: '2h ago', unread: false },
  ])
  const [showNotifs, setShowNotifs] = useState(false)

  useEffect(() => {
    Promise.all([
      adminService.getDashboard().catch(() => null),
      adminService.getConfig().catch(() => null),
      adminService.getPlatformAnalytics().catch(() => null),
      adminService.getPlatformTimeseries().catch(() => null),
    ]).then(([m, c, a, ts]) => { setMetrics(m); setConfig(c); setAnalytics(a); setTimeseries(ts) })
  }, [])

  const handleLogout = () => {
    if (loggingOut) return
    setShowLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    setShowLogoutConfirm(false)
    setLoggingOut(true)
    setError('')
    try {
      await logout()
      navigate('/login')
    } catch (err) {
      console.error('Logout failed:', err)
      setError('Logout failed. Please try again.')
      setLoggingOut(false)
    }
  }

  const unreadCount = notifications.filter(n => n.unread).length

  if (!metrics && !config) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <Loading message="Initializing Admin Panel..." size={48} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text)' }}>
      {/* Nav */}
      <nav style={{
        background: 'var(--bg-page)', 
        borderBottom: '1px solid var(--border)',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, boxShadow: 'var(--shadow)',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--coral)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
          </div>
          <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-head)' }}>
            IntervuAI
            <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.6, marginLeft: 6, background: 'var(--bg2)', borderRadius: 4, padding: '2px 6px', color: 'var(--text)' }}>
              ADMIN
            </span>
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {metrics && (
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>👥 {metrics.totalUsers} users</span>
              <span>🎯 {metrics.totalInterviews} interviews</span>
            </div>
          )}

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => setShowNotifs(!showNotifs)}
              style={{ padding: '6px', color: 'var(--text)', border: 'none', position: 'relative' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && (
                <span style={{ 
                  position: 'absolute', top: 2, right: 2, background: 'var(--coral)', color: '#fff', 
                  fontSize: 9, fontWeight: 800, minWidth: 14, height: 14, borderRadius: 10, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1a1a2e'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div style={{ 
                position: 'absolute', top: '100%', right: 0, marginTop: 12, width: 320, 
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, 
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden', zIndex: 1000 
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                  <button style={{ background: 'none', border: 'none', color: 'var(--coral)', fontSize: 11, cursor: 'pointer' }} onClick={() => setNotifications(ns => ns.map(n => ({...n, unread: false})))}>Mark all read</button>
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{ 
                      padding: '12px 16px', borderBottom: '1px solid var(--border)', 
                      background: n.unread ? 'var(--bg-page)' : 'transparent',
                      display: 'flex', gap: 12, alignItems: 'flex-start'
                    }}>
                      <div style={{ 
                        width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                        background: n.type === 'error' ? 'var(--coral)' : n.type === 'success' ? 'var(--teal)' : 'var(--yellow)' 
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{n.text}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No new notifications</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</span>
          <Link to="/dashboard" style={{ fontSize: 12, color: 'var(--coral)', textDecoration: 'none', fontWeight: 600 }}>← User View</Link>
          <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            style={{ padding: '4px 8px', fontSize: 12, border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div style={{ position: 'relative' }}>
            {error && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'var(--coral)', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 11, whiteSpace: 'nowrap', zIndex: 1000 }}>
                {error}
              </div>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              disabled={loggingOut}
              style={{ color: 'var(--text)', borderColor: 'var(--border)', fontSize: 12 }}
            >
              {loggingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 4px', fontFamily: 'var(--font-head)', fontSize: 22 }}>Admin Control Panel</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
            Manage users, interviews, question bank, job roles, subscription plans, and review activity.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto',
          background: 'var(--card)', borderRadius: 12, padding: 6,
          border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500,
                background: activeTab === t.id ? 'var(--coral)' : 'transparent',
                color: activeTab === t.id ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="tab-content animate-fade-in">
          {activeTab === 'overview'   && <OverviewTab metrics={metrics} config={config} analytics={analytics} />}
          {activeTab === 'sysanalytics' && <SystemAnalyticsTab analytics={analytics} timeseries={timeseries} />}
          {activeTab === 'users'      && <UsersTab setGlobalLoading={setGlobalLoading} />}
          {activeTab === 'interviews' && <InterviewsTab setGlobalLoading={setGlobalLoading} />}
          {activeTab === 'questions'  && <QuestionsTab />}
          {activeTab === 'jobroles'   && <JobRolesTab />}
          {activeTab === 'resources'  && <ResourcesTab />}
          {activeTab === 'plans'      && <PlansTab />}
          {activeTab === 'audit'      && <AuditLogsTab />}
          {activeTab === 'settings'   && <SettingsTab config={config} />}
        </div>
      </div>

      {showLogoutConfirm && (
        <ConfirmModal 
          title="Sign Out"
          message="Are you sure you want to log out? You will need to sign in again to access the admin panel."
          onConfirm={confirmLogout}
          onClose={() => setShowLogoutConfirm(false)}
          confirmText="Sign Out"
          type="coral"
        />
      )}

      {globalLoading && (
        <div style={{ 
          position: 'fixed', bottom: 24, right: 24, width: 320, 
          background: 'var(--card)', border: '1px solid var(--border)', 
          borderRadius: 12, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          zIndex: 3000, animation: 'slide-up 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{globalLoading.message}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(globalLoading.progress)}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', width: `${globalLoading.progress}%`, 
              background: 'var(--coral)', transition: 'width 0.3s ease-out' 
            }} />
          </div>
          <style>{`
            @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
        </div>
      )}
    </div>
  )
}
