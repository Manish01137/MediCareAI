import { Loader2 } from 'lucide-react'

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, style, className }) {
  return (
    <div className={className} style={{
      background: '#fff',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--g200)',
      boxShadow: 'var(--shadow-sm)',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({ label, value, color = 'var(--sky)', icon: Icon }) {
  return (
    <Card style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: 8 }}>{label}</p>
          <p style={{ fontSize: 34, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
        </div>
        {Icon && (
          <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} color={color} />
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ status }) {
  const map = {
    pending:  { bg: 'var(--warn-light)',    color: 'var(--warn)',    label: 'Pending Review' },
    reviewed: { bg: 'var(--success-light)', color: 'var(--success)', label: 'Reviewed' },
    flagged:  { bg: 'var(--danger-light)',  color: 'var(--danger)',  label: 'Flagged' },
    normal:   { bg: 'var(--success-light)', color: 'var(--success)', label: 'Normal' },
    high:     { bg: 'var(--danger-light)',  color: 'var(--danger)',  label: 'High' },
    low:      { bg: 'var(--warn-light)',    color: 'var(--warn)',    label: 'Low' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

// ── Button ────────────────────────────────────────────────────
export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, loading, style, type = 'button' }) {
  const styles = {
    primary:   { background: 'var(--accent)',        color: 'var(--navy)',  border: 'none' },
    secondary: { background: 'transparent',          color: 'var(--g700)',  border: '1px solid var(--g300)' },
    danger:    { background: 'var(--danger-light)',  color: 'var(--danger)',border: '1px solid var(--danger)' },
    ghost:     { background: 'transparent',          color: 'var(--g600)',  border: 'none' },
    navy:      { background: 'var(--navy)',           color: '#fff',         border: 'none' },
  }
  const sizes = {
    sm: { padding: '7px 14px', fontSize: 13 },
    md: { padding: '11px 20px', fontSize: 14 },
    lg: { padding: '14px 28px', fontSize: 16 },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...styles[variant],
        ...sizes[size],
        borderRadius: 'var(--radius-sm)',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'opacity 0.15s, transform 0.1s',
        ...style,
      }}
    >
      {loading && <Loader2 size={15} className="spinner" />}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, error, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--g600)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>}
      <input
        {...props}
        style={{
          width: '100%',
          padding: '11px 14px',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--g300)'}`,
          borderRadius: 'var(--radius-sm)',
          fontSize: 14,
          color: 'var(--g800)',
          background: '#fff',
          outline: 'none',
          transition: 'border-color 0.15s',
          ...props.style,
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = error ? 'var(--danger)' : 'var(--g300)'}
      />
      {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────
export function Select({ label, options, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--g600)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>}
      <select {...props} style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--g300)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--g800)', background: '#fff', outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 24, color = 'var(--accent)' }) {
  return <Loader2 size={size} color={color} className="spinner" />
}

// ── Empty State ───────────────────────────────────────────────
export function Empty({ icon: Icon, title, subtitle, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      {Icon && <div style={{ width: 56, height: 56, background: 'var(--g100)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Icon size={24} color="var(--g400)" /></div>}
      <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--g700)', marginBottom: 6 }}>{title}</p>
      {subtitle && <p style={{ fontSize: 14, color: 'var(--g500)', marginBottom: action ? 20 : 0 }}>{subtitle}</p>}
      {action}
    </div>
  )
}

// ── Lab Value Bar ─────────────────────────────────────────────
export function LabBar({ name, val, unit, min, max, status }) {
  const isHigh = status === 'high', isLow = status === 'low'
  const color = isHigh ? 'var(--danger)' : isLow ? 'var(--warn)' : 'var(--success)'
  const bg    = isHigh ? 'var(--danger-light)' : isLow ? 'var(--warn-light)' : 'var(--success-light)'
  const pct   = max > min ? Math.min(100, Math.max(2, ((val - min) / (max - min)) * 100)) : 50

  return (
    <div style={{ background: 'var(--g50)', borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--g700)', fontWeight: 500 }}>{name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--g800)' }}>
            {val} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--g400)' }}>{unit}</span>
          </span>
          <Badge status={status} />
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--g200)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--g400)' }}>Low: {min}</span>
        <span style={{ fontSize: 10, color: 'var(--g400)' }}>High: {max}</span>
      </div>
    </div>
  )
}

// ── Page Loader ───────────────────────────────────────────────
export function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--g50)' }}>
      <div style={{ textAlign: 'center' }}>
        <Spinner size={36} />
        <p style={{ marginTop: 12, color: 'var(--g500)', fontSize: 14 }}>Loading MediClear AI...</p>
      </div>
    </div>
  )
}
