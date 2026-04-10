'use client'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const CHALLENGES = [
  { slug: 'challenge_7',   days: 7,   icon: '🔥', color: '#FF9600', bg: '#FFF0D6', title: 'أسبوع نار',         xp: 100,  coins: 50   },
  { slug: 'challenge_14',  days: 14,  icon: '⚡', color: '#1CB0F6', bg: '#DDF4FF', title: 'أسبوعين متتاليين', xp: 250,  coins: 100  },
  { slug: 'challenge_30',  days: 30,  icon: '💪', color: '#CE82FF', bg: '#F5E6FF', title: 'شهر كامل',          xp: 500,  coins: 200  },
  { slug: 'challenge_100', days: 100, icon: '👑', color: '#FF4B4B', bg: '#FFDFE0', title: '100 يوم أسطوري',    xp: 1500, coins: 500  },
  { slug: 'challenge_365', days: 365, icon: '🏆', color: '#58CC02', bg: '#D7FFB8', title: 'سنة كاملة Legend',  xp: 5000, coins: 2000 },
]

export default function StreakPage() {
  const { user, loading } = useUser()
  const [activeTab, setActiveTab] = useState<'personal' | 'friends'>('personal')
  const [activityDates, setActivityDates] = useState<Set<string>>(new Set())
  const [enrollments, setEnrollments] = useState<Record<string, any>>({})
  const [friends, setFriends] = useState<any[]>([])
  const [viewMonth, setViewMonth] = useState(new Date())
  const [addFriendInput, setAddFriendInput] = useState('')
  const [addFriendType, setAddFriendType] = useState<'email' | 'phone'>('email')
  const [inviteSent, setInviteSent] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    // Load activity dates
    supabase.from('user_daily_activity').select('activity_date').eq('user_id', currentUser.id)
      .then(({ data }) => {
        if (data) setActivityDates(new Set(data.map((d: any) => d.activity_date)))
      })
    // Load enrollments
    supabase.from('user_streak_challenges')
      .select('*, streak_challenges(slug, target_days)')
      .eq('user_id', currentUser.id)
      .then(({ data }) => {
        if (data) {
          const m: Record<string, any> = {}
          data.forEach((e: any) => { if (e.streak_challenges) m[e.streak_challenges.slug] = e })
          setEnrollments(m)
        }
      })
    // Load friends
    supabase.from('friendships')
      .select('*, requester:requester_id(id,full_name,username,streak_current,current_level), addressee:addressee_id(id,full_name,username,streak_current,current_level)')
      .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)
      .eq('status', 'accepted')
      .then(({ data }) => {
        if (data) {
          const f = data.map((fr: any) => fr.requester_id === currentUser.id ? fr.addressee : fr.requester).filter(Boolean)
          setFriends(f)
        }
      })
  }, [user])

  const enrollChallenge = async (slug: string) => {
    if (!user) return
    const ch = await supabase.from('streak_challenges').select('id').eq('slug', slug).single()
    if (!ch.data) return
    await supabase.from('user_streak_challenges').upsert({
      user_id: currentUser.id, challenge_id: ch.data.id, is_active: true, current_day: 0
    }, { onConflict: 'user_id,challenge_id' })
    setEnrollments(prev => ({ ...prev, [slug]: { is_active: true, current_day: 0, completed_at: null } }))
  }

  const sendInvite = async () => {
    if (!user || !addFriendInput.trim()) return
    const type = addFriendInput.includes('@') ? 'email' : 'phone'
    await supabase.from('friend_invites').insert({
      sender_id: currentUser.id, invite_type: type, invite_value: addFriendInput.trim()
    })
    setInviteSent(true)
    setAddFriendInput('')
    setTimeout(() => setInviteSent(false), 3000)
  }

  // Calendar helpers
  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const getFirstDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay()
  const fmt = (d: Date, day: number) => {
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const dd = day.toString().padStart(2, '0')
    return `${d.getFullYear()}-${m}-${dd}`
  }
  const today = new Date()
  const todayStr = fmt(today, today.getDate())
  const DAYS_AR = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']
  const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

  if (!loading && !user) {
    if (typeof window !== 'undefined') window.location.replace('/auth/login')
    return null
  }
  if (loading) return null
  const currentUser = user!

  const currentChallenge = CHALLENGES.find(c => enrollments[c.slug]?.is_active && !enrollments[c.slug]?.completed_at)
  const currentEnrollment = currentChallenge ? enrollments[currentChallenge.slug] : null

  return (
    <div dir="rtl" style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', fontFamily: 'var(--font-sans)', background: '#1a1a1a', color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
        <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>↗</button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>الحماسة</h1>
        <Link href="/home" style={{ color: '#aaa', textDecoration: 'none', fontSize: 20 }}>✕</Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #333' }}>
        {[['personal', 'الشخصية'], ['friends', 'مع الأصدقاء']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key as any)}
            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', color: activeTab === key ? '#1CB0F6' : '#888', fontWeight: activeTab === key ? 700 : 400, fontSize: 15, cursor: 'pointer', borderBottom: activeTab === key ? '2px solid #1CB0F6' : '2px solid transparent', marginBottom: -2, fontFamily: 'var(--font-sans)' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'personal' && (
        <div style={{ padding: '0 0 90px' }}>
          {/* Streak Hero */}
          <div style={{ background: 'linear-gradient(180deg, #FF9600 0%, #E87000 100%)', padding: '28px 24px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={{ fontSize: 72, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>🔥</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '2px 10px', fontSize: 12, marginBottom: 4, display: 'inline-block' }}>رابطة الحماسة</div>
                <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: '#fff' }}>{currentUser.streak_current}</div>
                <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)' }}>يوم حماسة!</div>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div style={{ padding: '20px 16px' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700, textAlign: 'center' }}>تقويم الحماسة</h2>
            <div style={{ background: '#2a2a2a', borderRadius: 16, padding: 16 }}>
              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <button onClick={() => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>‹</button>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{MONTHS_AR[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
                <button onClick={() => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>›</button>
              </div>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
                {DAYS_AR.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 12, color: '#888', padding: '4px 0' }}>{d}</div>)}
              </div>
              {/* Days grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                {Array.from({ length: getFirstDay(viewMonth) }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: getDaysInMonth(viewMonth) }).map((_, i) => {
                  const day = i + 1
                  const dateStr = fmt(viewMonth, day)
                  const isActive = activityDates.has(dateStr)
                  const isToday = dateStr === todayStr
                  return (
                    <div key={day} style={{
                      aspectRatio: '1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: isActive ? 700 : 400,
                      background: isToday ? '#1CB0F6' : isActive ? '#FF9600' : 'transparent',
                      color: isActive || isToday ? '#fff' : '#aaa',
                      border: isToday ? '2px solid #fff' : 'none',
                      position: 'relative'
                    }}>
                      {day}
                      {isActive && !isToday && <span style={{ position: 'absolute', bottom: 1, fontSize: 8 }}>🔥</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Current Challenge Progress */}
          {currentChallenge && currentEnrollment && (
            <div style={{ padding: '0 16px 16px' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>هدف الحماسة</h2>
              <div style={{ background: '#2a2a2a', borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FF9600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📅</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 14, background: '#444', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#FF9600', borderRadius: 99, width: `${Math.min(100, (currentEnrollment.current_day / currentChallenge.days) * 100)}%`, transition: 'width 0.6s' }} />
                    </div>
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FF9600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✅</div>
                </div>
                <div style={{ textAlign: 'left', fontSize: 13, color: '#aaa' }}>{currentEnrollment.current_day} / {currentChallenge.days} يوماً</div>
              </div>
            </div>
          )}

          {/* Streak Challenges */}
          <div style={{ padding: '0 16px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>رابطة الحماسة</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CHALLENGES.map(c => {
                const enrolled = enrollments[c.slug]
                const completed = enrolled?.completed_at
                const active = enrolled?.is_active && !completed
                const pct = active ? Math.min(100, Math.round((enrolled.current_day / c.days) * 100)) : 0
                const canEnroll = !enrolled && currentUser.streak_current > 0
                return (
                  <div key={c.slug} style={{ background: '#2a2a2a', borderRadius: 16, padding: 16, border: `2px solid ${active ? c.color : '#333'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: completed ? c.bg : active ? c.bg : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                        {completed ? '✅' : active ? c.icon : '🔒'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{c.days} يوم</div>
                        <div style={{ fontSize: 13, color: '#aaa', marginBottom: active ? 8 : 0 }}>{c.title}</div>
                        {active && (
                          <div style={{ height: 8, background: '#444', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: c.color, borderRadius: 99, width: `${pct}%`, transition: 'width 0.6s' }} />
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        {completed ? (
                          <span style={{ color: '#58CC02', fontSize: 13, fontWeight: 700 }}>✓ منجز</span>
                        ) : active ? (
                          <span style={{ color: c.color, fontSize: 13, fontWeight: 700 }}>{enrolled.current_day}/{c.days}</span>
                        ) : canEnroll ? (
                          <button onClick={() => enrollChallenge(c.slug)}
                            style={{ background: c.color, border: 'none', borderRadius: 10, padding: '6px 12px', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                            ابدأ
                          </button>
                        ) : (
                          <span style={{ color: '#555', fontSize: 12 }}>مقفلة</span>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <span style={{ background: '#D7FFB8', color: '#27500A', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>+{c.xp} XP</span>
                      <span style={{ background: '#DDF4FF', color: '#1453A3', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>💎 {c.coins}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'friends' && (
        <div style={{ padding: '24px 16px 90px' }}>
          {/* Add Friend */}
          <div style={{ background: '#2a2a2a', borderRadius: 16, padding: 18, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>إضافة صديق</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {(['email', 'phone'] as const).map(t => (
                <button key={t} onClick={() => setAddFriendType(t)}
                  style={{ flex: 1, padding: '8px', borderRadius: 10, border: `2px solid ${addFriendType === t ? '#1CB0F6' : '#444'}`, background: addFriendType === t ? '#1CB0F6' : 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  {t === 'email' ? '📧 بريد' : '📱 تليفون'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={addFriendInput} onChange={e => setAddFriendInput(e.target.value)}
                placeholder={addFriendType === 'email' ? 'أدخل البريد الإلكتروني' : 'أدخل رقم التليفون'}
                style={{ flex: 1, background: '#333', border: '1px solid #444', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none' }} />
              <button onClick={sendInvite}
                style={{ background: '#1CB0F6', border: 'none', borderRadius: 10, padding: '10px 16px', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                دعوة
              </button>
            </div>
            {inviteSent && <div style={{ marginTop: 8, color: '#58CC02', fontSize: 13 }}>✅ تم إرسال الدعوة!</div>}
          </div>

          {/* Friends List */}
          {friends.length > 0 ? (
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>أصدقاؤك</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {friends.map((f: any) => (
                  <div key={f.id} style={{ background: '#2a2a2a', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: '#1CB0F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {(f.full_name?.[0] || f.username?.[0] || '?').toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{f.full_name || f.username}</div>
                      <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>🔥 {f.streak_current || 0} يوم</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#CE82FF', fontWeight: 700 }}>Lv.{f.current_level || 1}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🔥</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>
                ابدأ <span style={{ color: '#1CB0F6' }}>حماسة أصدقاء</span> لتحققا التقدّم سويًا كل يوم!
              </h3>
              <p style={{ color: '#888', fontSize: 14, margin: '0 0 20px' }}>أضف أصدقاءك وتحدّوا بعض على الـ streak</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#1a1a1a', borderTop: '2px solid #333', display: 'flex', padding: '8px 0 16px', zIndex: 100 }}>
        {[
          { href: '/home',        icon: '🏠', label: 'الرئيسية' },
          { href: '/learn',       icon: '📚', label: 'التعلم'   },
          { href: '/challenges',  icon: '⚔️',  label: 'التحديات'},
          { href: '/leaderboard', icon: '🏆', label: 'الترتيب'  },
          { href: '/profile',     icon: '👤', label: 'ملفي'     },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', padding: '4px 0' }}>
            <span style={{ fontSize: 22 }}>{n.icon}</span>
            <span style={{ fontSize: 10, color: '#666' }}>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
