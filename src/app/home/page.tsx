'use client'
import { useAuth } from '@/lib/auth-context'
import { getLevelInfo, LEVELS } from '@/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Duolingo exact colors from brand guidelines
const DUO = {
  green:   '#58CC02',
  greenDk: '#58A700',
  blue:    '#1CB0F6',
  blueDk:  '#1899D6',
  orange:  '#FF9600',
  orangeL: '#FFF5D3',
  purple:  '#CE82FF',
  purpleL: '#F5E6FF',
  red:     '#FF4B4B',
  yellow:  '#FFC800',
  // Pastels
  greenL:  '#D7FFB8',
  blueL:   '#DDF4FF',
  yellowL: '#FBE56D',
}

const ROADMAP_META: Record<string, { emoji: string; color: string; bg: string; label: string; desc: string }> = {
  n8n_automation: { emoji: '⚡', color: DUO.green,  bg: DUO.greenL,  label: 'أتمتة n8n',   desc: 'وصّل أدواتك تلقائياً' },
  ai_video:       { emoji: '🎬', color: DUO.orange, bg: DUO.orangeL, label: 'AI Video',     desc: 'فيديوهات بالذكاء الاصطناعي' },
  vibe_coding:    { emoji: '💻', color: DUO.purple, bg: DUO.purpleL, label: 'Vibe Coding',  desc: 'ابنِ تطبيقات بدون كود' },
}

const MOTIVATIONAL = [
  'هتبقى محترف قريباً! 🚀',
  'كل يوم خطوة للأمام! 💪',
  'إنت بتعمل حاجة عظيمة! ⭐',
  'لا تكسر الـ streak! 🔥',
  'الـ AI بينتظرك! 🤖',
]

