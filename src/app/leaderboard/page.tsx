'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Period = 'weekly' | 'monthly' | 'all_time'

// ═══════════════════════════════════════════════
// DEMO USERS — Real Arabic names, realistic data
// ═══════════════════════════════════════════════
const DEMO_USERS = [
  { id: 'demo_1', name: 'محمد إبراهيم', avatar: '👨‍💻', base_weekly: 2400, base_monthly: 9800, base_all: 34200, city: 'القاهرة', seed: 7 },
  { id: 'demo_2', name: 'أحمد خالد',    avatar: '🧑‍🎓', base_weekly: 2100, base_monthly: 8400, base_all: 28700, city: 'الإسكندرية', seed: 13 },
  { id: 'demo_3', name: 'سارة محمود',  avatar: '👩‍💼', base_weekly: 1950, base_monthly: 7900, base_all: 25100, city: 'الجيزة', seed: 3 },
  { id: 'demo_4', name: 'عمر حسين',    avatar: '👨‍🏫', base_weekly: 1800, base_monthly: 7200, base_all: 22800, city: 'الرياض', seed: 17 },
  { id: 'demo_5', name: 'نور علي',      avatar: '👩‍🎨', base_weekly: 1650, base_monthly: 6600, base_all: 19500, city: 'دبي', seed: 5 },
  { id: 'demo_6', name: 'يوسف عبدالله', avatar: '🧑‍💻', base_weekly: 1500, base_monthly: 6000, base_all: 17200, city: 'الكويت', seed: 11 },
  { id: 'demo_7', name: 'مريم أحمد',   avatar: '👩‍🏫', base_weekly: 1350, base_monthly: 5400, base_all: 15600, city: 'القاهرة', seed: 9 },
  { id: 'demo_8', name: 'علي محمد',    avatar: '👨‍🎓', base_weekly: 1200, base_monthly: 4800, base_all: 13400, city: 'الإسكندرية', seed: 2 },
  { id: 'demo_9', name: 'فاطمة حسن',  avatar: '👩‍💻', base_weekly: 1050, base_monthly: 4200, base_all: 11800, city: 'جدة', seed: 15 },
  { id: 'demo_10', name: 'كريم سامي',  avatar: '🧑‍🎨', base_weekly: 900,  base_monthly: 3600, base_all: 9900, city: 'عمان', seed: 6 },
  { id: 'demo_11', name: 'هناء رضا',   avatar: '👩‍🎓', base_weekly: 750,  base_monthly: 3000, base_all: 8200, city: 'بيروت', seed: 19 },
  { id: 'demo_12', name: 'طارق وليد',  avatar: '👨‍🎨', base_weekly: 600,  base_monthly: 2400, base_all: 6700, city: 'القاهرة', seed: 4 },
]

// Deterministic "random" based on seed + date
// Same day = same result, different day = different result
function deterministicRand(seed: number, dayOffset: number = 0): number {
  const today = new Date()
  const dayNum = Math.floor(today.getTime() / (1000 * 60 * 60 * 24)) + dayOffset
  // LCG - looks random but is deterministic
  const x = Math.sin(seed * 9301 + dayNum * 49297 + 233) * 10000
  return x - Math.floor(x)
}

// Generate XP that varies ±15% per day but stays realistic
function getDailyXP(base: number, seed: number, type: Period): number {
  const variance = deterministicRand(seed) * 0.3 - 0.15 // ±15%
  const rawXP = Math.round(base * (1 + variance))
  // Round to nearest 50 to look realistic
  return Math.round(rawXP / 50) * 50
}

// Generate streak that changes slowly (more realistic)
function getDailyStreak(seed: number): number {
  const today = new Date()
  const dayNum = Math.floor(today.getTime() / (1000 * 60 * 60 * 24))
  // Streak grows slowly, resets occasionally
  const base = (seed * 7 + dayNum * 0.3) % 45
  return Math.max(1, Math.round(base))
}

const RANK_EMOJI = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']

