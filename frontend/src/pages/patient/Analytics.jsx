import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { reportsApi } from '../../api'
import { Card, Spinner, Empty } from '../../components/UI'
import { TrendingUp } from 'lucide-react'

const PIE_COLORS = ['#10B981', '#F59E0B', '#EF4444']

export default function Analytics() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reportsApi.myReports().then(setReports).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={32} /></div>
  if (reports.length === 0) return <Empty icon={TrendingUp} title="No data yet" subtitle="Upload reports to see analytics" />

  // Status breakdown
  const statusData = [
    { name: 'Reviewed',  value: reports.filter(r => r.status === 'reviewed').length,  color: '#10B981' },
    { name: 'Pending',   value: reports.filter(r => r.status === 'pending').length,   color: '#F59E0B' },
    { name: 'Flagged',   value: reports.filter(r => r.status === 'flagged').length,   color: '#EF4444' },
  ].filter(d => d.value > 0)

  // Reports by month
  const byMonth = {}
  reports.forEach(r => {
    const key = new Date(r.uploaded_at).toLocaleDateString('en-IN', { month:'short', year:'2-digit' })
    byMonth[key] = (byMonth[key] || 0) + 1
  })
  const monthData = Object.entries(byMonth).map(([month, count]) => ({ month, count }))

  // Abnormal counts across all reports
  const abnormalMap = {}
  reports.forEach(r => {
    if (!r.lab_values) return
    Object.entries(r.lab_values).forEach(([name, v]) => {
      if (v.status !== 'normal') {
        abnormalMap[name] = (abnormalMap[name] || 0) + 1
      }
    })
  })
  const abnormalData = Object.entries(abnormalMap)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0,16)+'…' : name, count }))

  return (
    <div className="fade-up">
      <h2 style={{ fontWeight:800, fontSize:22, color:'var(--g800)', marginBottom:6 }}>Health Analytics</h2>
      <p style={{ color:'var(--g500)', fontSize:14, marginBottom:24 }}>Visual overview of your health trends across all reports.</p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
        {/* Status pie */}
        <Card style={{ padding:24 }}>
          <p style={{ fontWeight:700, fontSize:14, color:'var(--g700)', marginBottom:16 }}>Report Status Breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Reports over time */}
        <Card style={{ padding:24 }}>
          <p style={{ fontWeight:700, fontSize:14, color:'var(--g700)', marginBottom:16 }}>Reports Over Time</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthData} margin={{ top:5, right:10, left:-20, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94A3B8' }} />
              <YAxis tick={{ fontSize:11, fill:'#94A3B8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius:10, fontSize:13, border:'1px solid var(--g200)' }} />
              <Bar dataKey="count" fill="#00C9A7" radius={[4,4,0,0]} name="Reports" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Most flagged tests */}
        {abnormalData.length > 0 && (
          <Card style={{ padding:24, gridColumn:'1 / -1' }}>
            <p style={{ fontWeight:700, fontSize:14, color:'var(--g700)', marginBottom:4 }}>Most Frequently Abnormal Tests</p>
            <p style={{ fontSize:12, color:'var(--g500)', marginBottom:16 }}>Tests that appeared outside normal range across your reports</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={abnormalData} layout="vertical" margin={{ top:0, right:20, left:10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize:11, fill:'#94A3B8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'#475569' }} width={130} />
                <Tooltip contentStyle={{ borderRadius:10, fontSize:13, border:'1px solid var(--g200)' }} />
                <Bar dataKey="count" fill="#EF4444" radius={[0,4,4,0]} name="Times abnormal" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  )
}
