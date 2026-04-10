'use client'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const ROADMAP_META: Record<string, { emoji: string; color: string; bg: string; darkBg: string }> = {
  n8n_automation: { emoji: '⚡', color: '#58CC02', bg: '#D7FFB8', darkBg: '#1a2e0a' },
  ai_video:       { emoji: '🎬', color: '#FF9600', bg: '#FFCE8E', darkBg: '#2e1e0a' },
  vibe_coding:    { emoji: '💻', color: '#CE82FF', bg: '#F5E6FF', darkBg: '#1e0a2e' },
}

export default function LearnPage() {
  const { user, loading } = useUser()
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [lessons, setLessons] = useState<Record<string, any[]>>({})
  const [progress, setProgress] = useState<Record<string, any>>({})
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  const [selectedRoadmap, setSelectedRoadmap] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    supabase.from('roadmaps').select('*').order('sort_order')
      .then(({ data }) => {
        setRoadmaps(data || [])
        if (data && data.length > 0) setSelectedRoadmap(data[0].slug)
      })
    supabase.from('user_roadmap_progress').select('*').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const m: Record<string, any> = {}
          data.forEach((p: any) => { m[p.roadmap_id] = p })
          setProgress(m)
        }
      })
    supabase.from('user_lesson_progress').select('lesson_id').eq('user_id', user.id).eq('completed', true)
      .then(({ data }) => {
        if (data) setCompletedLessons(new Set(data.map((d: any) => d.lesson_id)))
      })
  }, [user])

  useEffect(() => {
    if (!selectedRoadmap) return
    const roadmap = roadmaps.find(r => r.slug === selectedRoadmap)
    if (!roadmap || lessons[roadmap.id]) return
    supabase.from('lessons').select('*').eq('roadmap_id', roadmap.id).eq('is_active', true).order('sort_order')
      .then(({ data }) => {
        if (data) setLessons(prev => ({ ...prev, [roadmap.id]: data }))
      })
  }, [selectedRoadmap, roadmaps])

  const enrollAndStart = async (roadmapId: string, lessonId: string) => {
    if (!user) return
    await supabase.from('user_roadmap_progress').upsert({
      user_id: user.id, roadmap_id: roadmapId, enrolled_at: new Date().toISOString()
    }, { onConflict: 'user_id,roadmap_id' })
    window.location.href = `/lesson/${lessonId}`
  }

  if (!loading && !user) { window.location.replace('/auth/login'); return null }
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)' }}>
      <span style={{ fontSize: 48 }}>📚</span>
    </div>
  )

  const currentRoadmap = roadmaps.find(r => r.slug === selectedRoadmap)
  const currentLessons = currentRoadmap ? (lessons[currentRoadmap.id] || []) : []
  const currentProgress = currentRoadmap ? progress[currentRoadmap.id] : null
  const meta = selectedRoadmap ? ROADMAP_META[selectedRoadmap] : null
  const completedCount = currentLessons.filter(l => completedLessons.has(l.id)).length
  const pct = currentLessons.length > 0 ? Math.round((completedCount / currentLessons.length) * 100) : 0

  return (
    <div dir="rtl" style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', fontFamily: 'var(--font-sans)', background: 'var(--color-background-tertiary)', paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>المسارات</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ background: '#FFF5D3', borderRadius: 99, padding: '6px 12px', fontSize: 14, fontWeight: 700, color: '#A56644' }}>🔥 {user!.streak_current}</div>
          <div style={{ background: '#DDF4FF', borderRadius: 99, padding: '6px 12px', fontSize: 14, fontWeight: 700, color: '#1453A3' }}>💎 {user!.coins_balance}</div>
        </div>
      </div>

      {/* Roadmap Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 16px 0', overflowX: 'auto' }}>
        {roadmaps.map(r => {
          const m = ROADMAP_META[r.slug]
          const active = selectedRoadmap === r.slug
          return (
            <button key={r.id} onClick={() => setSelectedRoadmap(r.slug)}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, border: `2px solid ${active ? (m?.color || '#7F77DD') : 'var(--color-border-tertiary)'}`, background: active ? (m?.bg || '#EEEDFE') : 'var(--color-background-primary)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? (m?.color || '#534AB7') : 'var(--color-text-secondary)', transition: 'all 0.15s' }}>
              <span>{m?.emoji || '📚'}</span> {r.title_ar}
            </button>
          )
        })}
      </div>

      {/* Current Roadmap Header */}
      {currentRoadmap && meta && (
        <div style={{ margin: '16px', background: 'var(--color-background-primary)', borderRadius: 20, padding: 18, border: `2px solid ${meta.color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{meta.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 2 }}>{currentRoadmap.title_ar}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{currentLessons.length} درس • {currentRoadmap.total_xp || 0} XP</div>
            </div>
            {!currentProgress ? (
              <span style={{ background: meta.color, color: '#fff', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>جديد</span>
            ) : (
              <span style={{ background: meta.bg, color: meta.color, borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>{pct}%</span>
            )}
          </div>
          {currentProgress && (
            <div style={{ height: 8, background: 'var(--color-background-secondary)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: meta.color, borderRadius: 99, width: `${pct}%`, transition: 'width 0.6s' }} />
            </div>
          )}
        </div>
      )}

      {/* Lessons List */}
      {currentRoadmap && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currentLessons.map((lesson, idx) => {
              const isDone = completedLessons.has(lesson.id)
              const isEnrolled = !!currentProgress
              const isFree = lesson.is_free
              const isLocked = !isEnrolled && !isFree
              const isNext = !isDone && (idx === 0 || completedLessons.has(currentLessons[idx - 1]?.id))

              return (
                <div key={lesson.id}
                  onClick={() => !isLocked && enrollAndStart(currentRoadmap.id, lesson.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-background-primary)', borderRadius: 16, padding: '14px 16px', border: `2px solid ${isNext ? (meta?.color || '#7F77DD') : isDone ? '#58CC02' : 'var(--color-border-tertiary)'}`, cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.5 : 1, transition: 'transform 0.1s', position: 'relative' }}>
                  {/* Number / Status Icon */}
                  <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isDone ? 20 : 16, fontWeight: 700, background: isDone ? '#D7FFB8' : isNext ? (meta?.bg || '#EEEDFE') : 'var(--color-background-secondary)', color: isDone ? '#27500A' : isNext ? (meta?.color || '#534AB7') : 'var(--color-text-tertiary)' }}>
                    {isDone ? '✅' : isLocked ? '🔒' : lesson.sort_order}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: isNext ? 700 : 600, color: 'var(--color-text-primary)', marginBottom: 3, lineHeight: 1.3 }}>{lesson.title_ar}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.3 }}>{lesson.description_ar}</div>
                  </div>

                  {/* XP Badge */}
                  <div style={{ flexShrink: 0, textAlign: 'center' }}>
                    <div style={{ background: isDone ? '#D7FFB8' : 'var(--color-background-secondary)', color: isDone ? '#27500A' : meta?.color || '#7F77DD', borderRadius: 8, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}>+{lesson.xp_reward} XP</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      {lesson.lesson_type === 'video' ? '🎬' : '📝'} {isFree ? 'مجاني' : 'Pro'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Enroll CTA */}
          {currentRoadmap && !currentProgress && (
            <div style={{ marginTop: 16, background: meta?.color || '#7F77DD', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: '#fff' }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>ابدأ المسار مجاناً!</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>أول 3 دروس مجانية</div>
              </div>
              <button onClick={() => currentLessons[0] && enrollAndStart(currentRoadmap.id, currentLessons[0].id)}
                style={{ background: '#fff', color: meta?.color || '#7F77DD', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                ابدأ الآن
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--color-background-primary)', borderTop: '2px solid var(--color-border-tertiary)', display: 'flex', padding: '8px 0 16px', zIndex: 100 }}>
        {[
          { href: '/home',        icon: '🏠', label: 'الرئيسية' },
          { href: '/learn',       icon: '📚', label: 'التعلم',    active: true },
          { href: '/challenges',  icon: '⚔️',  label: 'التحديات' },
          { href: '/leaderboard', icon: '🏆', label: 'الترتيب'  },
          { href: '/profile',     icon: '👤', label: 'ملفي'      },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', padding: '4px 0' }}>
            <span style={{ fontSize: 22 }}>{n.icon}</span>
            <span style={{ fontSize: 10, color: n.active ? '#1CB0F6' : 'var(--color-text-tertiary)', fontWeight: n.active ? 700 : 400 }}>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
