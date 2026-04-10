/**
 * PaymentModal — Multi-Method Payment Simulation
 *
 * Simulates a realistic premium checkout experience with:
 *   • Credit / Debit Card  (Visa, Mastercard, JCB, Amex)
 *   • GCash QR
 *   • Maya QR
 *   • GrabPay QR
 *
 * After any simulated confirmation the real subscribe() is called
 * to activate the premium subscription in the database.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'

/* ─── Constants ────────────────────────────────────────────────────────── */
const USD_TO_PHP   = 56
const toPHP        = (usd) => Math.round((usd || 0) * USD_TO_PHP)

const EWALLET_COUNTDOWN = 20  // seconds

/* ─── Card helpers ─────────────────────────────────────────────────────── */
const CARD_PATTERNS = {
  amex:       { re: /^3[47]/,      len: 15, cvvLen: 4, fmt: [4, 6, 5],  color: '#2E77BC', label: 'Amex' },
  jcb:        { re: /^35/,         len: 16, cvvLen: 3, fmt: [4, 4, 4, 4], color: '#003087', label: 'JCB' },
  mastercard: { re: /^5[1-5]|^2[2-7]/, len: 16, cvvLen: 3, fmt: [4, 4, 4, 4], color: '#EB001B', label: 'Mastercard' },
  visa:       { re: /^4/,          len: 16, cvvLen: 3, fmt: [4, 4, 4, 4], color: '#1A1F71', label: 'Visa' },
}

function detectCard(num) {
  const n = num.replace(/\D/g, '')
  for (const [type, cfg] of Object.entries(CARD_PATTERNS)) {
    if (cfg.re.test(n)) return { type, ...cfg }
  }
  return null
}

function formatCardNumber(raw, card) {
  const digits = raw.replace(/\D/g, '')
  const groups = card ? card.fmt : [4, 4, 4, 4]
  const maxLen  = card ? card.len : 16
  const capped  = digits.slice(0, maxLen)
  const parts   = []
  let cursor = 0
  for (const g of groups) {
    if (cursor >= capped.length) break
    parts.push(capped.slice(cursor, cursor + g))
    cursor += g
  }
  return parts.join(' ')
}

function luhnCheck(num) {
  const digits = num.replace(/\D/g, '').split('').reverse().map(Number)
  const sum = digits.reduce((acc, d, i) => {
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9 }
    return acc + d
  }, 0)
  return sum % 10 === 0
}

/* ─── Sandbox hint cards ───────────────────────────────────────────────── */
const SANDBOX_CARDS = [
  { label: 'Visa',       number: '4242 4242 4242 4242', expiry: '12/28', cvv: '123' },
  { label: 'Mastercard', number: '5555 5555 5555 4444', expiry: '08/27', cvv: '456' },
  { label: 'Amex',       number: '3782 822463 10005',   expiry: '03/29', cvv: '1234' },
  { label: 'JCB',        number: '3530 1113 3330 0000', expiry: '01/26', cvv: '789' },
]

/* ─── Payment methods config ───────────────────────────────────────────── */
const METHODS = [
  { id: 'card',    label: 'Card',    icon: '💳' },
  { id: 'gcash',   label: 'GCash',   icon: null, color: '#0070CD' },
  { id: 'maya',    label: 'Maya',    icon: null, color: '#00B050' },
  { id: 'grabpay', label: 'GrabPay', icon: null, color: '#00B14F' },
]