export default function HomePage() {
  const { user, loading } = useAuth()
  const [missions, setMissions] = useState<any[]>([])
  const [progress, setProgress] = useState<Record<string, any>>({})
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [quote] = useState(() => MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)])
  useEffect(() => {
    const supabase = createClient()
    if (!loading && !user) window.location.replace('/auth/login')
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

  // ── Skeleton ──────────────────────────────────────
  if (loading || !user) return (
    <div dir="rtl" style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#f7f7f7', fontFamily:"'Segoe UI', Tahoma, sans-serif" }}>
      <div style={{ padding:'16px 16px 0', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ display:'flex', gap:8 }}>
          {[80,80].map((w,i) => <div key={i} style={{ width:w, height:36, borderRadius:99, background:'#e5e5e5', animation:'pulse 1.5s infinite' }}/>)}
        </div>
        <div style={{ width:42, height:42, borderRadius:14, background:'#e5e5e5' }}/>
      </div>
      {[200,100,80,80,80].map((h,i) => (
        <div key={i} style={{ margin:'0 16px 12px', height:h, borderRadius:16, background:'#e5e5e5', animation:'pulse 1.5s infinite', animationDelay:`${i*0.1}s` }}/>
      ))}
      {/* Nav */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'#fff', borderTop:'2px solid #e5e5e5', display:'flex', padding:'8px 0 16px', zIndex:100, direction:'ltr' }}>
        {['👤','🏆','⚔️','📚','🏠'].map((icon,i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'4px 0' }}>
            <span style={{ fontSize:22, opacity:0.3 }}>{icon}</span>
            <div style={{ width:28, height:8, borderRadius:4, background:'#e5e5e5' }}/>
          </div>
        ))}
      </nav>
    </div>
  )

  const levelInfo = getLevelInfo(user.xp_total)
  const nextLevel = LEVELS.find(l => l.level === user.current_level + 1)
  const xpPct = nextLevel ? Math.min(100, ((user.xp_total - levelInfo.xp_min) / (nextLevel.xp_min - levelInfo.xp_min)) * 100) : 100
  const completedMissions = missions.filter(m => m.completed).length
  const enrolledRoadmaps = roadmaps.filter(r => progress[r.id])

  return (
    <div dir="rtl" style={{ maxWidth:480, margin:'0 auto', padding:'0 0 90px', fontFamily:"'Segoe UI', Tahoma, sans-serif", background:'#f7f7f7', minHeight:'100vh' }}>

      {/* ══ TOP BAR ══════════════════════════════════ */}
      <header style={{ background:'#fff', padding:'14px 16px 10px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'2px solid #f0f0f0', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', gap:8 }}>
          {/* Streak pill — clickable */}
          <Link href="/streak" style={{
            display:'flex', alignItems:'center', gap:5,
            background: user.streak_current > 0 ? DUO.orangeL : '#f0f0f0',
            borderRadius:99, padding:'6px 14px',
            fontWeight:800, fontSize:15,
            color: user.streak_current > 0 ? '#A56644' : '#999',
            textDecoration:'none',
            border: `2px solid ${user.streak_current > 0 ? '#FFD580' : '#e0e0e0'}`,
            transition:'transform 0.1s',
          }}>
            🔥 <span>{user.streak_current}</span>
          </Link>
          {/* Coins pill */}
          <div style={{
            display:'flex', alignItems:'center', gap:5,
            background: DUO.blueL, borderRadius:99, padding:'6px 14px',
            fontWeight:800, fontSize:15, color:'#1453A3',
            border:`2px solid #BBF2FF`,
          }}>
            💎 {user.coins_balance.toLocaleString()}
          </div>
        </div>

        {/* Avatar */}
        <Link href="/profile" style={{
          width:42, height:42, borderRadius:14,
          background: levelInfo.color,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:18, fontWeight:800, color:'#fff',
          textDecoration:'none',
          border:`3px solid ${levelInfo.color}44`,
          boxShadow:`0 4px 12px ${levelInfo.color}40`,
        }}>
          {user.current_level}
        </Link>
      </header>

      <div style={{ padding:'16px 16px 0' }}>

        {/* ══ GREETING ════════════════════════════════ */}
        <div style={{ marginBottom:20 }}>
          <p style={{ margin:'0 0 4px', fontSize:14, color:'#777', fontWeight:500 }}>
            أهلاً، {user.full_name?.split(' ')[0] || user.username}!
          </p>
          <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:'#333', lineHeight:1.2, letterSpacing:'-0.5px' }}>
            {quote}
          </h1>
        </div>

        {/* ══ XP PROGRESS CARD ══════════════════════════ */}
        <div style={{
          background:'#fff', borderRadius:20, padding:'16px 18px',
          marginBottom:16,
          border:'2px solid #f0f0f0',
          boxShadow:'0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            {/* Level badge */}
            <div style={{
              width:48, height:48, borderRadius:14,
              background:`linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:22, fontWeight:900, color:'#fff',
              boxShadow:`0 4px 12px ${levelInfo.color}50`,
              flexShrink:0,
            }}>
              {user.current_level}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#333', marginBottom:2 }}>{levelInfo.name_ar}</div>
              {nextLevel && <div style={{ fontSize:12, color:'#999' }}>
                {(nextLevel.xp_min - user.xp_total).toLocaleString()} XP للمستوى التالي
              </div>}
            </div>
            <div style={{ fontSize:15, fontWeight:800, color:levelInfo.color, flexShrink:0 }}>
              {user.xp_total.toLocaleString()} <span style={{ fontSize:11, fontWeight:600 }}>XP</span>
            </div>
          </div>
          {/* XP bar */}
          <div style={{ height:12, background:'#f0f0f0', borderRadius:99, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:99,
              background:`linear-gradient(90deg, ${levelInfo.color}, ${levelInfo.color}dd)`,
              width:`${xpPct}%`,
              transition:'width 1s ease',
              position:'relative',
            }}>
              <div style={{ position:'absolute', right:4, top:'50%', transform:'translateY(-50%)', width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,0.8)' }}/>
            </div>
          </div>
        </div>

        {/* ══ DAILY MISSIONS ══════════════════════════ */}
        {missions.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:'#333' }}>مهام اليوم</h2>
              <div style={{
                background: completedMissions===missions.length ? DUO.greenL : DUO.orangeL,
                color: completedMissions===missions.length ? '#27500A' : '#A56644',
                borderRadius:99, padding:'3px 12px', fontSize:13, fontWeight:800,
              }}>
                {completedMissions}/{missions.length}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {missions.map(m => (
                <div key={m.id} style={{
                  display:'flex', alignItems:'center', gap:12,
                  background:'#fff', borderRadius:16, padding:'12px 14px',
                  border:`2px solid ${m.completed ? DUO.green : '#f0f0f0'}`,
                  transition:'border-color 0.2s',
                }}>
                  <div style={{
                    width:40, height:40, borderRadius:12,
                    background: m.completed ? DUO.greenL : '#f7f7f7',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:20, flexShrink:0,
                  }}>
                    {m.completed ? '✅' : m.mission_type==='complete_lesson' ? '📚' : m.mission_type==='win_quiz' ? '⚡' : '🏆'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color: m.completed ? '#999' : '#333', textDecoration: m.completed ? 'line-through' : 'none' }}>
                      {m.mission_type==='complete_lesson' && 'أكمل درساً'}
                      {m.mission_type==='win_quiz' && 'اربح في Quiz'}
                      {m.mission_type==='join_challenge' && 'شارك في تحدي'}
                    </div>
                    <div style={{ fontSize:12, color:DUO.green, fontWeight:800, marginTop:2 }}>+{m.xp_reward} XP</div>
                  </div>
                  {!m.completed && (
                    <div style={{ width:28, height:28, borderRadius:8, border:`2px solid #e0e0e0`, flexShrink:0 }}/>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ CONTINUE LEARNING ════════════════════════ */}
        {enrolledRoadmaps.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <h2 style={{ margin:'0 0 10px', fontSize:17, fontWeight:800, color:'#333' }}>كمّل من حيث وقفت</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {enrolledRoadmaps.map(r => {
                const meta = ROADMAP_META[r.slug]
                const prog = progress[r.id]
                if (!meta) return null
                const pct = r.total_xp > 0 ? Math.min(100, Math.round((prog.total_xp_earned / r.total_xp) * 100)) : 0
                return (
                  <Link key={r.id} href={`/learn?roadmap=${r.slug}`} style={{
                    display:'flex', alignItems:'center', gap:14,
                    background:'#fff', borderRadius:20, padding:'14px 16px',
                    textDecoration:'none',
                    border:'2px solid #f0f0f0',
                    boxShadow:'0 2px 8px rgba(0,0,0,0.04)',
                    transition:'transform 0.1s, box-shadow 0.1s',
                  }}>
                    <div style={{
                      width:52, height:52, borderRadius:16,
                      background: meta.bg,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:28, flexShrink:0,
                      border:`2px solid ${meta.color}30`,
                    }}>{meta.emoji}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:16, fontWeight:800, color:'#333', marginBottom:8 }}>{meta.label}</div>
                      {/* Progress bar */}
                      <div style={{ height:10, background:'#f0f0f0', borderRadius:99, overflow:'hidden', position:'relative' }}>
                        <div style={{
                          height:'100%', background:meta.color, borderRadius:99,
                          width:`${pct}%`, transition:'width 0.8s ease',
                        }}/>
                      </div>
                    </div>
                    <span style={{ fontSize:14, fontWeight:800, color:meta.color, flexShrink:0, minWidth:36, textAlign:'left' }}>{pct}%</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ══ ALL PATHS ════════════════════════════════ */}
        <div style={{ marginBottom:20 }}>
          <h2 style={{ margin:'0 0 10px', fontSize:17, fontWeight:800, color:'#333' }}>
            {enrolledRoadmaps.length === 0 ? '🚀 ابدأ رحلتك' : 'كل المسارات'}
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Object.entries(ROADMAP_META).map(([slug, meta]) => {
              const roadmap = roadmaps.find(r => r.slug === slug)
              const isEnrolled = roadmap && progress[roadmap.id]
              const prog = isEnrolled ? progress[roadmap.id] : null
              const pct = (roadmap && prog && roadmap.total_xp > 0) ? Math.min(100, Math.round((prog.total_xp_earned / roadmap.total_xp) * 100)) : 0
              return (
                <Link key={slug} href={`/learn?roadmap=${slug}`} style={{
                  display:'flex', alignItems:'center', gap:14,
                  background:'#fff', borderRadius:20, padding:'14px 16px',
                  textDecoration:'none',
                  border:`2px solid ${isEnrolled ? meta.color+'40' : '#f0f0f0'}`,
                  position:'relative', overflow:'hidden',
                }}>
                  {/* Colored left accent */}
                  <div style={{ position:'absolute', right:0, top:0, bottom:0, width:4, background:meta.color, borderRadius:'0 20px 20px 0' }}/>
                  <div style={{
                    width:52, height:52, borderRadius:16,
                    background: meta.bg,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:26, flexShrink:0,
                  }}>{meta.emoji}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:15, fontWeight:800, color:'#333' }}>{meta.label}</span>
                      {isEnrolled && (
                        <span style={{ background:meta.bg, color:meta.color, borderRadius:99, padding:'2px 8px', fontSize:10, fontWeight:800 }}>
                          مسجّل
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:'#999' }}>{meta.desc}</div>
                    {isEnrolled && pct > 0 && (
                      <div style={{ height:6, background:'#f0f0f0', borderRadius:99, overflow:'hidden', marginTop:6 }}>
                        <div style={{ height:'100%', background:meta.color, borderRadius:99, width:`${pct}%` }}/>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize:20, color:'#ccc' }}>←</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ══ UPGRADE BANNER ══════════════════════════ */}
        {user.subscription_plan === 'free' && (
          <Link href="/upgrade" style={{
            display:'flex', alignItems:'center', gap:14,
            background:`linear-gradient(135deg, ${DUO.blue} 0%, ${DUO.blueDk} 100%)`,
            borderRadius:20, padding:'18px 20px',
            marginBottom:20, textDecoration:'none',
            boxShadow:`0 8px 24px ${DUO.blue}40`,
            position:'relative', overflow:'hidden',
          }}>
            {/* decorative circles */}
            <div style={{ position:'absolute', right:-20, top:-20, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.1)' }}/>
            <div style={{ position:'absolute', right:20, bottom:-30, width:60, height:60, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
            <span style={{ fontSize:32, flexShrink:0 }}>👑</span>
            <div style={{ flex:1, zIndex:1 }}>
              <div style={{ color:'#fff', fontWeight:900, fontSize:17, marginBottom:3 }}>ترقّى لـ Pro</div>
              <div style={{ color:'rgba(255,255,255,0.85)', fontSize:13 }}>XP مضاعف + دروس غير محدودة</div>
            </div>
            <div style={{
              background:'#fff', color:DUO.blue,
              borderRadius:12, padding:'10px 18px',
              fontSize:13, fontWeight:900,
              flexShrink:0, zIndex:1,
              boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
            }}>ابدأ</div>
          </Link>
        )}

      </div>{/* end padding wrapper */}

      {/* ══ BOTTOM NAV ══════════════════════════════ */}
      <nav style={{
        position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:480,
        background:'#fff',
        borderTop:'2px solid #f0f0f0',
        display:'flex', padding:'8px 0 16px', zIndex:100,
        direction:'ltr',
        boxShadow:'0 -4px 20px rgba(0,0,0,0.06)',
      }}>
        {[
          { href:'/profile',     icon:'👤', label:'ملفي'      },
          { href:'/leaderboard', icon:'🏆', label:'الترتيب'   },
          { href:'/challenges',  icon:'⚔️',  label:'التحديات' },
          { href:'/learn',       icon:'📚', label:'التعلم'    },
          { href:'/home',        icon:'🏠', label:'الرئيسية', active:true },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{
            flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            textDecoration:'none', padding:'4px 0', position:'relative',
          }}>
            {(n as any).active && (
              <div style={{ position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)', width:32, height:3, borderRadius:99, background:DUO.blue }}/>
            )}
            <span style={{ fontSize:22 }}>{n.icon}</span>
            <span style={{ fontSize:10, fontWeight: (n as any).active ? 800 : 400, color: (n as any).active ? DUO.blue : '#aaa', fontFamily:'inherit' }}>
              {n.label}
            </span>
          </Link>
        ))}
      </nav>

    </div>
  )
}
