import { useState, useEffect, useRef } from 'react'
import { messagesApi } from '../../api'
import { Card, Spinner, Empty, Button } from '../../components/UI'
import { MessageSquare, Send } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export default function PatientMessages() {
  const { user } = useAuth()
  const [doctors, setDoctors]   = useState([])
  const [selected, setSelected] = useState(null)
  const [thread, setThread]     = useState([])
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const bottomRef = useRef()

  useEffect(() => {
    messagesApi.doctors().then(d => { setDoctors(d); if (d.length) setSelected(d[0]) }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    messagesApi.thread(selected.id).then(setThread)
    const iv = setInterval(() => messagesApi.thread(selected.id).then(setThread), 8000)
    return () => clearInterval(iv)
  }, [selected])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [thread])

  const send = async () => {
    if (!text.trim() || !selected) return
    setSending(true)
    try {
      const msg = await messagesApi.send({ receiver_id: selected.id, content: text.trim() })
      setThread(t => [...t, msg])
      setText('')
    } catch { toast.error('Failed to send') }
    finally { setSending(false) }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={32} /></div>

  return (
    <div className="fade-up">
      <h2 style={{ fontWeight:800, fontSize:22, color:'var(--g800)', marginBottom:6 }}>Messages</h2>
      <p style={{ color:'var(--g500)', fontSize:14, marginBottom:20 }}>Communicate securely with your doctor.</p>

      <div style={{ display:'flex', gap:16, height:520 }}>
        {/* Doctor list */}
        <Card style={{ width:220, flexShrink:0, padding:16, overflowY:'auto' }}>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--g500)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>Doctors</p>
          {doctors.length === 0
            ? <p style={{ fontSize:13, color:'var(--g400)' }}>No doctors found</p>
            : doctors.map(d => (
              <div key={d.id} onClick={() => setSelected(d)} style={{
                padding:'12px', borderRadius:10, cursor:'pointer',
                background: selected?.id === d.id ? 'var(--accent-light)' : 'transparent',
                border: `1px solid ${selected?.id === d.id ? 'var(--accent)' : 'transparent'}`,
                marginBottom:8,
              }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:14, marginBottom:8 }}>
                  {d.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                </div>
                <p style={{ fontWeight:600, fontSize:13, color:'var(--g800)', margin:'0 0 2px' }}>{d.name}</p>
                <p style={{ fontSize:11, color:'var(--g500)', margin:0 }}>{d.specialty}</p>
              </div>
            ))
          }
        </Card>

        {/* Chat */}
        <Card style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {selected ? (
            <>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--g100)', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13 }}>
                  {selected.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                </div>
                <div>
                  <p style={{ fontWeight:700, fontSize:15, color:'var(--g800)', margin:0 }}>{selected.name}</p>
                  <p style={{ fontSize:12, color:'var(--g500)', margin:0 }}>{selected.specialty} · {selected.hospital}</p>
                </div>
              </div>

              <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
                {thread.length === 0 && <p style={{ textAlign:'center', color:'var(--g400)', fontSize:14, marginTop:40 }}>No messages yet. Start the conversation.</p>}
                {thread.map(m => {
                  const mine = m.sender_id === user.id
                  return (
                    <div key={m.id} style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth:'72%', padding:'10px 14px',
                        borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: mine ? 'var(--navy)' : 'var(--g100)',
                        color: mine ? '#fff' : 'var(--g800)',
                        fontSize:14, lineHeight:1.5,
                      }}>
                        <p style={{ margin:'0 0 4px' }}>{m.content}</p>
                        <p style={{ margin:0, fontSize:10, opacity:0.6 }}>{new Date(m.created_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <div style={{ padding:'14px 20px', borderTop:'1px solid var(--g100)', display:'flex', gap:10 }}>
                <textarea
                  value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Type a message... (Enter to send)"
                  rows={2}
                  style={{ flex:1, padding:'10px 14px', border:'1px solid var(--g200)', borderRadius:10, fontSize:14, color:'var(--g800)', resize:'none', outline:'none', fontFamily:'var(--font)' }}
                />
                <button onClick={send} disabled={sending || !text.trim()} style={{ padding:'10px 16px', background:'var(--accent)', border:'none', borderRadius:10, color:'var(--navy)', cursor: sending ? 'wait' : 'pointer', opacity: !text.trim() ? 0.5 : 1 }}>
                  <Send size={18} />
                </button>
              </div>
            </>
          ) : (
            <Empty icon={MessageSquare} title="Select a doctor" subtitle="Choose a doctor from the left to start chatting" />
          )}
        </Card>
      </div>
    </div>
  )
}
