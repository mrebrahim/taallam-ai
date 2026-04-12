'use client'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const DIFF_COLORS = ['', '#58CC02', '#1CB0F6', '#FF9600', '#CE82FF', '#FF4B4B']
const DIFF_LABELS = ['', 'سهل', 'متوسط', 'صعب', 'خبير', 'أسطوري']

export default function ChallengesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [challenges, setChallenges] = useState<any[]>([])
  const [attempts, setAttempts] = useState<Record<string, any>>({})
  const [active, setActive] = useState<any>(null)
  const [step, setStep] = useState<'intro' | 'mcq' | 'image_upload' | 'result'>('intro')

  // MCQ state
  const [selectedOption, setSelectedOption] = useState<number | null>(null)

  // Image upload state
  const [studentImage, setStudentImage] = useState<{ base64: string; mime: string; preview: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [result, setResult] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      const [{ data: u }, { data: ch }, { data: att }] = await Promise.all([
        supabase.from('users').select('*').eq('id', session.user.id).single(),
        supabase.from('challenges').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('user_challenge_attempts').select('*').eq('user_id', session.user.id),
      ])
      setUser(u)
      setChallenges(ch || [])
      const m: Record<string, any> = {}
      att?.forEach((a: any) => { m[a.challenge_id] = a })
      setAttempts(m)
      setLoading(false)
    }
    load()
  }, [])

  const openChallenge = (ch: any) => {
    setActive(ch)
    setStep('intro')
    setSelectedOption(null)
    setStudentImage(null)
    setResult(null)
  }

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setStudentImage({ base64, mime: file.type, preview: dataUrl })
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const submitChallenge = async () => {
    if (!user || !active) return

    // For MCQ: need selected option. For image: need image
    if (active.challenge_type === 'complete_sentence' || active.challenge_type === 'multiple_choice') {
      if (selectedOption === null) return
    }
    if (active.challenge_type === 'image_analysis' || active.challenge_type === 'node_analysis') {
      if (!studentImage) return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    try {
      let aiResult: any = null

      // MCQ — just check correct_answer
      if (active.challenge_type === 'complete_sentence' || active.challenge_type === 'multiple_choice') {
        const isCorrect = selectedOption === active.correct_answer
        aiResult = {
          is_correct: isCorrect,
          feedback_ar: isCorrect
            ? `🎉 إجابة صحيحة! ${active.explanation_ar || ''}`
            : `❌ الإجابة الصحيحة: ${active.options[active.correct_answer]}`,
          correct_explanation_ar: active.explanation_ar || '',
          score: isCorrect ? 100 : 0,
        }
      }

      // Image Analysis — Gemini
      if (active.challenge_type === 'image_analysis' || active.challenge_type === 'node_analysis') {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-challenge`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              mode: 'image_analysis',
              referenceImageUrl: active.image_url,
              studentImageBase64: studentImage?.base64,
              studentImageMimeType: studentImage?.mime,
              question: active.question_ar,
              explanation: active.explanation_ar,
            }),
          }
        )
        aiResult = await res.json()
      }

      // Save attempt
      await supabase.from('user_challenge_attempts').upsert({
        user_id: user.id,
        challenge_id: active.id,
        selected_answer: selectedOption ?? -1,
        is_correct: aiResult.is_correct,
        ai_feedback: aiResult.feedback_ar,
        score: aiResult.score || (aiResult.is_correct ? 100 : 0),
      }, { onConflict: 'user_id,challenge_id' })

      // Award XP if correct
      if (aiResult.is_correct) {
        try {
          await supabase.rpc('award_xp', {
            p_user_id: user.id,
            p_amount: active.xp_reward,
            p_reason: 'challenge_complete',
            p_reference_id: active.id,
          })
        } catch {}
      }

      setResult(aiResult)
      setAttempts(prev => ({ ...prev, [active.id]: { is_correct: aiResult.is_correct } }))
      setStep('result')
    } catch (err) {
      setResult({ is_correct: false, feedback_ar: 'حدث خطأ، حاول مرة أخرى' })
      setStep('result')
    }
    setSubmitting(false)
  }

  const completed = Object.values(attempts).filter((a: any) => a.is_correct).length
  const isImageType = active?.challenge_type === 'image_analysis' || active?.challenge_type === 'node_analysis'

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f7f7f7' }}>
      <span style={{ fontSize:48 }}>⚔️</span>
    </div>
  )

  return (
    <div dir="rtl" style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#f7f7f7', fontFamily:"'Segoe UI',Tahoma,sans-serif", paddingBottom:90 }}>

      {/* Header */}
      <header style={{ background:'#fff', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'2px solid #f0f0f0', position:'sticky', top:0, zIndex:50 }}>
        <h1 style={{ margin:0, fontSize:20, fontWeight:900, color:'#333' }}>⚔️ التحديات</h1>
        <div style={{ background:'#D7FFB8', borderRadius:99, padding:'5px 14px', fontSize:13, fontWeight:800, color:'#27500A' }}>
          {completed}/{challenges.length} مكتمل
        </div>
      </header>

      <div style={{ padding:16 }}>
        {/* Stats */}
        <div style={{ display:'flex', gap:10, marginBottom:20 }}>
          <div style={{ flex:1, background:'#D7FFB8', borderRadius:14, padding:'12px 14px' }}>
            <div style={{ fontSize:22, fontWeight:900, color:'#58CC02' }}>{completed}</div>
            <div style={{ fontSize:12, color:'#666', marginTop:2 }}>تحدي مكتمل</div>
          </div>
          <div style={{ flex:1, background:'#DDF4FF', borderRadius:14, padding:'12px 14px' }}>
            <div style={{ fontSize:22, fontWeight:900, color:'#1CB0F6' }}>
              {Object.values(attempts).filter((a: any) => a.is_correct).length * 100}
            </div>
            <div style={{ fontSize:12, color:'#666', marginTop:2 }}>XP مكتسب</div>
          </div>
        </div>

        {/* List */}
        {challenges.length === 0 ? (
          <div style={{ background:'#fff', borderRadius:20, padding:'48px 24px', textAlign:'center', border:'2px solid #f0f0f0' }}>
            <div style={{ fontSize:52, marginBottom:12 }}>🔜</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#333' }}>التحديات قادمة قريباً!</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {challenges.map(ch => {
              const att = attempts[ch.id]
              const done = att?.is_correct
              const tried = !!att && !done
              const color = DIFF_COLORS[ch.difficulty] || '#58CC02'
              const isImg = ch.challenge_type === 'image_analysis' || ch.challenge_type === 'node_analysis'

              return (
                <div key={ch.id} onClick={() => !done && openChallenge(ch)}
                  style={{ background:'#fff', borderRadius:18, padding:'16px 18px', border:`2px solid ${done ? '#58CC02' : '#f0f0f0'}`, cursor: done ? 'default' : 'pointer', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', right:0, top:0, bottom:0, width:4, background:color }} />
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    {/* Thumbnail */}
                    {ch.image_url && (
                      <img src={ch.image_url} alt="" style={{ width:64, height:48, borderRadius:10, objectFit:'cover', flexShrink:0, border:'2px solid #f0f0f0' }} />
                    )}
                    {!ch.image_url && (
                      <div style={{ width:48, height:48, borderRadius:14, background: done ? '#D7FFB8' : color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
                        {done ? '✅' : tried ? '🔄' : isImg ? '📸' : '⚔️'}
                      </div>
                    )}
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, color:'#333', fontSize:15, marginBottom:3, textAlign:'right' }}>{ch.title_ar}</div>
                      <div style={{ fontSize:12, color:'#999', textAlign:'right', marginBottom:6 }}>{ch.description_ar}</div>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end', flexWrap:'wrap' }}>
                        <span style={{ background:color+'20', color, borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700 }}>{DIFF_LABELS[ch.difficulty]}</span>
                        <span style={{ background:'#FFF5D3', color:'#A56644', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700 }}>+{ch.xp_reward} XP</span>
                        {isImg && <span style={{ background:'#F5E6FF', color:'#7B2FBE', borderRadius:6, padding:'2px 8px', fontSize:11 }}>📸 رفع صورة</span>}
                        {ch.use_ai_validation && <span style={{ background:'#F5E6FF', color:'#7B2FBE', borderRadius:6, padding:'2px 8px', fontSize:11 }}>🤖 AI</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ══ CHALLENGE MODAL ══ */}
      {active && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:480, maxHeight:'92vh', overflowY:'auto', padding:'24px 20px 40px' }} dir="rtl">

            {/* Close + Title */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:900, color:'#333' }}>{active.title_ar}</h2>
              <button onClick={() => setActive(null)} style={{ width:32, height:32, borderRadius:8, border:'none', background:'#f0f0f0', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>

            {/* ── INTRO STEP ── */}
            {step === 'intro' && (
              <>
                {active.description_ar && (
                  <div style={{ background:'#f7f7f7', borderRadius:12, padding:'12px 14px', marginBottom:16, fontSize:14, color:'#555', lineHeight:1.6, textAlign:'right' }}>
                    {active.description_ar}
                  </div>
                )}

                {/* Reference Node Image */}
                {active.image_url && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#999', marginBottom:6, textAlign:'right' }}>
                      {isImageType ? '📸 صورة الـ Node — شوف وحاول تعملها:' : '📸 صورة مرجعية:'}
                    </div>
                    <div style={{ borderRadius:14, overflow:'hidden', border:'2px solid #f0f0f0' }}>
                      <img src={active.image_url} alt="node reference" style={{ width:'100%', display:'block' }} />
                    </div>
                    {active.image_description && (
                      <div style={{ marginTop:6, padding:'8px 12px', background:'#f0f0f0', borderRadius:8, fontSize:12, color:'#666', textAlign:'right' }}>
                        💡 {active.image_description}
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

                <button
                  onClick={() => setStep(isImageType ? 'image_upload' : 'mcq')}
                  style={{ width:'100%', padding:'16px', borderRadius:14, border:'none', background:'#1CB0F6', color:'#fff', fontWeight:900, fontSize:16, cursor:'pointer' }}>
                  {isImageType ? '📸 ارفع صورتك' : '✍️ أجب على السؤال'}
                </button>
              </>
            )}

            {/* ── MCQ STEP ── */}
            {step === 'mcq' && (
              <>
                {active.image_url && (
                  <div style={{ borderRadius:12, overflow:'hidden', border:'2px solid #f0f0f0', marginBottom:12 }}>
                    <img src={active.image_url} alt="" style={{ width:'100%', display:'block', maxHeight:160, objectFit:'cover' }} />
                  </div>
                )}

                <div style={{ background:'#f7f7f7', borderRadius:12, padding:'12px 14px', marginBottom:14, fontSize:14, fontWeight:700, color:'#333', textAlign:'right', lineHeight:1.6 }}>
                  {active.question_ar}
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                  {(active.options || []).map((opt: string, i: number) => (
                    <button key={i} onClick={() => setSelectedOption(i)}
                      style={{ padding:'14px 16px', borderRadius:12, border:`2px solid ${selectedOption===i ? '#1CB0F6' : '#f0f0f0'}`, background: selectedOption===i ? '#DDF4FF' : '#fff', cursor:'pointer', textAlign:'right', fontSize:14, fontWeight: selectedOption===i ? 700 : 400, color: selectedOption===i ? '#1453A3' : '#333', display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ width:30, height:30, borderRadius:8, background: selectedOption===i ? '#1CB0F6' : '#f0f0f0', color: selectedOption===i ? '#fff' : '#999', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0 }}>
                        {['أ','ب','ج','د'][i]}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>

                <button onClick={submitChallenge} disabled={selectedOption === null || submitting}
                  style={{ width:'100%', padding:'16px', borderRadius:14, border:'none', background: selectedOption === null ? '#f0f0f0' : '#1CB0F6', color: selectedOption === null ? '#aaa' : '#fff', fontWeight:900, fontSize:16, cursor: selectedOption === null ? 'not-allowed' : 'pointer' }}>
                  {submitting ? '⏳ جاري التحقق...' : '✅ تأكيد الإجابة'}
                </button>
              </>
            )}

            {/* ── IMAGE UPLOAD STEP ── */}
            {step === 'image_upload' && (
              <>
                {/* Reference image small */}
                {active.image_url && (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:12, color:'#999', marginBottom:6, textAlign:'right' }}>📌 الـ Node المطلوب:</div>
                    <img src={active.image_url} alt="" style={{ width:'100%', borderRadius:10, border:'2px solid #f0f0f0', maxHeight:150, objectFit:'contain' }} />
                  </div>
                )}

                <div style={{ background:'#FFF5D3', borderRadius:12, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#A56644', textAlign:'right', lineHeight:1.6 }}>
                  <strong>📋 المطلوب:</strong> {active.question_ar}
                </div>

                {/* Student image upload */}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleImagePick} />

                {!studentImage ? (
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    style={{ width:'100%', padding:'28px 20px', borderRadius:16, border:'3px dashed #1CB0F6', background:'#DDF4FF', cursor:'pointer', textAlign:'center' }}>
                    <div style={{ fontSize:48, marginBottom:8 }}>📤</div>
                    <div style={{ fontSize:16, fontWeight:800, color:'#1453A3', marginBottom:4 }}>
                      {uploading ? 'جاري التحميل...' : 'ارفع Screenshot من n8n'}
                    </div>
                    <div style={{ fontSize:12, color:'#64748b' }}>اعمل الـ node وخد screenshot وارفعه هنا</div>
                  </button>
                ) : (
                  <div>
                    {/* Preview */}
                    <div style={{ borderRadius:14, overflow:'hidden', border:'3px solid #58CC02', marginBottom:12 }}>
                      <img src={studentImage.preview} alt="your work" style={{ width:'100%', display:'block' }} />
                    </div>
                    <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                      <button onClick={() => { setStudentImage(null); fileRef.current?.click() }}
                        style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:13, color:'#666' }}>
                        🔄 تغيير الصورة
                      </button>
                      <button onClick={() => setStudentImage(null)}
                        style={{ padding:'10px 14px', borderRadius:10, border:'1px solid #ffcdd2', background:'#fff', cursor:'pointer', fontSize:13, color:'#e53935' }}>
                        حذف
                      </button>
                    </div>

                    <button onClick={submitChallenge} disabled={submitting}
                      style={{ width:'100%', padding:'16px', borderRadius:14, border:'none', background: submitting ? '#aaa' : '#CE82FF', color:'#fff', fontWeight:900, fontSize:16, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                      {submitting ? '🤖 Gemini بيحلل صورتك...' : '🚀 أرسل للتصحيح بالـ AI'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── RESULT STEP ── */}
            {step === 'result' && result && (
              <div>
                {/* Result header */}
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ fontSize:64, marginBottom:8 }}>{result.is_correct ? '🎉' : '😔'}</div>
                  <div style={{ fontSize:22, fontWeight:900, color: result.is_correct ? '#58CC02' : '#FF4B4B' }}>
                    {result.is_correct ? `أحسنت! +${active.xp_reward} XP` : 'حاول مرة أخرى!'}
                  </div>
                </div>

                {/* Show MCQ options result */}
                {(active.challenge_type === 'complete_sentence' || active.challenge_type === 'multiple_choice') && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                    {(active.options || []).map((opt: string, i: number) => {
                      const isCorrect = i === active.correct_answer
                      const isSelected = i === selectedOption
                      return (
                        <div key={i} style={{ padding:'12px 14px', borderRadius:12, border:`2px solid ${isCorrect ? '#58CC02' : isSelected && !isCorrect ? '#FF4B4B' : '#f0f0f0'}`, background: isCorrect ? '#D7FFB8' : isSelected && !isCorrect ? '#FFE5E5' : '#f9f9f9', display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ width:28, height:28, borderRadius:8, background: isCorrect ? '#58CC02' : isSelected && !isCorrect ? '#FF4B4B' : '#f0f0f0', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0 }}>
                            {isCorrect ? '✓' : isSelected && !isCorrect ? '✗' : ['أ','ب','ج','د'][i]}
                          </span>
                          <span style={{ fontSize:14, fontWeight: isCorrect ? 700 : 400, color: isCorrect ? '#27500A' : isSelected && !isCorrect ? '#7f1d1d' : '#333' }}>{opt}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* AI Feedback */}
                <div style={{ background: result.is_correct ? '#D7FFB8' : '#FFF3E0', borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:14, color: result.is_correct ? '#27500A' : '#A56644', lineHeight:1.6, textAlign:'right' }}>
                    {result.feedback_ar}
                  </div>
                </div>

                {/* Explanation */}
                {result.correct_explanation_ar && (
                  <div style={{ background:'#f7f7f7', borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#999', marginBottom:4 }}>💡 الشرح:</div>
                    <div style={{ fontSize:13, color:'#555', lineHeight:1.7, textAlign:'right' }}>{result.correct_explanation_ar}</div>
                  </div>
                )}

                <button onClick={() => setActive(null)}
                  style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', background:'#1CB0F6', color:'#fff', fontWeight:900, fontSize:15, cursor:'pointer' }}>
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
