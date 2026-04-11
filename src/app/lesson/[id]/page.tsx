'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LessonPage() {
  const { id } = useParams()
  const router = useRouter()
  const [lesson, setLesson] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }

      const [{ data: lessonData }, { data: userData }, { data: progressData }] = await Promise.all([
        supabase.from('lessons').select('*, roadmaps(title_ar, slug)').eq('id', id).single(),
        supabase.from('users').select('*').eq('id', session.user.id).single(),
        supabase.from('user_lesson_progress').select('*').eq('user_id', session.user.id).eq('lesson_id', id).maybeSingle(),
      ])

      setLesson(lessonData)
      setUser(userData)
      setCompleted(progressData?.completed || false)
      setLoading(false)
    }
    load()
  }, [id])

  const completeLesson = async () => {
    if (completing || completed || !user) return
    setCompleting(true)
    const supabase = createClient()

    // Mark lesson complete
    await supabase.from('user_lesson_progress').upsert({
      user_id: user.id,
      lesson_id: id,
      completed: true,
      completed_at: new Date().toISOString(),
      score: 100,
    }, { onConflict: 'user_id,lesson_id' })

    // Award XP
    await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_amount: lesson.xp_reward,
      p_reason: 'lesson_complete',
      p_reference_id: id,
    })

    setCompleted(true)
    setCompleting(false)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f7f7f7' }}>
      <span style={{ fontSize:48 }}>📚</span>
    </div>
  )

  if (!lesson) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <span style={{ fontSize:48 }}>😕</span>
      <p>الدرس غير موجود</p>
      <Link href="/learn" style={{ color:'#1CB0F6' }}>← العودة للمسارات</Link>
    </div>
  )

  const roadmapSlug = lesson.roadmaps?.slug
  const COLORS: Record<string, string> = { n8n_automation:'#58CC02', ai_video:'#FF9600', vibe_coding:'#CE82FF' }
  const color = COLORS[roadmapSlug] || '#58CC02'

  // Get Vimeo embed URL (clean player - no logos, no related videos)
  const getVimeoEmbed = (lesson: any): string | null => {
    // Priority: vimeo_id > vimeo_url > video_url (YouTube fallback)
    let vimeoId: string | null = null
    
    if (lesson.vimeo_id) {
      vimeoId = lesson.vimeo_id
    } else if (lesson.vimeo_url) {
      const match = lesson.vimeo_url.match(/vimeo\.com\/(\d+)/)
      if (match) vimeoId = match[1]
    }
    
    if (vimeoId) {
      // Clean Vimeo player: no title, no byline, no portrait, no related videos
      return `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`
    }
    
    // Fallback to YouTube if no Vimeo
    if (lesson.video_url) {
      const match = lesson.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
      if (match) return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`
    }
    
    return null
  }

  const embedUrl = getVimeoEmbed(lesson)
  const isVimeo = !!(lesson.vimeo_id || lesson.vimeo_url)

  return (
    <div dir="rtl" style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#f7f7f7', fontFamily:"'Segoe UI', Tahoma, sans-serif", paddingBottom:100 }}>

      {/* Header */}
      <header style={{ background:'#fff', padding:'14px 16px', display:'flex', alignItems:'center', gap:12, borderBottom:'2px solid #f0f0f0', position:'sticky', top:0, zIndex:50 }}>
        <Link href={`/learn?roadmap=${roadmapSlug}`} style={{ width:36, height:36, borderRadius:10, background:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', fontSize:18, flexShrink:0 }}>
          ←
        </Link>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, color:'#999', marginBottom:2 }}>{lesson.roadmaps?.title_ar}</div>
          <div style={{ fontSize:15, fontWeight:700, color:'#333', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lesson.title_ar}</div>
        </div>
        <div style={{ background: color+'20', color, borderRadius:99, padding:'4px 12px', fontSize:13, fontWeight:800, flexShrink:0 }}>
          +{lesson.xp_reward} XP
        </div>
      </header>

      <div style={{ padding:'16px 16px 0' }}>

        {/* Video Player */}
        {embedUrl && (
          <div style={{ borderRadius:16, overflow:'hidden', marginBottom:20, boxShadow:'0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ position:'relative', paddingBottom:'56.25%', height:0 }}>
              <iframe
                src={embedUrl}
                style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }}
                allowFullScreen
                allow={isVimeo 
                  ? "autoplay; fullscreen; picture-in-picture; clipboard-write"
                  : "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                }
                title={lesson.title_ar}
              />
            </div>
          </div>
        )}

        {/* Lesson Info */}
        <div style={{ background:'#fff', borderRadius:20, padding:'18px 20px', marginBottom:16, border:'2px solid #f0f0f0' }}>
          <h1 style={{ margin:'0 0 8px', fontSize:20, fontWeight:900, color:'#333', lineHeight:1.3 }}>{lesson.title_ar}</h1>
          {lesson.description_ar && (
            <p style={{ margin:'0 0 12px', fontSize:14, color:'#666', lineHeight:1.6 }}>{lesson.description_ar}</p>
          )}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <span style={{ background:'#f0f0f0', borderRadius:8, padding:'4px 10px', fontSize:12, color:'#666' }}>
              ⏱️ {lesson.duration_minutes} دقيقة
            </span>
            <span style={{ background: color+'20', color, borderRadius:8, padding:'4px 10px', fontSize:12, fontWeight:700 }}>
              ⚡ {lesson.xp_reward} XP
            </span>
            {completed && (
              <span style={{ background:'#D7FFB8', color:'#27500A', borderRadius:8, padding:'4px 10px', fontSize:12, fontWeight:700 }}>
                ✅ مكتمل
              </span>
            )}
          </div>
        </div>

        {/* Lesson Content */}
        {lesson.content_ar && (
          <div style={{ background:'#fff', borderRadius:20, padding:'18px 20px', marginBottom:20, border:'2px solid #f0f0f0' }}>
            <h2 style={{ margin:'0 0 12px', fontSize:16, fontWeight:800, color:'#333' }}>📖 محتوى الدرس</h2>
            <div style={{ fontSize:14, color:'#555', lineHeight:1.8, whiteSpace:'pre-wrap' }}>
              {lesson.content_ar}
            </div>
          </div>
        )}

        {/* No content placeholder */}
        {!embedUrl && !lesson.content_ar && (
          <div style={{ background:'#fff', borderRadius:20, padding:'40px 20px', marginBottom:20, border:'2px solid #f0f0f0', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔜</div>
            <div style={{ fontSize:16, fontWeight:700, color:'#333', marginBottom:8 }}>المحتوى قادم قريباً</div>
            <div style={{ fontSize:14, color:'#999' }}>يتم إعداد محتوى هذا الدرس</div>
          </div>
        )}

      </div>

      {/* Complete Button - fixed bottom */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, padding:'12px 16px 20px', background:'linear-gradient(transparent, #f7f7f7 30%)', zIndex:50 }}>
        {completed ? (
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1, padding:'14px', borderRadius:14, background:'#D7FFB8', color:'#27500A', fontWeight:800, fontSize:16, textAlign:'center' }}>
              ✅ أكملت هذا الدرس!
            </div>
            <Link href={`/learn?roadmap=${roadmapSlug}`} style={{ padding:'14px 20px', borderRadius:14, background:'#1CB0F6', color:'#fff', fontWeight:800, fontSize:14, textDecoration:'none', display:'flex', alignItems:'center' }}>
              التالي ←
            </Link>
          </div>
        ) : (
          <button
            onClick={completeLesson}
            disabled={completing}
            style={{ width:'100%', padding:'16px', borderRadius:14, border:'none', background: completing ? '#aaa' : color, color:'#fff', fontWeight:900, fontSize:17, cursor: completing ? 'not-allowed' : 'pointer', boxShadow:`0 4px 16px ${color}50`, transition:'transform 0.1s', letterSpacing:0.5 }}
          >
            {completing ? '⏳ جاري التسجيل...' : '✅ أكملت الدرس — احصل على XP'}
          </button>
        )}
      </div>

    </div>
  )
}
