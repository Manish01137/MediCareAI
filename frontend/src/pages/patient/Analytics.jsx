import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceArea,
} from 'recharts'
import { reportsApi } from '../../api'
import { Card, Spinner, Empty, Badge } from '../../components/UI'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function Analytics() {
  const [reports, setReports] = useState([])
  const [trends, setTrends] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([reportsApi.myReports(), reportsApi.trends()])
      .then(([rs, tr]) => { setReports(rs); setTrends(tr || {}) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={32} /></div>
  if (reports.length === 0) return <Empty icon={TrendingUp} title="No data yet" subtitle="Upload reports to see analytics" />

  // Status pie
  const statusData = [
    { name:'Reviewed', value:reports.filter(r => r.status==='reviewed').length, color:'#10B981' },
    { name:'Pending',  value:reports.filter(r => r.status==='pending').length,  color:'#F59E0B' },
    { name:'Flagged',  value:reports.filter(r => r.status==='flagged').length,  color:'#EF4444' },
  ].filter(d => d.value > 0)

  // Reports by month
  const byMonth = {}
  reports.forEach(r => {
    const key = new Date(r.uploaded_at).toLocaleDateString('en-IN', { month:'short', year:'2-digit' })
    byMonth[key] = (byMonth[key] || 0) + 1
  })
  const monthData = Object.entries(byMonth).map(([month, count]) => ({ month, count }))

  // Abnormal counts
  const abnormalMap = {}
  reports.forEach(r => {
    if (!r.lab_values) return
    Object.entries(r.lab_values).forEach(([name, v]) => {
      if (v.status !== 'normal') abnormalMap[name] = (abnormalMap[name] || 0) + 1
    })
  })
  const abnormalData = Object.entries(abnormalMap)
    .sort((a,b) => b[1]-a[1]).slice(0,8)
    .map(([name,count]) => ({ name: name.length>18 ? name.slice(0,16)+'…' : name, count }))

  // Metrics with ≥2 points, ranked so the most meaningful charts come first
  const trendEntries = Object.entries(trends)
    .filter(([, t]) => t.count >= 2)
    .sort((a,b) => {
      const bad = (t) => (t.latest?.status !== 'normal' ? 1 : 0)
      return bad(b[1]) - bad(a[1]) || b[1].count - a[1].count
    })

  return (
    <div className="fade-up">
      <h2 style={{ fontWeight:800, fontSize:22, color:'var(--g800)', marginBottom:6 }}>Health Analytics</h2>
      <p style={{ color:'var(--g500)', fontSize:14, marginBottom:24 }}>Visual overview of your health trends across all reports.</p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
        <Card style={{ padding:24 }}>
          <p style={{ fontWeight:700, fontSize:14, color:'var(--g700)', marginBottom:16 }}>Report Status Breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                   label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {statusData.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

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

        {abnormalData.length > 0 && (
          <Card style={{ padding:24, gridColumn:'1 / -1' }}>
            <p style={{ fontWeight:700, fontSize:14, color:'var(--g700)', marginBottom:4 }}>Most Frequently Abnormal Tests</p>
            <p style={{ fontSize:12, color:'var(--g500)', marginBottom:16 }}>Tests outside normal range across your reports</p>
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

      {trendEntries.length > 0 && (
        <>
          <h3 style={{ fontWeight:800, fontSize:18, color:'var(--g800)', marginTop:32, marginBottom:4 }}>Trend per metric</h3>
          <p style={{ color:'var(--g500)', fontSize:13, marginBottom:16 }}>
            How each value has changed across your uploaded reports. The shaded band shows the normal range.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:16 }}>
            {trendEntries.map(([name, t]) => <TrendCard key={name} name={name} trend={t} />)}
          </div>
        </>
      )}
    </div>
  )
}

function TrendCard({ name, trend }) {
  const { points, delta, direction, unit, min, max, latest } = trend
  const data = points.map(p => ({
    date: new Date(p.uploaded_at).toLocaleDateString('en-IN', { month:'short', day:'numeric' }),
    val: p.val,
    status: p.status,
  }))
  const TrendIcon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus
  const trendColor = direction === 'flat' ? 'var(--g500)'
                   : (latest.status === 'normal' ? 'var(--success)' : 'var(--danger)')
  const safeMin = (typeof min === 'number' && min > 0) ? min : undefined
  const safeMax = (typeof max === 'number' && max < 999999) ? max : undefined
  return (
    <Card style={{ padding:18 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, gap:10 }}>
        <div style={{ minWidth:0 }}>
          <p style={{ fontWeight:700, fontSize:13, color:'var(--g800)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</p>
          <p style={{ fontSize:11, color:'var(--g500)' }}>
            Latest: <b style={{ color:'var(--g800)' }}>{latest.val}{unit ? ` ${unit}` : ''}</b>
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Badge status={latest.status} />
          <span title={`${direction === 'up' ? '+' : ''}${delta}${unit ? ' '+unit : ''} since first reading`}
                style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:700, color:trendColor }}>
            <TrendIcon size={13} /> {delta > 0 ? '+' : ''}{delta}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top:6, right:8, left:-24, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize:10, fill:'#94A3B8' }} />
          <YAxis tick={{ fontSize:10, fill:'#94A3B8' }} domain={['auto','auto']} />
          <Tooltip contentStyle={{ borderRadius:8, fontSize:12, border:'1px solid var(--g200)' }} />
          {safeMin !== undefined && safeMax !== undefined && (
            <ReferenceArea y1={safeMin} y2={safeMax} fill="#10B981" fillOpacity={0.08} />
          )}
          <Line type="monotone" dataKey="val" stroke="#0070F3" strokeWidth={2} dot={{ r:3, fill:'#0070F3' }} activeDot={{ r:5 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
