'use client'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const DIFF_COLORS = ['', '#58CC02', '#1CB0F6', '#FF9600', '#CE82FF', '#FF4B4B']
const DIFF_LABELS = ['', 'سهل', 'متوسط', 'صعب', 'خبير', 'أسطوري']

export default function ChallengesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [challenges, setChallenges] = useState<any[]>([])
  const [attempts, setAttempts] = useState<Record<string, any>>({})
  const [active, setActive] = useState<any>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      const [{ data: userData }, { data: ch }, { data: att }] = await Promise.all([
        supabase.from('users').select('*').eq('id', session.user.id).single(),
        supabase.from('challenges').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('user_challenge_attempts').select('*').eq('user_id', session.user.id),
      ])
      setUser(userData)
      setChallenges(ch || [])
      const attMap: Record<string, any> = {}
      att?.forEach((a: any) => { attMap[a.challenge_id] = a })
      setAttempts(attMap)
      setLoading(false)
    }
    load()
  }, [])

  const openChallenge = (ch: any) => {
    setActive(ch)
    setSelected(null)
    setResult(null)
  }

  const submitAnswer = async () => {
    if (selected === null || !user || !active) return
    setSubmitting(true)
    const supabase = createClient()

    // Check if using AI validation
    if (active.use_ai_validation) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-challenge`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              imageUrl: active.image_url,
              question: active.question_ar,
              options: active.options,
              selectedAnswer: selected,
              validationPrompt: active.ai_validation_prompt,
            }),
          }
        )
        const aiResult = await res.json()
        const isCorrect = aiResult.is_correct

        await supabase.from('user_challenge_attempts').upsert({
          user_id: user.id,
          challenge_id: active.id,
          selected_answer: selected,
          is_correct: isCorrect,
          ai_feedback: aiResult.feedback_ar,
          score: isCorrect ? 100 : 0,
        }, { onConflict: 'user_id,challenge_id' })

        if (isCorrect) {
          await supabase.rpc('award_xp', { p_user_id: user.id, p_amount: active.xp_reward, p_reason: 'challenge_complete', p_reference_id: active.id })
        }

        setResult({ isCorrect, feedback: aiResult.feedback_ar, explanation: aiResult.correct_explanation_ar || active.explanation_ar })
        setAttempts(prev => ({ ...prev, [active.id]: { is_correct: isCorrect } }))
      } catch {
        setResult({ isCorrect: false, feedback: 'حدث خطأ في التحليل، حاول مرة أخرى' })
      }
    } else {
      // Simple answer check
      const isCorrect = selected === active.correct_answer
      await supabase.from('user_challenge_attempts').upsert({
        user_id: user.id,
        challenge_id: active.id,
        selected_answer: selected,
        is_correct: isCorrect,
        score: isCorrect ? 100 : 0,
      }, { onConflict: 'user_id,challenge_id' })

      if (isCorrect) {
        try {
          await supabase.rpc('award_xp', { p_user_id: user.id, p_amount: active.xp_reward, p_reason: 'challenge_complete', p_reference_id: active.id })
        } catch {}
      }

      setResult({ isCorrect, feedback: isCorrect ? '🎉 إجابة صحيحة! أحسنت!' : '❌ إجابة خاطئة', explanation: active.explanation_ar })
      setAttempts(prev => ({ ...prev, [active.id]: { is_correct: isCorrect } }))
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f7f7f7' }}>
      <span style={{ fontSize:48 }}>⚔️</span>
    </div>
  )

  const completed = Object.values(attempts).filter((a: any) => a.is_correct).length

  return (
    <div dir="rtl" style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#f7f7f7', fontFamily:"'Segoe UI',Tahoma,sans-serif", paddingBottom:90 }}>
      
      {/* Header */}
      <header style={{ background:'#fff', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'2px solid #f0f0f0', position:'sticky', top:0, zIndex:50 }}>
        <h1 style={{ margin:0, fontSize:20, fontWeight:900, color:'#333' }}>⚔️ التحديات</h1>
        <div style={{ background:'#D7FFB8', borderRadius:99, padding:'5px 14px', fontSize:13, fontWeight:800, color:'#27500A' }}>
          {completed}/{challenges.length} مكتمل
        </div>
      </header>

      <div style={{ padding:'16px 16px 0' }}>

        {/* Stats bar */}
        <div style={{ display:'flex', gap:10, marginBottom:20 }}>
          {[
            { label:'مكتمل', val:completed, color:'#58CC02', bg:'#D7FFB8' },
            { label:'XP مكتسب', val: Object.values(attempts).filter((a: any) => a.is_correct).length * 100, color:'#1CB0F6', bg:'#DDF4FF' },
          ].map(s => (
            <div key={s.label} style={{ flex:1, background:s.bg, borderRadius:14, padding:'12px 14px', border:`2px solid ${s.color}30` }}>
              <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:12, color:'#666', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Challenges list */}
        {challenges.length === 0 ? (
          <div style={{ background:'#fff', borderRadius:20, padding:'48px 24px', textAlign:'center', border:'2px solid #f0f0f0' }}>
            <div style={{ fontSize:52, marginBottom:12 }}>🔜</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#333', marginBottom:8 }}>التحديات قادمة قريباً!</div>
            <div style={{ fontSize:14, color:'#999' }}>سيتم إضافة تحديات أسبوعية جديدة</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {challenges.map(ch => {
              const att = attempts[ch.id]
              const done = att?.is_correct
              const tried = !!att
              const color = DIFF_COLORS[ch.difficulty] || '#58CC02'
              return (
                <div key={ch.id} onClick={() => !done && openChallenge(ch)}
                  style={{ background:'#fff', borderRadius:18, padding:'16px 18px', border:`2px solid ${done ? '#58CC02' : '#f0f0f0'}`, cursor: done ? 'default' : 'pointer', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', right:0, top:0, bottom:0, width:4, background:color }} />
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:48, height:48, borderRadius:14, background: done ? '#D7FFB8' : color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
                      {done ? '✅' : tried ? '❌' : '⚔️'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, color:'#333', fontSize:15, marginBottom:4, textAlign:'right' }}>{ch.title_ar}</div>
                      <div style={{ fontSize:12, color:'#999', textAlign:'right', marginBottom:8 }}>{ch.description_ar}</div>
                      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', flexWrap:'wrap' }}>
                        <span style={{ background: color+'20', color, borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:700 }}>
                          {DIFF_LABELS[ch.difficulty]}
                        </span>
                        <span style={{ background:'#FFF5D3', color:'#A56644', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:700 }}>
                          +{ch.xp_reward} XP
                        </span>
                        {ch.image_url && <span style={{ background:'#DDF4FF', color:'#1453A3', borderRadius:6, padding:'3px 10px', fontSize:11 }}>📸 صورة</span>}
                        {ch.use_ai_validation && <span style={{ background:'#F5E6FF', color:'#7B2FBE', borderRadius:6, padding:'3px 10px', fontSize:11 }}>🤖 AI</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Challenge Modal */}
      {active && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 20px 40px', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' }} dir="rtl">
            
            {/* Close */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:900, color:'#333' }}>{active.title_ar}</h2>
              <button onClick={() => setActive(null)} style={{ width:32, height:32, borderRadius:8, border:'none', background:'#f0f0f0', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>

            {/* Node Image */}
            {active.image_url && (
              <div style={{ marginBottom:16, borderRadius:14, overflow:'hidden', border:'2px solid #f0f0f0' }}>
                <img src={active.image_url} alt="node" style={{ width:'100%', display:'block' }} />
                {active.image_description && (
                  <div style={{ padding:'8px 12px', background:'#f7f7f7', fontSize:12, color:'#666', textAlign:'right' }}>
                    {active.image_description}
                  </div>
                )}
              </div>
            )}

            {/* Question */}
            <div style={{ background:'#f7f7f7', borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#333', lineHeight:1.6, textAlign:'right' }}>
                {active.question_ar}
              </div>
            </div>

            {/* Options */}
            {!result && (
              <>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                  {active.options.map((opt: string, i: number) => (
                    <button key={i} onClick={() => setSelected(i)}
                      style={{ padding:'14px 16px', borderRadius:12, border:`2px solid ${selected===i ? '#1CB0F6' : '#f0f0f0'}`, background: selected===i ? '#DDF4FF' : '#fff', cursor:'pointer', textAlign:'right', fontSize:14, fontWeight: selected===i ? 700 : 400, color: selected===i ? '#1453A3' : '#333', display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ width:28, height:28, borderRadius:8, background: selected===i ? '#1CB0F6' : '#f0f0f0', color: selected===i ? '#fff' : '#999', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0 }}>
                        {['أ','ب','ج','د'][i]}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>

                <button onClick={submitAnswer} disabled={selected===null || submitting}
                  style={{ width:'100%', padding:'16px', borderRadius:14, border:'none', background: selected===null ? '#f0f0f0' : '#1CB0F6', color: selected===null ? '#aaa' : '#fff', fontWeight:900, fontSize:16, cursor: selected===null ? 'not-allowed' : 'pointer' }}>
                  {submitting ? '🤖 جاري التحليل...' : '✅ تأكيد الإجابة'}
                </button>
              </>
            )}

            {/* Result */}
            {result && (
              <div style={{ marginTop:8 }}>
                {/* Show correct/wrong options */}
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                  {active.options.map((opt: string, i: number) => {
                    const isCorrect = i === active.correct_answer
                    const isSelected = i === selected
                    let bg = '#fff', border = '#f0f0f0', textColor = '#333'
                    if (isCorrect) { bg = '#D7FFB8'; border = '#58CC02'; textColor = '#27500A' }
                    else if (isSelected && !isCorrect) { bg = '#FFE5E5'; border = '#FF4B4B'; textColor = '#7f1d1d' }
                    return (
                      <div key={i} style={{ padding:'12px 16px', borderRadius:12, border:`2px solid ${border}`, background:bg, display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ width:28, height:28, borderRadius:8, background: isCorrect ? '#58CC02' : isSelected ? '#FF4B4B' : '#f0f0f0', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0 }}>
                          {isCorrect ? '✓' : isSelected ? '✗' : ['أ','ب','ج','د'][i]}
                        </span>
                        <span style={{ fontSize:14, color:textColor, fontWeight: isCorrect ? 700 : 400 }}>{opt}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Feedback */}
                <div style={{ background: result.isCorrect ? '#D7FFB8' : '#FFE5E5', borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:15, fontWeight:800, color: result.isCorrect ? '#27500A' : '#7f1d1d', marginBottom:4 }}>
                    {result.isCorrect ? `🎉 أحسنت! حصلت على ${active.xp_reward} XP` : '❌ إجابة خاطئة'}
                  </div>
                  {result.feedback && <div style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>{result.feedback}</div>}
                </div>

                {/* Explanation */}
                {result.explanation && (
                  <div style={{ background:'#f7f7f7', borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#999', marginBottom:4 }}>💡 الشرح:</div>
                    <div style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>{result.explanation}</div>
                  </div>
                )}

                <button onClick={() => setActive(null)} style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', background:'#1CB0F6', color:'#fff', fontWeight:900, fontSize:15, cursor:'pointer' }}>
                  رجوع للتحديات
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'#fff', borderTop:'2px solid #f0f0f0', display:'flex', padding:'8px 0 16px', zIndex:100, direction:'ltr' }}>
        {[
          { href:'/profile',     icon:'👤', label:'ملفي'      },
          { href:'/leaderboard', icon:'🏆', label:'الترتيب'   },
          { href:'/challenges',  icon:'⚔️',  label:'التحديات', active:true },
          { href:'/learn',       icon:'📚', label:'التعلم'    },
          { href:'/home',        icon:'🏠', label:'الرئيسية'  },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, textDecoration:'none', padding:'4px 0', position:'relative' }}>
            {(n as any).active && <div style={{ position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)', width:32, height:3, borderRadius:99, background:'#1CB0F6' }}/>}
            <span style={{ fontSize:22 }}>{n.icon}</span>
            <span style={{ fontSize:10, fontWeight:(n as any).active ? 800 : 400, color:(n as any).active ? '#1CB0F6' : '#aaa' }}>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
