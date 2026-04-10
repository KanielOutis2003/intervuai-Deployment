import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import resourceService from '../services/resourceService'
import subscriptionService from '../services/subscriptionService'

const LogoIcon = () => (
  <div className="nav-logo-icon">
    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
  </div>
)

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'guide',    label: 'Guides' },
  { key: 'article',  label: 'Articles' },
  { key: 'video',    label: 'Videos' },
  { key: 'template', label: 'Templates' },
  { key: 'tip',      label: 'Tips & Exercises' },
]

const CATEGORY_TILES = [
  { icon: '📖', label: 'Guides',        tab: 'guide',    desc: 'Comprehensive prep resources' },
  { icon: '🎥', label: 'Videos',        tab: 'video',    desc: 'Visual learning modules' },
  { icon: '💡', label: 'Tips',          tab: 'tip',      desc: 'Bite-sized advice' },
  { icon: '📝', label: 'Templates',     tab: 'template', desc: 'CV and cover letter templates' },
]

const DIFFICULTY_COLOR = { beginner: 'tag-teal', intermediate: 'tag-yellow', advanced: 'tag-coral' }
const TYPE_ICON = { guide: '📖', article: '📰', video: '🎥', template: '📝', tip: '💡', exercise: '🏋️' }

function fmtReads(n) {
  if (!n && n !== 0) return ''
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

// Parse special content markers from the content field
function parseResourceContent(content) {
  if (!content) return { youtubeId: null, youtubeSearch: null, body: null }
  const ytId = content.match(/^YOUTUBE:([a-zA-Z0-9_-]+)/)?.[1] ?? null
  const ytSearch = content.match(/^YOUTUBE_SEARCH:([^\n]+)/)?.[1]?.trim() ?? null
  const body = content.replace(/^YOUTUBE[^\n]*\n\n?/, '').trim() || null
  return { youtubeId: ytId, youtubeSearch: ytSearch, body }
}

// Lightweight markdown-lite renderer (handles ##, ###, **, -, ☐, ---)
function RichContent({ text }) {
  if (!text) return null
  const renderInline = (line) => {
    const parts = line.split(/\*\*([^*]+)\*\*/)
    return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)
  }
  return (
    <div>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h5 key={i} style={{ fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700, margin: '16px 0 6px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{line.slice(4)}</h5>
        if (line.startsWith('## ')) return <h4 key={i} style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800, margin: '22px 0 8px', color: 'var(--text)' }}>{line.slice(3)}</h4>
        if (line.startsWith('# ')) return <h3 key={i} style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, margin: '24px 0 10px', color: 'var(--text)' }}>{line.slice(2)}</h3>
        if (line.startsWith('---')) return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />
        if (line.startsWith('☐ ')) return <div key={i} style={{ display: 'flex', gap: 10, margin: '5px 0', fontSize: 14, alignItems: 'flex-start' }}><span style={{ flexShrink: 0, marginTop: 1 }}>☐</span><span style={{ lineHeight: 1.6 }}>{renderInline(line.slice(2))}</span></div>
        if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ display: 'flex', gap: 10, margin: '5px 0', fontSize: 14, alignItems: 'flex-start' }}><span style={{ color: 'var(--coral)', flexShrink: 0, marginTop: 2, fontWeight: 700 }}>•</span><span style={{ lineHeight: 1.6 }}>{renderInline(line.slice(2))}</span></div>
        if (/^\d+\.\s/.test(line)) { const m = line.match(/^(\d+)\.\s(.+)/); return m ? <div key={i} style={{ display: 'flex', gap: 10, margin: '5px 0', fontSize: 14, alignItems: 'flex-start' }}><span style={{ color: 'var(--coral)', flexShrink: 0, fontWeight: 700, minWidth: 18 }}>{m[1]}.</span><span style={{ lineHeight: 1.6 }}>{renderInline(m[2])}</span></div> : <p key={i} style={{ margin: '4px 0', fontSize: 14 }}>{line}</p> }
        if (line.startsWith('|') && line.includes('|')) return <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, padding: '3px 0', color: 'var(--text-muted)', overflowX: 'auto', whiteSpace: 'pre' }}>{line}</div>
        if (!line.trim()) return <div key={i} style={{ height: 8 }} />
        return <p key={i} style={{ margin: '5px 0', fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{renderInline(line)}</p>
      })}
    </div>
  )
}

