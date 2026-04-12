'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Period = 'weekly' | 'monthly' | 'all_time'

// ══════════════════════════════════════════════════════
// DEMO USERS — realistic Arabic names + deterministic XP
// ══════════════════════════════════════════════════════
const DEMO_USERS = [
  { id:'d1', name:'محمد إبراهيم',   avatar:'👨‍💻', w:2400, m:9800,  a:34200, streak_base:28, seed:7  },
  { id:'d2', name:'أحمد خالد',      avatar:'🧑‍🎓', w:2100, m:8400,  a:28700, streak_base:21, seed:13 },
  { id:'d3', name:'سارة محمود',    avatar:'👩‍💼', w:1950, m:7900,  a:25100, streak_base:35, seed:3  },
  { id:'d4', name:'عمر حسين',      avatar:'👨‍🏫', w:1800, m:7200,  a:22800, streak_base:14, seed:17 },
  { id:'d5', name:'نور علي',        avatar:'👩‍🎨', w:1650, m:6600,  a:19500, streak_base:9,  seed:5  },
  { id:'d6', name:'يوسف عبدالله',  avatar:'🧑‍💻', w:1500, m:6000,  a:17200, streak_base:42, seed:11 },
  { id:'d7', name:'مريم أحمد',     avatar:'👩‍🏫', w:1350, m:5400,  a:15600, streak_base:7,  seed:9  },
  { id:'d8', name:'علي محمد',      avatar:'👨‍🎓', w:1200, m:4800,  a:13400, streak_base:16, seed:2  },
  { id:'d9', name:'فاطمة حسن',    avatar:'👩‍💻', w:1050, m:4200,  a:11800, streak_base:5,  seed:15 },
  { id:'d10',name:'كريم سامي',     avatar:'🧑‍🎨', w:900,  m:3600,  a:9900,  streak_base:11, seed:6  },
  { id:'d11',name:'هناء رضا',      avatar:'👩‍🎓', w:750,  m:3000,  a:8200,  streak_base:3,  seed:19 },
  { id:'d12',name:'طارق وليد',     avatar:'👨‍🎨', w:600,  m:2400,  a:6700,  streak_base:19, seed:4  },
]

// Deterministic daily variation ±15% — same day = same number, next day = different
function dailyXP(base: number, seed: number): number {
  const dayNum = Math.floor(Date.now() / 86400000)
  const r = Math.abs(Math.sin(seed * 9301 + dayNum * 49297)) 
  const variance = r * 0.3 - 0.15  // ±15%
  return Math.round(base * (1 + variance) / 50) * 50  // round to nearest 50
}

function dailyStreak(base: number, seed: number): number {
  const dayNum = Math.floor(Date.now() / 86400000)
  const r = Math.abs(Math.sin(seed * 1234 + dayNum * 567))
  return Math.max(1, base + Math.round(r * 4 - 2))  // ±2 days variation
}

const RANK_EMOJI = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']

