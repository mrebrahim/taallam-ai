'use client'
import { useUser } from '@/hooks/useUser'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  quiz_battle:   { emoji: '⚡', label: 'Quiz Battle',   color: '#378ADD' },
  speed_quiz:    { emoji: '🚀', label: 'Speed Quiz',    color: '#f97316' },
  puzzle:        { emoji: '🧩', label: 'Puzzle',        color: '#8b5cf6' },
  memory_game:   { emoji: '🧠', label: 'Memory Game',  color: '#10b981' },
  ai_mission:    { emoji: '🤖', label: 'AI Mission',    color: '#BA7517' },
}

const DIFF_LABELS = ['', 'سهل', 'متوسط', 'صعب', 'خبير', 'أسطوري']

export default function ChallengesPage() {
  const { user, loading } = useUser()
  const [challenges, setChallenges] = useState<any[]>([])
  const [attempts, setAttempts] = useState<Record<string, any>>({})
  const [fetching, setFetching] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    setFetching(true)

    // Load active challenges
    supabase.from('challenges')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setChallenges(data || [])
        setFetching(false)
      })

    // Load user attempts
    supabase.from('user_challenge_attempts')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, any> = {}
          data.forEach(a => { map[a.challenge_id] = a })
          setAttempts(map)
        }
      })
  }, [user])

  if (loading) return <div className="ch-loading">جاري التحميل...</div>
  if (!user) { if (typeof window !== 'undefined') window.location.href = '/auth/login'; return null }

  const completed = Object.values(attempts).filter(a => a.completed).length

  return (
    <div className="ch-page" dir="rtl">
      <header className="ch-header">
        <div>
          <h1>التحديات ⚔️</h1>
          <p>{completed} مكتمل هذا الأسبوع</p>
        </div>
        <div className="ch-completed-badge">
          {completed}/{challenges.length}
        </div>
      </header>

      {/* Weekly progress */}
      <div className="ch-week-bar">
        <div className="ch-week-fill"
          style={{ width: `${challenges.length ? (completed / challenges.length) * 100 : 0}%` }} />
      </div>

      {/* Challenges list */}
      {fetching ? (
        <div className="ch-loading">جاري التحميل...</div>
      ) : challenges.length === 0 ? (
        <div className="ch-empty">
          <div className="ch-empty-icon">🤖</div>
          <p>AI بيولد تحديات جديدة...</p>
          <p className="ch-empty-sub">ارجع بكره لتشوف تحديات هذا الأسبوع!</p>
        </div>
      ) : (
        <div className="ch-list">
          {challenges.map(ch => {
            const meta = TYPE_META[ch.challenge_type] || { emoji: '🎯', label: ch.challenge_type, color: '#888780' }
            const attempt = attempts[ch.id]
            const done = attempt?.completed
            const isExpired = ch.ends_at && new Date(ch.ends_at) < new Date()

            return (
              <div key={ch.id} className={`ch-card ${done ? 'ch-card-done' : ''} ${isExpired ? 'ch-card-expired' : ''}`}>
                <div className="ch-card-icon" style={{ background: meta.color + '22' }}>
                  <span>{meta.emoji}</span>
                </div>
                <div className="ch-card-body">
                  <div className="ch-card-top">
                    <span className="ch-card-title">{ch.title_ar}</span>
                    {ch.ai_generated && <span className="ch-ai-badge">🤖 AI</span>}
                  </div>
                  <div className="ch-card-meta">
                    <span className="ch-type" style={{ color: meta.color }}>{meta.label}</span>
                    <span className="ch-dot">·</span>
                    <span className="ch-diff">{DIFF_LABELS[ch.difficulty] || 'متوسط'}</span>
                    {ch.ends_at && (
                      <>
                        <span className="ch-dot">·</span>
                        <span className="ch-ends">
                          {isExpired ? 'انتهى' : `ينتهي ${new Date(ch.ends_at).toLocaleDateString('ar-EG')}`}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="ch-rewards">
                    <span className="ch-reward">+{ch.xp_reward} XP</span>
                    <span className="ch-reward">🪙 {ch.coins_reward}</span>
                    {attempt && !done && (
                      <span className="ch-score">نقاطك: {attempt.score}</span>
                    )}
                  </div>
                </div>
                <div className="ch-card-action">
                  {done ? (
                    <div className="ch-done-check">✓</div>
                  ) : isExpired ? (
                    <div className="ch-expired-text">منتهي</div>
                  ) : (
                    <button
                      className="ch-start-btn"
                      style={{ background: meta.color }}
                      onClick={() => alert('قريباً — الـ quiz engine تحت البناء!')}
                    >
                      ابدأ
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {[
          { href: '/home',        icon: '🏠', label: 'الرئيسية' },
          { href: '/learn',       icon: '📚', label: 'التعلم' },
          { href: '/challenges',  icon: '⚔️', label: 'التحديات', active: true },
          { href: '/leaderboard', icon: '🏆', label: 'الترتيب' },
          { href: '/profile',     icon: '👤', label: 'الملف' },
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
        .ch-page { max-width: 480px; margin: 0 auto; padding: 20px 16px 90px; font-family: var(--font-sans); }
        .ch-loading { min-height: 200px; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); font-family: var(--font-sans); }
        .ch-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .ch-header h1 { margin: 0 0 2px; font-size: 24px; font-weight: 700; color: var(--color-text-primary); }
        .ch-header p { margin: 0; font-size: 13px; color: var(--color-text-secondary); }
        .ch-completed-badge { width: 52px; height: 52px; border-radius: 14px; background: #EEEDFE; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: #534AB7; }
        .ch-week-bar { height: 6px; background: var(--color-background-secondary); border-radius: 99px; margin-bottom: 24px; overflow: hidden; }
        .ch-week-fill { height: 100%; background: #7F77DD; border-radius: 99px; transition: width 0.6s ease; }
        .ch-list { display: flex; flex-direction: column; gap: 10px; }
        .ch-card { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--color-background-primary); border: 1px solid var(--color-border-tertiary); border-radius: 16px; transition: opacity 0.2s; }
        .ch-card-done { opacity: 0.65; }
        .ch-card-expired { opacity: 0.45; }
        .ch-card-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .ch-card-body { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .ch-card-top { display: flex; align-items: center; gap: 6px; }
        .ch-card-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
        .ch-ai-badge { font-size: 10px; background: var(--color-background-secondary); padding: 1px 6px; border-radius: 99px; color: var(--color-text-tertiary); }
        .ch-card-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-text-tertiary); }
        .ch-type { font-weight: 500; }
        .ch-dot { opacity: 0.4; }
        .ch-rewards { display: flex; gap: 8px; margin-top: 2px; }
        .ch-reward { font-size: 11px; font-weight: 600; color: #7F77DD; background: #EEEDFE; padding: 2px 7px; border-radius: 99px; }
        .ch-score { font-size: 11px; color: var(--color-text-tertiary); }
        .ch-card-action { flex-shrink: 0; }
        .ch-start-btn { padding: 8px 14px; border: none; border-radius: 10px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font-sans); transition: opacity 0.15s; }
        .ch-start-btn:hover { opacity: 0.88; }
        .ch-done-check { width: 36px; height: 36px; border-radius: 50%; background: #EAF3DE; display: flex; align-items: center; justify-content: center; color: #27500A; font-size: 18px; font-weight: 700; }
        .ch-expired-text { font-size: 11px; color: var(--color-text-tertiary); }
        .ch-empty { text-align: center; padding: 60px 20px; }
        .ch-empty-icon { font-size: 48px; margin-bottom: 12px; }
        .ch-empty p { margin: 0 0 6px; font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
        .ch-empty-sub { font-size: 13px; color: var(--color-text-secondary); }
        .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: var(--color-background-primary); border-top: 1px solid var(--color-border-tertiary); display: flex; padding: 8px 0 12px; z-index: 100; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; padding: 4px 0; }
        .nav-icon { font-size: 20px; }
        .nav-label { font-size: 10px; color: var(--color-text-tertiary); }
        .nav-active .nav-label { color: #7F77DD; font-weight: 600; }
      `}</style>
    </div>
  )
}
