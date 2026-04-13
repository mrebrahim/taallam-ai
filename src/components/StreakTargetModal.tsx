'use client'
import { useEffect, useState } from 'react'

interface Target {
  days: number
  xp_reward: number
  coins_reward: number
  title_ar: string
  description_ar: string
  emoji: string
  badge_color: string
}

interface Props {
  completedTarget: Target       // الـ target اللي اتكمل
  nextTarget: Target | null     // الـ target الجاي
  streak: number                // الـ streak الحالي
  onContinue: () => void
}

export default function StreakTargetModal({ completedTarget, nextTarget, streak, onContinue }: Props) {
  const [phase, setPhase] = useState<'celebrate' | 'next_target'>('celebrate')
  const [countXP, setCountXP] = useState(0)
  const [showParticles, setShowParticles] = useState(false)

  useEffect(() => {
    // Particles burst
    setTimeout(() => setShowParticles(true), 200)

    // Count up XP
    let n = 0
    const interval = setInterval(() => {
      n += Math.ceil(completedTarget.xp_reward / 25)
      if (n >= completedTarget.xp_reward) { setCountXP(completedTarget.xp_reward); clearInterval(interval) }
      else setCountXP(n)
    }, 40)

    // Show next target after 3.5s
    if (nextTarget) {
      setTimeout(() => setPhase('next_target'), 3500)
    }

    return () => clearInterval(interval)
  }, [])

  // Particles
  const PARTICLES = ['🔥','⭐','💎','✨','🎉','🏆','⚡']

  if (phase === 'celebrate') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#1a1a2e',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        direction: 'rtl', padding: 24,
      }}>
        {/* Particles */}
        {showParticles && Array.from({length: 16}).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${5 + (i * 6) % 90}%`,
            top: `${5 + (i * 9) % 40}%`,
            fontSize: `${16 + (i % 3) * 8}px`,
            animation: `rainDown ${1.5 + (i % 3) * 0.5}s ease-out ${i * 0.1}s forwards`,
            opacity: 0,
          }}>
            {PARTICLES[i % PARTICLES.length]}
          </div>
        ))}

        {/* Big badge */}
        <div style={{
          width: 140, height: 140, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${completedTarget.badge_color}dd, ${completedTarget.badge_color}66)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 64,
          boxShadow: `0 0 60px ${completedTarget.badge_color}60, 0 0 120px ${completedTarget.badge_color}30`,
          marginBottom: 24,
          animation: 'popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}>
          {completedTarget.emoji}
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 8px', fontSize: 28, fontWeight: 900,
          color: completedTarget.badge_color, textAlign: 'center',
          textShadow: `0 0 20px ${completedTarget.badge_color}80`,
          animation: 'slideUp 0.5s 0.3s both',
        }}>
          {completedTarget.title_ar}
        </h1>

        {/* Streak number big */}
        <div style={{
          fontSize: 72, fontWeight: 900, color: '#FFD700', lineHeight: 1,
          marginBottom: 8,
          textShadow: '0 0 30px rgba(255,215,0,0.6)',
          animation: 'slideUp 0.5s 0.4s both',
        }}>
          {completedTarget.days}
        </div>
        <div style={{
          fontSize: 20, color: '#FFD700', fontWeight: 700, marginBottom: 24,
          animation: 'slideUp 0.5s 0.5s both',
        }}>
          يوم متواصل 🔥
        </div>

        {/* Description */}
        <div style={{
          background: 'rgba(255,255,255,0.08)', borderRadius: 14,
          padding: '12px 20px', marginBottom: 24,
          animation: 'slideUp 0.5s 0.6s both',
        }}>
          <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center' }}>
            {completedTarget.description_ar}
          </p>
        </div>

        {/* Rewards */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 32,
          animation: 'slideUp 0.5s 0.7s both',
        }}>
          <div style={{
            background: 'rgba(255,150,0,0.2)', borderRadius: 12,
            padding: '12px 20px', textAlign: 'center',
            border: '2px solid rgba(255,150,0,0.4)',
          }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#FF9600' }}>+{countXP}</div>
            <div style={{ fontSize: 12, color: '#FF9600', fontWeight: 600 }}>⚡ XP</div>
          </div>
          {completedTarget.coins_reward > 0 && (
            <div style={{
              background: 'rgba(28,176,246,0.2)', borderRadius: 12,
              padding: '12px 20px', textAlign: 'center',
              border: '2px solid rgba(28,176,246,0.4)',
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#1CB0F6' }}>+{completedTarget.coins_reward}</div>
              <div style={{ fontSize: 12, color: '#1CB0F6', fontWeight: 600 }}>💎 عملة</div>
            </div>
          )}
        </div>

        {/* Continue button */}
        <button onClick={nextTarget ? () => setPhase('next_target') : onContinue} style={{
          width: '100%', maxWidth: 340,
          padding: '16px', borderRadius: 14, border: 'none',
          background: completedTarget.badge_color,
          color: '#fff', fontWeight: 900, fontSize: 17,
          cursor: 'pointer',
          boxShadow: `0 6px 0 ${completedTarget.badge_color}88`,
          animation: 'slideUp 0.5s 0.8s both',
        }}>
          {nextTarget ? 'شوف الـ Target الجاي →' : 'رائع! 🎉'}
        </button>

        <style>{`
          @keyframes rainDown {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(60vh) rotate(720deg); opacity: 0; }
          }
          @keyframes popIn {
            0% { transform: scale(0) rotate(-20deg); opacity: 0; }
            70% { transform: scale(1.15) rotate(5deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  // Next target phase — "اختار هدفك الجاي"
  if (phase === 'next_target' && nextTarget) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#1a1a2e',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        direction: 'rtl', padding: 24,
      }}>
        {/* Mascot */}
        <div style={{
          fontSize: 72, marginBottom: 16,
          animation: 'bounce 0.8s ease infinite alternate',
        }}>🤖</div>

        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, color: '#fff', textAlign: 'center' }}>
          🎯 الـ Target الجاي
        </h2>
        <p style={{ margin: '0 0 28px', fontSize: 15, color: '#94a3b8', textAlign: 'center' }}>
          ركّز على الوصول لـ {nextTarget.days} يوم متواصل!
        </p>

        {/* Next target card */}
        <div style={{
          width: '100%', maxWidth: 340,
          background: `linear-gradient(135deg, ${nextTarget.badge_color}15, ${nextTarget.badge_color}08)`,
          borderRadius: 20, padding: '24px',
          border: `2px solid ${nextTarget.badge_color}40`,
          textAlign: 'center', marginBottom: 24,
          animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{nextTarget.emoji}</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: nextTarget.badge_color, marginBottom: 4 }}>
            {nextTarget.days}
          </div>
          <div style={{ fontSize: 16, color: nextTarget.badge_color, fontWeight: 700, marginBottom: 8 }}>
            يوم متواصل
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 16 }}>
            {nextTarget.description_ar}
          </div>

          {/* Reward preview */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,150,0,0.2)', borderRadius: 8, padding: '6px 14px' }}>
              <span style={{ color: '#FF9600', fontWeight: 800, fontSize: 14 }}>⚡ +{nextTarget.xp_reward} XP</span>
            </div>
            {nextTarget.coins_reward > 0 && (
              <div style={{ background: 'rgba(28,176,246,0.2)', borderRadius: 8, padding: '6px 14px' }}>
                <span style={{ color: '#1CB0F6', fontWeight: 800, fontSize: 14 }}>💎 +{nextTarget.coins_reward}</span>
              </div>
            )}
          </div>
        </div>

        {/* Days remaining */}
        <div style={{
          background: 'rgba(255,255,255,0.06)', borderRadius: 12,
          padding: '12px 20px', marginBottom: 28, textAlign: 'center',
        }}>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>
            باقي <strong style={{ color: '#fff', fontSize: 18 }}>{nextTarget.days - streak}</strong> يوم للوصول للهدف
          </span>
        </div>

        <button onClick={onContinue} style={{
          width: '100%', maxWidth: 340,
          padding: '16px', borderRadius: 14, border: 'none',
          background: nextTarget.badge_color,
          color: '#fff', fontWeight: 900, fontSize: 17,
          cursor: 'pointer',
          boxShadow: `0 6px 0 ${nextTarget.badge_color}88`,
        }}>
          يلا نكمل! 🔥
        </button>

        <style>{`
          @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-10px); } }
          @keyframes popIn {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  return null
}
