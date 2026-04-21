import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { PageLoader } from './components/UI'
import { useAuth } from './hooks/useAuth'

import Login    from './pages/Login'
import Register from './pages/Register'

import PatientLayout   from './pages/patient/Layout'
import PatientOverview from './pages/patient/Overview'
import UploadReport    from './pages/patient/Upload'
import MyReports       from './pages/patient/MyReports'
import Analytics       from './pages/patient/Analytics'
import PatientMessages from './pages/patient/Messages'
import PatientChat     from './pages/patient/Chat'

import DoctorLayout   from './pages/doctor/Layout'
import DoctorOverview from './pages/doctor/Overview'
import DoctorReports  from './pages/doctor/Reports'
import DoctorPatients from './pages/doctor/Patients'
import DoctorMessages from './pages/doctor/Messages'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'doctor' ? '/doctor' : '/patient'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Patient */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route index             element={<PatientOverview />} />
          <Route path="upload"     element={<UploadReport />} />
          <Route path="reports"    element={<MyReports />} />
          <Route path="analytics"  element={<Analytics />} />
          <Route path="chat"       element={<PatientChat />} />
          <Route path="messages"   element={<PatientMessages />} />
        </Route>

        {/* Doctor */}
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index            element={<DoctorOverview />} />
          <Route path="reports"   element={<DoctorReports />} />
          <Route path="patients"  element={<DoctorPatients />} />
          <Route path="messages"  element={<DoctorMessages />} />
        </Route>

        {/* Root */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