function ResourceModal({ resource, onClose }) {
  const [copied, setCopied] = useState(false)

  if (!resource) return null

  const { youtubeId, youtubeSearch, body } = parseResourceContent(resource.content)
  const isVideo = resource.resourceType === 'video'
  const isTemplate = resource.resourceType === 'template'
  const typeIcon = TYPE_ICON[resource.resourceType] || '📄'
  const diffCls = DIFFICULTY_COLOR[resource.difficulty] || 'tag-purple'
  const maxWidth = isVideo ? 740 : 660

  const handleCopy = () => {
    const text = body || resource.content || ''
    navigator.clipboard.writeText(text)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })
      .catch(() => {})
  }

  const handleDownload = () => {
    const text = (body || resource.content || '')
      .replace(/^#+\s+/gm, '').replace(/\*\*/g, '')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(resource.title || 'template').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: '#fff', zIndex: 2, borderRadius: '20px 20px 0 0', flexShrink: 0 }}>
          <button onClick={onClose} style={{ position: 'absolute', right: 18, top: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, padding: 4 }}>✕</button>
          <div style={{ display: 'flex', gap: 7, marginBottom: 10, flexWrap: 'wrap', paddingRight: 36 }}>
            <span className="tag tag-coral">{typeIcon} {resource.resourceType || 'resource'}</span>
            {resource.category && <span className="tag tag-purple">{resource.category}</span>}
            {resource.difficulty && <span className={`tag ${diffCls}`}>{resource.difficulty}</span>}
            {resource.readCount > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>📖 {fmtReads(resource.readCount)} reads</span>}
          </div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 21, fontWeight: 800, lineHeight: 1.3, margin: 0, paddingRight: 40 }}>{resource.title}</h2>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '20px 28px 28px', overflowY: 'auto', flex: 1 }}>

          {/* ── VIDEO: YouTube embed ── */}
          {isVideo && youtubeId && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 14, background: '#000', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&color=white`}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: 14 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={resource.title}
                  loading="lazy"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <a href={`https://www.youtube.com/watch?v=${youtubeId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
                  ↗ Open in YouTube
                </a>
              </div>
            </div>
          )}

          {/* ── VIDEO: No known ID — YouTube search link ── */}
          {isVideo && !youtubeId && (
            <div style={{ background: 'linear-gradient(135deg,#ff2d55,#e8445a)', borderRadius: 14, padding: '28px 24px', marginBottom: 20, textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>▶</div>
              <p style={{ fontSize: 15, marginBottom: 4, fontWeight: 600 }}>Watch on YouTube</p>
              <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 20 }}>Find curated interview videos on this topic</p>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearch || resource.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block', background: '#fff', color: '#e8445a', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
              >
                🔍 Search Related Videos →
              </a>
            </div>
          )}

          {/* ── TEMPLATE: Action bar ── */}
          {isTemplate && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <button className="btn btn-coral" onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                ⬇ Download .txt
              </button>
              <button className="btn btn-ghost" onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
              </button>
            </div>
          )}

          {/* Description */}
          {resource.description && (
            <p style={{ color: 'var(--text-muted)', marginBottom: 18, fontSize: 14, lineHeight: 1.65 }}>{resource.description}</p>
          )}

          {/* Content body */}
          {body && (
            <>
              {isTemplate ? (
                /* Template: document-style preview */
                <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ background: '#f7f7f8', padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>📄 DOCUMENT TEMPLATE</span>
                    <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: copied ? 'var(--teal-dark)' : 'var(--coral)', fontWeight: 700, padding: '4px 8px', borderRadius: 6 }}>
                      {copied ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                  <div style={{ padding: '20px 22px', fontFamily: "'Georgia', serif", fontSize: 13.5, lineHeight: 1.9, background: '#fff' }}>
                    <RichContent text={body} />
                  </div>
                </div>
              ) : (
                /* Guide/Article/Video/Tip: reading-format */
                <div style={{ paddingTop: (isVideo && (youtubeId || !youtubeId)) ? 0 : 0 }}>
                  {isVideo && <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📝 Video Notes</div>}
                  <RichContent text={body} />
                </div>
              )}
            </>
          )}

          {/* Tags */}
          {resource.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
              {resource.tags.map(t => (
                <span key={t} style={{ background: 'var(--bg)', padding: '4px 12px', borderRadius: 20, fontSize: 12, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>#{t}</span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, marginTop: 26, flexWrap: 'wrap' }}>
            {isTemplate && (
              <button className="btn btn-coral" onClick={handleDownload}>⬇ Download Template</button>
            )}
            <button className="btn btn-ghost btn-full" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubscriptionModal({ plan, subscribing, onConfirm, onClose }) {
  if (!plan) return null
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}
      onClick={() => !subscribing && onClose()}
    >
      <div
        style={{ background: '#fff', borderRadius: 18, padding: 32, width: '100%', maxWidth: 450, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', textAlign: 'center' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Confirm Subscription</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          You are about to subscribe to <strong>{plan.name}</strong> for <strong>${plan.price}/mo</strong>.
        </p>
        <div style={{ background: 'var(--bg)', padding: 20, borderRadius: 12, marginBottom: 24, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
            <span>Plan</span><span style={{ fontWeight: 700 }}>{plan.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
            <span>Billing Period</span><span style={{ fontWeight: 700 }}>Monthly</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8, fontWeight: 800 }}>
            <span>Total Due Today</span><span style={{ color: 'var(--coral)' }}>${plan.price}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-coral btn-full" onClick={onConfirm} disabled={subscribing}>
            {subscribing ? 'Processing...' : 'Confirm & Subscribe →'}
          </button>
          <button className="btn btn-ghost" onClick={onClose} disabled={subscribing}>Cancel</button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 16 }}>This is a demo. No real money will be charged.</p>
      </div>
    </div>
  )
}

export default function ResourceHubPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [resources, setResources] = useState([])
  const [tips, setTips] = useState([])
  const [plans, setPlans] = useState([])
  const [mySubscription, setMySubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)
  const [showSubModal, setShowSubModal] = useState(false)
  const [pendingPlan, setPendingPlan] = useState(null)

  useEffect(() => {
    Promise.all([
      resourceService.listResources(),
      resourceService.getTips(),
      resourceService.getSubscriptionPlans(),
      subscriptionService.getMySubscription().catch(() => null),
    ]).then(([res, t, p, mySub]) => {
      setResources(res?.resources || [])
      setTips(t || [])
      setPlans(p || [])
      setMySubscription(mySub?.subscription || null)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Compute tab counts
  const tabCounts = useMemo(() => {
    const counts = { all: resources.length }
    resources.forEach(r => {
      const t = r.resourceType
      if (t) counts[t] = (counts[t] || 0) + 1
    })
    counts.tip = (counts.tip || 0) + (counts.exercise || 0)
    return counts
  }, [resources])

  // Compute category tile counts from real data
  const tileCounts = useMemo(() => ({
    guide: resources.filter(r => r.resourceType === 'guide').length,
    video: resources.filter(r => r.resourceType === 'video').length,
    tip: tips.length,
    template: resources.filter(r => r.resourceType === 'template').length,
  }), [resources, tips])

  // Filter resources by active tab + search
  const filteredResources = useMemo(() => {
    let list = resources
    if (activeTab === 'tip') {
      // Show tips state (includes tip + exercise types from dedicated endpoint)
      list = tips
    } else if (activeTab !== 'all') {
      list = resources.filter(r => r.resourceType === activeTab)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.tags?.some(t => t.toLowerCase().includes(q))
      )
    }
    return list
  }, [resources, tips, activeTab, search])

  // Featured = top 3 by readCount from all resources
  const featuredResources = useMemo(() =>
    [...resources].sort((a, b) => (b.readCount || 0) - (a.readCount || 0)).slice(0, 3),
    [resources]
  )

  const handleResourceClick = async (resource) => {
    setSelectedResource(resource)
    if (resource.id) {
      await resourceService.trackRead(resource.id)
      // Optimistically update readCount in state
      setResources(prev => prev.map(r => r.id === resource.id ? { ...r, readCount: (r.readCount || 0) + 1 } : r))
      setTips(prev => prev.map(t => t.id === resource.id ? { ...t, readCount: (t.readCount || 0) + 1 } : t))
    }
  }

  const handleSubscribeClick = (plan) => {
    if (mySubscription?.planId === plan.id) return
    setPendingPlan(plan)
    setShowSubModal(true)
  }

  const confirmSubscription = async () => {
    if (!pendingPlan) return
    setSubscribing(true)
    try {
      await subscriptionService.subscribe(pendingPlan.id)
      const mySub = await subscriptionService.getMySubscription()
      setMySubscription(mySub?.subscription || null)
      setShowSubModal(false)
      setPendingPlan(null)
      alert(`Successfully subscribed to ${pendingPlan.name}!`)
    } catch {
      alert('Failed to subscribe. Please try again.')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div>
      {/* Nav */}
      <nav className="res-nav">
        <Link to="/" className="nav-logo">
          <LogoIcon />
          <span className="nav-logo-text">IntervuAI</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/dashboard" className="btn btn-ghost btn-sm">← Dashboard</Link>
          <Link to="/analytics" className="btn btn-ghost btn-sm">Analytics</Link>
          <button className="btn btn-coral btn-sm" onClick={() => navigate('/interview/chat')}>Start Practice</button>
        </div>
      </nav>

      <div className="res-body">
        {/* Header */}
        <div className="res-header">
          <h2>Resource Hub</h2>
          <p>Everything you need to prepare for your next interview</p>
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              placeholder="Search guides, articles, tips..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: '0 8px' }}
              >✕</button>
            )}
          </div>
        </div>

        {/* Category Tiles */}
        <div className="cat-tiles">
          {CATEGORY_TILES.map(c => (
            <div
              className={`cat-tile${activeTab === c.tab ? ' active' : ''}`}
              key={c.tab}
              onClick={() => setActiveTab(activeTab === c.tab ? 'all' : c.tab)}
              style={{ cursor: 'pointer' }}
            >
              <div className="cat-tile-icon">{c.icon}</div>
              <h4>{c.label}</h4>
              <p>{c.desc} · {tileCounts[c.tab] || 0} items</p>
            </div>
          ))}
        </div>

        {/* Featured Resources */}
        {!loading && featuredResources.length > 0 && (
          <>
            <div className="res-section-title">Featured Resources</div>
            <div className="feat-grid">
              {featuredResources.map(r => (
                <div className="feat-card" key={r.id} onClick={() => handleResourceClick(r)} style={{ cursor: 'pointer' }}>
                  <div className="feat-card-top">
                    <span className="tag tag-coral">{TYPE_ICON[r.resourceType] || '📄'} {r.resourceType}</span>
                    {r.readCount > 0 && <div className="feat-rating">📖 {fmtReads(r.readCount)}</div>}
                  </div>
                  <h4>{r.title}</h4>
                  <p>{r.description || 'Click to read more.'}</p>
                  <div className="feat-card-meta">
                    <span>{r.category}</span>
                    {r.difficulty && <span className={`tag ${DIFFICULTY_COLOR[r.difficulty] || 'tag-purple'}`}>{r.difficulty}</span>}
                  </div>
                  <button className="feat-access">Access Resource →</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="res-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`res-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span style={{ marginLeft: 6, background: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : 'var(--bg)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                  {tab.key === 'tip' ? (tips.length || tabCounts.tip || 0) : (tabCounts[tab.key] || 0)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Resource List */}
        <div className="res-list">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <div className="res-item" key={i} style={{ opacity: 0.5 }}>
                <div className="res-item-left">
                  <div style={{ height: 18, background: 'var(--border)', borderRadius: 6, width: '60%', marginBottom: 8 }} />
                  <div style={{ height: 14, background: 'var(--border)', borderRadius: 6, width: '80%', marginBottom: 8 }} />
                  <div style={{ height: 12, background: 'var(--border)', borderRadius: 6, width: '40%' }} />
                </div>
              </div>
            ))
          ) : filteredResources.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <h4 style={{ fontFamily: 'var(--font-head)', marginBottom: 8 }}>
                {search ? 'No results found' : 'No resources yet'}
              </h4>
              <p style={{ fontSize: 14 }}>
                {search ? `Try a different search term.` : 'Check back soon — resources are being added.'}
              </p>
              {search && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setSearch('')}>
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filteredResources.map(r => {
              const typeIcon = TYPE_ICON[r.resourceType] || '📄'
              const diffCls = DIFFICULTY_COLOR[r.difficulty] || ''
              return (
                <div className="res-item" key={r.id || r.title} onClick={() => handleResourceClick(r)} style={{ cursor: 'pointer' }}>
                  <div className="res-item-left">
                    <h4>
                      <span className="tag tag-coral" style={{ marginRight: 8 }}>{typeIcon} {r.resourceType || 'article'}</span>
                      {r.title}
                    </h4>
                    <p>{r.description || 'Click to read this resource.'}</p>
                    <div className="res-item-meta">
                      {r.category && <span className="tag tag-purple">{r.category}</span>}
                      {r.difficulty && <span className={`tag ${diffCls}`}>{r.difficulty}</span>}
                      {r.readCount > 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>📖 {fmtReads(r.readCount)} reads</span>}
                      {r.tags?.slice(0, 2).map(t => (
                        <span key={t} style={{ fontSize: 12, color: 'var(--text-light)' }}>#{t}</span>
                      ))}
                    </div>
                  </div>
                  <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>→</span>
                </div>
              )
            })
          )}
        </div>

        {/* Subscription Plans */}
        {plans.length > 0 && (
          <>
            <div className="res-section-title" style={{ marginTop: 40 }}>Subscription Plans</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
              {plans.map(p => (
                <div className="feat-card" key={p.id} style={{ textAlign: 'center' }}>
                  <h4 style={{ fontSize: 20, marginBottom: 8 }}>{p.name}</h4>
                  <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-head)', color: 'var(--coral)', marginBottom: 8 }}>
                    {p.price === 0 ? 'Free' : `$${p.price}`}
                    {p.price > 0 && <span style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>/mo</span>}
                  </div>
                  <p style={{ marginBottom: 16, fontSize: 13 }}>{p.description}</p>
                  <ul style={{ listStyle: 'none', textAlign: 'left', marginBottom: 20, fontSize: 13 }}>
                    {(p.features || []).map(f => (
                      <li key={f} style={{ padding: '4px 0', display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--teal-dark)' }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="feat-access"
                    onClick={() => handleSubscribeClick(p)}
                    disabled={subscribing || mySubscription?.planId === p.id}
                  >
                    {mySubscription?.planId === p.id ? 'Current Plan' : (p.price === 0 ? 'Start Free' : 'Get Started')}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Personalized CTA */}
        <div className="personalized-cta">
          <div className="cta-icon">🎯</div>
          <h3>Get Personalized Recommendations</h3>
          <p>Based on your interview performance, we'll recommend resources tailored to your specific improvement areas.</p>
          <button className="btn btn-coral btn-lg" onClick={() => navigate('/analytics')}>View My Analytics →</button>
        </div>
      </div>

      {/* Modals */}
      <ResourceModal resource={selectedResource} onClose={() => setSelectedResource(null)} />
      <SubscriptionModal
        plan={showSubModal ? pendingPlan : null}
        subscribing={subscribing}
        onConfirm={confirmSubscription}
        onClose={() => { setShowSubModal(false); setPendingPlan(null) }}
      />
    </div>
  )
}
