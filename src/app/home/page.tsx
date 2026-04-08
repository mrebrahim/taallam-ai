'use client'
import { useUser } from '@/hooks/useUser'
import { XPBar, StreakCounter, CoinBalance, StatsRow } from '@/components/gamification'
import { getLevelInfo } from '@/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ROADMAP_META = {
  n8n_automation: { emoji: '⚡', color: '#10b981', label: 'أتمتة n8n' },
  ai_video:       { emoji: '🎬', color: '#f97316', label: 'AI Video' },
  vibe_coding:    { emoji: '💻', color: '#8b5cf6', label: 'Vibe Coding' },
}

export default function HomePage() {
  const { user, loading, signOut } = useUser()
  const [missions, setMissions] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    supabase
      .from('daily_missions')
      .select('*')
      .eq('user_id', user.id)
      .eq('mission_date', new Date().toISOString().split('T')[0])
      .then(({ data }) => setMissions(data || []))
  }, [user])

  if (loading) return <div className="home-loading">جاري التحميل...</div>
  if (!user) { if (typeof window !== 'undefined') window.location.href = '/auth/login'; return null }

  const levelInfo = getLevelInfo(user.xp_total)

  return (
    <div className="home-page" dir="rtl">

      {/* ── Top Bar ── */}
      <header className="home-header">
        <div className="home-header-left">
          <StreakCounter streak={user.streak_current} />
          <CoinBalance coins={user.coins_balance} />
        </div>
        <button onClick={signOut} className="home-signout">خروج</button>
      </header>

      {/* ── Hero Card ── */}
      <section className="home-hero">
        <div className="home-avatar" style={{ background: levelInfo.color }}>
          {user.full_name?.[0] || user.username[0]}
        </div>
        <div className="home-hero-info">
          <h1>أهلاً، {user.full_name?.split(' ')[0] || user.username}!</h1>
          <p style={{ color: levelInfo.color }}>Level {user.current_level} — {levelInfo.name_ar}</p>
        </div>
        {user.subscription_plan !== 'free' && (
          <span className="home-plan-badge">
            {user.subscription_plan === 'elite' ? '⭐ Elite' : '🔵 Pro'}
          </span>
        )}
      </section>

      {/* ── XP Bar ── */}
      <section className="home-section">
        <XPBar xp={user.xp_total} />
      </section>

      {/* ── Stats ── */}
      <section className="home-card">
        <StatsRow xp={user.xp_total} coins={user.coins_balance} streak={user.streak_current} />
      </section>

      {/* ── Daily Missions ── */}
      <section className="home-section">
        <div className="home-section-title">
          <span>مهام اليوم</span>
          <span className="home-section-sub">{missions.filter(m => m.completed).length}/{missions.length}</span>
        </div>
        {missions.length === 0 ? (
          <div className="home-empty-missions">لا توجد مهام اليوم — ابدأ درساً لإنشاء مهام!</div>
        ) : (
          <div className="home-missions-list">
            {missions.map(m => (
              <div key={m.id} className={`mission-item ${m.completed ? 'mission-done' : ''}`}>
                <span className="mission-check">{m.completed ? '✓' : '○'}</span>
                <span className="mission-text">
                  {m.mission_type === 'complete_lesson' && 'أكمل درساً'}
                  {m.mission_type === 'win_quiz' && 'اربح في quiz'}
                  {m.mission_type === 'join_challenge' && 'شارك في تحدي'}
                </span>
                <span className="mission-xp">+{m.xp_reward} XP</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Quick Start — 3 Roadmaps ── */}
      <section className="home-section">
        <div className="home-section-title">ابدأ التعلم</div>
        <div className="home-roadmaps">
          {Object.entries(ROADMAP_META).map(([slug, meta]) => (
            <Link href={`/learn?roadmap=${slug}`} key={slug} className="roadmap-quick-card">
              <span className="roadmap-quick-emoji" style={{ background: meta.color + '22' }}>
                {meta.emoji}
              </span>
              <span className="roadmap-quick-label">{meta.label}</span>
              <span className="roadmap-quick-arrow">←</span>
              <style jsx>{`
                .roadmap-quick-card {
                  display: flex; align-items: center; gap: 12px;
                  background: var(--color-background-primary);
                  border: 1px solid var(--color-border-tertiary);
                  border-radius: 14px; padding: 14px 16px;
                  text-decoration: none; color: var(--color-text-primary);
                  transition: border-color 0.15s;
                }
                .roadmap-quick-card:hover { border-color: ${meta.color}; }
                .roadmap-quick-emoji {
                  width: 40px; height: 40px; border-radius: 10px;
                  display: flex; align-items: center; justify-content: center;
                  font-size: 20px; flex-shrink: 0;
                }
                .roadmap-quick-label { flex: 1; font-size: 15px; font-weight: 500; }
                .roadmap-quick-arrow { color: var(--color-text-tertiary); font-size: 18px; }
              `}</style>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Upgrade CTA (free users only) ── */}
      {user.subscription_plan === 'free' && (
        <Link href="/upgrade" className="home-upgrade-cta">
          <span>🚀</span>
          <div>
            <strong>ترقى لـ Pro</strong>
            <p>XP مضاعف + دروس غير محدودة</p>
          </div>
          <span className="cta-arrow">←</span>
        </Link>
      )}

      {/* ── Bottom Nav ── */}
      <nav className="bottom-nav">
        {[
          { href: '/home',        icon: '🏠', label: 'الرئيسية' },
          { href: '/learn',       icon: '📚', label: 'التعلم' },
          { href: '/challenges',  icon: '⚔️', label: 'التحديات' },
          { href: '/leaderboard', icon: '🏆', label: 'الترتيب' },
          { href: '/profile',     icon: '👤', label: 'الملف' },
        ].map(n => (
          <Link key={n.href} href={n.href} className="nav-item">
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
          </Link>
        ))}
      </nav>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--color-background-tertiary); }
        .home-page { max-width: 480px; margin: 0 auto; padding: 16px 16px 90px; font-family: var(--font-sans); }
        .home-loading { min-height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); font-family: var(--font-sans); }
        .home-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding: 4px 0; }
        .home-header-left { display: flex; align-items: center; gap: 8px; }
        .home-signout { background: none; border: none; font-size: 13px; color: var(--color-text-tertiary); cursor: pointer; padding: 6px; }
        .home-hero { display: flex; align-items: center; gap: 14px; background: var(--color-background-primary); border-radius: 18px; padding: 20px; margin-bottom: 12px; border: 1px solid var(--color-border-tertiary); position: relative; }
        .home-avatar { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .home-hero-info h1 { margin: 0 0 4px; font-size: 18px; font-weight: 600; color: var(--color-text-primary); }
        .home-hero-info p { margin: 0; font-size: 13px; font-weight: 500; }
        .home-plan-badge { position: absolute; top: 14px; left: 14px; font-size: 12px; font-weight: 600; background: var(--color-background-secondary); padding: 3px 8px; border-radius: 99px; color: var(--color-text-secondary); }
        .home-section { margin-bottom: 20px; }
        .home-card { background: var(--color-background-primary); border: 1px solid var(--color-border-tertiary); border-radius: 18px; margin-bottom: 20px; overflow: hidden; }
        .home-section-title { display: flex; align-items: center; justify-content: space-between; font-size: 16px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 12px; }
        .home-section-sub { font-size: 13px; font-weight: 400; color: var(--color-text-tertiary); }
        .home-roadmaps { display: flex; flex-direction: column; gap: 8px; }
        .home-empty-missions { text-align: center; padding: 20px; font-size: 14px; color: var(--color-text-tertiary); background: var(--color-background-primary); border-radius: 14px; border: 1px solid var(--color-border-tertiary); }
        .home-missions-list { display: flex; flex-direction: column; gap: 8px; }
        .mission-item { display: flex; align-items: center; gap: 10px; background: var(--color-background-primary); border: 1px solid var(--color-border-tertiary); border-radius: 12px; padding: 12px 14px; }
        .mission-done { opacity: 0.6; }
        .mission-check { font-size: 16px; color: #1D9E75; font-weight: 700; width: 20px; text-align: center; }
        .mission-text { flex: 1; font-size: 14px; color: var(--color-text-primary); }
        .mission-xp { font-size: 12px; font-weight: 600; color: #7F77DD; }
        .home-upgrade-cta { display: flex; align-items: center; gap: 14px; background: linear-gradient(135deg, #534AB7, #7F77DD); border-radius: 18px; padding: 18px 20px; margin-bottom: 20px; text-decoration: none; }
        .home-upgrade-cta span:first-child { font-size: 24px; }
        .home-upgrade-cta strong { display: block; color: #fff; font-size: 16px; margin-bottom: 2px; }
        .home-upgrade-cta p { margin: 0; color: #CECBF6; font-size: 13px; }
        .cta-arrow { color: #CECBF6; font-size: 20px; margin-right: auto; }
        .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: var(--color-background-primary); border-top: 1px solid var(--color-border-tertiary); display: flex; padding: 8px 0 12px; z-index: 100; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; padding: 4px 0; }
        .nav-icon { font-size: 20px; }
        .nav-label { font-size: 10px; color: var(--color-text-tertiary); }
      `}</style>
    </div>
  )
}
