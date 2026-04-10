'use client'
import { useUser } from '@/hooks/useUser'
import { getLevelInfo, LEVELS } from '@/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ROADMAP_META: Record<string, { emoji: string; color: string; bg: string; label: string; desc: string }> = {
  n8n_automation: { emoji: '⚡', color: '#58CC02', bg: '#D7FFB8', label: 'أتمتة n8n',   desc: 'وصّل كل أدواتك تلقائياً' },
  ai_video:       { emoji: '🎬', color: '#FF9600', bg: '#FFCE8E', label: 'AI Video',     desc: 'أنشئ فيديوهات بالذكاء الاصطناعي' },
  vibe_coding:    { emoji: '💻', color: '#CE82FF', bg: '#F5E6FF', label: 'Vibe Coding',  desc: 'ابنِ تطبيقات بدون كود تقليدي' },
}

const MOTIVATIONAL = [
  'هتبقى محترف قريباً! 🔥',
  'كل يوم خطوة للأمام! 💪',
  'إنت بتعمل حاجة عظيمة! ⭐',
  'استمر — الـ streak بيحسبك! 🎯',
]

const NAV = [
  { href:'/profile',     icon:'👤', label:'ملفي'                    },
  { href:'/leaderboard', icon:'🏆', label:'الترتيب'                },
  { href:'/challenges',  icon:'⚔️',  label:'التحديات'              },
  { href:'/learn',       icon:'📚', label:'التعلم'                 },
  { href:'/home',        icon:'🏠', label:'الرئيسية', active:true  },
]

