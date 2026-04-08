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

      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--color-background-tertiary); }
        .lb-page { max-width: 480px; margin: 0 auto; padding: 20px 16px 90px; font-family: var(--font-sans); }
        .lb-loading, .lb-fetching { min-height: 200px; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); font-family: var(--font-sans); }
        .lb-header { margin-bottom: 20px; display: flex; align-items: baseline; justify-content: space-between; }
        .lb-header h1 { margin: 0; font-size: 24px; font-weight: 700; color: var(--color-text-primary); }
        .lb-my-rank { margin: 0; font-size: 14px; font-weight: 600; color: #7F77DD; }
        .lb-tabs { display: flex; background: var(--color-background-secondary); border-radius: 12px; padding: 4px; margin-bottom: 20px; gap: 4px; }
        .lb-tab { flex: 1; padding: 8px 4px; border: none; background: none; font-size: 13px; color: var(--color-text-secondary); border-radius: 8px; cursor: pointer; font-family: var(--font-sans); transition: all 0.15s; }
        .lb-tab-active { background: var(--color-background-primary); color: var(--color-text-primary); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .lb-podium { display: flex; align-items: flex-end; justify-content: center; gap: 8px; margin-bottom: 24px; padding: 16px; background: var(--color-background-primary); border-radius: 20px; border: 1px solid var(--color-border-tertiary); }
        .podium-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .podium-medal { font-size: 22px; }
        .podium-avatar { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; }
        .podium-name { font-size: 11px; font-weight: 600; color: var(--color-text-primary); text-align: center; }
        .podium-xp { font-size: 10px; color: var(--color-text-tertiary); }
        .podium-bar { width: 100%; border-radius: 6px 6px 0 0; }
        .lb-list { display: flex; flex-direction: column; gap: 6px; }
        .lb-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--color-background-primary); border: 1px solid var(--color-border-tertiary); border-radius: 14px; }
        .lb-row-me { border-color: #7F77DD; background: #EEEDFE; }
        .lb-rank { font-size: 14px; font-weight: 700; color: var(--color-text-tertiary); min-width: 32px; text-align: center; }
        .lb-avatar { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .lb-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .lb-username { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
        .lb-you-badge { font-size: 10px; background: #7F77DD; color: #fff; padding: 1px 6px; border-radius: 99px; margin-right: 4px; }
        .lb-level { font-size: 11px; color: var(--color-text-tertiary); }
        .lb-xp { font-size: 14px; font-weight: 700; color: var(--color-text-primary); }
        .lb-xp small { font-size: 10px; color: var(--color-text-tertiary); font-weight: 400; }
        .lb-empty { text-align: center; padding: 40px 20px; color: var(--color-text-secondary); font-size: 14px; line-height: 1.8; }
        .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: var(--color-background-primary); border-top: 1px solid var(--color-border-tertiary); display: flex; padding: 8px 0 12px; z-index: 100; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; padding: 4px 0; }
        .nav-icon { font-size: 20px; }
        .nav-label { font-size: 10px; color: var(--color-text-tertiary); }
        .nav-active .nav-label { color: #7F77DD; font-weight: 600; }
      `}</style>
    </div>
  )
}