export default function LeaderboardPage() {
  const router = useRouter()
  const [user, setUser]       = useState<any>(null)
  const [period, setPeriod]   = useState<Period>('weekly')
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data:{ session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      const { data: u } = await supabase.from('users').select('*').eq('id', session.user.id).single()
      setUser(u)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!user) return
    buildLeaderboard()
  }, [user, period])

  const buildLeaderboard = () => {
    // ── Real user XP (always from actual DB) ──
    const realXP =
      period === 'weekly'   ? Math.round((user.xp_total || 0) * 0.15) :
      period === 'monthly'  ? Math.round((user.xp_total || 0) * 0.40) :
                              (user.xp_total || 0)

    const realEntry: any = {
      id:     user.id,
      name:   user.full_name || user.username || 'أنت',
      avatar: '⭐',
      xp:     realXP,
      streak: user.streak_current || 0,
      level:  user.current_level || 1,
      isMe:   true,
    }

    // ── Demo users with daily-varying XP ──
    const demoEntries = DEMO_USERS.map(u => ({
      id:     u.id,
      name:   u.name,
      avatar: u.avatar,
      xp:     dailyXP(period === 'weekly' ? u.w : period === 'monthly' ? u.m : u.a, u.seed),
      streak: dailyStreak(u.streak_base, u.seed),
      level:  Math.floor(dailyXP(u.a, u.seed) / 2500) + 1,
      isMe:   false,
    }))

    // ── Sort by XP ──
    const sorted = [...demoEntries, realEntry].sort((a, b) => b.xp - a.xp)
    setEntries(sorted)
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f7f7f7'}}>
      <span style={{fontSize:48}}>🏆</span>
    </div>
  )

  const myRank  = entries.findIndex((e:any) => e.isMe) + 1
  const myEntry = entries.find((e:any) => e.isMe)
  const top3    = entries.slice(0, 3)
  const belowTop3 = entries.slice(3)

  // Gap to next rank
  const xpToNextRank = myRank > 1
    ? entries[myRank - 2].xp - myEntry.xp
    : 0

  return (
    <div dir="rtl" style={{maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#f7f7f7', fontFamily:"'Segoe UI',Tahoma,sans-serif", paddingBottom:90}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#1CB0F6 0%,#0090CC 100%)', padding:'20px 16px 28px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <h1 style={{margin:0, fontSize:22, fontWeight:900, color:'#fff'}}>🏆 الترتيب</h1>
          {myRank > 0 && (
            <div style={{background:'rgba(255,255,255,0.2)', borderRadius:99, padding:'5px 14px'}}>
              <span style={{color:'#fff', fontSize:14, fontWeight:800}}>
                ترتيبك: <span style={{color:'#FFD700'}}>#{myRank}</span>
              </span>
            </div>
          )}
        </div>

        {/* Period Tabs */}
        <div style={{display:'flex', background:'rgba(0,0,0,0.2)', borderRadius:12, padding:3, gap:2}}>
          {([['weekly','هذا الأسبوع'],['monthly','هذا الشهر'],['all_time','كل الوقت']] as [Period,string][]).map(([p,label]) => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{flex:1, padding:'8px 4px', borderRadius:10, border:'none', background:period===p?'#fff':'transparent', color:period===p?'#1CB0F6':'rgba(255,255,255,0.7)', fontWeight:period===p?800:400, cursor:'pointer', fontSize:12, transition:'all 0.2s'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'0 16px 16px'}}>

        {/* ── Podium Top 3 ── */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1.15fr 1fr', gap:8, margin:'20px 0 16px', alignItems:'flex-end'}}>
          {/* 2nd */}
          {top3[1] && (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:30, marginBottom:4}}>{top3[1].isMe ? '⭐' : top3[1].avatar}</div>
              <div style={{fontSize:11, fontWeight:700, color:'#333', marginBottom:4, lineHeight:1.2}}>{top3[1].name}</div>
              <div style={{background:'#C0C0C0', borderRadius:'10px 10px 0 0', padding:'10px 4px'}}>
                <div style={{fontSize:16}}>🥈</div>
                <div style={{fontSize:13, fontWeight:900, color:'#fff'}}>{top3[1].xp.toLocaleString()}</div>
                <div style={{fontSize:9, color:'rgba(255,255,255,0.8)'}}>XP</div>
                {top3[1].isMe && <div style={{fontSize:9, color:'#FFD700', fontWeight:800}}>أنت!</div>}
              </div>
            </div>
          )}
          {/* 1st */}
          {top3[0] && (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:14, marginBottom:2}}>👑</div>
              <div style={{fontSize:34, marginBottom:4}}>{top3[0].isMe ? '⭐' : top3[0].avatar}</div>
              <div style={{fontSize:12, fontWeight:800, color:'#333', marginBottom:4, lineHeight:1.2}}>{top3[0].name}</div>
              <div style={{background:'#FFD700', borderRadius:'10px 10px 0 0', padding:'14px 4px'}}>
                <div style={{fontSize:18}}>🥇</div>
                <div style={{fontSize:15, fontWeight:900, color:'#fff'}}>{top3[0].xp.toLocaleString()}</div>
                <div style={{fontSize:9, color:'rgba(255,255,255,0.8)'}}>XP</div>
                {top3[0].isMe && <div style={{fontSize:9, color:'#333', fontWeight:800}}>أنت!</div>}
              </div>
            </div>
          )}
          {/* 3rd */}
          {top3[2] && (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:28, marginBottom:4}}>{top3[2].isMe ? '⭐' : top3[2].avatar}</div>
              <div style={{fontSize:11, fontWeight:700, color:'#333', marginBottom:4, lineHeight:1.2}}>{top3[2].name}</div>
              <div style={{background:'#CD7F32', borderRadius:'10px 10px 0 0', padding:'8px 4px'}}>
                <div style={{fontSize:14}}>🥉</div>
                <div style={{fontSize:13, fontWeight:900, color:'#fff'}}>{top3[2].xp.toLocaleString()}</div>
                <div style={{fontSize:9, color:'rgba(255,255,255,0.8)'}}>XP</div>
                {top3[2].isMe && <div style={{fontSize:9, color:'#FFD700', fontWeight:800}}>أنت!</div>}
              </div>
            </div>
          )}
        </div>

        {/* ── Rest of list ── */}
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {belowTop3.map((entry:any, i:number) => {
            const rank = i + 4
            const isMe = entry.isMe
            return (
              <div key={entry.id} style={{
                background: isMe ? '#DDF4FF' : '#fff',
                borderRadius:14, padding:'12px 14px',
                border: isMe ? '2px solid #1CB0F6' : '2px solid #f0f0f0',
                display:'flex', alignItems:'center', gap:12,
                boxShadow: isMe ? '0 2px 12px rgba(28,176,246,0.15)' : 'none',
              }}>
                <div style={{width:30, textAlign:'center', flexShrink:0}}>
                  <span style={{fontSize:rank<=10?16:13, fontWeight:800, color:isMe?'#1CB0F6':'#aaa'}}>
                    {rank <= 10 ? RANK_EMOJI[rank-1] : `#${rank}`}
                  </span>
                </div>
                <div style={{width:40, height:40, borderRadius:12, background:isMe?'#DDF4FF':'#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0, border:isMe?'2px solid #1CB0F6':'none'}}>
                  {entry.avatar}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700, color:isMe?'#1453A3':'#333', fontSize:14}}>
                    {entry.name}
                    {isMe && <span style={{fontSize:11, color:'#1CB0F6', fontWeight:700, marginRight:4}}> (أنت)</span>}
                  </div>
                  <div style={{fontSize:11, color:'#aaa', marginTop:2}}>
                    🔥 {entry.streak} يوم · Lv.{entry.level}
                  </div>
                </div>
                <div style={{textAlign:'left', flexShrink:0}}>
                  <div style={{fontWeight:900, color:isMe?'#1CB0F6':'#333', fontSize:15}}>{entry.xp.toLocaleString()}</div>
                  <div style={{fontSize:10, color:'#ccc', textAlign:'center'}}>XP</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Motivational message for real user ── */}
        {myRank > 0 && myEntry && (
          <div style={{
            background: myRank === 1 ? '#D7FFB8' : myRank <= 3 ? '#FFF5D3' : '#DDF4FF',
            borderRadius:14, padding:'14px 16px', marginTop:16,
            border:`2px solid ${myRank===1?'#58CC02':myRank<=3?'#FF9600':'#1CB0F6'}`,
            textAlign:'center'
          }}>
            <div style={{fontSize:20, marginBottom:4}}>
              {myRank===1?'🏆':myRank<=3?'🔥':myRank<=5?'💪':'📈'}
            </div>
            <div style={{fontSize:14, fontWeight:700, color:myRank===1?'#27500A':myRank<=3?'#A56644':'#1453A3'}}>
              {myRank === 1
                ? '🎉 أنت في المرتبة الأولى! استمر!'
                : myRank <= 3
                ? `🔥 أنت في المراكز الأولى! فرقك عن #${myRank-1} فقط ${xpToNextRank.toLocaleString()} XP`
                : `💪 اكسب ${xpToNextRank.toLocaleString()} XP أكتر عشان تتقدم للمرتبة #${myRank-1}`
              }
            </div>
            <div style={{fontSize:12, color:'#666', marginTop:4}}>
              بياناتك حقيقية — XP: {myEntry.xp.toLocaleString()} · Streak: {myEntry.streak} يوم
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav style={{position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'#fff', borderTop:'2px solid #f0f0f0', display:'flex', padding:'8px 0 16px', zIndex:100, direction:'ltr'}}>
        {[
          {href:'/profile',     icon:'👤', label:'ملفي'     },
          {href:'/leaderboard', icon:'🏆', label:'الترتيب', active:true},
          {href:'/challenges',  icon:'⚔️',  label:'التحديات'},
          {href:'/learn',       icon:'📚', label:'التعلم'   },
          {href:'/home',        icon:'🏠', label:'الرئيسية' },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, textDecoration:'none', padding:'4px 0', position:'relative'}}>
            {(n as any).active && <div style={{position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)', width:32, height:3, borderRadius:99, background:'#1CB0F6'}}/>}
            <span style={{fontSize:22}}>{n.icon}</span>
            <span style={{fontSize:10, fontWeight:(n as any).active?800:400, color:(n as any).active?'#1CB0F6':'#aaa'}}>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
