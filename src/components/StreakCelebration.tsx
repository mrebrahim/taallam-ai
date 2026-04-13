'use client'
import { useEffect, useState } from 'react'

interface Props {
  streak: number
  xpEarned: number
  accuracy?: number       // 0-100
  timeSeconds?: number
  onContinue: () => void
}

export default function StreakCelebration({ streak, xpEarned, accuracy = 93, timeSeconds = 307, onContinue }: Props) {
  const [phase, setPhase] = useState<'fire' | 'stats'>('fire')
  const [displayStreak, setDisplayStreak] = useState(streak - 1)
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    // Phase 1: show fire mascot with old streak number
    const t1 = setTimeout(() => {
      // Animate streak number going up
      setDisplayStreak(streak)
    }, 600)

    // Phase 2: show stats card
    const t2 = setTimeout(() => {
      setPhase('stats')
      setTimeout(() => setShowStats(true), 100)
    }, 2200)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [streak])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Streak phase
  if (phase === 'fire') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#1a1a2e', zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', direction: 'rtl',
      }}>
        {/* Particles */}
        {Array.from({length: 8}).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${20 + Math.random() * 60}%`,
            top: `${10 + Math.random() * 40}%`,
            width: 8, height: 8, borderRadius: '50%',
            background: '#FFD700',
            animation: `particle ${0.8 + i * 0.2}s ease-out infinite`,
            opacity: 0.6,
          }} />
        ))}

        {/* Fire Mascot */}
        <div style={{ position: 'relative', marginBottom: 32 }}>
          {/* Glow */}
          <div style={{
            position: 'absolute', inset: -30,
            background: 'radial-gradient(circle, rgba(255,150,0,0.4) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'glow 1.5s ease-in-out infinite alternate',
          }} />
          {/* Fire emoji mascot */}
          <div style={{
            width: 160, height: 160,
            background: 'radial-gradient(circle at 40% 35%, #FFD700 0%, #FF9600 40%, #FF4500 80%)',
            borderRadius: '50% 50% 45% 45%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 72,
            boxShadow: '0 0 60px rgba(255,150,0,0.6), 0 0 120px rgba(255,100,0,0.3)',
            animation: 'pulse 1s ease-in-out infinite alternate',
            position: 'relative', zIndex: 1,
          }}>
            🔥
          </div>
        </div>

        {/* Streak number */}
        <div style={{
          fontSize: displayStreak === streak ? 96 : 80,
          fontWeight: 900,
          color: '#FFD700',
          textShadow: '0 0 40px rgba(255,215,0,0.8)',
          lineHeight: 1,
          marginBottom: 8,
          transition: 'font-size 0.3s, color 0.3s',
          animation: displayStreak === streak ? 'pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
        }}>
          {displayStreak}
        </div>
        <div style={{ fontSize: 22, color: '#FFD700', fontWeight: 700, opacity: 0.9 }}>
          يوم حماسة
        </div>

        {/* Streak dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24, alignItems: 'center' }}>
          {Array.from({ length: Math.min(streak, 7) }).map((_, i) => {
            const isToday = i === Math.min(streak, 7) - 1
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 10, color: '#FFD700', opacity: 0.7, fontWeight: 700 }}>
                  {['ث','ن','ح','س','ج','خ','ر'][i]}
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: isToday ? '#FFD700' : i > 0 ? '#1CB0F6' : '#334155',
                  border: `3px solid ${isToday ? '#FFD700' : i > 0 ? '#1CB0F6' : '#475569'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                  animation: isToday ? 'popIn 0.5s 0.8s both' : 'none',
                }}>
                  {i > 0 ? (isToday ? '🔥' : '✓') : ''}
                </div>
              </div>
            )
          })}
        </div>

        <style>{`
          @keyframes glow { from { opacity: 0.4; transform: scale(0.95); } to { opacity: 0.8; transform: scale(1.05); } }
          @keyframes pulse { from { transform: scale(1); } to { transform: scale(1.05); } }
          @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
          @keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes particle { 0% { transform: translateY(0) scale(1); opacity: 0.6; } 100% { transform: translateY(-40px) scale(0); opacity: 0; } }
        `}</style>
      </div>
    )
  }

  // Stats phase (زي صورة "نجم التحدث")
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#1a1a2e', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 24, direction: 'rtl',
      opacity: showStats ? 1 : 0, transition: 'opacity 0.4s',
    }}>
      {/* Mascot */}
      <div style={{ fontSize: 80, marginBottom: 8, animation: 'bounce 0.6s ease infinite alternate' }}>
        🤖
      </div>

      {/* Title */}
      <div style={{ fontSize: 28, fontWeight: 900, color: '#FFD700', marginBottom: 4, textAlign: 'center' }}>
        نجم التحدّث!
      </div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 28, textAlign: 'center' }}>
        {streak} يوم متواصل 🔥 لقد تدرّبت على التحدّي {streak} مرات!
      </div>

      {/* 3 Stats Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 36, width: '100%', maxWidth: 380 }}>
        {/* Time */}
        <div style={{
          flex: 1, background: '#0f3460', borderRadius: 16, padding: '16px 12px',
          textAlign: 'center', border: '2px solid #1d4ed8',
          animation: 'slideUp 0.4s 0.1s both',
        }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#60a5fa', marginBottom: 4 }}>
            {formatTime(timeSeconds)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 12 }}>🕐</span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>منتظم</span>
          </div>
        </div>

        {/* Accuracy */}
        <div style={{
          flex: 1, background: '#0a2e1a', borderRadius: 16, padding: '16px 12px',
          textAlign: 'center', border: '2px solid #16a34a',
          animation: 'slideUp 0.4s 0.2s both',
        }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#4ade80', marginBottom: 4 }}>
            {accuracy}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 12 }}>🎯</span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>رائع</span>
          </div>
        </div>

        {/* XP */}
        <div style={{
          flex: 1, background: '#2e1f00', borderRadius: 16, padding: '16px 12px',
          textAlign: 'center', border: '2px solid #d97706',
          animation: 'slideUp 0.4s 0.3s both',
        }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fbbf24', marginBottom: 4 }}>
            {xpEarned}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 12 }}>⚡</span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>إجمالي XP</span>
          </div>
        </div>
      </div>

      {/* Streak progress bar */}
      <div style={{ width: '100%', maxWidth: 380, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>{streak + 1}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 20, background: '#FFD700', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⭐</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{streak}</span>
          </div>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>{streak - 1}</span>
        </div>
        <div style={{ height: 16, background: '#334155', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: '85%',
            background: 'linear-gradient(90deg, #58CC02, #a0e040)',
            borderRadius: 99,
            transition: 'width 1s ease',
          }} />
          {/* Diamond marker */}
          <div style={{
            position: 'absolute', left: '83%', top: '50%',
            width: 20, height: 20,
            background: '#FFD700',
            borderRadius: 4,
            transform: 'translateY(-50%) rotate(45deg)',
          }} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: '#94a3b8' }}>
          لقد اقتربت خطوة من رفع علامتك! 🏆
        </div>
      </div>

      {/* Continue button */}
      <button onClick={onContinue} style={{
        width: '100%', maxWidth: 380,
        padding: '16px', borderRadius: 14, border: 'none',
        background: '#58CC02', color: '#fff', fontWeight: 900, fontSize: 18,
        cursor: 'pointer', boxShadow: '0 6px 0 #3d8f00',
      }}>
        المتابعة
      </button>

      <style>{`
        @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-8px); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
