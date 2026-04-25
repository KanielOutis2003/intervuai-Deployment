/**
 * Beautiful confirmation & alert modal to replace window.confirm() and alert().
 *
 * Usage:
 *   <ConfirmModal
 *     isOpen={show}
 *     title="End Session?"
 *     message="Your progress will be saved."
 *     confirmLabel="End"              // default "OK"
 *     cancelLabel="Cancel"            // default "Cancel"
 *     variant="danger"                // "danger" | "warning" | "info" | "success"
 *     icon="⚠️"                       // optional custom icon
 *     onConfirm={() => {}}
 *     onCancel={() => {}}
 *     alertOnly                       // hides cancel button (alert mode)
 *   />
 */
import { useEffect, useRef } from 'react'

const VARIANTS = {
  danger:  { bg: '#fef2f2', border: '#fecaca', iconBg: '#fee2e2', iconColor: '#dc2626', btnBg: 'linear-gradient(135deg, #dc2626, #ef4444)', btnShadow: 'rgba(220,38,38,0.3)' },
  warning: { bg: '#fffbeb', border: '#fde68a', iconBg: '#fef3c7', iconColor: '#d97706', btnBg: 'linear-gradient(135deg, #d97706, #f59e0b)', btnShadow: 'rgba(217,119,6,0.3)' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', iconBg: '#dbeafe', iconColor: '#2563eb', btnBg: 'linear-gradient(135deg, #2563eb, #3b82f6)', btnShadow: 'rgba(37,99,235,0.3)' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', iconBg: '#dcfce7', iconColor: '#16a34a', btnBg: 'linear-gradient(135deg, #16a34a, #22c55e)', btnShadow: 'rgba(22,163,106,0.3)' },
}

const DEFAULT_ICONS = {
  danger: '🗑️',
  warning: '⚠️',
  info: 'ℹ️',
  success: '✅',
}

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  variant = 'warning',
  icon,
  onConfirm,
  onCancel,
  alertOnly = false,
}) {
  const confirmRef = useRef(null)
  const v = VARIANTS[variant] || VARIANTS.warning
  const displayIcon = icon || DEFAULT_ICONS[variant] || '⚠️'

  useEffect(() => {
    if (isOpen) confirmRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.() }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalPop { from { opacity: 0; transform: scale(0.92) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
      <div style={{
        background: '#fff', borderRadius: 16, maxWidth: 420, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        animation: 'modalPop 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Icon + Content */}
        <div style={{ padding: '28px 28px 20px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: v.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 26,
          }}>
            {displayIcon}
          </div>
          <h3 style={{
            margin: '0 0 8px', fontSize: 18, fontWeight: 700,
            fontFamily: 'var(--font-head, inherit)', color: 'var(--text, #1a1a1a)',
          }}>
            {title}
          </h3>
          {message && (
            <p style={{
              margin: 0, fontSize: 14, lineHeight: 1.6,
              color: 'var(--text-muted, #6b7280)',
            }}>
              {message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{
          padding: '0 28px 24px',
          display: 'flex', gap: 10,
          flexDirection: alertOnly ? 'column' : 'row',
        }}>
          {!alertOnly && (
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                background: 'var(--bg, #f5f5f5)', border: '1.5px solid var(--border, #e5e7eb)',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                color: 'var(--text, #374151)', transition: 'background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg, #f5f5f5)'}
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            onClick={onConfirm}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              background: v.btnBg, border: 'none',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              color: '#fff', boxShadow: `0 4px 14px ${v.btnShadow}`,
              transition: 'transform 0.1s, box-shadow 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
