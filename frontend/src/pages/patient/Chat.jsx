import { useState, useEffect, useRef } from 'react'
import { chatApi } from '../../api'
import { Card, Button, Spinner } from '../../components/UI'
import { Bot, User as UserIcon, Send, Trash2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

const SUGGESTIONS = [
  "What do my latest lab values mean in simple terms?",
  "Which of my values are outside the normal range?",
  "What is diabetes and how is it diagnosed?",
  "What's a normal blood pressure range?",
  "How can I lower my cholesterol naturally?",
  "How has my HbA1c changed over time?",
]

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const endRef = useRef(null)

  useEffect(() => {
    chatApi.history()
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function send(text) {
    const q = (text ?? input).trim()
    if (!q || sending) return
    setInput('')
    setSending(true)
    const optimistic = { id: `tmp-${Date.now()}`, role: 'user', content: q, created_at: new Date().toISOString() }
    setMessages(m => [...m, optimistic])
    try {
      const { answer } = await chatApi.ask(q)
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: answer, created_at: new Date().toISOString() }])
    } catch {
      setMessages(m => m.filter(x => x.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  async function clearChat() {
    if (!confirm('Clear chat history?')) return
    try {
      await chatApi.clear()
      setMessages([])
      toast.success('Chat cleared')
    } catch {}
  }

  return (
    <div className="fade-up" style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 140px)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:22, color:'var(--g800)', marginBottom:4, display:'flex', alignItems:'center', gap:8 }}>
            <Sparkles size={20} color="var(--accent)" /> Ask MediClear AI
          </h2>
          <p style={{ color:'var(--g500)', fontSize:14 }}>Ask questions about your own lab reports in plain language.</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat}>
            <Trash2 size={14} /> Clear
          </Button>
        )}
      </div>

      <Card style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          {loadingHistory ? (
            <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign:'center', padding:'30px 10px' }}>
              <div style={{ width:56, height:56, borderRadius:16, background:'var(--accent)18', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                <Bot size={26} color="var(--accent)" />
              </div>
              <p style={{ fontWeight:700, fontSize:16, color:'var(--g700)', marginBottom:6 }}>Hi! I can help explain your reports.</p>
              <p style={{ fontSize:13, color:'var(--g500)', marginBottom:20 }}>Try one of these to get started:</p>
              <div style={{ display:'grid', gap:8, maxWidth:520, margin:'0 auto' }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    style={{
                      textAlign:'left', padding:'12px 14px', border:'1px solid var(--g200)',
                      borderRadius:10, background:'#fff', fontSize:13, color:'var(--g700)',
                      cursor:'pointer', transition:'border-color .15s, background .15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.background='var(--g50)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--g200)'; e.currentTarget.style.background='#fff' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
              {sending && (
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:'var(--accent)18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Bot size={16} color="var(--accent)" />
                  </div>
                  <div style={{ padding:'10px 14px', background:'var(--g50)', borderRadius:12, color:'var(--g500)', fontSize:13 }}>
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <form
          onSubmit={e => { e.preventDefault(); send() }}
          style={{ borderTop:'1px solid var(--g200)', padding:14, display:'flex', gap:10 }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your reports…"
            disabled={sending}
            style={{
              flex:1, padding:'11px 14px', border:'1px solid var(--g300)',
              borderRadius:'var(--radius-sm)', fontSize:14, color:'var(--g800)', outline:'none'
            }}
            onFocus={e => e.target.style.borderColor='var(--accent)'}
            onBlur={e => e.target.style.borderColor='var(--g300)'}
          />
          <Button type="submit" loading={sending} disabled={!input.trim()}>
            <Send size={14} /> Send
          </Button>
        </form>
      </Card>
    </div>
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', gap:10, alignItems:'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <div style={{
        width:32, height:32, borderRadius:10, flexShrink:0,
        background: isUser ? 'var(--navy)' : 'var(--accent)18',
        display:'flex', alignItems:'center', justifyContent:'center'
      }}>
        {isUser ? <UserIcon size={16} color="#fff" /> : <Bot size={16} color="var(--accent)" />}
      </div>
      <div style={{
        maxWidth:'75%',
        padding:'10px 14px',
        background: isUser ? 'var(--accent)' : 'var(--g50)',
        color: isUser ? 'var(--navy)' : 'var(--g800)',
        borderRadius:12,
        fontSize:14,
        lineHeight:1.55,
        whiteSpace:'pre-wrap',
        fontWeight: isUser ? 600 : 400,
      }}>
        {msg.content}
      </div>
    </div>
  )
}
