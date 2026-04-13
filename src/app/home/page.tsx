'use client'
import StreakTargetModal from '@/components/StreakTargetModal'
import AdBanner from '@/components/AdBanner'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ══════════════════════════════════════════
// NAR MASCOT — messages based on streak
// ══════════════════════════════════════════
function getNarMessage(streak: number, name: string, hour: number): { msg: string; mood: 'happy' | 'sad' | 'fire' | 'warning' } {
  const isEvening = hour >= 18

  if (streak === 0) return { msg: `أهلاً ${name}! ابدأ رحلتك دلوقتي 🚀`, mood: 'happy' }
  if (streak === 1) return { msg: `${name}! اليوم الأول دايماً الأصعب — وإنت عدّيته! 💪`, mood: 'happy' }
  if (streak < 7) {
    if (isEvening) return { msg: `${name}! اليوم ${streak} — وفي وقت ممتاز للتعلم! 🔥`, mood: 'fire' }
    return { msg: `${streak} أيام متواصلة! إنت أحسن من 80% من الطلاب 💪`, mood: 'fire' }
  }
  if (streak < 14) return { msg: `أسبوع كامل! العادة بدأت تتكون 🎯 استمر!`, mood: 'fire' }
  if (streak < 30) return { msg: `${streak} يوم متواصل! 🔥 إنت من أقوى الطلاب`, mood: 'fire' }
  if (streak >= 30) return { msg: `⚠️ ${streak} يوم! ده إنجاز حقيقي — ماتضيعوش!`, mood: 'warning' }
  return { msg: `أهلاً ${name}!`, mood: 'happy' }
}

const NAR_MOODS = {
  happy:   { emoji: '🤖', bg: '#D7FFB8', border: '#58CC02', color: '#27500A' },
  fire:    { emoji: '🔥', bg: '#FFF5D3', border: '#FF9600', color: '#A56644' },
  sad:     { emoji: '😢', bg: '#FFE5E5', border: '#FF4B4B', color: '#7f1d1d' },
  warning: { emoji: '⚠️', bg: '#FFE5E5', border: '#FF4B4B', color: '#7f1d1d' },
}

// Level thresholds
const LEVELS = [
  { level:1, name:'مبتدئ',    xp:0,    color:'#94a3b8' },
  { level:2, name:'متعلم',    xp:100,  color:'#58CC02' },
  { level:3, name:'محترف',    xp:400,  color:'#1CB0F6' },
  { level:4, name:'خبير',     xp:900,  color:'#FF9600' },
  { level:5, name:'أسطورة',   xp:1600, color:'#CE82FF' },
  { level:6, name:'نخبة إبراهيم', xp:2500, color:'#FFD700' },
]

