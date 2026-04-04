import { useState, useEffect } from 'react'
import { FileText, Clock, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react'
import { reportsApi } from '../../api'
import { StatCard, Spinner, Empty } from '../../components/UI'
import ReportCard from '../../components/ReportCard'
import { useAuth } from '../../hooks/useAuth'

export default function PatientOverview() {
  const { user } = useAuth()
  const [stats, setStats]     = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([reportsApi.patientStats(), reportsApi.myReports()])
      .then(([s, r]) => { setStats(s); setReports(r) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={32} /></div>

  return (
    <div className="fade-up">
      {/* Hero banner */}
      <div style={{ background:'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)', borderRadius:'var(--radius-lg)', padding:'28px 32px', marginBottom:24, color:'#fff' }}>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, marginBottom:4 }}>Welcome back,</p>
        <h2 style={{ fontSize:26, fontWeight:800, margin:'0 0 16px', fontFamily:'var(--font-serif)' }}>{user.full_name}</h2>
        <div style={{ display:'flex', gap:28, flexWrap:'wrap' }}>
          {[['Age', user.date_of_birth ? `${new Date().getFullYear() - new Date(user.date_of_birth).getFullYear()} yrs` : '—'],
            ['Blood Type', user.blood_type || '—'],
            ['Member Since', new Date(user.created_at).getFullYear()]
          ].map(([k,v]) => (
            <div key={k}>
              <p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.6px' }}>{k}</p>
              <p style={{ margin:0, fontSize:18, fontWeight:700 }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, marginBottom:28 }}>
          <StatCard label="Total Reports"    value={stats.total_reports}    color="var(--sky)"     icon={FileText} />
          <StatCard label="Pending Review"   value={stats.pending_reports}  color="var(--warn)"    icon={Clock} />
          <StatCard label="Reviewed"         value={stats.reviewed_reports} color="var(--success)" icon={CheckCircle} />
          <StatCard label="Flagged"          value={stats.flagged_reports}  color="var(--danger)"  icon={AlertTriangle} />
        </div>
      )}

      {/* Latest report */}
      <h3 style={{ fontWeight:700, fontSize:16, color:'var(--g700)', marginBottom:14 }}>Latest Report</h3>
      {reports.length === 0
        ? <Empty icon={FileText} title="No reports yet" subtitle="Upload your first lab report to get started" />
        : <ReportCard report={reports[0]} defaultExpanded />
      }
    </div>
  )
}
