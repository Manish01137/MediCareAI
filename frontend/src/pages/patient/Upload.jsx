import { useState, useRef } from 'react'
import { Upload, CheckCircle, File, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { reportsApi } from '../../api'
import { Button, Spinner } from '../../components/UI'
import ReportCard from '../../components/ReportCard'

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.bmp'
const TEST_TYPES = ['Complete Blood Count (CBC)', 'Lipid Panel', 'Thyroid Function', 'Blood Glucose / HbA1c', 'Liver Function Test', 'Kidney Function', 'Urine Analysis']

export default function UploadReport() {
  const [state, setState]   = useState('idle')   // idle | uploading | analyzing | done
  const [file, setFile]     = useState(null)
  const [dragOver, setDrag] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const handleFile = async (f) => {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['pdf','jpg','jpeg','png','bmp'].includes(ext)) {
      toast.error('Only PDF, JPG, PNG files are allowed')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB')
      return
    }
    setFile(f)
    setState('uploading')
    try {
      toast.loading('Uploading report...', { id: 'upload' })
      const report = await reportsApi.upload(f)
      toast.success('Report uploaded! AI is analyzing...', { id: 'upload' })
      setState('analyzing')
      // Poll until AI analysis is done (max 20s)
      let attempts = 0
      const poll = async () => {
        attempts++
        const fresh = await reportsApi.getReport(report.id)
        if (fresh.ai_summary || attempts >= 10) {
          setResult(fresh)
          setState('done')
          toast.success('Analysis complete!')
        } else {
          setTimeout(poll, 2000)
        }
      }
      setTimeout(poll, 2000)
    } catch {
      setState('idle')
      setFile(null)
    }
  }

  const reset = () => { setState('idle'); setFile(null); setResult(null) }

  return (
    <div className="fade-up">
      <h2 style={{ fontWeight:800, fontSize:22, color:'var(--g800)', marginBottom:6 }}>Upload Lab Report</h2>
      <p style={{ color:'var(--g500)', fontSize:14, marginBottom:24 }}>Upload your lab report and our AI will analyze it and explain it in plain English.</p>

      {state === 'idle' && (
        <>
          <div
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--g300)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '64px 32px',
              textAlign: 'center',
              background: dragOver ? 'var(--accent-light)' : '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: 24,
            }}
          >
            <input ref={fileRef} type="file" accept={ACCEPTED} style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />
            <div style={{ width:64, height:64, background:'var(--accent-light)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <Upload size={30} color="var(--accent)" />
            </div>
            <h3 style={{ fontWeight:700, fontSize:20, color:'var(--g800)', marginBottom:8 }}>Drop your report here</h3>
            <p style={{ color:'var(--g500)', fontSize:14, marginBottom:6 }}>or click to browse files</p>
            <p style={{ color:'var(--g400)', fontSize:12, marginBottom:24 }}>PDF, JPG, PNG · Max 10MB</p>
            <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
              {TEST_TYPES.map(t => (
                <span key={t} style={{ padding:'4px 12px', background:'var(--g100)', borderRadius:20, fontSize:12, color:'var(--g600)' }}>{t}</span>
              ))}
            </div>
          </div>

          <div style={{ background:'var(--sky-light)', borderRadius:'var(--radius-md)', padding:'16px 20px', border:'1px solid rgba(74,159,224,0.2)' }}>
            <p style={{ fontWeight:700, fontSize:13, color:'var(--sky)', marginBottom:6 }}>🔒 Privacy & Security</p>
            <p style={{ fontSize:13, color:'var(--g600)', lineHeight:1.6, margin:0 }}>Your reports are encrypted at rest and in transit. Only you and your assigned doctor can view them. We never share your data with third parties.</p>
          </div>
        </>
      )}

      {(state === 'uploading' || state === 'analyzing') && (
        <div style={{ textAlign:'center', padding:'80px 32px', background:'#fff', borderRadius:'var(--radius-lg)', border:'1px solid var(--g200)' }}>
          <div style={{ width:68, height:68, background:'var(--accent-light)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 22px' }}>
            <Spinner size={32} />
          </div>
          <h3 style={{ fontWeight:700, fontSize:20, color:'var(--g800)', marginBottom:8 }}>
            {state === 'uploading' ? 'Uploading your report...' : 'AI is analyzing your report...'}
          </h3>
          <p style={{ color:'var(--g500)', fontSize:14, lineHeight:1.6 }}>
            {state === 'uploading'
              ? 'Securely uploading your file...'
              : 'Reading lab values, identifying abnormalities, and preparing a plain-English explanation for you.'}
          </p>
          {file && (
            <div style={{ marginTop:20, display:'inline-flex', alignItems:'center', gap:8, padding:'10px 16px', background:'var(--g50)', borderRadius:10 }}>
              <File size={16} color="var(--g500)" />
              <span style={{ fontSize:13, color:'var(--g600)' }}>{file.name}</span>
            </div>
          )}
        </div>
      )}

      {state === 'done' && result && (
        <div className="fade-up">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:28, height:28, background:'var(--success-light)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <CheckCircle size={16} color="var(--success)" />
              </div>
              <h3 style={{ margin:0, fontWeight:700, fontSize:18, color:'var(--g800)' }}>Analysis Complete</h3>
            </div>
            <Button variant="secondary" size="sm" onClick={reset}>Upload Another</Button>
          </div>
          <ReportCard report={result} defaultExpanded />
        </div>
      )}
    </div>
  )
}
