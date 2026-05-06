import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-page, #f9fafb)',
          padding: '32px',
          textAlign: 'center',
        }}>
          <div style={{
            background: 'var(--card, #fff)',
            color: 'var(--text, #111827)',
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: '16px',
            padding: '48px 40px',
            maxWidth: '480px',
            boxShadow: '0 18px 46px rgba(0,0,0,.5)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8, color: 'var(--text, #1a1a2e)' }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              An unexpected error occurred. This has been logged automatically.
              Please reload the page to continue.
            </p>
            {this.state.error && (
              <details style={{ marginBottom: 24, textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-light, #9ca3af)', marginBottom: 8 }}>
                  Error details
                </summary>
                <pre style={{
                  background: 'var(--bg, #f3f4f6)',
                  borderRadius: 8,
                  padding: '12px',
                  fontSize: 11,
                  color: 'var(--text, #374151)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReload}
              style={{
                background: '#ff6b6b',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 28px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
