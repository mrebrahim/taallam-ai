'use client'
import QuizSession from '@/components/QuizSession'
import CelebrationScreen from '@/components/CelebrationScreen'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const DIFF_COLORS = ['','#58CC02','#1CB0F6','#FF9600','#CE82FF','#FF4B4B']
const DIFF_LABELS = ['','سهل','متوسط','صعب','خبير','أسطوري']

export default function ChallengesPage() {
  const router = useRouter()
  const [user, setUser]         = useState<any>(null)
  const [challenges, setChallenges] = useState<any[]>([])
  const [attempts, setAttempts] = useState<Record<string,any>>({})
  const [active, setActive]     = useState<any>(null)
  const [step, setStep]         = useState<'intro'|'mcq'|'image_upload'|'result'>('intro')
  const [selectedOption, setSelectedOption] = useState<number|null>(null)
  const [studentImage, setStudentImage] = useState<{base64:string;mime:string;preview:string}|null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult]     = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [showCelebration, setShowCelebration] = useState(false)
  const [quizMode, setQuizMode] = useState(false)
  const [celebrationXP, setCelebrationXP] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data:{ session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      const [{ data:u }, { data:ch }, { data:att }] = await Promise.all([
        supabase.from('users').select('*').eq('id', session.user.id).single(),
        supabase.from('challenges').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('user_challenge_attempts').select('*').eq('user_id', session.user.id),
      ])
      setUser(u)
      setChallenges(ch || [])
      const m: Record<string,any> = {}
      att?.forEach((a:any) => { m[a.challenge_id] = a })
      setAttempts(m)
      setLoading(false)
    }
    load()
  }, [])

  const openChallenge = (ch: any) => {
    setActive(ch); setStep('intro')
    setSelectedOption(null); setStudentImage(null); setResult(null)
  }

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setStudentImage({ base64: dataUrl.split(',')[1], mime: file.type, preview: dataUrl })
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const submitChallenge = async () => {
    if (!user || !active) return
    setSubmitting(true)
    const supabase = createClient()
    const { data:{ session } } = await supabase.auth.getSession()

    try {
      let aiResult: any = null
      const isMCQ = active.challenge_type === 'complete_sentence' || active.challenge_type === 'multiple_choice'
      const isImg = active.challenge_type === 'image_analysis' || active.challenge_type === 'node_analysis'

      if (isMCQ) {
        const isCorrect = selectedOption === active.correct_answer
        aiResult = {
          is_correct: isCorrect,
          feedback_ar: isCorrect
            ? `${active.explanation_ar || 'أحسنت! إجابة صحيحة تماماً!'}`
            : `الإجابة الصحيحة: ${active.options[active.correct_answer]}`,
          correct_explanation_ar: active.explanation_ar || '',
          score: isCorrect ? 100 : 0,
        }
      }

      if (isImg && studentImage) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-challenge`,
          {
            method: 'POST',
            headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${session?.access_token}` },
            body: JSON.stringify({
              mode: 'image_analysis',
              referenceImageUrl: active.image_url,
              studentImageBase64: studentImage.base64,
              studentImageMimeType: studentImage.mime,
              question: active.question_ar,
              explanation: active.explanation_ar,
            }),
          }
        )
        aiResult = await res.json()
      }

      await supabase.from('user_challenge_attempts').upsert({
        user_id: user.id,
        challenge_id: active.id,
        selected_answer: selectedOption ?? -1,
        is_correct: aiResult.is_correct,
        ai_feedback: aiResult.feedback_ar,
        score: aiResult.score || (aiResult.is_correct ? 100 : 0),
      }, { onConflict: 'user_id,challenge_id' })

      if (aiResult.is_correct) {
        try {
          await supabase.rpc('award_xp', {
            p_user_id: user.id, p_amount: active.xp_reward,
            p_reason: 'challenge_complete', p_reference_id: active.id,
          })
        } catch {}
        setCelebrationXP(active.xp_reward)
        setShowCelebration(true)
      }

      setResult(aiResult)
      setAttempts(prev => ({ ...prev, [active.id]: { is_correct: aiResult.is_correct } }))
      setStep('result')
    } catch {
      setResult({ is_correct: false, feedback_ar: 'حدث خطأ، حاول مرة أخرى' })
      setStep('result')
    }
    setSubmitting(false)
  }

  const completed = Object.values(attempts).filter((a:any) => a.is_correct).length
  const isImageType = active?.challenge_type === 'image_analysis' || active?.challenge_type === 'node_analysis'

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f7f7f7'}}>
      <span style={{fontSize:48}}>⚔️</span>
    </div>
  )

  return (
    <div dir="rtl" style={{maxWidth:480,margin:'0 auto',minHeight:'100vh',background:'#f7f7f7',fontFamily:"'Segoe UI',Tahoma,sans-serif",paddingBottom:90}}>

      {/* Celebration Screen */}
      {showCelebration && (
        <CelebrationScreen
          xp={celebrationXP}
          title={active ? `🎉 ${active.title_ar}` : '🎉 أحسنت!'}
          subtitle={`حصلت على +${celebrationXP} XP! استمر وحافظ على الـ streak 🔥`}
          onContinue={() => { setShowCelebration(false); setActive(null) }}
        />
      )}

      {/* Header */}
      {/* Quiz Session Mode */}
      {quizMode && challenges.length > 0 && (
        <QuizSession
          streak={user?.streak_current || 0}
          questions={challenges.map(ch => ({
            id: ch.id,
            title_ar: ch.title_ar,
            question_ar: ch.question_ar,
            options: ch.options || [],
            correct_answer: ch.correct_answer,
            explanation_ar: ch.explanation_ar,
            xp_reward: ch.xp_reward,
            difficulty: ch.difficulty,
          }))}
          onComplete={({ correct, total, xpEarned }) => {
            setQuizMode(false)
            // Reload attempts
            const supabase = createClient()
            supabase.from('user_challenge_attempts').select('*').eq('user_id', user?.id).then(({ data }) => {
              const m: Record<string, any> = {}
              data?.forEach((a: any) => { m[a.challenge_id] = a })
              setAttempts(m)
            })
          }}
          onExit={() => setQuizMode(false)}
        />
      )}

      <header style={{background:'#fff',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'2px solid #f0f0f0',position:'sticky',top:0,zIndex:50}}>
        <h1 style={{margin:0,fontSize:20,fontWeight:900,color:'#333'}}>⚔️ التحديات</h1>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {challenges.filter(ch => ch.challenge_type === 'complete_sentence' || ch.challenge_type === 'multiple_choice').length > 0 && (
            <button onClick={() => setQuizMode(true)} style={{background:'#1CB0F6',borderRadius:99,padding:'6px 14px',fontSize:12,fontWeight:800,color:'#fff',border:'none',cursor:'pointer'}}>
              🚀 جلسة كاملة
            </button>
          )}
          <div style={{background:'#D7FFB8',borderRadius:99,padding:'5px 14px',fontSize:13,fontWeight:800,color:'#27500A'}}>
            {completed}/{challenges.length} ✅
          </div>
        </div>
      </header>

      <div style={{padding:16}}>
        {/* Stats */}
        <div style={{display:'flex',gap:10,marginBottom:16}}>
          <div style={{flex:1,background:'#D7FFB8',borderRadius:14,padding:'12px 14px'}}>
            <div style={{fontSize:22,fontWeight:900,color:'#58CC02'}}>{completed}</div>
            <div style={{fontSize:12,color:'#666',marginTop:2}}>مكتمل</div>
          </div>
          <div style={{flex:1,background:'#FFF5D3',borderRadius:14,padding:'12px 14px'}}>
            <div style={{fontSize:22,fontWeight:900,color:'#FF9600'}}>
              {Object.values(attempts).filter((a:any) => a.is_correct).reduce((sum:number, a:any) => sum, 0) * 100}
            </div>
            <div style={{fontSize:12,color:'#666',marginTop:2}}>XP مكتسب</div>
          </div>
        </div>

        {/* Sadaqat Al-Ilm Banner */}
        <Link href="/sadaqat" style={{ textDecoration:'none', display:'block', marginBottom:16 }}>
          <div style={{ background:'linear-gradient(135deg, #1e293b, #334155)', borderRadius:18, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:32 }}>📿</span>
            <div>
              <div style={{ fontWeight:800, color:'#fff', fontSize:15 }}>صدقة العلم</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:2 }}>حل التحديات مع زملائك واكسب XP أكتر!</div>
            </div>
            <span style={{ marginRight:'auto', color:'#FF9600', fontSize:18 }}>←</span>
          </div>
        </Link>

        {challenges.length === 0 ? (
          <div style={{background:'#fff',borderRadius:20,padding:'48px 24px',textAlign:'center',border:'2px solid #f0f0f0'}}>
            <div style={{fontSize:52,marginBottom:12}}>🔜</div>
            <div style={{fontSize:18,fontWeight:800,color:'#333'}}>التحديات قادمة!</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {challenges.map(ch => {
              const att = attempts[ch.id]
              const done = att?.is_correct
              const tried = !!att && !done
              const color = DIFF_COLORS[ch.difficulty] || '#58CC02'
              return (
                <div key={ch.id} onClick={() => !done && openChallenge(ch)}
                  style={{background:'#fff',borderRadius:18,padding:'16px 18px',border:`2px solid ${done?'#58CC02':'#f0f0f0'}`,cursor:done?'default':'pointer',position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',right:0,top:0,bottom:0,width:4,background:color}}/>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    {ch.image_url && (
                      <img src={ch.image_url} alt="" style={{width:56,height:44,borderRadius:8,objectFit:'cover',border:'2px solid #f0f0f0',flexShrink:0}}/>
                    )}
                    {!ch.image_url && (
                      <div style={{width:48,height:48,borderRadius:14,background:done?'#D7FFB8':color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>
                        {done?'✅':tried?'🔄':ch.challenge_type==='node_analysis'?'📸':'⚔️'}
                      </div>
                    )}
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,color:'#333',fontSize:15,marginBottom:3}}>{ch.title_ar}</div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <span style={{background:color+'20',color,borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:700}}>{DIFF_LABELS[ch.difficulty]}</span>
                        <span style={{background:'#FFF5D3',color:'#A56644',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:700}}>+{ch.xp_reward} XP</span>
                        {ch.use_ai_validation && <span style={{background:'#F5E6FF',color:'#7B2FBE',borderRadius:6,padding:'2px 8px',fontSize:11}}>🤖 AI</span>}
                      </div>
                    </div>
                    {!done && <span style={{fontSize:18,color:'#ddd'}}>←</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ══ CHALLENGE MODAL ══ */}
      {active && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.72)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200}}>
          <div style={{background:'#fff',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:480,maxHeight:'93vh',overflowY:'auto',padding:'24px 20px 40px'}} dir="rtl">

            {/* ── RESULT SCREEN — Duolingo XP Lightning Style ── */}
            {step === 'result' && result && (
              <div>
                {result.is_correct ? (
                  /* ═══════ SUCCESS SCREEN ═══════ */
                  <div style={{background:'#1a1a2e',borderRadius:20,margin:'-24px -20px -40px',padding:'32px 24px 40px',minHeight:400,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>

                    {/* Lightning bolts background */}
                    <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
                      {/* Left lightning */}
                      <svg style={{position:'absolute',left:-20,top:0,opacity:0.3}} width="120" height="400" viewBox="0 0 120 400">
                        <polyline points="80,0 40,150 70,150 20,400" stroke="#FFD700" strokeWidth="12" fill="none" strokeLinejoin="round"/>
                      </svg>
                      {/* Right lightning */}
                      <svg style={{position:'absolute',right:-20,top:0,opacity:0.3}} width="120" height="400" viewBox="0 0 120 400">
                        <polyline points="40,0 80,150 50,150 100,400" stroke="#FFD700" strokeWidth="12" fill="none" strokeLinejoin="round"/>
                      </svg>
                    </div>

                    {/* Stars */}
                    {['20%,15%','75%,10%','10%,45%','85%,40%','50%,8%'].map((pos,i)=>(
                      <div key={i} style={{position:'absolute',left:pos.split(',')[0],top:pos.split(',')[1],fontSize:i%2===0?16:12,animation:`twinkle ${1+i*0.3}s ease-in-out infinite alternate`}}>⭐</div>
                    ))}

                    {/* Nar mascot holding XP cup */}
                    <div style={{fontSize:80,marginBottom:8,filter:'drop-shadow(0 0 20px #58CC02)'}}>🤖</div>

                    {/* XP Cup — the KEY element */}
                    <div style={{
                      background:'linear-gradient(135deg,#FF9600,#FFD700)',
                      borderRadius:20,padding:'16px 32px',marginBottom:16,
                      boxShadow:'0 8px 32px #FF960060, 0 0 60px #FFD70040',
                      border:'3px solid #FFD700',
                      display:'flex',alignItems:'center',gap:12,
                      animation:'xpPulse 0.6s ease-out',
                    }}>
                      <span style={{fontSize:36}}>⚡</span>
                      <span style={{fontSize:48,fontWeight:900,color:'#fff',textShadow:'0 2px 8px rgba(0,0,0,0.3)'}}>+{active.xp_reward}</span>
                      <div>
                        <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>XP</div>
                      </div>
                    </div>

                    <h2 style={{margin:'0 0 6px',fontSize:28,fontWeight:900,color:'#fff',textAlign:'center'}}>
                      إجابة صحيحة! 🎉
                    </h2>
                    <p style={{margin:'0 0 24px',fontSize:15,color:'rgba(255,255,255,0.7)',textAlign:'center'}}>
                      نار فخور بيك! 🤖
                    </p>

                    {/* Explanation (collapsible feel) */}
                    {result.feedback_ar && (
                      <div style={{background:'rgba(255,255,255,0.1)',borderRadius:14,padding:'12px 16px',marginBottom:20,width:'100%',boxSizing:'border-box',textAlign:'right'}}>
                        <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:4}}>💡 الشرح:</div>
                        <div style={{fontSize:14,color:'rgba(255,255,255,0.9)',lineHeight:1.7}}>{result.feedback_ar}</div>
                      </div>
                    )}

                    <button onClick={()=>setActive(null)}
                      style={{width:'100%',padding:'16px',borderRadius:14,border:'none',background:'#58CC02',color:'#fff',fontWeight:900,fontSize:18,cursor:'pointer',boxShadow:'0 4px 16px #58CC0260',letterSpacing:0.5}}>
                      المتابعة ←
                    </button>
                  </div>
                ) : (
                  /* ═══════ WRONG ANSWER SCREEN ═══════ */
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                      <div style={{fontSize:13,color:'#FF4B4B',fontWeight:700}}>إجابة خاطئة</div>
                      <button onClick={()=>setActive(null)} style={{width:30,height:30,borderRadius:7,border:'none',background:'#f0f0f0',cursor:'pointer',fontSize:14}}>✕</button>
                    </div>

                    {/* Wrong indicator */}
                    <div style={{background:'#FFE5E5',borderRadius:14,padding:'14px 16px',marginBottom:14,border:'2px solid #FF4B4B',display:'flex',alignItems:'center',gap:12}}>
                      <span style={{fontSize:32}}>😔</span>
                      <div>
                        <div style={{fontWeight:800,color:'#FF4B4B',fontSize:15,marginBottom:2}}>الإجابة الصحيحة:</div>
                        <div style={{fontSize:14,color:'#7f1d1d',fontWeight:700}}>{active.options?.[active.correct_answer]}</div>
                      </div>
                    </div>

                    {/* MCQ options */}
                    <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
                      {(active.options||[]).map((opt:string,i:number)=>{
                        const isCorrect = i===active.correct_answer
                        const isSelected = i===selectedOption
                        return (
                          <div key={i} style={{padding:'12px 14px',borderRadius:12,border:`2px solid ${isCorrect?'#58CC02':isSelected&&!isCorrect?'#FF4B4B':'#f0f0f0'}`,background:isCorrect?'#D7FFB8':isSelected&&!isCorrect?'#FFE5E5':'#f9f9f9',display:'flex',alignItems:'center',gap:10}}>
                            <span style={{width:28,height:28,borderRadius:8,background:isCorrect?'#58CC02':isSelected&&!isCorrect?'#FF4B4B':'#f0f0f0',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,flexShrink:0}}>
                              {isCorrect?'✓':isSelected&&!isCorrect?'✗':['أ','ب','ج','د'][i]}
                            </span>
                            <span style={{fontSize:14,fontWeight:isCorrect?700:400,color:isCorrect?'#27500A':isSelected&&!isCorrect?'#7f1d1d':'#555'}}>{opt}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Explanation */}
                    {result.feedback_ar && (
                      <div style={{background:'#FFF3E0',borderRadius:12,padding:'12px 14px',marginBottom:16,border:'2px solid #FF9600',textAlign:'right'}}>
                        <div style={{fontSize:12,color:'#A56644',fontWeight:700,marginBottom:4}}>🔍 التصحيح:</div>
                        <div style={{fontSize:13,color:'#7f3d00',lineHeight:1.7}}>{result.feedback_ar}</div>
                      </div>
                    )}

                    <div style={{display:'flex',gap:10}}>
                      <button onClick={()=>{setStep('mcq');setSelectedOption(null);setResult(null)}}
                        style={{flex:1,padding:'14px',borderRadius:14,border:'2px solid #1CB0F6',background:'transparent',color:'#1CB0F6',fontWeight:800,fontSize:14,cursor:'pointer'}}>
                        🔄 حاول مرة أخرى
                      </button>
                      <button onClick={()=>setActive(null)}
                        style={{flex:1,padding:'14px',borderRadius:14,border:'none',background:'#f0f0f0',color:'#666',fontWeight:700,fontSize:14,cursor:'pointer'}}>
                        رجوع
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── INTRO STEP ── */}
            {step === 'intro' && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <h2 style={{margin:0,fontSize:18,fontWeight:900,color:'#333'}}>{active.title_ar}</h2>
                  <button onClick={()=>setActive(null)} style={{width:32,height:32,borderRadius:8,border:'none',background:'#f0f0f0',cursor:'pointer',fontSize:16}}>✕</button>
                </div>
                {active.image_url && (
                  <div style={{marginBottom:16,borderRadius:14,overflow:'hidden',border:'2px solid #f0f0f0'}}>
                    <img src={active.image_url} alt="node" style={{width:'100%',display:'block'}}/>
                  </div>
                )}
                <div style={{background:'#f7f7f7',borderRadius:14,padding:'14px 16px',marginBottom:16}}>
                  <div style={{fontSize:15,fontWeight:700,color:'#333',lineHeight:1.6}}>{active.question_ar}</div>
                </div>
                <div style={{display:'flex',gap:10,marginBottom:20}}>
                  <div style={{background:'#FFF5D3',borderRadius:10,padding:'8px 14px',fontSize:13,fontWeight:700,color:'#A56644'}}>+{active.xp_reward} XP</div>
                  <div style={{background:DIFF_COLORS[active.difficulty]+'20',borderRadius:10,padding:'8px 14px',fontSize:13,fontWeight:700,color:DIFF_COLORS[active.difficulty]}}>{DIFF_LABELS[active.difficulty]}</div>
                  <div style={{background:'#f0f0f0',borderRadius:10,padding:'8px 14px',fontSize:13,color:'#999'}}>3 دقائق</div>
                </div>
                <button onClick={()=>setStep(isImageType?'image_upload':'mcq')}
                  style={{width:'100%',padding:'16px',borderRadius:14,border:'none',background:'#1CB0F6',color:'#fff',fontWeight:900,fontSize:16,cursor:'pointer'}}>
                  {isImageType?'📸 ارفع صورتك':'✍️ أجب على السؤال'}
                </button>
              </>
            )}

            {/* ── MCQ STEP ── */}
            {step === 'mcq' && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <button onClick={()=>setStep('intro')} style={{background:'none',border:'none',color:'#aaa',cursor:'pointer',fontSize:14}}>← رجوع</button>
                  <button onClick={()=>setActive(null)} style={{width:30,height:30,borderRadius:7,border:'none',background:'#f0f0f0',cursor:'pointer',fontSize:14}}>✕</button>
                </div>
                {active.image_url && (
                  <div style={{borderRadius:12,overflow:'hidden',border:'2px solid #f0f0f0',marginBottom:12}}>
                    <img src={active.image_url} alt="" style={{width:'100%',display:'block',maxHeight:160,objectFit:'cover'}}/>
                  </div>
                )}
                <div style={{background:'#f7f7f7',borderRadius:12,padding:'12px 14px',marginBottom:14,fontSize:14,fontWeight:700,color:'#333',lineHeight:1.6}}>
                  {active.question_ar}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
                  {(active.options||[]).map((opt:string,i:number)=>(
                    <button key={i} onClick={()=>setSelectedOption(i)}
                      style={{padding:'14px 16px',borderRadius:12,border:`2px solid ${selectedOption===i?'#1CB0F6':'#f0f0f0'}`,background:selectedOption===i?'#DDF4FF':'#fff',cursor:'pointer',textAlign:'right',fontSize:14,fontWeight:selectedOption===i?700:400,color:selectedOption===i?'#1453A3':'#333',display:'flex',alignItems:'center',gap:12,transition:'all 0.15s'}}>
                      <span style={{width:30,height:30,borderRadius:8,background:selectedOption===i?'#1CB0F6':'#f0f0f0',color:selectedOption===i?'#fff':'#999',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,flexShrink:0}}>
                        {['أ','ب','ج','د'][i]}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
                <button onClick={submitChallenge} disabled={selectedOption===null||submitting}
                  style={{width:'100%',padding:'16px',borderRadius:14,border:'none',background:selectedOption===null?'#f0f0f0':submitting?'#aaa':'#1CB0F6',color:selectedOption===null?'#aaa':'#fff',fontWeight:900,fontSize:16,cursor:selectedOption===null?'not-allowed':'pointer',transition:'background 0.2s'}}>
                  {submitting?'⏳ جاري التحقق...':'✅ تأكيد الإجابة'}
                </button>
              </>
            )}

            {/* ── IMAGE UPLOAD STEP ── */}
            {step === 'image_upload' && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <button onClick={()=>setStep('intro')} style={{background:'none',border:'none',color:'#aaa',cursor:'pointer',fontSize:14}}>← رجوع</button>
                  <button onClick={()=>setActive(null)} style={{width:30,height:30,borderRadius:7,border:'none',background:'#f0f0f0',cursor:'pointer',fontSize:14}}>✕</button>
                </div>
                {active.image_url && (
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,color:'#999',marginBottom:6}}>📌 الـ Node المطلوب:</div>
                    <img src={active.image_url} alt="" style={{width:'100%',borderRadius:10,border:'2px solid #f0f0f0',maxHeight:150,objectFit:'contain'}}/>
                  </div>
                )}
                <div style={{background:'#FFF5D3',borderRadius:12,padding:'10px 14px',marginBottom:14,fontSize:13,color:'#A56644',lineHeight:1.6}}>
                  <strong>📋 المطلوب:</strong> {active.question_ar}
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handleImagePick}/>
                {!studentImage ? (
                  <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                    style={{width:'100%',padding:'28px 20px',borderRadius:16,border:'3px dashed #1CB0F6',background:'#DDF4FF',cursor:'pointer',textAlign:'center'}}>
                    <div style={{fontSize:48,marginBottom:8}}>📤</div>
                    <div style={{fontSize:16,fontWeight:800,color:'#1453A3',marginBottom:4}}>{uploading?'جاري التحميل...':'ارفع Screenshot من n8n'}</div>
                    <div style={{fontSize:12,color:'#64748b'}}>اعمل الـ node وخد screenshot</div>
                  </button>
                ) : (
                  <div>
                    <div style={{borderRadius:14,overflow:'hidden',border:'3px solid #58CC02',marginBottom:12}}>
                      <img src={studentImage.preview} alt="" style={{width:'100%',display:'block'}}/>
                    </div>
                    <div style={{display:'flex',gap:8,marginBottom:16}}>
                      <button onClick={()=>{setStudentImage(null);fileRef.current?.click()}} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13,color:'#666'}}>🔄 تغيير</button>
                      <button onClick={()=>setStudentImage(null)} style={{padding:'10px 14px',borderRadius:10,border:'1px solid #ffcdd2',background:'#fff',cursor:'pointer',fontSize:13,color:'#e53935'}}>حذف</button>
                    </div>
                    <button onClick={submitChallenge} disabled={submitting}
                      style={{width:'100%',padding:'16px',borderRadius:14,border:'none',background:submitting?'#aaa':'#CE82FF',color:'#fff',fontWeight:900,fontSize:16,cursor:submitting?'not-allowed':'pointer'}}>
                      {submitting?'🤖 Gemini بيحلل صورتك...':'🚀 أرسل للتصحيح بالـ AI'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:'#fff',borderTop:'2px solid #f0f0f0',display:'flex',padding:'8px 0 16px',zIndex:100,direction:'ltr'}}>
        {[
          {href:'/profile',     icon:'👤',label:'ملفي'     },
          {href:'/leaderboard', icon:'🏆',label:'الترتيب'  },
          {href:'/challenges',  icon:'⚔️', label:'التحديات',active:true},
          {href:'/learn',       icon:'📚',label:'التعلم'   },
          {href:'/home',        icon:'🏠',label:'الرئيسية' },
        ].map(n=>(
          <Link key={n.href} href={n.href} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,textDecoration:'none',padding:'4px 0',position:'relative'}}>
            {(n as any).active&&<div style={{position:'absolute',top:-8,left:'50%',transform:'translateX(-50%)',width:32,height:3,borderRadius:99,background:'#1CB0F6'}}/>}
            <span style={{fontSize:22}}>{n.icon}</span>
            <span style={{fontSize:10,fontWeight:(n as any).active?800:400,color:(n as any).active?'#1CB0F6':'#aaa'}}>{n.label}</span>
          </Link>
        ))}
      </nav>

      <style>{`
        @keyframes fall {
          to { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes xpPulse {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes twinkle {
          from { opacity: 0.3; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
