import { useState } from 'react'
import { useSubscription } from '../context/SubscriptionContext'
import GCashPaymentModal from './GCashPaymentModal'

const FREE_FEATURES = [
  { text: '5 interviews/month', included: true },
  { text: 'Basic feedback', included: true },
  { text: 'Limited question bank', included: true },
  { text: 'AI feedback', included: false },
  { text: 'Session summaries', included: false },
  { text: 'Progress tracking', included: false },
]

const PREMIUM_FEATURES = [
  { text: 'Unlimited interviews', included: true },
  { text: 'AI feedback', included: true },
  { text: 'Full question bank', included: true },
  { text: 'Session summaries', included: true },
  { text: 'Progress tracking', included: true },
  { text: 'Priority support', included: true },
]

const USD_TO_PHP = 56

export default function UpgradeModal({ isOpen, onClose }) {
  const { plans, subscribe } = useSubscription()
  const [showGCash, setShowGCash] = useState(false)
  const [success, setSuccess]     = useState(false)

  if (!isOpen) return null

  const premiumPlan = plans.find(p => p.price > 0 && p.name?.toLowerCase().includes('premium'))
    || plans.find(p => p.price > 0)

  const phpAmount = premiumPlan ? Math.round(premiumPlan.price * USD_TO_PHP) : 0

  const handleGCashSuccess = async (planId) => {
    // Called by GCashPaymentModal after simulated payment — activates real subscription
    await subscribe(planId)
    setShowGCash(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div style={{
          background: 'var(--card)', borderRadius: 18, padding: 40, width: 420,
          maxWidth: '92vw', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            Welcome to Premium!
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
            Your GCash payment was confirmed. You now have full access to all premium features.
          </p>
          <button className="btn btn-coral btn-full" onClick={onClose}>
            Start Using Premium 🚀
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div style={{
          background: 'var(--card)', borderRadius: 18, padding: '32px 32px 28px',
          width: 720, maxWidth: '92vw', boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          maxHeight: '90vh', overflow: 'auto',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                Upgrade Your Plan
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Card · GCash · Maya · GrabPay — secure checkout
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
          </div>

          {/* Plan cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Free Plan */}
            <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 24, border: '1.5px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Free</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                ₱0<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Basic access to interview practice</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {FREE_FEATURES.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ color: f.included ? 'var(--teal)' : 'var(--text-light)', fontSize: 14 }}>
                      {f.included ? '✓' : '✗'}
                    </span>
                    <span style={{ color: f.included ? 'var(--text)' : 'var(--text-light)', textDecoration: f.included ? 'none' : 'line-through' }}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost btn-full" style={{ marginTop: 20 }} disabled>Current Plan</button>
            </div>

            {/* Premium Plan */}
            <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 24, border: '2px solid var(--coral)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -10, right: 16, background: 'var(--coral)', color: '#fff', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                RECOMMENDED
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--coral)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Premium</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                ₱{phpAmount.toLocaleString()}
                <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Full access with AI-powered features</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PREMIUM_FEATURES.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--teal)', fontSize: 14 }}>✓</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>

              {/* Checkout button */}
              <button
                onClick={() => setShowGCash(true)}
                disabled={!premiumPlan}
                style={{
                  marginTop: 20, width: '100%', padding: '11px 0',
                  background: 'linear-gradient(135deg, #5046e5, #7c3aed)',
                  color: '#fff', border: 'none',
                  borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: premiumPlan ? 1 : 0.5, transition: 'opacity 0.2s',
                  boxShadow: '0 4px 14px rgba(80,70,229,0.3)',
                }}
                onMouseEnter={e => { if (premiumPlan) e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => { if (premiumPlan) e.currentTarget.style.opacity = '1' }}
              >
                🔒 Checkout  ₱{phpAmount.toLocaleString()}/mo
              </button>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 10 }}>
                {['💳 Card', 'GCash', 'Maya', 'GrabPay'].map(m => (
                  <span key={m} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg2)', borderRadius: 6, padding: '2px 7px' }}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Payment trust badges */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
            padding: '14px 0', borderTop: '1px solid var(--border)',
          }}>
            {[
              { icon: '🔒', label: '256-bit SSL' },
              { icon: '🛡️', label: 'PCI DSS' },
              { icon: '⚡', label: 'Instant Access' },
              { icon: '↩️', label: 'Cancel Anytime' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GCash Payment Modal */}
      <GCashPaymentModal
        isOpen={showGCash}
        onClose={() => setShowGCash(false)}
        plan={premiumPlan}
        onSuccess={handleGCashSuccess}
      />
    </>
  )
}
