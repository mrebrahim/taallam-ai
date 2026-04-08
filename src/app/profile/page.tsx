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
          { href: '/home',        icon: '🏠', label: 'الرئيسية' },
          { href: '/learn',       icon: '📚', label: 'التعلم' },
          { href: '/challenges',  icon: '⚔️', label: 'التحديات' },
          { href: '/leaderboard', icon: '🏆', label: 'الترتيب' },
          { href: '/profile',     icon: '👤', label: 'الملف', active: true },
        ].map(n => (
          <Link key={n.href} href={n.href} className={`nav-item ${(n as any).active ? 'nav-active' : ''}`}>
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
          </Link>
        ))}
      </nav>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--color-background-tertiary); }
        .profile-page { max-width: 480px; margin: 0 auto; padding: 20px 16px 90px; font-family: var(--font-sans); }
        .profile-loading { min-height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); font-family: var(--font-sans); }
        .profile-hero { text-align: center; padding: 24px 16px 20px; }
        .profile-avatar { width: 72px; height: 72px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 700; color: #fff; margin: 0 auto 12px; }
        .profile-hero h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; color: var(--color-text-primary); }
        .profile-username { margin: 0 0 10px; font-size: 13px; color: var(--color-text-tertiary); }
        .profile-plan-chip { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 13px; font-weight: 600; }
        .profile-card { background: var(--color-background-primary); border: 1px solid var(--color-border-tertiary); border-radius: 18px; margin-bottom: 12px; overflow: hidden; }
        .profile-card-pad { padding: 18px; }
        .profile-section-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 14px; }
        .profile-levels { display: flex; gap: 6px; margin-top: 12px; justify-content: center; }
        .profile-level-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--color-background-secondary); border: 2px solid var(--color-border-secondary); transition: background 0.3s; }
        .profile-level-dot.reached { border-color: transparent; }
        .profile-level-labels { display: flex; justify-content: space-between; margin-top: 6px; }
        .profile-level-name { font-size: 9px; color: var(--color-text-tertiary); text-align: center; flex: 1; }
        .profile-level-name.current { font-weight: 700; }
        .profile-streak-row { display: flex; gap: 16px; }
        .profile-streak-item { flex: 1; text-align: center; padding: 12px; background: var(--color-background-secondary); border-radius: 12px; }
        .streak-big { display: block; font-size: 22px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 4px; }
        .streak-lbl { font-size: 11px; color: var(--color-text-tertiary); }
        .badges-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .badge-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .badge-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--color-background-secondary); display: flex; align-items: center; justify-content: center; font-size: 22px; }
        .badge-name { font-size: 10px; color: var(--color-text-secondary); text-align: center; line-height: 1.3; }
        .profile-empty { font-size: 13px; color: var(--color-text-tertiary); text-align: center; margin: 4px 0; }
        .profile-sub-row { display: flex; align-items: center; justify-content: space-between; }
        .profile-sub-row strong { font-size: 16px; }
        .profile-sub-exp { margin: 4px 0 0; font-size: 12px; color: var(--color-text-tertiary); }
        .profile-upgrade-btn { background: #7F77DD; color: #fff; border: none; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
        .profile-signout { display: block; width: 100%; margin-bottom: 12px; padding: 13px; background: none; border: 1px solid var(--color-border-secondary); border-radius: 14px; color: var(--color-text-secondary); font-size: 14px; cursor: pointer; }
        .profile-signout:hover { background: var(--color-background-secondary); }
        .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: var(--color-background-primary); border-top: 1px solid var(--color-border-tertiary); display: flex; padding: 8px 0 12px; z-index: 100; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; padding: 4px 0; }
        .nav-icon { font-size: 20px; }
        .nav-label { font-size: 10px; color: var(--color-text-tertiary); }
        .nav-active .nav-label { color: #7F77DD; font-weight: 600; }
      `}</style>
    </div>
  )
}
