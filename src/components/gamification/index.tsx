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
    </div>
  )
}

// ── Streak Counter ──
export function StreakCounter({ streak }: { streak: number }) {
  return (
    <div className="streak-pill">
      <span className="streak-fire">🔥</span>
      <span className="streak-count">{streak}</span>
    </div>
  )
}

// ── Coin Balance ──
export function CoinBalance({ coins }: { coins: number }) {
  return (
    <div className="coin-pill">
      <span className="coin-icon">🪙</span>
      <span className="coin-count">{coins.toLocaleString()}</span>
    </div>
  )
}

// ── Level Badge ──
export function LevelBadge({ level, xp }: { level: number; xp: number }) {
  const info = getLevelInfo(xp)
  return (
    <div className="level-badge" style={{ background: info.color }}>
      <span className="level-num">{level}</span>
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
    </div>
  )
}
