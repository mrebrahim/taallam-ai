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
    </div>
  )
}
