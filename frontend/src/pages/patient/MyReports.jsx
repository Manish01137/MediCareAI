import { useState, useEffect } from 'react'
import { FileText } from 'lucide-react'
import { reportsApi } from '../../api'
import { Spinner, Empty, Button } from '../../components/UI'
import ReportCard from '../../components/ReportCard'
import { useNavigate } from 'react-router-dom'

const FILTERS = [
  { value: '', label: 'All Reports' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'flagged', label: 'Flagged' },
]

export default function MyReports() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [filter, setFilter]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    reportsApi.myReports(filter || undefined)
      .then(setReports)
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div className="fade-up">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:22, color:'var(--g800)', margin:'0 0 4px' }}>My Reports</h2>
          <p style={{ color:'var(--g500)', fontSize:14, margin:0 }}>{reports.length} report{reports.length !== 1 ? 's' : ''} found</p>
        </div>
        <Button onClick={() => navigate('/patient/upload')}>+ Upload Report</Button>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} style={{
            padding:'8px 18px', borderRadius:10,
            border:`1px solid ${filter === f.value ? 'var(--accent)' : 'var(--g200)'}`,
            background: filter === f.value ? 'var(--accent-light)' : '#fff',
            color: filter === f.value ? 'var(--accent-dark)' : 'var(--g600)',
            fontWeight: filter === f.value ? 700 : 400,
            fontSize:14, cursor:'pointer', transition:'all 0.15s',
          }}>{f.label}</button>
        ))}
      </div>

      {loading
        ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={32} /></div>
        : reports.length === 0
          ? <Empty icon={FileText} title="No reports found" subtitle={filter ? `No ${filter} reports` : 'Upload your first lab report'} action={<Button onClick={() => navigate('/patient/upload')}>Upload Report</Button>} />
          : <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {reports.map(r => <ReportCard key={r.id} report={r} />)}
            </div>
      }
    </div>
  )
}