const EWALLET_META = {
  gcash:   { name: 'GCash',   color: '#0070CD', light: '#E8F4FF', hint: 'GCash app → Pay QR' },
  maya:    { name: 'Maya',    color: '#00B050', light: '#E6F5EC', hint: 'Maya app → Scan to Pay' },
  grabpay: { name: 'GrabPay', color: '#00B14F', light: '#E6F5EC', hint: 'Grab app → Pay → Scan QR' },
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* ─── Sub-components ────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════ */

/* Step indicator */
function Steps({ step }) {
  const labels = ['Method', 'Payment', 'Confirm']
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 20 }}>
      {labels.map((label, i) => {
        const idx        = i + 1
        const isActive   = idx === step
        const isComplete = idx < step
        const color      = isComplete || isActive ? '#5046e5' : '#d1d5db'
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: isComplete || isActive ? '#5046e5' : 'var(--border)',
                color: isComplete || isActive ? '#fff' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, transition: 'all 0.3s',
              }}>
                {isComplete ? '✓' : idx}
              </div>
              <div style={{ fontSize: 10, color, fontWeight: isActive ? 700 : 400 }}>{label}</div>
            </div>
            {i < labels.length - 1 && (
              <div style={{
                width: 40, height: 2, margin: '0 4px', marginBottom: 16,
                background: isComplete ? '#5046e5' : 'var(--border)', transition: 'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* Method selector */
function MethodSelector({ selected, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
      {METHODS.map(m => {
        const isActive = selected === m.id
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              padding: '12px 10px', borderRadius: 10, cursor: 'pointer',
              border: `2px solid ${isActive ? '#5046e5' : 'var(--border)'}`,
              background: isActive ? '#f0f0ff' : 'var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.18s', fontWeight: isActive ? 700 : 500,
              fontSize: 13, color: isActive ? '#5046e5' : 'var(--text)',
            }}
          >
            {m.icon ? (
              <span style={{ fontSize: 18 }}>{m.icon}</span>
            ) : (
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: m.color, color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 900, flexShrink: 0,
              }}>{m.label[0]}</span>
            )}
            {m.label}
            {isActive && <span style={{ marginLeft: 'auto', color: '#5046e5' }}>✓</span>}
          </button>
        )
      })}
    </div>
  )
}

/* Animated card preview */
function CardPreview({ number, name, expiry, cvv, card, flipped }) {
  const displayNum = number
    ? number.padEnd(card ? card.len : 16, '·').replace(/(.{4})/g, '$1 ').trim()
    : '•••• •••• •••• ••••'

  return (
    <div style={{ perspective: 800, height: 110, marginBottom: 20 }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.5s ease',
        transform: flipped ? 'rotateY(180deg)' : 'none',
      }}>
        {/* Front */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          background: card
            ? `linear-gradient(135deg, ${card.color}dd, ${card.color}99)`
            : 'linear-gradient(135deg, #374151, #1f2937)',
          borderRadius: 12, padding: '14px 18px',
          boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
          color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 10, opacity: 0.8, letterSpacing: 1, textTransform: 'uppercase' }}>
              {card ? card.label : 'Card'}
            </div>
            {/* Chip */}
            <div style={{
              width: 28, height: 20, borderRadius: 3,
              background: 'linear-gradient(135deg, #d4af37, #b8962e)',
              border: '1px solid rgba(255,255,255,0.2)',
            }} />
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 15, letterSpacing: 2.5, opacity: 0.95 }}>
            {displayNum}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 8, opacity: 0.7, marginBottom: 2, textTransform: 'uppercase' }}>Card Holder</div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
                {name || 'FULL NAME'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 8, opacity: 0.7, marginBottom: 2, textTransform: 'uppercase' }}>Expires</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{expiry || 'MM/YY'}</div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: card
            ? `linear-gradient(135deg, ${card.color}bb, ${card.color}77)`
            : 'linear-gradient(135deg, #374151, #1f2937)',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
          color: '#fff',
        }}>
          {/* Magnetic strip */}
          <div style={{ height: 28, background: '#111', marginTop: 18, marginBottom: 12 }} />
          <div style={{ padding: '0 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 30, background: 'rgba(255,255,255,0.9)', borderRadius: 3 }} />
            <div style={{
              width: 50, height: 30, background: 'rgba(255,255,255,0.9)', borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#333', fontSize: 13, fontWeight: 700, fontFamily: 'monospace',
              letterSpacing: 2,
            }}>
              {cvv || '•••'}
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textAlign: 'right', padding: '6px 18px 0' }}>
            CVV
          </div>
        </div>
      </div>
    </div>
  )
}

