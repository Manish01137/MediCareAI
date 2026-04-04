import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Navbar from '../../components/Navbar'

const LINKS = [
  { path:'/doctor',           label:'Overview' },
  { path:'/doctor/reports',   label:'Patient Reports' },
  { path:'/doctor/patients',  label:'Patients' },
  { path:'/doctor/messages',  label:'Messages' },
]

export default function DoctorLayout() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'doctor') return <Navigate to="/patient" replace />

  return (
    <div style={{ minHeight:'100vh', background:'var(--g50)' }}>
      <Navbar links={LINKS} />
      <main style={{ maxWidth:1100, margin:'0 auto', padding:'28px 16px' }}>
        <Outlet />
      </main>
    </div>
  )
}
