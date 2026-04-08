'use client'
import { useUser } from '@/hooks/useUser'
import { getLevelInfo } from '@/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Period = 'weekly' | 'monthly' | 'all_time'

const PERIOD_LABELS: Record<Period, string> = {
  weekly: 'هذا الأسبوع',
  monthly: 'هذا الشهر',
  all_time: 'كل الوقت',
}

function getPeriodKey(period: Period): string {
  const now = new Date()
  if (period === 'weekly') {
    const week = Math.ceil(now.getDate() / 7)
    return `${now.getFullYear()}-W${String(now.getMonth() + 1).padStart(2, '0')}${week}`
  }
  if (period === 'monthly') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return 'all'
}

export default function LeaderboardPage() {
  const { user, loading } = useUser()
  const [period, setPeriod] = useState<Period>('weekly')
  const [entries, setEntries] = useState<any[]>([])
  const [fetching, setFetching] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    setFetching(true)
    supabase
      .from('leaderboard_entries')
      .select('*, users(username, avatar_url, current_level, xp_total)')
      .eq('period_type', period)
      .eq('period_key', getPeriodKey(period))
      .order('xp_earned', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setEntries(data || [])
        setFetching(false)
      })
  }, [user, period])

  if (loading) return <div className="lb-loading">جاري التحميل...</div>
  if (!user) { if (typeof window !== 'undefined') window.location.href = '/auth/login'; return null }

  const myRank = entries.findIndex(e => e.user_id === user.id) + 1

  return (
    <div className="lb-page" dir="rtl">
      <header className="lb-header">
        <h1>الترتيب 🏆</h1>
        {myRank > 0 && <p className="lb-my-rank">ترتيبك: #{myRank}</p>}
      </header>

      {/* Period Tabs */}
      <div className="lb-tabs">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            className={`lb-tab ${period === p ? 'lb-tab-active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div className="lb-podium">
          {[entries[1], entries[0], entries[2]].map((e, i) => {
            if (!e) return null
            const pos = i === 1 ? 1 : i === 0 ? 2 : 3
            const lvl = getLevelInfo(e.users?.xp_total || 0)
            const heights = ['80px', '104px', '68px']
            const medals = ['🥈', '🥇', '🥉']
            return (
              <div key={e.id} className="podium-item">
                <span className="podium-medal">{medals[i]}</span>
                <div className="podium-avatar" style={{ background: lvl.color }}>
                  {e.users?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="podium-name">{e.users?.username}</span>
                <span className="podium-xp">{e.xp_earned.toLocaleString()} XP</span>
                <div className="podium-bar" style={{ height: heights[i], background: lvl.color + '33', borderTop: `3px solid ${lvl.color}` }} />
              </div>
            )
          })}
        </div>
      )}

      {/* Full list */}
      {fetching ? (
        <div className="lb-fetching">جاري التحميل...</div>
      ) : entries.length === 0 ? (
        <div className="lb-empty">
          <p>لا يوجد بيانات لهذه الفترة بعد.</p>
          <p>أكمل دروساً واربح XP لتظهر في الترتيب!</p>
        </div>
      ) : (
        <div className="lb-list">
          {entries.map((e, idx) => {
            const isMe = e.user_id === user.id
            const lvl = getLevelInfo(e.users?.xp_total || 0)
            const rank = idx + 1
            return (
              <div key={e.id} className={`lb-row ${isMe ? 'lb-row-me' : ''}`}>
                <span className="lb-rank" style={rank <= 3 ? { color: ['#BA7517','#888780','#D85A30'][rank-1] } : {}}>
                  #{rank}
                </span>
                <div className="lb-avatar" style={{ background: lvl.color }}>
                  {e.users?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="lb-info">
                  <span className="lb-username">
                    {e.users?.username}
                    {isMe && <span className="lb-you-badge"> أنت</span>}
                  </span>
                  <span className="lb-level">Lv.{e.users?.current_level} · {lvl.name_ar}</span>
                </div>
                <span className="lb-xp">{e.xp_earned.toLocaleString()} <small>XP</small></span>
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
          { href: '/challenges',  icon: '⚔️', label: 'التحديات' },
          { href: '/leaderboard', icon: '🏆', label: 'الترتيب', active: true },
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