/* Card form */
function CardForm({ onPay, amount }) {
  const [number,  setNumber]  = useState('')
  const [name,    setName]    = useState('')
  const [expiry,  setExpiry]  = useState('')
  const [cvv,     setCvv]     = useState('')
  const [saveCard, setSave]   = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [errors,  setErrors]  = useState({})
  const [showTip, setShowTip] = useState(false)

  const card = detectCard(number)

  const handleNumber = (e) => {
    const formatted = formatCardNumber(e.target.value, card)
    setNumber(formatted)
  }

  const handleExpiry = (e) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2, 4)
    setExpiry(val)
  }

  const validate = () => {
    const errs = {}
    const digits = number.replace(/\D/g, '')
    if (!digits || digits.length < (card?.len || 16)) errs.number = 'Invalid card number'
    else if (!luhnCheck(digits)) errs.number = 'Card number is not valid'
    if (!name.trim()) errs.name = 'Name required'
    const [m, y] = expiry.split('/')
    if (!m || !y || isNaN(m) || isNaN(y) || parseInt(m) > 12 || parseInt(m) < 1) errs.expiry = 'Invalid expiry'
    const now = new Date(); const expYear = 2000 + parseInt(y); const expMon = parseInt(m)
    if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMon < now.getMonth() + 1)) errs.expiry = 'Card expired'
    if (!cvv || cvv.length < (card?.cvvLen || 3)) errs.cvv = 'Invalid CVV'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const fillSandbox = (c) => {
    setNumber(c.number)
    setExpiry(c.expiry)
    setCvv(c.cvv)
    setName('Test User')
    setErrors({})
  }

  return (
    <div>
      <CardPreview number={number} name={name.toUpperCase()} expiry={expiry} cvv={cvv} card={card} flipped={flipped} />

      {/* Sandbox helper */}
      <button
        type="button"
        onClick={() => setShowTip(t => !t)}
        style={{
          background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8,
          padding: '6px 12px', fontSize: 11, fontWeight: 600, color: '#92400e',
          cursor: 'pointer', width: '100%', marginBottom: 14, textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        🧪 Sandbox mode — click to see test card numbers {showTip ? '▲' : '▼'}
      </button>
      {showTip && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14,
        }}>
          {SANDBOX_CARDS.map(c => (
            <button
              key={c.label}
              type="button"
              onClick={() => fillSandbox(c)}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 10px', cursor: 'pointer', textAlign: 'left', fontSize: 11,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#5046e5'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{c.label}</div>
              <div style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 10 }}>{c.number}</div>
            </button>
          ))}
        </div>
      )}

      {/* Card number */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text-muted)' }}>Card Number</label>
        <div style={{ position: 'relative' }}>
          <input
            value={number}
            onChange={handleNumber}
            placeholder="1234 5678 9012 3456"
            maxLength={card ? card.fmt.reduce((a,b)=>a+b,0) + card.fmt.length - 1 : 19}
            style={{
              width: '100%', padding: '10px 42px 10px 12px', borderRadius: 9, fontSize: 14,
              border: `1.5px solid ${errors.number ? '#ef4444' : 'var(--border)'}`,
              background: 'var(--bg)', color: 'var(--text)', fontFamily: 'monospace',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {card && (
            <div style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              width: 28, height: 18, borderRadius: 3,
              background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, color: '#fff', fontWeight: 900, letterSpacing: 0.3,
            }}>
              {card.label.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        {errors.number && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 3 }}>{errors.number}</div>}
      </div>

      {/* Cardholder */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text-muted)' }}>Cardholder Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Juan dela Cruz"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 14,
            border: `1.5px solid ${errors.name ? '#ef4444' : 'var(--border)'}`,
            background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
          }}
        />
        {errors.name && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 3 }}>{errors.name}</div>}
      </div>

      {/* Expiry + CVV */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text-muted)' }}>Expiry Date</label>
          <input
            value={expiry}
            onChange={handleExpiry}
            placeholder="MM/YY"
            maxLength={5}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 14,
              border: `1.5px solid ${errors.expiry ? '#ef4444' : 'var(--border)'}`,
              background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {errors.expiry && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 3 }}>{errors.expiry}</div>}
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text-muted)' }}>CVV</label>
          <input
            value={cvv}
            onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, card?.cvvLen || 4))}
            placeholder={card?.cvvLen === 4 ? '1234' : '123'}
            maxLength={card?.cvvLen || 4}
            onFocus={() => setFlipped(true)}
            onBlur={() => setFlipped(false)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 14,
              border: `1.5px solid ${errors.cvv ? '#ef4444' : 'var(--border)'}`,
              background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {errors.cvv && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 3 }}>{errors.cvv}</div>}
        </div>
      </div>

      {/* Save card */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, cursor: 'pointer' }}>
        <input type="checkbox" checked={saveCard} onChange={e => setSave(e.target.checked)}
          style={{ width: 15, height: 15, cursor: 'pointer' }} />
        Save card for future payments
      </label>

      <button
        onClick={() => { if (validate()) onPay() }}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 10,
          background: 'linear-gradient(135deg, #5046e5, #7c3aed)',
          color: '#fff', border: 'none', fontWeight: 700, fontSize: 15,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 14px rgba(80,70,229,0.35)',
        }}
      >
        🔒 Pay ₱{toPHP(amount).toLocaleString()} securely
      </button>
    </div>
  )
}

