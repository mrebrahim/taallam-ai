'use client'
import { useEffect, useState } from 'react'

interface Props {
  xp: number
  title?: string
  subtitle?: string
  onContinue: () => void
}

export default function CelebrationScreen({ xp, title, subtitle, onContinue }: Props) {
  const [phase, setPhase] = useState<'lightning' | 'reward' | 'done'>('lightning')
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Phase 1: lightning flash (0.8s)
    const t1 = setTimeout(() => setPhase('reward'), 800)
    // Phase 2: count up XP
    const t2 = setTimeout(() => {
      let n = 0
      const interval = setInterval(() => {
        n += Math.ceil(xp / 20)
        if (n >= xp) { setCount(xp); clearInterval(interval) }
        else setCount(n)
      }, 40)
    }, 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [xp])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      direction: 'rtl',
    }}>
      {/* Lightning Phase */}
      {phase === 'lightning' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#1a1a2e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'flashIn 0.1s ease-out',
        }}>
          {/* Lightning bolt SVG */}
          <svg width="200" height="320" viewBox="0 0 200 320" style={{ filter: 'drop-shadow(0 0 30px #FFD700)' }}>
            <path
              d="M120 10 L60 160 L100 160 L80 310 L160 130 L115 130 Z"
              fill="#FFD700"
              stroke="#FFF"
              strokeWidth="3"
            />
          </svg>
          {/* Flash overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)',
            animation: 'pulse 0.4s ease-out',
          }} />
        </div>
      )}

      {/* Reward Phase */}
      {phase === 'reward' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 0,
          animation: 'fadeIn 0.3s ease-out',
        }}>
          {/* Stars scattered */}
          {Array.from({length: 12}).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${10 + Math.random() * 80}%`,
              top: `${5 + Math.random() * 60}%`,
              fontSize: `${12 + Math.random() * 16}px`,
              opacity: 0.6 + Math.random() * 0.4,
              animation: `twinkle ${1 + Math.random() * 2}s infinite`,
            }}>⭐</div>
          ))}

          {/* Mascot Nar with lightning legs */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            {/* Lightning legs */}
            <svg width="120" height="80" viewBox="0 0 120 80" style={{ position: 'absolute', bottom: -30, left: '50%', transform: 'translateX(-50%)' }}>
              <path d="M45 0 L35 40 L50 40 L40 80" stroke="#FFD700" strokeWidth="6" fill="none" strokeLinecap="round"/>
              <path d="M75 0 L85 40 L70 40 L80 80" stroke="#FFD700" strokeWidth="6" fill="none" strokeLinecap="round"/>
            </svg>
            {/* Robot face */}
            <div style={{
              width: 90, height: 90, borderRadius: 20,
              background: 'linear-gradient(135deg, #58CC02, #a0e040)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48, boxShadow: '0 8px 32px rgba(88,204,2,0.5)',
              position: 'relative', zIndex: 1,
              animation: 'bounce 0.6s ease infinite alternate',
            }}>
              🤖
            </div>
          </div>

          {/* XP Cup/Badge */}
          <div style={{
            marginTop: 48,
            background: 'linear-gradient(135deg, #FF9600, #FFD700)',
            borderRadius: 20,
            padding: '16px 32px',
            border: '4px solid #FFD700',
            boxShadow: '0 8px 32px rgba(255,150,0,0.5)',
            position: 'relative',
            animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}>
            {/* Cup handles */}
            <div style={{ position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)', width: 14, height: 28, borderRadius: '0 50% 50% 0', border: '4px solid #FFD700', borderLeft: 'none', background: 'transparent' }} />
            <div style={{ position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)', width: 14, height: 28, borderRadius: '50% 0 0 50%', border: '4px solid #FFD700', borderRight: 'none', background: 'transparent' }} />
            <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.3)', textAlign: 'center', minWidth: 80 }}>
              +{count}
            </div>
          </div>

          {/* Motivational text */}
          <div style={{ marginTop: 28, textAlign: 'center', padding: '0 32px' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
              {title || '🎉 أحسنت!'}
            </div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
              {subtitle || 'استمر وحافظ على الـ streak! 🔥'}
            </div>
          </div>

          {/* Continue button */}
          <button
            onClick={onContinue}
            style={{
              marginTop: 36,
              padding: '16px 64px',
              borderRadius: 14,
              border: 'none',
              background: '#58CC02',
              color: '#fff',
              fontWeight: 900,
              fontSize: 18,
              cursor: 'pointer',
              boxShadow: '0 6px 0 #3d8f00',
              transform: 'translateY(0)',
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseDown={e => {
              const btn = e.currentTarget
              btn.style.transform = 'translateY(4px)'
              btn.style.boxShadow = '0 2px 0 #3d8f00'
            }}
            onMouseUp={e => {
              const btn = e.currentTarget
              btn.style.transform = 'translateY(0)'
              btn.style.boxShadow = '0 6px 0 #3d8f00'
            }}
          >
            المتابعة
          </button>
        </div>
      )}

      <style>{`
        @keyframes flashIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-8px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes pulse {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
