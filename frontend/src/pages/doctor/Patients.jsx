import { useState, useEffect } from 'react'
import { usersApi, reportsApi } from '../../api'
import { Card, Spinner, Empty } from '../../components/UI'
import { Users, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DoctorPatients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading]   = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    usersApi.patients().then(setPatients).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={32} /></div>

  return (
    <div className="fade-up">
      <h2 style={{ fontWeight:800, fontSize:22, color:'var(--g800)', marginBottom:6 }}>Patients</h2>
      <p style={{ color:'var(--g500)', fontSize:14, marginBottom:20 }}>{patients.length} registered patients</p>

      {patients.length === 0
        ? <Empty icon={Users} title="No patients yet" subtitle="Patients will appear here once they register" />
        : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
            {patients.map(p => (
              <Card key={p.id} style={{ padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                  <div style={{ width:46, height:46, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--navy)', fontWeight:800, fontSize:16, flexShrink:0 }}>
                    {p.full_name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <p style={{ fontWeight:700, fontSize:15, color:'var(--g800)', margin:'0 0 2px' }}>{p.full_name}</p>
                    <p style={{ fontSize:12, color:'var(--g500)', margin:0 }}>{p.email}</p>
                  </div>
                </div>
                <div style={{ borderTop:'1px solid var(--g100)', paddingTop:14, display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    ['Blood Type', p.blood_type || '—'],
                    ['Phone',      p.phone || '—'],
                    ['DOB',        p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString('en-IN') : '—'],
                    ['Member Since', new Date(p.created_at).toLocaleDateString('en-IN', { month:'short', year:'numeric' })],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                      <span style={{ color:'var(--g500)' }}>{k}</span>
                      <span style={{ color:'var(--g800)', fontWeight:500 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/doctor/reports')} style={{ marginTop:14, width:'100%', padding:'9px', background:'var(--navy)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <FileText size={14} /> View Reports
                </button>
              </Card>
            ))}
          </div>
      }
    </div>
  )
}
