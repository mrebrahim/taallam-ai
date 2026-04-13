'use client'
import { useState, useEffect, useRef } from 'react'
import CelebrationScreen from './CelebrationScreen'
import StreakCelebration from './StreakCelebration'

interface Question {
  id: string
  title_ar: string
  question_ar: string
  options: string[]
  correct_answer: number
  explanation_ar?: string
  xp_reward: number
  difficulty: number
}

interface Props {
  questions: Question[]
  streak?: number
  onComplete: (results: { correct: number; total: number; xpEarned: number }) => void
  onExit: () => void
}

const HEARTS = 3 // max mistakes before session ends (optional)

export default function QuizSession({ questions, streak = 0, onComplete, onExit }: Props) {
  const [queueOriginal]   = useState<Question[]>(questions)
  const [queue, setQueue]           = useState<Question[]>([...questions])
  const [current, setCurrent]       = useState(0)
  const [selected, setSelected]     = useState<number | null>(null)
  const [answered, setAnswered]      = useState(false)
  const [isCorrect, setIsCorrect]   = useState(false)
  const [mistakes, setMistakes]     = useState<Question[]>([]) // questions answered wrong
  const [inReview, setInReview]     = useState(false) // reviewing mistakes phase
  const [reviewQueue, setReviewQueue] = useState<Question[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [xpEarned, setXpEarned]    = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showStreakCelebration, setShowStreakCelebration] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const startTimeRef = useRef(Date.now())
  const [showNarCorrect, setShowNarCorrect] = useState(false)
  const [showNarFix, setShowNarFix] = useState(false) // "هيا نصلح بعض الأخطاء"

  const totalQ = queueOriginal.length
  const progress = inReview
    ? ((reviewIndex) / reviewQueue.length) * 100
    : ((current) / totalQ) * 100

  const currentQ = inReview ? reviewQueue[reviewIndex] : queue[current]

  const handleSelect = (i: number) => {
    if (answered) return
    setSelected(i)
    const correct = i === currentQ.correct_answer
    setIsCorrect(correct)
    setAnswered(true)

    if (correct) {
      setCorrectCount(prev => prev + 1)
      setXpEarned(prev => prev + currentQ.xp_reward)
    } else {
      if (!inReview) {
        setMistakes(prev => [...prev, currentQ])
      }
    }
  }

  const handleNext = () => {
    setSelected(null)
    setAnswered(false)
    setIsCorrect(false)

    if (inReview) {
      if (reviewIndex + 1 >= reviewQueue.length) {
        // Done with review — session complete!
        setSessionDone(true)
        if (streak > 0) {
          setShowStreakCelebration(true)
        } else {
          setShowCelebration(true)
        }
      } else {
        setReviewIndex(prev => prev + 1)
      }
    } else {
      if (current + 1 >= queue.length) {
        // Finished first pass
        if (mistakes.length > 0) {
          // Go into review mode
          setShowNarFix(true)
        } else {
          // Perfect — done!
          setSessionDone(true)
          setShowCelebration(true)
        }
      } else {
        setCurrent(prev => prev + 1)
      }
    }
  }

  const startReview = () => {
    setShowNarFix(false)
    setReviewQueue([...mistakes])
    setReviewIndex(0)
    setInReview(true)
    setMistakes([])
  }

  const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
  const accuracy = Math.round((correctCount / Math.max(totalQ, 1)) * 100)

  if (sessionDone && showStreakCelebration) {
    return (
      <StreakCelebration
        streak={streak}
        xpEarned={xpEarned}
        accuracy={accuracy}
        timeSeconds={elapsedSeconds}
        onContinue={() => {
          setShowStreakCelebration(false)
          setShowCelebration(true)
        }}
      />
    )
  }

  if (sessionDone && showCelebration) {
    return (
      <CelebrationScreen
        xp={xpEarned}
        title={`✅ أكملت الجلسة!`}
        subtitle={`${correctCount}/${totalQ} إجابة صحيحة — استمر! 🔥`}
        onContinue={() => {
          setShowCelebration(false)
          onComplete({ correct: correctCount, total: totalQ, xpEarned })
        }}
      />
    )
  }

  // "هيا نصلح بعض الأخطاء" screen
  if (showNarFix) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#1a1a2e',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 32, direction: 'rtl',
      }}>
        {/* Nar peeking from bottom */}
        <div style={{ position: 'absolute', bottom: 0, right: 20, fontSize: 80, animation: 'peekUp 0.5s ease-out forwards' }}>
          🤖
        </div>

        {/* Speech bubble */}
        <div style={{
          background: '#1e293b', borderRadius: 20, padding: '24px 28px',
          maxWidth: 320, marginBottom: 40, position: 'relative',
          border: '2px solid #334155',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {/* Bubble tail */}
          <div style={{
            position: 'absolute', bottom: -16, left: 40,
            width: 0, height: 0,
            borderLeft: '16px solid transparent',
            borderRight: '0px solid transparent',
            borderTop: '16px solid #334155',
          }} />
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.6, textAlign: 'center' }}>
            هيا نصلح بعض الأخطاء. لن تكون بحاجة إلى طاقة!
          </p>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 16, color: '#94a3b8' }}>
            {mistakes.length} سؤال تحتاج مراجعة
          </div>
        </div>

        <button onClick={startReview} style={{
          padding: '16px 48px', borderRadius: 14, border: 'none',
          background: '#58CC02', color: '#fff', fontWeight: 900, fontSize: 18,
          cursor: 'pointer', boxShadow: '0 6px 0 #3d8f00',
        }}>
          المتابعة
        </button>

        <style>{`
          @keyframes peekUp {
            from { transform: translateY(100%); }
            to { transform: translateY(20%); }
          }
        `}</style>
      </div>
    )
  }

  if (!currentQ) return null

  const DIFF_COLORS: Record<number, string> = { 1: '#58CC02', 2: '#1CB0F6', 3: '#FF9600', 4: '#CE82FF', 5: '#FF4B4B' }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#f7f7f7', zIndex: 9999,
      display: 'flex', flexDirection: 'column', maxWidth: 480,
      margin: '0 auto', fontFamily: "'Segoe UI', Tahoma, sans-serif", direction: 'rtl',
    }}>
      {/* Top bar */}
      <div style={{ padding: '16px 16px 0', background: '#f7f7f7' }}>
        {/* Progress + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={onExit} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#e0e0e0', cursor: 'pointer', fontSize: 18, color: '#999', flexShrink: 0 }}>
            ✕
          </button>
          {/* Progress bar */}
          <div style={{ flex: 1, height: 14, background: '#e0e0e0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: inReview ? '#FF9600' : '#58CC02',
              width: `${progress}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
          {/* XP so far */}
          <div style={{ background: '#FFF5D3', borderRadius: 99, padding: '4px 10px', fontSize: 12, fontWeight: 800, color: '#A56644', flexShrink: 0 }}>
            ⚡ {xpEarned}
          </div>
        </div>

        {/* Review mode badge */}
        {inReview && (
          <div style={{ background: '#FFF5D3', borderRadius: 10, padding: '6px 14px', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>🔄</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#A56644' }}>مراجعة الأخطاء — {reviewIndex + 1}/{reviewQueue.length}</span>
          </div>
        )}
      </div>

      {/* Question area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {/* Q counter */}
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12, fontWeight: 600 }}>
          {inReview ? `🔄 خطأ سابق` : `السؤال ${current + 1} من ${totalQ}`}
        </div>

        {/* Question */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '18px 18px', marginBottom: 16, border: '2px solid #f0f0f0' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#333', lineHeight: 1.6 }}>
            {currentQ.question_ar}
          </div>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {currentQ.options.map((opt, i) => {
            let border = '2px solid #f0f0f0'
            let bg = '#fff'
            let color = '#333'
            let fontWeight: 400 | 700 = 400

            if (answered) {
              if (i === currentQ.correct_answer) {
                border = '2px solid #58CC02'; bg = '#D7FFB8'; color = '#27500A'; fontWeight = 700
              } else if (i === selected && i !== currentQ.correct_answer) {
                border = '2px solid #FF4B4B'; bg = '#FFE5E5'; color = '#7f1d1d'
              }
            } else if (selected === i) {
              border = '2px solid #1CB0F6'; bg = '#DDF4FF'; color = '#1453A3'; fontWeight = 700
            }

            return (
              <button key={i} onClick={() => handleSelect(i)}
                style={{ padding: '14px 16px', borderRadius: 14, border, background: bg, cursor: answered ? 'default' : 'pointer', textAlign: 'right', fontSize: 14, fontWeight, color, display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s', width: '100%' }}>
                <span style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: answered && i === currentQ.correct_answer ? '#58CC02' : answered && i === selected && i !== currentQ.correct_answer ? '#FF4B4B' : selected === i ? '#1CB0F6' : '#f0f0f0',
                  color: answered || selected === i ? '#fff' : '#999',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800,
                }}>
                  {answered && i === currentQ.correct_answer ? '✓' : answered && i === selected && i !== currentQ.correct_answer ? '✗' : ['أ', 'ب', 'ج', 'د'][i]}
                </span>
                {opt}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom feedback bar */}
      {answered && (
        <div style={{
          padding: '16px 16px 32px',
          background: isCorrect ? '#D7FFB8' : '#FFE5E5',
          borderTop: `3px solid ${isCorrect ? '#58CC02' : '#FF4B4B'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: isCorrect ? '#27500A' : '#7f1d1d', marginBottom: 4 }}>
                {isCorrect ? '🎉 أحسنت عملاً!' : '❌ محاولة جيدة'}
              </div>
              {!isCorrect && (
                <div style={{ fontSize: 13, color: '#7f1d1d', marginBottom: 4 }}>
                  الإجابة الصحيحة: <strong>{currentQ.options[currentQ.correct_answer]}</strong>
                </div>
              )}
              {currentQ.explanation_ar && (
                <div style={{ fontSize: 13, color: isCorrect ? '#27500A' : '#7f1d1d', opacity: 0.85, lineHeight: 1.5 }}>
                  {currentQ.explanation_ar}
                </div>
              )}
            </div>
            {isCorrect && (
              <div style={{ background: '#58CC02', borderRadius: 10, padding: '6px 12px', fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                +{currentQ.xp_reward} XP
              </div>
            )}
          </div>

          <button onClick={handleNext} style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: isCorrect ? '#58CC02' : '#FF4B4B',
            color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer',
            boxShadow: `0 4px 0 ${isCorrect ? '#3d8f00' : '#cc0000'}`,
          }}>
            {inReview && reviewIndex + 1 >= reviewQueue.length ? 'إنهاء الجلسة 🎉' : 'المتابعة →'}
          </button>
        </div>
      )}

      {/* CTA when not answered yet */}
      {!answered && (
        <div style={{ padding: '16px 16px 32px', background: '#f7f7f7' }}>
          <button disabled style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: '#e0e0e0', color: '#aaa', fontWeight: 900, fontSize: 16, cursor: 'not-allowed' }}>
            اختر إجابة
          </button>
        </div>
      )}
    </div>
  )
}
