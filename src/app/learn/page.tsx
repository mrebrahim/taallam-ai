'use client'
import { useUser } from '@/hooks/useUser'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Roadmap, UserRoadmapProgress } from '@/types'

const ROADMAP_META: Record<string, { emoji: string; gradient: string }> = {
  n8n_automation: { emoji: '⚡', gradient: 'linear-gradient(135deg, #065f46, #10b981)' },
  ai_video:       { emoji: '🎬', gradient: 'linear-gradient(135deg, #9a3412, #f97316)' },
  vibe_coding:    { emoji: '💻', gradient: 'linear-gradient(135deg, #4c1d95, #8b5cf6)' },
}

export default function LearnPage() {
  const { user, loading } = useUser()
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [progress, setProgress] = useState<Record<string, UserRoadmapProgress>>({})
  const [lessonCounts, setLessonCounts] = useState<Record<string, number>>({})
  const supabase = createClient()

  useEffect(() => {
    supabase.from('roadmaps').select('*').order('sort_order').then(({ data }) => {
      if (data) setRoadmaps(data)
    })
  }, [])

  useEffect(() => {
    if (!user || roadmaps.length === 0) return
    // Get user progress for all roadmaps
    supabase.from('user_roadmap_progress')
      .select('*').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, UserRoadmapProgress> = {}
          data.forEach(p => { map[p.roadmap_id] = p })
          setProgress(map)
        }
      })
    // Get lesson counts per roadmap
    roadmaps.forEach(r => {
      supabase.from('lessons').select('id', { count: 'exact' })
        .eq('roadmap_id', r.id).eq('is_active', true)
        .then(({ count }) => {
          setLessonCounts(prev => ({ ...prev, [r.id]: count || 0 }))
        })
    })
  }, [user, roadmaps])

  const handleEnroll = async (roadmapId: string) => {
    if (!user) return
    await supabase.from('user_roadmap_progress').upsert({
      user_id: user.id,
      roadmap_id: roadmapId,
    })
    const { data } = await supabase.from('user_roadmap_progress')
      .select('*').eq('user_id', user.id)
    if (data) {
      const map: Record<string, UserRoadmapProgress> = {}
      data.forEach(p => { map[p.roadmap_id] = p })
      setProgress(map)
    }
  }

  if (loading) return <div className="learn-loading">جاري التحميل...</div>
  if (!user) { if (typeof window !== 'undefined') window.location.href = '/auth/login'; return null }

  return (
    <div className="learn-page" dir="rtl">
      <header className="learn-header">
        <h1>اختار مسارك</h1>
        <p>كل مسار رحلة مستقلة بدروسها وتحدياتها</p>
      </header>

      <div className="learn-roadmaps">
        {roadmaps.map(roadmap => {
          const meta = ROADMAP_META[roadmap.slug] || { emoji: '📚', gradient: '#7F77DD' }
          const prog = progress[roadmap.id]
          const total = lessonCounts[roadmap.id] || 0
          const done = prog?.lessons_completed || 0
          const pct = total > 0 ? Math.round((done / total) * 100) : 0
          const enrolled = !!prog

          return (
            <div key={roadmap.id} className="roadmap-card">
              {/* Cover */}
              <div className="roadmap-cover" style={{ background: meta.gradient }}>
                <span className="roadmap-emoji">{meta.emoji}</span>
                {prog?.certificate_issued && (
                  <span className="roadmap-cert-badge">🏆 شهادة</span>
                )}
              </div>

              {/* Body */}
              <div className="roadmap-body">
                <h2>{roadmap.title_ar}</h2>
                {roadmap.description_ar && (
                  <p className="roadmap-desc">{roadmap.description_ar}</p>
                )}

                {/* Stats row */}
                <div className="roadmap-stats">
                  <span>📚 {total} درس</span>
                  <span>⭐ {roadmap.total_xp} XP</span>
                  {roadmap.certificate_title_ar && (
                    <span>🎓 {roadmap.certificate_title_ar}</span>
                  )}
                </div>

                {/* Progress bar (if enrolled) */}
                {enrolled && (
                  <div className="roadmap-progress">
                    <div className="roadmap-progress-labels">
                      <span>{done} / {total} درس</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="roadmap-progress-track">
                      <div
                        className="roadmap-progress-fill"
                        style={{ width: `${pct}%`, background: roadmap.color_hex }}
                      />
                    </div>
                  </div>
                )}

                {/* CTA */}
                {enrolled ? (
                  <Link
                    href={`/learn/${roadmap.slug}`}
                    className="roadmap-btn"
                    style={{ background: roadmap.color_hex }}
                  >
                    {done === 0 ? 'ابدأ التعلم' : 'كمّل من حيث وقفت'}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleEnroll(roadmap.id)}
                    className="roadmap-btn roadmap-btn-outline"
                    style={{ borderColor: roadmap.color_hex, color: roadmap.color_hex }}
                  >
                    انضم للمسار مجاناً
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {[
          { href: '/home',        icon: '🏠', label: 'الرئيسية' },
          { href: '/learn',       icon: '📚', label: 'التعلم', active: true },
          { href: '/challenges',  icon: '⚔️', label: 'التحديات' },
          { href: '/leaderboard', icon: '🏆', label: 'الترتيب' },
          { href: '/profile',     icon: '👤', label: 'الملف' },
        ].map(n => (
          <Link key={n.href} href={n.href} className={`nav-item ${n.active ? 'nav-active' : ''}`}>
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
