import { useState } from 'react'
import { ChevronDown, FileText, Lightbulb, Heart, Stethoscope, AlertTriangle } from 'lucide-react'
import { Badge, LabBar } from './UI'

export default function ReportCard({ report, defaultExpanded = false }) {
  const [open, setOpen] = useState(defaultExpanded)

  const labEntries  = report.lab_values ? Object.entries(report.lab_values) : []
  const abnormal    = labEntries.filter(([, v]) => v.status !== 'normal')
  const flagCount   = abnormal.length

  return (
    <div className="fade-up" style={{
      background: '#fff',
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${open ? 'var(--accent)' : 'var(--g200)'}`,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
      boxShadow: open ? '0 4px 20px rgba(0,201,167,0.1)' : 'var(--shadow-sm)',
    }}>
      {/* Header row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '18px 22px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, background: 'var(--accent-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={18} color="var(--accent-dark)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--g800)' }}>{report.report_type}</span>
              <Badge status={report.status} />
              {flagCount > 0 && (
                <span style={{ padding: '3px 9px', borderRadius: 20, background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={11} /> {flagCount} abnormal
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--g500)' }}>
              {new Date(report.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              {report.file_name && ` · ${report.file_name}`}
            </p>
          </div>
        </div>
        <ChevronDown size={20} color="var(--g400)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }} />
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ borderTop: '1px solid var(--g100)', padding: '20px 22px' }}>

          {/* Analyzing state */}
          {!report.ai_summary && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--g500)' }}>
              <div className="pulse" style={{ fontSize: 14 }}>⏳ AI is analyzing your report... Refresh in a few seconds.</div>
            </div>
          )}

          {report.ai_summary && (
            <>
              {/* Summary */}
              <InfoBox color="accent" icon={<FileText size={15} />} title="Summary">
                {report.ai_summary}
              </InfoBox>

              {/* Plain English */}
              <InfoBox color="sky" icon={<Lightbulb size={15} />} title="Plain English Explanation" style={{ marginTop: 12 }}>
                {report.ai_explanation}
              </InfoBox>

              {/* Lab values */}
              {labEntries.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--g700)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Lab Values ({labEntries.length} tests)
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {labEntries.map(([name, v]) => (
                      <LabBar key={name} name={name} {...v} />
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {report.ai_tips?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--g700)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Health Recommendations
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {report.ai_tips.map((tip, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 24, height: 24, background: 'var(--accent-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: 'var(--accent-dark)' }}>
                          {i + 1}
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--g600)', lineHeight: 1.6, margin: 0 }}>{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Doctor note */}
              {report.doctor_note && (
                <InfoBox color="success" icon={<Stethoscope size={15} />} title={`Doctor's Note${report.reviewing_doctor_name ? ` — ${report.reviewing_doctor_name}` : ''}`} style={{ marginTop: 16 }}>
                  {report.doctor_note}
                </InfoBox>
              )}

              {/* Flag reason */}
              {report.is_flagged && report.flag_reason && (
                <InfoBox color="danger" icon={<AlertTriangle size={15} />} title="Flagged for Follow-up" style={{ marginTop: 12 }}>
                  {report.flag_reason}
                </InfoBox>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function InfoBox({ color, icon, title, children, style }) {
  const map = {
    accent:  { bg: 'var(--accent-light)',  border: 'var(--accent)',   text: 'var(--accent-dark)' },
    sky:     { bg: 'var(--sky-light)',     border: 'var(--sky)',      text: 'var(--sky)' },
    success: { bg: 'var(--success-light)', border: 'var(--success)',  text: 'var(--success)' },
    danger:  { bg: 'var(--danger-light)',  border: 'var(--danger)',   text: 'var(--danger)' },
    warn:    { bg: 'var(--warn-light)',    border: 'var(--warn)',     text: 'var(--warn)' },
  }
  const s = map[color]
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}22`, borderRadius: 12, padding: '14px 18px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: s.text }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</span>
      </div>
      <p style={{ fontSize: 14, color: 'var(--g700)', lineHeight: 1.7, margin: 0 }}>{children}</p>
    </div>
  )
}
