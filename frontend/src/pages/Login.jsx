import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Activity, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { Button, Input } from '../components/UI'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [show, setShow]     = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const fill = (email, password) => setForm({ email, password })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Please fill all fields'); return }
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`)
      navigate(user.role === 'doctor' ? '/doctor' : '/patient')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, var(--navy) 0%, #0D2845 60%, #0B3060 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 62, height: 62, background: 'var(--accent)', borderRadius: 18, marginBottom: 16, boxShadow: '0 8px 28px rgba(0,201,167,0.4)' }}>
            <Activity size={30} color="var(--navy)" strokeWidth={2.5} />
          </div>
          <h1 style={{ color: '#fff', fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.5 }}>MediClear AI</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Medical Report Intelligence Platform</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--navy-mid)', borderRadius: 'var(--radius-xl)', padding: 32, border: '1px solid var(--navy-light)' }}>
          <form onSubmit={submit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Email</label>
              <input
                type="email" value={form.email} onChange={set('email')} placeholder="your@email.com"
                style={{ width: '100%', padding: '12px 14px', background: 'var(--navy)', border: '1px solid var(--navy-light)', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="••••••••"
                  style={{ width: '100%', padding: '12px 44px 12px 14px', background: 'var(--navy)', border: '1px solid var(--navy-light)', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none' }}
                />
                <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, background: 'var(--accent)', border: 'none', borderRadius: 10, color: 'var(--navy)', fontSize: 16, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: 22, padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Quick Demo Login</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => fill('rahul@example.com', 'patient123')} style={{ padding: '9px 14px', background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.25)', borderRadius: 8, color: 'var(--accent)', fontSize: 13, fontWeight: 600, textAlign: 'left' }}>
                🧑‍⚕️ Patient — rahul@example.com / patient123
              </button>
              <button onClick={() => fill('doctor@example.com', 'doctor123')} style={{ padding: '9px 14px', background: 'rgba(74,159,224,0.1)', border: '1px solid rgba(74,159,224,0.25)', borderRadius: 8, color: 'var(--sky)', fontSize: 13, fontWeight: 600, textAlign: 'left' }}>
                👨‍⚕️ Doctor — doctor@example.com / doctor123
              </button>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            No account? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Register here</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 20 }}>
          HIPAA-compliant · End-to-end encrypted · SOC 2 Type II
        </p>
      </div>
    </div>
  )
}
