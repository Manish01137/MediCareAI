import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Navbar from '../../components/Navbar'

const LINKS = [
  { path:'/patient',          label:'Overview' },
  { path:'/patient/upload',   label:'Upload Report' },
  { path:'/patient/reports',  label:'My Reports' },
  { path:'/patient/analytics',label:'Analytics' },
  { path:'/patient/messages', label:'Messages' },
]

export default function PatientLayout() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'patient') return <Navigate to="/doctor" replace />

  return (
    <div style={{ minHeight:'100vh', background:'var(--g50)' }}>
      <Navbar links={LINKS} />
      <main style={{ maxWidth:1060, margin:'0 auto', padding:'28px 16px' }}>
        <Outlet />
      </main>
    </div>
  )
}
