'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getLevelInfo, LEVELS } from '@/types'

const DUO = {
  green:'#58CC02', greenDk:'#58A700', blue:'#1CB0F6', blueDk:'#1899D6',
  orange:'#FF9600', purple:'#CE82FF', greenL:'#D7FFB8', blueL:'#DDF4FF',
  orangeL:'#FFF5D3', purpleL:'#F5E6FF',
}

const ROADMAP_META: Record<string, {emoji:string; color:string; bg:string; label:string; desc:string}> = {
  n8n_automation: {emoji:'⚡', color:DUO.green,  bg:DUO.greenL,  label:'أتمتة n8n',   desc:'وصّل أدواتك تلقائياً'},
  ai_video:       {emoji:'🎬', color:DUO.orange, bg:DUO.orangeL, label:'AI Video',     desc:'فيديوهات بالذكاء الاصطناعي'},
  vibe_coding:    {emoji:'💻', color:DUO.purple, bg:DUO.purpleL, label:'Vibe Coding',  desc:'ابنِ تطبيقات بدون كود'},
}

const QUOTES = ['هتبقى محترف قريباً! 🚀','كل يوم خطوة للأمام! 💪','إنت بتعمل حاجة عظيمة! ⭐','لا تكسر الـ streak! 🔥']

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [progress, setProgress] = useState<Record<string, any>>({})
  const [missions, setMissions] = useState<any[]>([])
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const loadAll = async (userId: string, accessToken: string) => {
      // Load user profile
      const { data: profile } = await supabase.from('users').select('*').eq('id', userId).single()
      if (profile) setUser(profile)

      // Load roadmaps + progress in parallel
      const [{ data: rm }, { data: prog }, { data: miss }] = await Promise.all([
        supabase.from('roadmaps').select('*').order('sort_order'),
        supabase.from('user_roadmap_progress').select('*').eq('user_id', userId),
        supabase.from('daily_missions').select('*').eq('user_id', userId).eq('mission_date', new Date().toISOString().split('T')[0]),
      ])
      if (rm) setRoadmaps(rm)
      if (prog) {
        const m: Record<string, any> = {}
        prog.forEach((p: any) => { m[p.roadmap_id] = p })
        setProgress(m)
      }
      if (miss) setMissions(miss)
    }

    // Check session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthChecked(true)
      if (!session?.user) {
        window.location.replace('/auth/login')
        return
      }
      loadAll(session.user.id, session.access_token)
    })

    // Also listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { window.location.replace('/auth/login') }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await createClient().auth.signOut()
    window.location.replace('/auth/login')
  }

  // Show minimal skeleton only while checking auth (< 500ms usually)
  if (!authChecked) {
    return (
      <div style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f7f7f7'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:48, marginBottom:12}}>🦉</div>
          <div style={{color:'#999', fontSize:14}}>جاري التحميل...</div>
        </div>
      </div>
    )
  }

  // Page renders immediately after auth check, user data fills in as it loads
  const levelInfo = user ? getLevelInfo(user.xp_total) : { name_ar: '...', color: '#ccc', xp_min: 0 }
  const nextLevel = user ? LEVELS.find(l => l.level === user.current_level + 1) : null
  const xpPct = (user && nextLevel) ? Math.min(100, ((user.xp_total - levelInfo.xp_min) / (nextLevel.xp_min - levelInfo.xp_min)) * 100) : 0
  const enrolledRoadmaps = roadmaps.filter(r => progress[r.id])
  const completedMissions = missions.filter(m => m.completed).length

  return (
    <div dir="rtl" style={{maxWidth:480, margin:'0 auto', padding:'0 0 90px', fontFamily:"'Segoe UI', Tahoma, sans-serif", background:'#f7f7f7', minHeight:'100vh'}}>

      {/* TOP BAR */}
      <header style={{background:'#fff', padding:'14px 16px 10px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'2px solid #f0f0f0', position:'sticky', top:0, zIndex:50}}>
        <div style={{display:'flex', gap:8}}>
          <Link href="/streak" style={{display:'flex', alignItems:'center', gap:5, background:DUO.orangeL, borderRadius:99, padding:'6px 14px', fontWeight:800, fontSize:15, color:'#A56644', textDecoration:'none', border:'2px solid #FFD580'}}>
            🔥 {user?.streak_current ?? '—'}
          </Link>
          <div style={{display:'flex', alignItems:'center', gap:5, background:DUO.blueL, borderRadius:99, padding:'6px 14px', fontWeight:800, fontSize:15, color:'#1453A3', border:'2px solid #BBF2FF'}}>
            💎 {user?.coins_balance?.toLocaleString() ?? '—'}
          </div>
        </div>
        <button onClick={signOut} style={{width:42, height:42, borderRadius:14, background: levelInfo.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#fff', border:'none', cursor:'pointer'}}>
          {user?.current_level ?? '?'}
        </button>
      </header>

      <div style={{padding:'16px 16px 0'}}>

        {/* GREETING */}
        <div style={{marginBottom:20}}>
          <p style={{margin:'0 0 4px', fontSize:14, color:'#777'}}>أهلاً، {user?.full_name?.split(' ')[0] || user?.username || '...'}!</p>
          <h1 style={{margin:0, fontSize:22, fontWeight:900, color:'#333', lineHeight:1.2}}>{quote}</h1>
        </div>

        {/* XP CARD */}
        {user && (
          <div style={{background:'#fff', borderRadius:20, padding:'16px 18px', marginBottom:16, border:'2px solid #f0f0f0', boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:12}}>
              <div style={{width:48, height:48, borderRadius:14, background:`linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}cc)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:900, color:'#fff', flexShrink:0}}>
                {user.current_level}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:16, fontWeight:800, color:'#333', marginBottom:2}}>{levelInfo.name_ar}</div>
                {nextLevel && <div style={{fontSize:12, color:'#999'}}>{(nextLevel.xp_min - user.xp_total).toLocaleString()} XP للمستوى التالي</div>}
              </div>
              <div style={{fontSize:15, fontWeight:800, color:levelInfo.color}}>{user.xp_total?.toLocaleString()} XP</div>
            </div>
            <div style={{height:12, background:'#f0f0f0', borderRadius:99, overflow:'hidden'}}>
              <div style={{height:'100%', background:levelInfo.color, borderRadius:99, width:`${xpPct}%`, transition:'width 1s ease'}}/>
            </div>
          </div>
        )}

        {/* DAILY MISSIONS */}
        {missions.length > 0 && (
          <div style={{marginBottom:20}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
              <h2 style={{margin:0, fontSize:17, fontWeight:800, color:'#333'}}>مهام اليوم</h2>
              <span style={{background: completedMissions===missions.length ? DUO.greenL : DUO.orangeL, color: completedMissions===missions.length ? '#27500A' : '#A56644', borderRadius:99, padding:'3px 12px', fontSize:13, fontWeight:800}}>
                {completedMissions}/{missions.length}
              </span>
            </div>
            {missions.map(m => (
              <div key={m.id} style={{display:'flex', alignItems:'center', gap:12, background:'#fff', borderRadius:16, padding:'12px 14px', marginBottom:8, border:`2px solid ${m.completed ? DUO.green : '#f0f0f0'}`}}>
                <div style={{width:40, height:40, borderRadius:12, background: m.completed ? DUO.greenL : '#f7f7f7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0}}>
                  {m.completed ? '✅' : m.mission_type==='complete_lesson' ? '📚' : '⚡'}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14, fontWeight:700, color: m.completed ? '#999' : '#333', textDecoration: m.completed ? 'line-through' : 'none'}}>
                    {m.mission_type==='complete_lesson' ? 'أكمل درساً' : m.mission_type==='win_quiz' ? 'اربح في Quiz' : 'شارك في تحدي'}
                  </div>
                  <div style={{fontSize:12, color:DUO.green, fontWeight:800}}>+{m.xp_reward} XP</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CONTINUE LEARNING */}
        {enrolledRoadmaps.length > 0 && (
          <div style={{marginBottom:20}}>
            <h2 style={{margin:'0 0 10px', fontSize:17, fontWeight:800, color:'#333'}}>كمّل من حيث وقفت</h2>
            {enrolledRoadmaps.map(r => {
              const meta = ROADMAP_META[r.slug]; const prog = progress[r.id]
              if (!meta) return null
              const pct = r.total_xp > 0 ? Math.min(100, Math.round((prog.total_xp_earned / r.total_xp) * 100)) : 0
              return (
                <Link key={r.id} href={`/learn?roadmap=${r.slug}`} style={{display:'flex', alignItems:'center', gap:14, background:'#fff', borderRadius:20, padding:'14px 16px', textDecoration:'none', border:'2px solid #f0f0f0', marginBottom:10}}>
                  <div style={{width:52, height:52, borderRadius:16, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0}}>{meta.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15, fontWeight:800, color:'#333', marginBottom:8}}>{meta.label}</div>
                    <div style={{height:10, background:'#f0f0f0', borderRadius:99, overflow:'hidden'}}>
                      <div style={{height:'100%', background:meta.color, borderRadius:99, width:`${pct}%`}}/>
                    </div>
                  </div>
                  <span style={{fontSize:14, fontWeight:800, color:meta.color, flexShrink:0}}>{pct}%</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* ALL PATHS */}
        <div style={{marginBottom:20}}>
          <h2 style={{margin:'0 0 10px', fontSize:17, fontWeight:800, color:'#333'}}>{enrolledRoadmaps.length===0 ? '🚀 ابدأ رحلتك' : 'كل المسارات'}</h2>
          {Object.entries(ROADMAP_META).map(([slug, meta]) => {
            const roadmap = roadmaps.find(r => r.slug===slug)
            const isEnrolled = roadmap && progress[roadmap.id]
            const pct = (roadmap && isEnrolled && roadmap.total_xp > 0) ? Math.min(100, Math.round((progress[roadmap.id].total_xp_earned / roadmap.total_xp) * 100)) : 0
            return (
              <Link key={slug} href={`/learn?roadmap=${slug}`} style={{display:'flex', alignItems:'center', gap:14, background:'#fff', borderRadius:20, padding:'14px 16px', textDecoration:'none', border:`2px solid ${isEnrolled ? meta.color+'40' : '#f0f0f0'}`, marginBottom:10, position:'relative', overflow:'hidden'}}>
                <div style={{position:'absolute', right:0, top:0, bottom:0, width:4, background:meta.color, borderRadius:'0 20px 20px 0'}}/>
                <div style={{width:52, height:52, borderRadius:16, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0}}>{meta.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                    <span style={{fontSize:15, fontWeight:800, color:'#333'}}>{meta.label}</span>
                    {isEnrolled && <span style={{background:meta.bg, color:meta.color, borderRadius:99, padding:'2px 8px', fontSize:10, fontWeight:800}}>مسجّل</span>}
                  </div>
                  <div style={{fontSize:12, color:'#999'}}>{meta.desc}</div>
                  {isEnrolled && pct > 0 && <div style={{height:6, background:'#f0f0f0', borderRadius:99, marginTop:6, overflow:'hidden'}}><div style={{height:'100%', background:meta.color, borderRadius:99, width:`${pct}%`}}/></div>}
                </div>
                <span style={{fontSize:18, color:'#ddd'}}>←</span>
              </Link>
            )
          })}
        </div>

        {/* UPGRADE BANNER */}
        {user?.subscription_plan === 'free' && (
          <Link href="/upgrade" style={{display:'flex', alignItems:'center', gap:14, background:`linear-gradient(135deg, ${DUO.blue}, ${DUO.blueDk})`, borderRadius:20, padding:'18px 20px', marginBottom:20, textDecoration:'none', boxShadow:`0 8px 24px ${DUO.blue}40`, position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', right:-20, top:-20, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.1)'}}/>
            <span style={{fontSize:32, flexShrink:0}}>👑</span>
            <div style={{flex:1}}>
              <div style={{color:'#fff', fontWeight:900, fontSize:17, marginBottom:3}}>ترقّى لـ Pro</div>
              <div style={{color:'rgba(255,255,255,0.85)', fontSize:13}}>XP مضاعف + دروس غير محدودة</div>
            </div>
            <div style={{background:'#fff', color:DUO.blue, borderRadius:12, padding:'10px 18px', fontSize:13, fontWeight:900, flexShrink:0}}>ابدأ</div>
          </Link>
        )}

      </div>

      {/* BOTTOM NAV */}
      <nav style={{position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'#fff', borderTop:'2px solid #f0f0f0', display:'flex', padding:'8px 0 16px', zIndex:100, direction:'ltr', boxShadow:'0 -4px 20px rgba(0,0,0,0.06)'}}>
        {[
          {href:'/profile',     icon:'👤', label:'ملفي'},
          {href:'/leaderboard', icon:'🏆', label:'الترتيب'},
          {href:'/challenges',  icon:'⚔️',  label:'التحديات'},
          {href:'/learn',       icon:'📚', label:'التعلم'},
          {href:'/home',        icon:'🏠', label:'الرئيسية', active:true},
        ].map(n => (
          <Link key={n.href} href={n.href} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, textDecoration:'none', padding:'4px 0', position:'relative'}}>
            {(n as any).active && <div style={{position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)', width:32, height:3, borderRadius:99, background:DUO.blue}}/>}
            <span style={{fontSize:22}}>{n.icon}</span>
            <span style={{fontSize:10, fontWeight:(n as any).active ? 800 : 400, color:(n as any).active ? DUO.blue : '#aaa'}}>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