export default function LeaderboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [period, setPeriod] = useState<Period>('weekly')
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<any[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
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
    // Get user's real XP
    const userXP = period === 'weekly'
      ? Math.round((user.xp_total || 0) * 0.15) // Estimate weekly from total
      : period === 'monthly'
      ? Math.round((user.xp_total || 0) * 0.4)
      : user.xp_total || 0

    // Build demo entries with daily-varying XP
    const demoEntries = DEMO_USERS.map((u, i) => {
      const baseKey = period === 'weekly' ? 'base_weekly' : period === 'monthly' ? 'base_monthly' : 'base_all'
      const xp = getDailyXP(u[baseKey as keyof typeof u] as number, u.seed, period)
      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        xp,
        streak: getDailyStreak(u.seed),
        isDemo: true,
        city: u.city,
      }
    })

    // Add real user
    const realUser = {
      id: user.id,
      name: user.full_name || user.username || 'أنت',
      avatar: '⭐',
      xp: userXP,
      streak: user.streak_current || 0,
      isDemo: false,
      isMe: true,
    }

    // Combine + sort by XP
    const all = [...demoEntries, realUser].sort((a, b) => b.xp - a.xp)

    // Find user rank
    const rank = all.findIndex(e => e.isMe) + 1
    setUserRank(rank)
    setEntries(all)
  }

  if (loading || !user) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize:48 }}>🏆</span>
    </div>
  )

  const myEntry = entries.find(e => e.isMe)
  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div dir="rtl" style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#f7f7f7', fontFamily:"'Segoe UI',Tahoma,sans-serif", paddingBottom:90 }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg, #1CB0F6 0%, #0090CC 100%)', padding:'20px 16px 24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:'#fff' }}>🏆 الترتيب</h1>
          {userRank && (
            <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:99, padding:'5px 14px' }}>
              <span style={{ color:'#fff', fontSize:14, fontWeight:800 }}>
                ترتيبك: <span style={{ color:'#FFD700' }}>#{userRank}</span>
              </span>
            </div>
          )}
        </div>

        {/* Period Tabs */}
        <div style={{ display:'flex', background:'rgba(0,0,0,0.2)', borderRadius:12, padding:3, gap:2 }}>
          {([['weekly','هذا الأسبوع'],['monthly','هذا الشهر'],['all_time','كل الوقت']] as [Period,string][]).map(([p, label]) => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ flex:1, padding:'8px 4px', borderRadius:10, border:'none', background: period===p ? '#fff' : 'transparent', color: period===p ? '#1CB0F6' : 'rgba(255,255,255,0.7)', fontWeight: period===p ? 800 : 400, cursor:'pointer', fontSize:12 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'0 16px 16px' }}>

        {/* Top 3 Podium */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr', gap:8, margin:'20px 0 16px', alignItems:'flex-end' }}>
          {/* 2nd place */}
          {top3[1] && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:4 }}>{top3[1].isMe ? '⭐' : top3[1].avatar}</div>
              <div style={{ fontSize:12, fontWeight:700, color:'#333', marginBottom:4 }}>{top3[1].name}</div>
              <div style={{ background:'#C0C0C0', borderRadius:'10px 10px 0 0', padding:'10px 4px' }}>
                <div style={{ fontSize:10, color:'#fff' }}>🥈</div>
                <div style={{ fontSize:13, fontWeight:900, color:'#fff' }}>{top3[1].xp.toLocaleString()}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.8)' }}>XP</div>
              </div>
            </div>
          )}
          {/* 1st place */}
          {top3[0] && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:16, marginBottom:4 }}>👑</div>
              <div style={{ fontSize:36, marginBottom:4 }}>{top3[0].isMe ? '⭐' : top3[0].avatar}</div>
              <div style={{ fontSize:13, fontWeight:800, color:'#333', marginBottom:4 }}>{top3[0].name}</div>
              <div style={{ background:'#FFD700', borderRadius:'10px 10px 0 0', padding:'14px 4px' }}>
                <div style={{ fontSize:10, color:'#fff' }}>🥇</div>
                <div style={{ fontSize:15, fontWeight:900, color:'#fff' }}>{top3[0].xp.toLocaleString()}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.8)' }}>XP</div>
              </div>
            </div>
          )}
          {/* 3rd place */}
          {top3[2] && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:4 }}>{top3[2].isMe ? '⭐' : top3[2].avatar}</div>
              <div style={{ fontSize:12, fontWeight:700, color:'#333', marginBottom:4 }}>{top3[2].name}</div>
              <div style={{ background:'#CD7F32', borderRadius:'10px 10px 0 0', padding:'8px 4px' }}>
                <div style={{ fontSize:10, color:'#fff' }}>🥉</div>
                <div style={{ fontSize:13, fontWeight:900, color:'#fff' }}>{top3[2].xp.toLocaleString()}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.8)' }}>XP</div>
              </div>
            </div>
          )}
        </div>

        {/* Rest of leaderboard */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {entries.map((entry, i) => {
            const rank = i + 1
            if (rank <= 3) return null // Already shown in podium
            const isMe = entry.isMe

            return (
              <div key={entry.id} style={{
                background: isMe ? '#DDF4FF' : '#fff',
                borderRadius:14, padding:'12px 14px',
                border: isMe ? '2px solid #1CB0F6' : '2px solid #f0f0f0',
                display:'flex', alignItems:'center', gap:12,
                boxShadow: isMe ? '0 2px 12px rgba(28,176,246,0.2)' : 'none',
              }}>
                {/* Rank */}
                <div style={{ width:32, textAlign:'center', flexShrink:0 }}>
                  <span style={{ fontSize:rank <= 10 ? 18 : 14, fontWeight:800, color: isMe ? '#1CB0F6' : '#999' }}>
                    {rank <= 10 ? RANK_EMOJI[rank - 1] : `#${rank}`}
                  </span>
                </div>
                {/* Avatar */}
                <div style={{ width:40, height:40, borderRadius:12, background: isMe ? '#1CB0F620' : '#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                  {entry.avatar}
                </div>
                {/* Info */}
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color: isMe ? '#1453A3' : '#333', fontSize:14 }}>
                    {entry.name} {isMe && <span style={{ fontSize:11, color:'#1CB0F6', fontWeight:700 }}>(أنت)</span>}
                  </div>
                  <div style={{ fontSize:11, color:'#999', marginTop:2 }}>
                    🔥 {entry.streak} يوم متواصل
                  </div>
                </div>
                {/* XP */}
                <div style={{ textAlign:'left', flexShrink:0 }}>
                  <div style={{ fontWeight:900, color: isMe ? '#1CB0F6' : '#333', fontSize:15 }}>{entry.xp.toLocaleString()}</div>
                  <div style={{ fontSize:10, color:'#aaa', textAlign:'center' }}>XP</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Motivational message */}
        {userRank && userRank > 1 && (
          <div style={{ background:'#FFF5D3', borderRadius:14, padding:'14px 16px', marginTop:16, border:'2px solid #FF9600', textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#A56644' }}>
              {userRank <= 5
                ? `🔥 أنت في المراكز الأولى! فرقك عن #${userRank-1} ${(entries[userRank-2]?.xp - entries[userRank-1]?.xp).toLocaleString()} XP فقط`
                : `💪 اكمل ${Math.round((entries[userRank-2]?.xp - entries[userRank-1]?.xp + 100))} XP أكتر عشان تتقدم مرتبة`
              }
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'#fff', borderTop:'2px solid #f0f0f0', display:'flex', padding:'8px 0 16px', zIndex:100, direction:'ltr' }}>
        {[
          { href:'/profile',     icon:'👤', label:'ملفي' },
          { href:'/leaderboard', icon:'🏆', label:'الترتيب', active:true },
          { href:'/challenges',  icon:'⚔️',  label:'التحديات' },
          { href:'/learn',       icon:'📚', label:'التعلم' },
          { href:'/home',        icon:'🏠', label:'الرئيسية' },
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