function getLevelInfo(xp: number) {
  let current = LEVELS[0], next = LEVELS[1]
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) { current = LEVELS[i]; next = LEVELS[i+1] || LEVELS[i] }
  }
  const progress = next.xp > current.xp
    ? Math.min(100, Math.round(((xp - current.xp) / (next.xp - current.xp)) * 100))
    : 100
  return { current, next, progress, xpToNext: Math.max(0, next.xp - xp) }
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser]               = useState<any>(null)
  const [todayChallenge, setTodayChallenge] = useState<any>(null)
  const [challengeDone, setChallengeDone]   = useState(false)
  const [streakFreeze, setStreakFreeze]      = useState<any>(null)
  const [enrolledSlugs, setEnrolledSlugs]     = useState<string[]>([])
  const [streakTarget, setStreakTarget]         = useState<any>(null)
  const [nextStreakTarget, setNextStreakTarget]  = useState<any>(null)
  const [allTargets, setAllTargets]             = useState<any[]>([])
  const [completedTargetDays, setCompletedTargetDays] = useState<Set<number>>(new Set())
  const [loading, setLoading]         = useState(true)
  const [streakAnim, setStreakAnim]    = useState(false)
  const hasLoaded                      = useRef(false)

  useEffect(() => {
    if (hasLoaded.current) return
    hasLoaded.current = true
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }

      const [{ data: u }, { data: freezes }] = await Promise.all([
        supabase.from('users').select('*').eq('id', session.user.id).single(),
        supabase.from('streak_freezes').select('*').eq('user_id', session.user.id).is('used_at', null),
      ])
      setUser(u)
      setStreakFreeze(freezes?.[0] || null)

      // Check streak targets
      if (u && u.streak_current > 0) {
        const [{ data: allTargets }, { data: completedTargets }] = await Promise.all([
          supabase.from('streak_targets').select('*').eq('is_active', true).order('days'),
          supabase.from('user_streak_targets').select('target_days').eq('user_id', session.user.id),
        ])

        if (allTargets) {
          const completedDays = new Set(completedTargets?.map((t: any) => t.target_days) || [])
          setAllTargets(allTargets)
          setCompletedTargetDays(completedDays as Set<number>)

          // Check if current streak hits any uncompleted target
          const justCompleted = allTargets.find(t =>
            t.days <= u.streak_current && !completedDays.has(t.days)
          )

          if (justCompleted) {
            // Award XP and mark target as completed
            await supabase.from('user_streak_targets').upsert({
              user_id: session.user.id,
              target_days: justCompleted.days,
              xp_awarded: justCompleted.xp_reward,
            }, { onConflict: 'user_id,target_days' })

            try {
              await supabase.rpc('award_xp', {
                p_user_id: session.user.id,
                p_amount: justCompleted.xp_reward,
                p_reason: 'streak_target',
                p_reference_id: justCompleted.id,
              })
            } catch {}

            // Find next target
            const updatedCompleted = new Set([...completedDays, justCompleted.days])
            const next = allTargets.find(t => !updatedCompleted.has(t.days) && t.days > u.streak_current)

            setStreakTarget(justCompleted)
            setNextStreakTarget(next || null)
          }
        }
      }

      // Fetch enrolled roadmap slugs for ad targeting
      const { data: enrollData } = await supabase
        .from('course_enrollments')
        .select('roadmaps(slug)')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
      const slugs = enrollData?.map((e: any) => e.roadmaps?.slug).filter(Boolean) || []
      setEnrolledSlugs(slugs)

      // Check streak freeze / XP deduction on login
      if (u) {
        try {
          const { data: streakCheck } = await supabase.rpc('check_streak_on_login', { p_user_id: session.user.id })
          if (streakCheck?.status === 'missed_days') {
            // Refetch user to get updated XP
            const { data: updatedUser } = await supabase.from('users').select('*').eq('id', session.user.id).single()
            setUser(updatedUser)
          }
        } catch {}
      }

      // Load today's daily challenge
      const today = new Date().toISOString().split('T')[0]
      const { data: schedule } = await supabase
        .from('daily_challenge_schedule')
        .select('*, challenges(*)')
        .eq('scheduled_date', today)
        .maybeSingle()

      if (schedule?.challenges) {
        setTodayChallenge(schedule.challenges)
        // Check if already done today
        const { data: attempt } = await supabase
          .from('user_challenge_attempts')
          .select('id, is_correct')
          .eq('user_id', session.user.id)
          .eq('challenge_id', schedule.challenges.id)
          .maybeSingle()
        setChallengeDone(!!attempt)
      } else {
        // Pick a random active challenge as today's challenge
        const { data: challenges } = await supabase
          .from('challenges')
          .select('*')
          .eq('is_active', true)
          .limit(20)

        if (challenges && challenges.length > 0) {
          // Deterministic pick based on date
          const dayNum = Math.floor(Date.now() / 86400000)
          const picked = challenges[dayNum % challenges.length]
          setTodayChallenge(picked)

          // Schedule it
          await supabase.from('daily_challenge_schedule').upsert({
            challenge_id: picked.id,
            scheduled_date: today,
          }, { onConflict: 'scheduled_date' })

          const { data: attempt } = await supabase
            .from('user_challenge_attempts')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('challenge_id', picked.id)
            .maybeSingle()
          setChallengeDone(!!attempt)
        }
      }

      setLoading(false)
      // Trigger streak animation after load
      setTimeout(() => setStreakAnim(true), 300)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f7f7f7' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:12, animation:'pulse 1s infinite' }}>🤖</div>
        <div style={{ fontSize:14, color:'#999' }}>جاري التحميل...</div>
      </div>
    </div>
  )

  const hour = new Date().getHours()
  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'يا بطل'
  const nar = getNarMessage(user?.streak_current || 0, firstName, hour)
  const narStyle = NAR_MOODS[nar.mood]
  const lvl = getLevelInfo(user?.xp_total || 0)

  // Streak phase messaging
  const streak = user?.streak_current || 0
  let streakLabel = ''
  let streakSub = ''
  if (streak === 0) { streakLabel = 'ابدأ اليوم'; streakSub = 'أول درس = أول streak' }
  else if (streak < 7) { streakLabel = `🔥 ${streak} يوم`; streakSub = `${7 - streak} أيام لتحقيق أول أسبوع!` }
  else if (streak < 30) { streakLabel = `🔥 ${streak} يوم`; streakSub = 'العادة بتتكون — لا توقف!' }
  else { streakLabel = `🔥 ${streak} يوم`; streakSub = `إنجاز ضخم — ماتضيعوش! 🛡️` }

  return (
    <div dir="rtl" style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#f7f7f7', fontFamily:"'Segoe UI',Tahoma,sans-serif", paddingBottom:90 }}>

      {/* Header */}
      <header style={{ background:'#fff', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'2px solid #f0f0f0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:12, background: lvl.current.color + '20', border:`2px solid ${lvl.current.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:lvl.current.color, fontSize:16 }}>
            {user?.current_level || 1}
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#333' }}>{firstName}</div>
            <div style={{ fontSize:11, color:lvl.current.color, fontWeight:600 }}>{lvl.current.name}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* Streak badge */}
          <div style={{
            background: streak > 0 ? '#FFF5D3' : '#f5f5f5',
            borderRadius:99, padding:'5px 12px',
            display:'flex', alignItems:'center', gap:5,
            border: streak >= 7 ? '2px solid #FF9600' : '2px solid transparent',
            transform: streakAnim && streak > 0 ? 'scale(1.05)' : 'scale(1)',
            transition:'transform 0.3s',
          }}>
            <span style={{ fontSize:16 }}>🔥</span>
            <span style={{ fontSize:15, fontWeight:900, color: streak > 0 ? '#FF9600' : '#aaa' }}>{streak}</span>
          </div>
          {/* Coins */}
          <div style={{ background:'#DDF4FF', borderRadius:99, padding:'5px 12px', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:14 }}>💎</span>
            <span style={{ fontSize:13, fontWeight:800, color:'#1453A3' }}>{(user?.coins_balance || 0).toLocaleString()}</span>
          </div>
        </div>
      </header>

      <div style={{ padding:'16px 16px 0' }}>

        {/* NAR MESSAGE */}
        <div style={{ background:narStyle.bg, borderRadius:18, padding:'14px 16px', marginBottom:16, border:`2px solid ${narStyle.border}`, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:36, flexShrink:0 }}>{narStyle.emoji}</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:narStyle.color, lineHeight:1.5 }}>{nar.msg}</div>
            <div style={{ fontSize:11, color:narStyle.color + 'aa', marginTop:2 }}>نار — مساعدك الذكي 🤖</div>
          </div>
        </div>

        {/* XP & Level Progress */}
        <div style={{ background:'#fff', borderRadius:18, padding:'16px 18px', marginBottom:16, border:'2px solid #f0f0f0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:13, color:'#999' }}>المستوى التالي: {lvl.next.name}</span>
            <span style={{ fontSize:14, fontWeight:800, color: lvl.current.color }}>
              {(user?.xp_total || 0).toLocaleString()} XP
            </span>
          </div>
          <div style={{ height:14, background:'#f0f0f0', borderRadius:99, overflow:'hidden', marginBottom:6 }}>
            <div style={{
              height:'100%', borderRadius:99,
              background: `linear-gradient(90deg, ${lvl.current.color}, ${lvl.next.color || lvl.current.color})`,
              width:`${lvl.progress}%`,
              transition:'width 1s ease',
              position:'relative'
            }}>
              {lvl.progress > 20 && (
                <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:10, fontWeight:800, color:'#fff' }}>
                  {lvl.progress}%
                </span>
              )}
            </div>
          </div>
          {lvl.xpToNext > 0 && (
            <div style={{ fontSize:11, color:'#aaa', textAlign:'left' }}>
              {lvl.xpToNext.toLocaleString()} XP للوصول لـ {lvl.next.name}
            </div>
          )}
        </div>

        {/* STREAK CARD */}
        <div style={{
          background: streak >= 30 ? 'linear-gradient(135deg,#FF4B4B,#FF9600)' : streak >= 7 ? 'linear-gradient(135deg,#FF9600,#FF4B4B)' : '#fff',
          borderRadius:18, padding:'16px 18px', marginBottom:16,
          border: streak > 0 ? 'none' : '2px solid #f0f0f0',
          position:'relative', overflow:'hidden'
        }}>
          {streak > 0 && <div style={{ position:'absolute', top:-20, left:-20, fontSize:80, opacity:0.08 }}>🔥</div>}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:28, fontWeight:900, color: streak > 0 ? '#fff' : '#333', marginBottom:2 }}>
                {streakLabel}
              </div>
              <div style={{ fontSize:13, color: streak > 0 ? 'rgba(255,255,255,0.85)' : '#999' }}>
                {streakSub}
              </div>
            </div>
            {/* Streak freeze shield */}
            {streakFreeze && (
              <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:12, padding:'8px 12px', textAlign:'center' }}>
                <div style={{ fontSize:22 }}>🛡️</div>
                <div style={{ fontSize:10, color: streak > 0 ? '#fff' : '#666', fontWeight:700 }}>Freeze</div>
              </div>
            )}
          </div>
          {/* Streak days visualization */}
          {streak > 0 && streak <= 14 && (
            <div style={{ display:'flex', gap:4, marginTop:10, flexWrap:'wrap' }}>
              {Array.from({length: Math.min(streak, 14)}).map((_,i) => (
                <div key={i} style={{ width:24, height:24, borderRadius:6, background:'rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>
                  🔥
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STREAK TARGETS PROGRESS */}
        {allTargets.length > 0 && (
          <div style={{ background:'#fff', borderRadius:18, padding:'16px 18px', marginBottom:16, border:'2px solid #f0f0f0' }}>
            <div style={{ fontSize:14, fontWeight:800, color:'#333', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
              🎯 أهداف الـ Streak
            </div>
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
              {allTargets.slice(0, 6).map((t: any) => {
                const done = completedTargetDays.has(t.days)
                const isNext = !done && !allTargets.filter((x: any) => !completedTargetDays.has(x.days)).some((x: any) => x.days < t.days)
                const pct = Math.min(100, Math.round(((user?.streak_current || 0) / t.days) * 100))
                return (
                  <div key={t.days} style={{
                    flexShrink: 0, width: 64,
                    background: done ? t.badge_color + '20' : isNext ? t.badge_color + '10' : '#f7f7f7',
                    borderRadius: 12, padding: '10px 6px',
                    border: `2px solid ${done ? t.badge_color : isNext ? t.badge_color + '60' : '#f0f0f0'}`,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{done ? '✅' : t.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: done ? t.badge_color : isNext ? t.badge_color : '#aaa' }}>
                      {t.days}
                    </div>
                    <div style={{ fontSize: 9, color: done ? t.badge_color : '#aaa', fontWeight: 600 }}>يوم</div>
                    {isNext && !done && (
                      <div style={{ marginTop: 4, height: 3, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: t.badge_color, borderRadius: 99 }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Next target message */}
            {(() => {
              const next = allTargets.find((t: any) => !completedTargetDays.has(t.days))
              if (!next) return null
              const remaining = next.days - (user?.streak_current || 0)
              return (
                <div style={{ marginTop: 10, fontSize: 12, color: '#999', textAlign: 'right' }}>
                  {remaining <= 0 ? '🎉 حققت الهدف!' : `باقي ${remaining} يوم للوصول لـ ${next.days} يوم (${next.title_ar})`}
                </div>
              )
            })()}
          </div>
        )}

        {/* TODAY'S DAILY CHALLENGE */}
        {todayChallenge && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#999', marginBottom:8 }}>
              ⚡ تحدي اليوم — ينتهي في منتصف الليل
            </div>
            <Link href="/challenges" style={{ textDecoration:'none' }}>
              <div style={{
                background: challengeDone ? '#D7FFB8' : 'linear-gradient(135deg,#1CB0F6,#0090CC)',
                borderRadius:18, padding:'16px 18px',
                border: challengeDone ? '2px solid #58CC02' : 'none',
                position:'relative', overflow:'hidden'
              }}>
                {!challengeDone && <div style={{ position:'absolute', top:-15, left:-15, fontSize:60, opacity:0.1 }}>⚔️</div>}
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:48, height:48, borderRadius:14, background: challengeDone ? '#58CC02' : 'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
                    {challengeDone ? '✅' : '⚔️'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, color: challengeDone ? '#27500A' : '#fff', fontSize:15, marginBottom:3 }}>
                      {challengeDone ? 'أكملت تحدي اليوم! 🎉' : todayChallenge.title_ar}
                    </div>
                    <div style={{ fontSize:12, color: challengeDone ? '#58CC02' : 'rgba(255,255,255,0.8)' }}>
                      {challengeDone ? `حصلت على ${todayChallenge.xp_reward} XP` : `3 دقائق فقط · +${todayChallenge.xp_reward} XP`}
                    </div>
                  </div>
                  {!challengeDone && (
                    <div style={{ background:'rgba(255,255,255,0.25)', borderRadius:10, padding:'8px 12px', fontSize:13, fontWeight:800, color:'#fff', flexShrink:0 }}>
                      ابدأ ←
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* STREAK TARGET MODAL */}
        {streakTarget && (
          <StreakTargetModal
            completedTarget={streakTarget}
            nextTarget={nextStreakTarget}
            streak={user?.streak_current || 0}
            onContinue={() => setStreakTarget(null)}
          />
        )}

        {/* AD BANNER */}
        {user && (
          <AdBanner
            userId={user.id}
            enrolledRoadmapSlugs={enrolledSlugs}
            placement="home"
          />
        )}

        {/* QUICK ACTIONS */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { href:'/learn',       icon:'📚', label:'كمّل التعلم',    color:'#58CC02', bg:'#D7FFB8' },
            { href:'/leaderboard', icon:'🏆', label:'لوحة الترتيب',  color:'#1CB0F6', bg:'#DDF4FF' },
            { href:'/challenges',  icon:'⚔️',  label:'التحديات',      color:'#CE82FF', bg:'#F5E6FF' },
            { href:'/profile',     icon:'👤', label:'ملفي الشخصي',   color:'#FF9600', bg:'#FFF5D3' },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{ textDecoration:'none' }}>
              <div style={{ background:a.bg, borderRadius:16, padding:'14px 16px', border:`2px solid ${a.color}20`, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:24 }}>{a.icon}</span>
                <span style={{ fontSize:14, fontWeight:700, color:a.color }}>{a.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* STREAK FREEZE promotion if low streak */}
        {streak >= 3 && streak < 7 && !streakFreeze && (
          <div style={{ background:'#f7f7f7', borderRadius:16, padding:'14px 16px', border:'2px dashed #ddd', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:4 }}>🛡️</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#333', marginBottom:4 }}>Streak Freeze</div>
            <div style={{ fontSize:12, color:'#999' }}>احمِ streak بتاعك لليوم اللي تبقى فيه مشغول</div>
          </div>
        )}

      </div>

      {/* Bottom Nav */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'#fff', borderTop:'2px solid #f0f0f0', display:'flex', padding:'8px 0 16px', zIndex:100, direction:'ltr' }}>
        {[
          { href:'/profile',     icon:'👤', label:'ملفي'     },
          { href:'/leaderboard', icon:'🏆', label:'الترتيب'  },
          { href:'/challenges',  icon:'⚔️',  label:'التحديات'},
          { href:'/learn',       icon:'📚', label:'التعلم'   },
          { href:'/home',        icon:'🏠', label:'الرئيسية', active:true },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, textDecoration:'none', padding:'4px 0', position:'relative' }}>
            {(n as any).active && <div style={{ position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)', width:32, height:3, borderRadius:99, background:'#1CB0F6' }}/>}
            <span style={{ fontSize:22 }}>{n.icon}</span>
            <span style={{ fontSize:10, fontWeight:(n as any).active?800:400, color:(n as any).active?'#1CB0F6':'#aaa' }}>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
