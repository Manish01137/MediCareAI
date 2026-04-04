import { useState, useEffect } from 'react'
import { reportsApi } from '../../api'
import { Spinner, Empty, Badge, LabBar, Card, Button } from '../../components/UI'
import { FileText, Stethoscope, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const FILTERS = [
  { value:'',         label:'All' },
  { value:'pending',  label:'Pending' },
  { value:'reviewed', label:'Reviewed' },
  { value:'flagged',  label:'Flagged' },
]

export default function DoctorReports() {
  const [reports, setReports]   = useState([])
  const [filter, setFilter]     = useState('')
  const [selected, setSelected] = useState(null)
  const [note, setNote]         = useState('')
  const [flagged, setFlagged]   = useState(false)
  const [flagReason, setFlagReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    reportsApi.allReports(filter ? { status:filter } : {})
      .then(setReports)
      .finally(() => setLoading(false))
  }, [filter])

  const selectReport = (r) => {
    setSelected(r)
    setNote(r.doctor_note || '')
    setFlagged(r.is_flagged || false)
    setFlagReason(r.flag_reason || '')
  }

  const submit = async () => {
    if (!selected) return
    if (!note.trim()) { toast.error('Please add a clinical note'); return }
    setSubmitting(true)
    try {
      const updated = await reportsApi.review(selected.id, {
        doctor_note: note.trim(),
        is_flagged: flagged,
        flag_reason: flagged ? flagReason : '',
      })
      toast.success(flagged ? 'Report flagged for follow-up' : 'Report marked as reviewed')
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r))
      setSelected(updated)
    } finally {
      setSubmitting(false)
    }
  }

  const labEntries = selected?.lab_values ? Object.entries(selected.lab_values) : []

  return (
    <div className="fade-up">
      <h2 style={{ fontWeight:800, fontSize:22, color:'var(--g800)', marginBottom:6 }}>Patient Reports</h2>
      <p style={{ color:'var(--g500)', fontSize:14, marginBottom:20 }}>Review AI-analyzed lab reports and add your clinical notes.</p>

      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} style={{
            padding:'8px 18px', borderRadius:10,
            border:`1px solid ${filter===f.value ? 'var(--accent)' : 'var(--g200)'}`,
            background: filter===f.value ? 'var(--accent-light)' : '#fff',
            color: filter===f.value ? 'var(--accent-dark)' : 'var(--g600)',
            fontWeight: filter===f.value ? 700 : 400,
            fontSize:14, cursor:'pointer',
          }}>{f.label} {f.value === '' ? `(${reports.length})` : ''}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
        {/* Report list */}
        <div style={{ flex:'1 1 280px', minWidth:0 }}>
          {loading
            ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner size={28} /></div>
            : reports.length === 0
              ? <Empty icon={FileText} title="No reports" subtitle={filter ? `No ${filter} reports` : 'All clear!'} />
              : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {reports.map(r => {
                    const hasFlags = r.lab_values && Object.values(r.lab_values).some(v => v.status !== 'normal')
                    return (
                      <div key={r.id} onClick={() => selectReport(r)} style={{
                        background:'#fff', borderRadius:'var(--radius-md)', padding:'14px 18px',
                        border:`1.5px solid ${selected?.id === r.id ? 'var(--accent)' : 'var(--g200)'}`,
                        cursor:'pointer', transition:'border-color 0.15s',
                        boxShadow: selected?.id === r.id ? '0 0 0 3px rgba(0,201,167,0.1)' : 'none',
                      }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                          <div style={{ minWidth:0, flex:1 }}>
                            <p style={{ fontWeight:700, color:'var(--g800)', fontSize:14, margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.patient_name}</p>
                            <p style={{ color:'var(--g500)', fontSize:12, margin:'0 0 6px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.report_type}</p>
                            <p style={{ color:'var(--g400)', fontSize:11, margin:0 }}>{new Date(r.uploaded_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end', marginLeft:8, flexShrink:0 }}>
                            <Badge status={r.status} />
                            {hasFlags && <span style={{ padding:'2px 7px', borderRadius:20, background:'var(--danger-light)', color:'var(--danger)', fontSize:10, fontWeight:700 }}>⚠ flags</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
          }
        </div>

        {/* Review panel */}
        {selected && (
          <Card className="fade-up" style={{ flex:'2 1 380px', padding:24, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
              <div>
                <h3 style={{ fontWeight:800, fontSize:17, color:'var(--g800)', margin:'0 0 4px' }}>{selected.patient_name}</h3>
                <p style={{ color:'var(--g500)', fontSize:13, margin:0 }}>{selected.report_type} · {new Date(selected.uploaded_at).toLocaleDateString('en-IN')}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'var(--g400)', fontSize:22, cursor:'pointer', lineHeight:1 }}>×</button>
            </div>

            {/* AI Summary */}
            {selected.ai_summary && (
              <div style={{ background:'var(--accent-light)', borderRadius:12, padding:'13px 16px', marginBottom:16, border:'1px solid rgba(0,201,167,0.2)' }}>
                <p style={{ fontSize:11, fontWeight:800, color:'var(--accent-dark)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>AI Summary</p>
                <p style={{ fontSize:14, color:'var(--g700)', lineHeight:1.7, margin:0 }}>{selected.ai_summary}</p>
              </div>
            )}

            {/* Lab values */}
            {labEntries.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <p style={{ fontWeight:700, fontSize:13, color:'var(--g700)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>Lab Values</p>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {labEntries.map(([name, v]) => <LabBar key={name} name={name} {...v} />)}
                </div>
              </div>
            )}

            {/* Doctor note */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontWeight:700, fontSize:13, color:'var(--g700)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                <Stethoscope size={13} style={{ verticalAlign:'middle', marginRight:5 }} />Clinical Notes
              </label>
              <textarea
                value={note} onChange={e => setNote(e.target.value)} rows={4}
                placeholder="Add clinical observations, recommendations, medication changes, follow-up instructions..."
                style={{ width:'100%', padding:'12px 14px', border:'1px solid var(--g200)', borderRadius:10, fontSize:14, color:'var(--g800)', resize:'vertical', fontFamily:'var(--font)', lineHeight:1.6, outline:'none' }}
              />
            </div>

            {/* Flag option */}
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                <input type="checkbox" checked={flagged} onChange={e => setFlagged(e.target.checked)} style={{ width:16, height:16, accentColor:'var(--danger)' }} />
                <span style={{ fontWeight:600, fontSize:14, color: flagged ? 'var(--danger)' : 'var(--g700)' }}>Flag for urgent follow-up</span>
              </label>
              {flagged && (
                <input
                  value={flagReason} onChange={e => setFlagReason(e.target.value)}
                  placeholder="Reason for flagging (e.g. critical value, urgent referral needed)..."
                  style={{ width:'100%', marginTop:10, padding:'10px 14px', border:'1px solid var(--danger)', borderRadius:9, fontSize:13, color:'var(--g800)', outline:'none', fontFamily:'var(--font)' }}
                />
              )}
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={submit} disabled={submitting} style={{
                flex:1, padding:'13px', background: flagged ? 'var(--danger)' : 'var(--accent)',
                border:'none', borderRadius:10, color: flagged ? '#fff' : 'var(--navy)',
                fontWeight:800, fontSize:15, cursor: submitting ? 'wait' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
                {submitting
                  ? 'Saving...'
                  : flagged
                    ? <><AlertTriangle size={16} /> Flag Report</>
                    : <><CheckCircle size={16} /> Mark Reviewed</>
                }
              </button>
            </div>

            {/* Existing doctor note display */}
            {selected.status !== 'pending' && selected.doctor_note && (
              <div style={{ marginTop:16, padding:'13px 16px', background:'var(--success-light)', borderRadius:12, border:'1px solid rgba(16,185,129,0.2)' }}>
                <p style={{ fontSize:11, fontWeight:800, color:'var(--success)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Your Previous Note</p>
                <p style={{ fontSize:13, color:'var(--g700)', margin:0 }}>{selected.doctor_note}</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
