'use client'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ROADMAP_META: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
  n8n_automation: { emoji: '⚡', color: '#58CC02', bg: '#D7FFB8', label: 'أتمتة n8n' },
  ai_video:       { emoji: '🎬', color: '#FF9600', bg: '#FFCE8E', label: 'AI Video' },
  vibe_coding:    { emoji: '💻', color: '#CE82FF', bg: '#F5E6FF', label: 'Vibe Coding' },
}

export default function LearnPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<Set<string>>(new Set())
  const [lessons, setLessons] = useState<Record<string, any[]>>({})
  const [progress, setProgress] = useState<Record<string, any>>({})
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  const [selectedRoadmap, setSelectedRoadmap] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }

      const [
        { data: userData },
        { data: roadmapData },
        { data: enrollData },
        { data: progressData },
        { data: lessonProgressData },
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', session.user.id).single(),
        supabase.from('roadmaps').select('*').order('sort_order'),
        supabase.from('course_enrollments').select('roadmap_id').eq('user_id', session.user.id).eq('is_active', true),
        supabase.from('user_roadmap_progress').select('*').eq('user_id', session.user.id),
        supabase.from('user_lesson_progress').select('lesson_id').eq('user_id', session.user.id).eq('completed', true),
      ])

      setUser(userData)
      setRoadmaps(roadmapData || [])
      setEnrollments(new Set(enrollData?.map((e: any) => e.roadmap_id) || []))
      
      if (progressData) {
        const m: Record<string, any> = {}
        progressData.forEach((p: any) => { m[p.roadmap_id] = p })
        setProgress(m)
      }
      if (lessonProgressData) {
        setCompletedLessons(new Set(lessonProgressData.map((d: any) => d.lesson_id)))
      }

      // Select first enrolled roadmap
      const firstEnrolled = roadmapData?.find((r: any) => enrollData?.some((e: any) => e.roadmap_id === r.id))
      if (firstEnrolled) setSelectedRoadmap(firstEnrolled.slug)
      else if (roadmapData && roadmapData.length > 0) setSelectedRoadmap(roadmapData[0].slug)
      
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedRoadmap) return
    const roadmap = roadmaps.find(r => r.slug === selectedRoadmap)
    if (!roadmap || lessons[roadmap.id]) return
    
    // Only load lessons if enrolled
    if (!enrollments.has(roadmap.id)) return

    const supabase = createClient()
    supabase.from('lessons').select('*').eq('roadmap_id', roadmap.id).eq('is_active', true).order('sort_order')
      .then(({ data }) => {
        if (data) setLessons(prev => ({ ...prev, [roadmap.id]: data }))
      })
  }, [selectedRoadmap, roadmaps, enrollments])

  const enrollAndStart = async (roadmapId: string, lessonId: string) => {
    if (!user) return
    const supabase = createClient()
    await supabase.from('user_roadmap_progress').upsert({
      user_id: user.id, roadmap_id: roadmapId, enrolled_at: new Date().toISOString()
    }, { onConflict: 'user_id,roadmap_id' })
    router.push(`/lesson/${lessonId}`)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f7f7f7' }}>
      <span style={{ fontSize:48 }}>📚</span>
    </div>
  )

  const currentRoadmap = roadmaps.find(r => r.slug === selectedRoadmap)
  const currentLessons = currentRoadmap ? (lessons[currentRoadmap.id] || []) : []
  const isEnrolled = currentRoadmap ? enrollments.has(currentRoadmap.id) : false
  const meta = selectedRoadmap ? ROADMAP_META[selectedRoadmap] : null
  const completedCount = currentLessons.filter(l => completedLessons.has(l.id)).length
  const pct = currentLessons.length > 0 ? Math.round((completedCount / currentLessons.length) * 100) : 0

  return (
    <div dir="rtl" style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', fontFamily:"'Segoe UI', Tahoma, sans-serif", background:'#f7f7f7', paddingBottom:90 }}>

      {/* Header */}
      <div style={{ padding:'16px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#333' }}>المسارات</h1>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ background:'#FFF5D3', borderRadius:99, padding:'6px 12px', fontSize:14, fontWeight:700, color:'#A56644' }}>🔥 {user?.streak_current}</div>
          <div style={{ background:'#DDF4FF', borderRadius:99, padding:'6px 12px', fontSize:14, fontWeight:700, color:'#1453A3' }}>💎 {user?.coins_balance}</div>
        </div>
      </div>

      {/* Roadmap Tabs */}
      <div style={{ display:'flex', gap:8, padding:'16px 16px 0', overflowX:'auto' }}>
        {roadmaps.map(r => {
          const m = ROADMAP_META[r.slug]
          const active = selectedRoadmap === r.slug
          const enrolled = enrollments.has(r.id)
          return (
            <button key={r.id} onClick={() => setSelectedRoadmap(r.slug)} style={{
              flexShrink:0, padding:'8px 16px', borderRadius:99, border:'none', cursor:'pointer', fontWeight:700, fontSize:14,
              background: active ? (m?.color || '#58CC02') : '#fff',
              color: active ? '#fff' : (enrolled ? '#333' : '#aaa'),
              boxShadow: active ? `0 4px 12px ${m?.color}40` : '0 1px 4px rgba(0,0,0,0.08)',
              display:'flex', alignItems:'center', gap:6,
            }}>
              {m?.emoji} {m?.label || r.title_ar}
              {!enrolled && <span style={{ fontSize:10, opacity:0.7 }}>🔒</span>}
            </button>
          )
        })}
      </div>

      <div style={{ padding:'16px' }}>

        {/* Not enrolled state */}
        {!isEnrolled && currentRoadmap && (
          <div style={{ background:'#fff', borderRadius:20, padding:'32px 24px', textAlign:'center', border:'2px solid #f0f0f0' }}>
            <div style={{ fontSize:52, marginBottom:12 }}>🔒</div>
            <h2 style={{ margin:'0 0 8px', color:'#333', fontSize:20 }}>{meta?.label || currentRoadmap.title_ar}</h2>
            <p style={{ color:'#999', fontSize:14, margin:'0 0 20px' }}>
              هذا المسار متاح للمشتركين فقط.<br/>تواصل مع الإدارة للاشتراك.
            </p>
            <Link href="/upgrade" style={{ display:'inline-block', padding:'12px 32px', borderRadius:12, background:'#1CB0F6', color:'#fff', fontWeight:800, fontSize:15, textDecoration:'none' }}>
              اشترك دلوقتي 🚀
            </Link>
          </div>
        )}

        {/* Enrolled — show roadmap header */}
        {isEnrolled && currentRoadmap && meta && (
          <>
            <div style={{ background:'#fff', borderRadius:20, padding:'16px 18px', marginBottom:16, border:'2px solid #f0f0f0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <div style={{ width:48, height:48, borderRadius:14, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{meta.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, color:'#333', fontSize:16 }}>{meta.label}</div>
                  <div style={{ fontSize:13, color:'#999' }}>{currentLessons.length} درس • {completedCount} مكتمل</div>
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:meta.color }}>{pct}%</div>
              </div>
              <div style={{ height:10, background:'#f0f0f0', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', background:meta.color, borderRadius:99, width:`${pct}%`, transition:'width 0.8s' }}/>
              </div>
            </div>

            {/* Lessons list */}
            {currentLessons.length === 0 ? (
              <div style={{ background:'#fff', borderRadius:16, padding:'32px', textAlign:'center', color:'#999', fontSize:14 }}>
                🔜 الدروس قادمة قريباً
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {currentLessons.map((lesson, i) => {
                  const done = completedLessons.has(lesson.id)
                  const isFirst = i === 0
                  const prevDone = i === 0 || completedLessons.has(currentLessons[i-1].id)
                  const locked = !prevDone && !done && i > 0

                  return (
                    <div key={lesson.id} onClick={() => !locked && enrollAndStart(currentRoadmap.id, lesson.id)}
                      style={{ background:'#fff', borderRadius:16, padding:'14px 16px', border:`2px solid ${done ? meta.color : locked ? '#f0f0f0' : '#f0f0f0'}`, cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.5 : 1, display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background: done ? meta.bg : locked ? '#f5f5f5' : meta.bg+'80', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                        {done ? '✅' : locked ? '🔒' : lesson.lesson_type === 'video' ? '🎬' : '📖'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, color: locked ? '#aaa' : '#333', fontSize:15, marginBottom:3 }}>{lesson.title_ar}</div>
                        <div style={{ fontSize:12, color:'#999', display:'flex', gap:8 }}>
                          <span>⏱️ {lesson.duration_minutes}د</span>
                          <span style={{ color: done ? '#58CC02' : meta.color, fontWeight:700 }}>+{lesson.xp_reward} XP</span>
                        </div>
                      </div>
                      {!locked && !done && <span style={{ fontSize:20, color:'#ddd' }}>←</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'#fff', borderTop:'2px solid #f0f0f0', display:'flex', padding:'8px 0 16px', zIndex:100, direction:'ltr' }}>
        {[
          { href:'/profile',     icon:'👤', label:'ملفي'      },
          { href:'/leaderboard', icon:'🏆', label:'الترتيب'   },
          { href:'/challenges',  icon:'⚔️',  label:'التحديات' },
          { href:'/learn',       icon:'📚', label:'التعلم', active:true },
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
