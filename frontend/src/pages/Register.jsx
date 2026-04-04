import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [role, setRole]     = useState('patient')
  const [loading, setLoading] = useState(false)
  const [form, setForm]     = useState({
    full_name: '', email: '', password: '',
    date_of_birth: '', blood_type: '', phone: '',
    specialty: '', hospital: '', license_number: '',
  })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.password) { toast.error('Name, email and password are required'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const user = await register({ ...form, role })
      toast.success('Account created!')
      navigate(user.role === 'doctor' ? '/doctor' : '/patient')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, name, type = 'text', placeholder }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</label>
      <input type={type} value={form[name]} onChange={set(name)} placeholder={placeholder}
        style={{ width: '100%', padding: '11px 14px', background: 'var(--navy)', border: '1px solid var(--navy-light)', borderRadius: 9, color: '#fff', fontSize: 14, outline: 'none' }}
      />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, var(--navy) 0%, #0D2845 60%, #0B3060 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, background: 'var(--accent)', borderRadius: 16, marginBottom: 12 }}>
            <Activity size={26} color="var(--navy)" strokeWidth={2.5} />
          </div>
          <h1 style={{ color: '#fff', fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>Create Account</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>MediClear AI Medical Platform</p>
        </div>

        <div style={{ background: 'var(--navy-mid)', borderRadius: 'var(--radius-xl)', padding: 28, border: '1px solid var(--navy-light)' }}>
          {/* Role toggle */}
          <div style={{ display: 'flex', marginBottom: 22, background: 'var(--navy)', borderRadius: 10, padding: 3 }}>
            {['patient', 'doctor'].map(r => (
              <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: role === r ? 'var(--accent)' : 'transparent', color: role === r ? 'var(--navy)' : 'rgba(255,255,255,0.45)', fontWeight: 700, fontSize: 14, textTransform: 'capitalize', transition: 'all 0.15s' }}>
                {r === 'patient' ? '🧑‍⚕️ Patient' : '👨‍⚕️ Doctor'}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            <Field label="Full Name" name="full_name" placeholder="Rahul Sharma" />
            <Field label="Email" name="email" type="email" placeholder="you@example.com" />
            <Field label="Password" name="password" type="password" placeholder="Min 6 characters" />
            <Field label="Phone" name="phone" placeholder="+91 98765 43210" />

            {role === 'patient' && (
              <>
                <Field label="Date of Birth" name="date_of_birth" type="date" />
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Blood Type</label>
                  <select value={form.blood_type} onChange={set('blood_type')} style={{ width: '100%', padding: '11px 14px', background: 'var(--navy)', border: '1px solid var(--navy-light)', borderRadius: 9, color: form.blood_type ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 14, outline: 'none' }}>
                    <option value="">Select blood type</option>
                    {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
              </>
            )}

            {role === 'doctor' && (
              <>
                <Field label="Specialty" name="specialty" placeholder="Internal Medicine" />
                <Field label="Hospital / Clinic" name="hospital" placeholder="Apollo Hospital, Bangalore" />
                <Field label="Medical License Number" name="license_number" placeholder="KA-MED-2024-XXXXX" />
              </>
            )}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, background: 'var(--accent)', border: 'none', borderRadius: 10, color: 'var(--navy)', fontSize: 15, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', marginTop: 8 }}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
