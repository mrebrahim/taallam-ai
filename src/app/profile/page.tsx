'use client'
import { useUser } from '@/hooks/useUser'
import { XPBar, StatsRow } from '@/components/gamification'
import { getLevelInfo, LEVELS } from '@/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const { user, loading, signOut } = useUser()
  const [badges, setBadges] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    supabase.from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false })
      .then(({ data }) => setBadges(data || []))
  }, [user])

  if (!loading && !user) { if (typeof window !== "undefined") window.location.replace("/auth/login"); return null }
  if (loading) return <div className="profile-loading">جاري التحميل...</div>
  if (!user) { if (typeof window !== 'undefined') window.location.href = '/auth/login'; return null }

  const levelInfo = getLevelInfo(user.xp_total)
  const planColors = { free: '#888780', pro: '#185FA5', elite: '#BA7517' }
  const planNames  = { free: 'مجاني', pro: 'Pro', elite: 'Elite ⭐' }

  return (
    <div className="profile-page" dir="rtl">

      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-avatar" style={{ background: levelInfo.color }}>
          {user.full_name?.[0] || user.username[0]}
        </div>
        <h1>{user.full_name || user.username}</h1>
        <p className="profile-username">@{user.username}</p>
        <span className="profile-plan-chip"
          style={{ background: planColors[user.subscription_plan] + '22',
                   color: planColors[user.subscription_plan] }}>
          {planNames[user.subscription_plan]}
        </span>
      </div>

      {/* Stats */}
      <div className="profile-card">
        <StatsRow xp={user.xp_total} coins={user.coins_balance} streak={user.streak_current} />
      </div>

      {/* XP / Level */}
      <div className="profile-card profile-card-pad">
        <div className="profile-section-title">تقدم المستوى</div>
        <XPBar xp={user.xp_total} />
        <div className="profile-levels">
          {LEVELS.map(l => (
            <div
              key={l.level}
              className={`profile-level-dot ${user.current_level >= l.level ? 'reached' : ''}`}
              style={user.current_level >= l.level ? { background: l.color } : {}}
              title={l.name_ar}
            />
          ))}
        </div>
        <div className="profile-level-labels">
          {LEVELS.map(l => (
            <span key={l.level} className={`profile-level-name ${user.current_level === l.level ? 'current' : ''}`}
              style={user.current_level === l.level ? { color: l.color } : {}}>
              {l.name_ar}
            </span>
          ))}
        </div>
      </div>

      {/* Streak record */}
      <div className="profile-card profile-card-pad">
        <div className="profile-section-title">إحصائيات الـ Streak</div>
        <div className="profile-streak-row">
          <div className="profile-streak-item">
            <span className="streak-big">🔥 {user.streak_current}</span>
            <span className="streak-lbl">الـ streak الحالي</span>
          </div>
          <div className="profile-streak-item">
            <span className="streak-big">⭐ {user.streak_longest}</span>
            <span className="streak-lbl">أطول streak</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="profile-card profile-card-pad">
        <div className="profile-section-title">الـ Badges ({badges.length})</div>
        {badges.length === 0 ? (
          <p className="profile-empty">أكمل دروساً واربح تحديات لتحصل على badges!</p>
        ) : (
          <div className="badges-grid">
            {badges.map(ub => (
              <div key={ub.id} className="badge-item" title={ub.badges?.description_ar}>
                <div className="badge-icon">{ub.badges?.icon_url || '🏅'}</div>
                <span className="badge-name">{ub.badges?.title_ar}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subscription */}
      <div className="profile-card profile-card-pad">
        <div className="profile-section-title">الاشتراك</div>
        <div className="profile-sub-row">
          <div>
            <strong style={{ color: planColors[user.subscription_plan] }}>
              {planNames[user.subscription_plan]}
            </strong>
            {user.subscription_expires_at && (
              <p className="profile-sub-exp">
                ينتهي: {new Date(user.subscription_expires_at).toLocaleDateString('ar-EG')}
              </p>
            )}
          </div>
          {user.subscription_plan === 'free' && (
            <Link href="/upgrade" className="profile-upgrade-btn">ترقى الآن</Link>
          )}
        </div>
      </div>

      {/* Sign out */}
      <button onClick={signOut} className="profile-signout">تسجيل الخروج</button>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {[
                    { href: '/profile', icon: '👤', label: 'الملف', active: true },
          { href: '/leaderboard', icon: '🏆', label: 'الترتيب' },
          { href: '/challenges', icon: '⚔️', label: 'التحديات' },
          { href: '/learn', icon: '📚', label: 'التعلم' },
          { href: '/home', icon: '🏠', label: 'الرئيسية' },
        ].map(n => (
          <Link key={n.href} href={n.href} className={`nav-item ${(n as any).active ? 'nav-active' : ''}`}>
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
