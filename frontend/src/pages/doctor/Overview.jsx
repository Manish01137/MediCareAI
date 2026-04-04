import { useState, useEffect } from 'react'
import { Users, FileText, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { reportsApi } from '../../api'
import { StatCard, Spinner, Card } from '../../components/UI'
import { useAuth } from '../../hooks/useAuth'

export default function DoctorOverview() {
  const { user } = useAuth()
  const [stats, setStats]     = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([reportsApi.doctorStats(), reportsApi.allReports({ status:'pending' })])
      .then(([s, r]) => { setStats(s); setReports(r.slice(0,5)) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={32} /></div>

  return (
    <div className="fade-up">
      {/* Doctor banner */}
      <div style={{ background:'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)', borderRadius:'var(--radius-lg)', padding:'26px 30px', marginBottom:24, color:'#fff' }}>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, marginBottom:3 }}>{user.specialty} · {user.hospital}</p>
        <h2 style={{ fontSize:24, fontWeight:800, margin:'0 0 4px', fontFamily:'var(--font-serif)' }}>{user.full_name}</h2>
        <p style={{ margin:0, color:'rgba(255,255,255,0.45)', fontSize:13 }}>License: {user.license_number || 'Not set'}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:16, marginBottom:28 }}>
          <StatCard label="Total Patients"   value={stats.total_patients}    color="var(--sky)"     icon={Users} />
          <StatCard label="Total Reports"    value={stats.total_reports}     color="var(--navy)"    icon={FileText} />
          <StatCard label="Pending Reviews"  value={stats.pending_reviews}   color="var(--warn)"    icon={Clock} />
          <StatCard label="Reviewed Today"   value={stats.reviewed_today}    color="var(--success)" icon={CheckCircle} />
          <StatCard label="Flagged Reports"  value={stats.flagged_reports}   color="var(--danger)"  icon={AlertTriangle} />
        </div>
      )}

      {/* Pending queue */}
      <h3 style={{ fontWeight:700, fontSize:16, color:'var(--g700)', marginBottom:14 }}>Pending Reviews</h3>
      {reports.length === 0 ? (
        <Card style={{ padding:40, textAlign:'center' }}>
          <CheckCircle size={32} color="var(--success)" style={{ marginBottom:12 }} />
          <p style={{ fontWeight:700, color:'var(--g700)' }}>All caught up!</p>
          <p style={{ color:'var(--g500)', fontSize:14 }}>No pending reports to review.</p>
        </Card>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {reports.map(r => (
            <Card key={r.id} style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:15, color:'var(--g800)' }}>{r.patient_name}</span>
                  <span style={{ padding:'2px 8px', borderRadius:20, background:'var(--warn-light)', color:'var(--warn)', fontSize:11, fontWeight:700 }}>Pending</span>
                  {r.lab_values && Object.values(r.lab_values).some(v => v.status !== 'normal') && (
                    <span style={{ padding:'2px 8px', borderRadius:20, background:'var(--danger-light)', color:'var(--danger)', fontSize:11, fontWeight:700 }}>Has Flags</span>
                  )}
                </div>
                <p style={{ margin:0, fontSize:13, color:'var(--g500)' }}>{r.report_type} · {new Date(r.uploaded_at).toLocaleDateString('en-IN')}</p>
              </div>
              <a href="/doctor/reports" style={{ padding:'8px 16px', background:'var(--navy)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>Review →</a>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
