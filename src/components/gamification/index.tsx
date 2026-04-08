'use client'
import { LEVELS, getLevelInfo, getXPToNextLevel } from '@/types'

// ── XP Progress Bar ──
export function XPBar({ xp, size = 'md' }: { xp: number; size?: 'sm' | 'md' }) {
  const level = getLevelInfo(xp)
  const nextLevel = LEVELS.find(l => l.level === level.level + 1)
  const prevXP = level.xp_min
  const nextXP = nextLevel?.xp_min ?? xp
  const progress = nextLevel ? Math.min(100, ((xp - prevXP) / (nextXP - prevXP)) * 100) : 100
  const toNext = getXPToNextLevel(xp)

  return (
    <div className={`xp-bar xp-bar-${size}`}>
      <div className="xp-bar-labels">
        <span className="xp-label">Level {level.level} — {level.name_ar}</span>
        {nextLevel && <span className="xp-label-next">{toNext} XP للمستوى التالي</span>}
      </div>
      <div className="xp-track">
        <div
          className="xp-fill"
          style={{ width: `${progress}%`, background: level.color }}
        />
      </div>
      <style jsx>{`
        .xp-bar { width: 100%; }
        .xp-bar-labels { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .xp-label { font-size: ${size === 'sm' ? '11px' : '13px'}; font-weight: 500; color: var(--color-text-primary); }
        .xp-label-next { font-size: ${size === 'sm' ? '10px' : '12px'}; color: var(--color-text-tertiary); }
        .xp-track { height: ${size === 'sm' ? '6px' : '8px'}; background: var(--color-background-secondary); border-radius: 99px; overflow: hidden; }
        .xp-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
      `}</style>
    </div>
  )
}

// ── Streak Counter ──
export function StreakCounter({ streak }: { streak: number }) {
  return (
    <div className="streak-pill">
      <span className="streak-fire">🔥</span>
      <span className="streak-count">{streak}</span>
      <style jsx>{`
        .streak-pill {
          display: inline-flex; align-items: center; gap: 4px;
          background: #FAEEDA; border-radius: 99px;
          padding: 5px 12px;
        }
        .streak-fire { font-size: 16px; }
        .streak-count { font-size: 15px; font-weight: 700; color: #633806; }
      `}</style>
    </div>
  )
}

// ── Coin Balance ──
export function CoinBalance({ coins }: { coins: number }) {
  return (
    <div className="coin-pill">
      <span className="coin-icon">🪙</span>
      <span className="coin-count">{coins.toLocaleString()}</span>
      <style jsx>{`
        .coin-pill {
          display: inline-flex; align-items: center; gap: 4px;
          background: #FAEEDA; border-radius: 99px;
          padding: 5px 12px;
        }
        .coin-icon { font-size: 15px; }
        .coin-count { font-size: 14px; font-weight: 700; color: #633806; }
      `}</style>
    </div>
  )
}

// ── Level Badge ──
export function LevelBadge({ level, xp }: { level: number; xp: number }) {
  const info = getLevelInfo(xp)
  return (
    <div className="level-badge" style={{ background: info.color }}>
      <span className="level-num">{level}</span>
      <style jsx>{`
        .level-badge {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
        }
        .level-num { color: #fff; font-size: 16px; font-weight: 700; }
      `}</style>
    </div>
  )
}

// ── Stats Row (used in profile + home) ──
export function StatsRow({ xp, coins, streak }: { xp: number; coins: number; streak: number }) {
  return (
    <div className="stats-row">
      <div className="stat-item">
        <span className="stat-value">{xp.toLocaleString()}</span>
        <span className="stat-label">XP</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value">{coins.toLocaleString()}</span>
        <span className="stat-label">كوين</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value">{streak}</span>
        <span className="stat-label">streak 🔥</span>
      </div>
      <style jsx>{`
        .stats-row { display: flex; align-items: center; gap: 0; }
        .stat-item { flex: 1; text-align: center; padding: 12px 8px; }
        .stat-value { display: block; font-size: 20px; font-weight: 700; color: var(--color-text-primary); }
        .stat-label { display: block; font-size: 12px; color: var(--color-text-tertiary); margin-top: 2px; }
        .stat-divider { width: 1px; height: 36px; background: var(--color-border-tertiary); }
      `}</style>
    </div>
  )
}
