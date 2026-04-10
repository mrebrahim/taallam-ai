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

  if (!loading && !user) { if (typeof window !== "undefined") window.location.replace("/auth/login"); return null }
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
    </div>
  )
}
