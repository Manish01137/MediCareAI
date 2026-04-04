import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, LogOut, Bell, User, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Navbar({ links }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav style={{
      background: 'var(--navy)',
      height: 62,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, background: 'var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Activity size={18} color="var(--navy)" strokeWidth={2.5} />
        </div>
        <span style={{ color: '#fff', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>
          MediClear AI
        </span>
        <span style={{
          padding: '2px 8px',
          background: user?.role === 'doctor' ? 'var(--sky)' : 'var(--accent)',
          color: 'var(--navy)',
          fontSize: 10,
          fontWeight: 800,
          borderRadius: 6,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {user?.role}
        </span>
      </div>

      {/* Desktop nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' }}>
        {links?.map(({ path, label }) => {
          const active = location.pathname === path
          return (
            <button key={path} onClick={() => navigate(path)} style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.6)',
              fontSize: 14,
              fontWeight: active ? 600 : 400,
              transition: 'all 0.15s',
            }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Right: user info + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{user?.full_name}</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 1.2 }}>{user?.email}</p>
        </div>
        <button onClick={handleLogout} style={{
          padding: '7px 13px',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.7)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
        }}>
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  )
}