export default function HomePage() {
  const { user, loading } = useUser()
  const [missions, setMissions] = useState<any[]>([])
  const [progress, setProgress] = useState<Record<string, any>>({})
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [quote] = useState(() => MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)])
  const supabase = createClient()

  // Redirect if no user after loading completes
  useEffect(() => {
    if (!loading && !user) {
      window.location.replace('/auth/login')
    }
  }, [loading, user])

  useEffect(() => {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    supabase.from('daily_missions').select('*').eq('user_id', user.id).eq('mission_date', today)
      .then(({ data }) => setMissions(data || []))
    supabase.from('roadmaps').select('*').order('sort_order')
      .then(({ data }) => setRoadmaps(data || []))
    supabase.from('user_roadmap_progress').select('*').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const m: Record<string, any> = {}
          data.forEach((p: any) => { m[p.roadmap_id] = p })
          setProgress(m)
        }
      })
  }, [user])

  // Show skeleton while loading — no more spinner stuck forever
  if (loading || !user) {
    return (
      <div dir="rtl" style={{ maxWidth:480, margin:'0 auto', padding:'16px 16px 90px', fontFamily:'var(--font-sans)', background:'var(--color-background-tertiary)', minHeight:'100vh' }}>
        {/* Skeleton top bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ width:80, height:34, borderRadius:99, background:'#eee' }} />
            <div style={{ width:80, height:34, borderRadius:99, background:'#eee' }} />
          </div>
          <div style={{ width:42, height:42, borderRadius:14, background:'#eee' }} />
        </div>
        {/* Skeleton greeting */}
        <div style={{ width:200, height:20, borderRadius:8, background:'#eee', marginBottom:8 }} />
        <div style={{ width:280, height:28, borderRadius:8, background:'#eee', marginBottom:20 }} />
        {/* Skeleton XP card */}
        <div style={{ background:'#fff', borderRadius:20, padding:18, marginBottom:16, height:80 }} />
        {/* Skeleton cards */}
        {[1,2,3].map(i => (
          <div key={i} style={{ background:'#f5f5f5', borderRadius:16, padding:14, marginBottom:10, height:70 }} />
        ))}
        {/* Bottom nav */}
        <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'var(--color-background-primary)', borderTop:'2px solid var(--color-border-tertiary)', display:'flex', padding:'8px 0 16px', zIndex:100, direction:'ltr' }}>
          {NAV.map(n => (
            <Link key={n.href} href={n.href} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, textDecoration:'none', padding:'4px 0' }}>
              <span style={{ fontSize:22 }}>{n.icon}</span>
              <span style={{ fontSize:10, color: n.active ? '#1CB0F6' : 'var(--color-text-tertiary)', fontWeight: n.active ? 700 : 400 }}>{n.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    )
  }

  const levelInfo = getLevelInfo(user.xp_total)
  const nextLevel = LEVELS.find(l => l.level === user.current_level + 1)
  const xpProgress = nextLevel
    ? Math.min(100, ((user.xp_total - levelInfo.xp_min) / (nextLevel.xp_min - levelInfo.xp_min)) * 100)
    : 100
  const completedMissions = missions.filter(m => m.completed).length
  const enrolledRoadmaps = roadmaps.filter(r => progress[r.id])

  return (
    <div dir="rtl" style={{ maxWidth:480, margin:'0 auto', padding:'16px 16px 90px', fontFamily:'var(--font-sans)', background:'var(--color-background-tertiary)', minHeight:'100vh' }}>

      {/* TOP BAR */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div style={{ display:'flex', gap:8 }}>
          <Link href="/streak" style={{ display:'flex', alignItems:'center', gap:6, background:'#FFF5D3', borderRadius:99, padding:'6px 14px', fontWeight:700, fontSize:15, color:'#A56644', textDecoration:'none' }}>
            🔥 {user.streak_current}
          </Link>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'#DDF4FF', borderRadius:99, padding:'6px 14px', fontWeight:700, fontSize:15, color:'#1453A3' }}>
            💎 {user.coins_balance.toLocaleString()}
          </div>
        </div>
        <Link href="/profile" style={{ width:42, height:42, borderRadius:14, background:levelInfo.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#fff', textDecoration:'none' }}>
          {(user.full_name?.match(/[a-zA-Z]/)?.[0] || user.username?.match(/[a-zA-Z]/)?.[0] || '👤')}
        </Link>
      </header>

      {/* GREETING */}
      <div style={{ marginBottom:20 }}>
        <p style={{ margin:'0 0 4px', fontSize:14, color:'var(--color-text-secondary)' }}>أهلاً، {user.full_name?.split(' ')[0] || user.username}!</p>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'var(--color-text-primary)', lineHeight:1.3 }}>{quote}</h1>
      </div>

      {/* XP CARD */}
      <div style={{ background:'var(--color-background-primary)', borderRadius:20, padding:18, marginBottom:16, border:'1px solid var(--color-border-tertiary)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <div style={{ width:44, height:44, borderRadius:14, background:levelInfo.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#fff', flexShrink:0 }}>
            {user.current_level}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--color-text-primary)', marginBottom:2 }}>{levelInfo.name_ar}</div>
            {nextLevel && <div style={{ fontSize:12, color:'var(--color-text-tertiary)' }}>{nextLevel.xp_min - user.xp_total} XP للمستوى التالي</div>}
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:levelInfo.color }}>{user.xp_total.toLocaleString()} XP</div>
        </div>
        <div style={{ height:10, background:'var(--color-background-secondary)', borderRadius:99, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:99, background:levelInfo.color, width:`${xpProgress}%`, transition:'width 0.8s ease' }} />
        </div>
      </div>

      {/* DAILY MISSIONS */}
      {missions.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'var(--color-text-primary)' }}>مهام اليوم</h2>
            <span style={{ background: completedMissions===missions.length ? '#D7FFB8' : '#FFF5D3', color: completedMissions===missions.length ? '#27500A' : '#633806', borderRadius:99, padding:'3px 10px', fontSize:13, fontWeight:700 }}>
              {completedMissions}/{missions.length}
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {missions.map(m => (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, background:'var(--color-background-primary)', borderRadius:16, padding:'12px 14px', border:`2px solid ${m.completed ? '#58CC02' : 'var(--color-border-tertiary)'}`, opacity: m.completed ? 0.7 : 1 }}>
                <div style={{ width:38, height:38, borderRadius:50, background: m.completed ? '#D7FFB8' : 'var(--color-background-secondary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                  {m.completed ? '✅' : m.mission_type === 'complete_lesson' ? '📚' : m.mission_type === 'win_quiz' ? '⚡' : '🏆'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--color-text-primary)', textDecoration: m.completed ? 'line-through' : 'none' }}>
                    {m.mission_type === 'complete_lesson' && 'أكمل درساً'}
                    {m.mission_type === 'win_quiz' && 'اربح في Quiz'}
                    {m.mission_type === 'join_challenge' && 'شارك في تحدي'}
                  </div>
                  <div style={{ fontSize:12, color:'#58CC02', fontWeight:700 }}>+{m.xp_reward} XP</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTINUE LEARNING */}
      {enrolledRoadmaps.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <h2 style={{ margin:'0 0 10px', fontSize:17, fontWeight:700, color:'var(--color-text-primary)' }}>كمّل من حيث وقفت</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {enrolledRoadmaps.map(r => {
              const meta = ROADMAP_META[r.slug]
              const prog = progress[r.id]
              if (!meta) return null
              const pct = r.total_xp > 0 ? Math.min(100, Math.round((prog.total_xp_earned / r.total_xp) * 100)) : 0
              return (
                <Link key={r.id} href={`/learn?roadmap=${r.slug}`} style={{ display:'flex', alignItems:'center', gap:14, background:'var(--color-background-primary)', borderRadius:18, padding:'14px 16px', textDecoration:'none', border:'1px solid var(--color-border-tertiary)' }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{meta.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--color-text-primary)', marginBottom:6 }}>{meta.label}</div>
                    <div style={{ height:8, background:'var(--color-background-secondary)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', background:meta.color, borderRadius:99, width:`${pct}%`, transition:'width 0.6s ease' }} />
                    </div>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:meta.color, marginRight:4 }}>{pct}%</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ALL PATHS */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ margin:'0 0 10px', fontSize:17, fontWeight:700, color:'var(--color-text-primary)' }}>
          {enrolledRoadmaps.length === 0 ? 'ابدأ رحلتك' : 'كل المسارات'}
        </h2>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {Object.entries(ROADMAP_META).map(([slug, meta]) => {
            const roadmap = roadmaps.find(r => r.slug === slug)
            const isEnrolled = roadmap && progress[roadmap.id]
            return (
              <Link key={slug} href={`/learn?roadmap=${slug}`} style={{ display:'flex', alignItems:'center', gap:12, background:'var(--color-background-primary)', borderRadius:16, padding:'14px 16px', textDecoration:'none', border:'1px solid var(--color-border-tertiary)' }}>
                <div style={{ width:48, height:48, borderRadius:14, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{meta.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--color-text-primary)', marginBottom:2 }}>{meta.label}</div>
                  <div style={{ fontSize:12, color:'var(--color-text-secondary)' }}>{meta.desc}</div>
                </div>
                {isEnrolled && <span style={{ background:meta.bg, color:meta.color, borderRadius:99, padding:'3px 10px', fontSize:11, fontWeight:700, flexShrink:0 }}>مسجّل</span>}
              </Link>
            )
          })}
        </div>
      </div>

      {/* UPGRADE BANNER */}
      {user.subscription_plan === 'free' && (
        <Link href="/upgrade" style={{ display:'flex', alignItems:'center', gap:14, background:'linear-gradient(135deg, #1CB0F6, #1899D6)', borderRadius:20, padding:'18px 20px', marginBottom:20, textDecoration:'none' }}>
          <span style={{ fontSize:28 }}>👑</span>
          <div style={{ flex:1 }}>
            <div style={{ color:'#fff', fontWeight:800, fontSize:16, marginBottom:2 }}>ترقّى لـ Pro</div>
            <div style={{ color:'#BBF2FF', fontSize:13 }}>XP مضاعف + دروس غير محدودة</div>
          </div>
          <span style={{ background:'#fff', color:'#1CB0F6', borderRadius:12, padding:'8px 16px', fontSize:13, fontWeight:800, flexShrink:0 }}>ابدأ</span>
        </Link>
      )}

      {/* BOTTOM NAV */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'var(--color-background-primary)', borderTop:'2px solid var(--color-border-tertiary)', display:'flex', padding:'8px 0 16px', zIndex:100, direction:'ltr' }}>
        {NAV.map(n => (
          <Link key={n.href} href={n.href} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, textDecoration:'none', padding:'4px 0' }}>
            <span style={{ fontSize:22 }}>{n.icon}</span>
            <span style={{ fontSize:10, color: n.active ? '#1CB0F6' : 'var(--color-text-tertiary)', fontWeight: n.active ? 700 : 400 }}>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