/* E-wallet QR form (GCash / Maya / GrabPay) */
function EWalletForm({ method, plan, onPay, onCountdownDone }) {
  const meta           = EWALLET_META[method]
  const [countdown, setCountdown] = useState(EWALLET_COUNTDOWN)
  const timerRef       = useRef(null)
  const expiredRef     = useRef(false)

  const qrValue = `https://pay.${method}.ph/intervuai/${plan?.id}?amount=${toPHP(plan?.price)}&ref=${Math.random().toString(36).slice(2,10)}`

  // Trigger onCountdownDone outside of the setCountdown updater to avoid
  // the "setState during render" React warning
  useEffect(() => {
    if (countdown === 0 && expiredRef.current) {
      expiredRef.current = false
      onCountdownDone()
    }
  }, [countdown, onCountdownDone])

  useEffect(() => {
    expiredRef.current = false
    setCountdown(EWALLET_COUNTDOWN)
    timerRef.current = setInterval(() => {
      setCountdown(p => {
        if (p <= 1) {
          clearInterval(timerRef.current)
          expiredRef.current = true
          return 0
        }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [method]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Branded header */}
      <div style={{
        background: meta.color, borderRadius: 12, padding: '10px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: meta.color, fontWeight: 900, fontSize: 13,
        }}>{meta.name[0]}</div>
        <div style={{ color: '#fff', textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{meta.name}</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>{meta.hint}</div>
        </div>
        <div style={{
          marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', borderRadius: 10,
          padding: '2px 8px', fontSize: 10, color: '#fff', fontWeight: 700,
        }}>SIMULATION</div>
      </div>

      {/* Amount */}
      <div style={{
        background: meta.light, borderRadius: 10, padding: '10px 16px', marginBottom: 16,
        fontSize: 13, color: meta.color, fontWeight: 600,
      }}>
        Amount: <span style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 900 }}>
          ₱{toPHP(plan?.price).toLocaleString()}
        </span> / month
      </div>

      {/* QR Code */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: 14, display: 'inline-block',
        boxShadow: `0 4px 20px ${meta.color}28`, border: `2px solid ${meta.color}30`, marginBottom: 14,
      }}>
        <QRCodeSVG value={qrValue} size={160} level="M" />
        <div style={{ marginTop: 8, fontSize: 11, color: '#555', fontWeight: 600 }}>
          Scan with {meta.name} app
        </div>
      </div>

      {/* Countdown */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
          <span>QR expires in</span>
          <span style={{ fontWeight: 700, color: meta.color }}>{countdown}s</span>
        </div>
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 4 }}>
          <div style={{
            height: '100%', borderRadius: 4, background: meta.color,
            width: `${(countdown / EWALLET_COUNTDOWN) * 100}%`,
            transition: 'width 1s linear',
          }} />
        </div>
      </div>

      {/* Pay button */}
      <button
        onClick={() => { clearInterval(timerRef.current); onPay() }}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 10,
          background: meta.color, color: '#fff', border: 'none',
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <span style={{
          width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.25)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 11,
        }}>{meta.name[0]}</span>
        Simulate {meta.name} Payment
      </button>
    </div>
  )
}

/* Processing overlay */
function Processing() {
  return (
    <div style={{ textAlign: 'center', padding: '44px 24px' }}>
      <div style={{
        width: 64, height: 64, margin: '0 auto 20px',
        borderRadius: '50%', border: '4px solid #e0e7ff',
        borderTopColor: '#5046e5', animation: 'spin 0.85s linear infinite',
      }} />
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        Processing Payment
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Verifying transaction… please wait
      </div>
    </div>
  )
}

/* Success screen */
function Success({ plan, method, onClose }) {
  const refNo = `IV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`
  const rows = [
    ['Plan',    plan?.name || 'Premium'],
    ['Amount',  `₱${toPHP(plan?.price).toLocaleString()}/month`],
    ['Method',  method === 'card' ? 'Credit / Debit Card' : EWALLET_META[method]?.name || method],
    ['Status',  '✅  Paid'],
    ['Ref No',  refNo],
    ['Date',    new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })],
  ]
  return (
    <div style={{ textAlign: 'center', padding: '28px 28px 24px' }}>
      <div style={{
        width: 68, height: 68, borderRadius: '50%', background: '#dcfce7',
        margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, animation: 'successPop 0.5s ease',
      }}>✅</div>
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: '#16a34a', marginBottom: 6 }}>
        Payment Successful!
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Your subscription has been activated immediately.
      </div>

      {/* Receipt */}
      <div style={{
        background: 'var(--bg)', border: '1.5px solid var(--border)',
        borderRadius: 12, padding: '16px 18px', textAlign: 'left', marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          📄 Payment Receipt
        </div>
        {rows.map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 7, marginBottom: 7, borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{l}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 10,
          background: 'linear-gradient(135deg, #5046e5, #7c3aed)',
          color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(80,70,229,0.35)',
        }}
      >
        Start Using Premium 🚀
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* ─── Main Export ───────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function GCashPaymentModal({ isOpen, onClose, plan, onSuccess }) {
  const [step,   setStep]   = useState(1)          // 1=select, 2=form, 3=processing, 4=success
  const [method, setMethod] = useState('card')
  const [error,  setError]  = useState('')

  // Reset on open
  useEffect(() => {
    if (isOpen) { setStep(1); setMethod('card'); setError('') }
  }, [isOpen])

  const handlePay = useCallback(async () => {
    setStep(3)
    setError('')
    // Simulate bank/wallet processing delay
    await new Promise(r => setTimeout(r, 2400))
    try {
      await onSuccess(plan.id)
      setStep(4)
    } catch (err) {
      setError(err?.response?.data?.error || 'Payment failed. Please try again.')
      setStep(2)
    }
  }, [onSuccess, plan])

  const handleClose = () => {
    if (step === 3) return   // block close while processing
    setStep(1); setMethod('card'); setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
        padding: '12px',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div style={{
        background: 'var(--card)', borderRadius: 18, width: 440, maxWidth: '100%',
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 20px 70px rgba(0,0,0,0.3)',
        animation: 'fadeInUp 0.25s ease',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 22px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--card)', zIndex: 2, borderRadius: '18px 18px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #5046e5, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 14,
            }}>IV</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>IntervuAI Checkout</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {plan?.name} — ₱{toPHP(plan?.price).toLocaleString()}/mo
              </div>
            </div>
          </div>
          {step !== 3 && (
            <button onClick={handleClose} style={{
              background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
              color: 'var(--text-muted)', lineHeight: 1, padding: 4,
            }}>✕</button>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ padding: step === 4 ? 0 : '20px 22px' }}>

          {/* Steps 1–3 */}
          {step < 4 && <Steps step={Math.min(step, 2)} />}

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '8px 12px', fontSize: 13, color: '#dc2626', marginBottom: 14,
            }}>{error}</div>
          )}

          {/* Step 1: method selector */}
          {step === 1 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Select Payment Method
              </div>
              <MethodSelector selected={method} onSelect={setMethod} />
              <button
                onClick={() => setStep(2)}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 10,
                  background: 'linear-gradient(135deg, #5046e5, #7c3aed)',
                  color: '#fff', border: 'none', fontWeight: 700, fontSize: 15,
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(80,70,229,0.3)',
                }}
              >
                Continue →
              </button>
            </>
          )}

          {/* Step 2: payment form */}
          {step === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: 0 }}
                >
                  ← Back
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {method === 'card' ? '💳 Card Details' : EWALLET_META[method]?.name + ' Payment'}
                </span>
              </div>

              {method === 'card' && (
                <CardForm onPay={handlePay} amount={plan?.price} />
              )}
              {method !== 'card' && (
                <EWalletForm
                  method={method}
                  plan={plan}
                  onPay={handlePay}
                  onCountdownDone={handlePay}
                />
              )}
            </>
          )}

          {/* Step 3: processing */}
          {step === 3 && <Processing />}
        </div>

        {/* Step 4: success (no padding wrapper) */}
        {step === 4 && <Success plan={plan} method={method} onClose={handleClose} />}

        {/* ── Security footer ── */}
        {step < 4 && (
          <div style={{
            borderTop: '1px solid var(--border)', padding: '12px 22px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            flexWrap: 'wrap',
          }}>
            {[
              { icon: '🔒', text: '256-bit SSL' },
              { icon: '🛡️', text: 'PCI DSS' },
              { icon: '✅', text: 'Verified' },
              { icon: '🔄', text: 'Cancel anytime' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
