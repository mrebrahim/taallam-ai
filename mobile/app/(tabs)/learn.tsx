import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors, ROADMAP_META } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

export default function LearnScreen() {
  const { user } = useAuth()
  const { isAr } = useLang()
  const params = useLocalSearchParams<{ roadmap?: string }>()
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<Set<string>>(new Set())
  const [lessons, setLessons] = useState<Record<string, any[]>>({})
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: rm }, { data: en }, { data: lp }] = await Promise.all([
        supabase.from('roadmaps').select('*').order('sort_order'),
        supabase.from('course_enrollments').select('roadmap_id, expires_at').eq('user_id', user.id).eq('is_active', true),
        supabase.from('user_lesson_progress').select('lesson_id').eq('user_id', user.id).eq('completed', true),
      ])
      setRoadmaps(rm || [])
      const now = new Date()
      const validEnrollments = (en || []).filter((e: any) => 
        !e.expires_at || new Date(e.expires_at) > now
      )
      setEnrollments(new Set(validEnrollments.map((e: any) => e.roadmap_id)))
      setCompletedLessons(new Set(lp?.map((d: any) => d.lesson_id) || []))

      const firstEnrolled = rm?.find((r: any) => en?.some((e: any) => e.roadmap_id === r.id))
      const initialSlug = params.roadmap || firstEnrolled?.slug || rm?.[0]?.slug
      if (initialSlug) setSelected(initialSlug)
      setLoading(false)
    }
    load()
  }, [user])

  useEffect(() => {
    if (!selected || !user) return
    const roadmap = roadmaps.find(r => r.slug === selected)
    if (!roadmap || lessons[roadmap.id] || !enrollments.has(roadmap.id)) return
    supabase.from('lessons').select('*').eq('roadmap_id', roadmap.id).eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setLessons(prev => ({ ...prev, [roadmap.id]: data })) })
  }, [selected, roadmaps, enrollments])

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.green} /></View>

  const currentRoadmap = roadmaps.find(r => r.slug === selected)
  const currentLessons = currentRoadmap ? (lessons[currentRoadmap.id] || []) : []
  const isEnrolled = currentRoadmap ? enrollments.has(currentRoadmap.id) : false
  const meta = selected ? ROADMAP_META[selected as keyof typeof ROADMAP_META] : null
  const completedCount = currentLessons.filter(l => completedLessons.has(l.id)).length
  const pct = currentLessons.length > 0 ? Math.round((completedCount / currentLessons.length) * 100) : 0

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>المسارات</Text>
        <View style={styles.pills}>
          {user && <>
            <View style={[styles.pill, { backgroundColor: Colors.orangeL }]}>
              <Text style={[styles.pillTxt, { color: '#A56644' }]}>🔥 {user.streak_current}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: Colors.blueL }]}>
              <Text style={[styles.pillTxt, { color: '#1453A3' }]}>💎 {user.coins_balance}</Text>
            </View>
          </>}
        </View>
      </View>

      {/* Roadmap Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {roadmaps.map(r => {
          const m = ROADMAP_META[r.slug as keyof typeof ROADMAP_META]
          const active = selected === r.slug
          const enrolled = enrollments.has(r.id)
          return (
            <TouchableOpacity key={r.id} onPress={() => setSelected(r.slug)}
              style={[styles.tab, active && { backgroundColor: m?.color || Colors.green, shadowColor: m?.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }]}>
              <Text style={{ fontSize: 16 }}>{m?.emoji}</Text>
              <Text style={[styles.tabTxt, active && { color: '#fff' }]}>{m?.label || r.title_ar}</Text>
              {!enrolled && <Text style={{ fontSize: 10 }}>🔒</Text>}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Not Enrolled */}
        {!isEnrolled && currentRoadmap && (
          <View style={styles.lockedCard}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>🔒</Text>
            <Text style={styles.lockedTitle}>{meta?.label || currentRoadmap.title_ar}</Text>
            <Text style={styles.lockedDesc}>هذا المسار متاح للمشتركين فقط.{'\n'}تواصل مع الإدارة للاشتراك.</Text>
            <TouchableOpacity style={styles.subscribeBtn}>
              <Text style={styles.subscribeBtnTxt}>اشترك دلوقتي 🚀</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Enrolled */}
        {isEnrolled && currentRoadmap && meta && (
          <>
            {/* Roadmap Header */}
            <View style={styles.roadmapHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={[styles.roadmapIcon, { backgroundColor: meta.bg }]}>
                  <Text style={{ fontSize: 24 }}>{meta.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roadmapTitle}>{meta.label}</Text>
                  <Text style={styles.roadmapSub}>{currentLessons.length} درس • {completedCount} مكتمل</Text>
                </View>
                <Text style={[styles.pct, { color: meta.color }]}>{pct}%</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: meta.color }]} />
              </View>
            </View>

            {/* Lessons */}
            {currentLessons.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🔜</Text>
                <Text style={styles.emptyTxt}>الدروس قادمة قريباً</Text>
              </View>
            ) : (
              currentLessons.map((lesson, i) => {
                const done = completedLessons.has(lesson.id)
                const prevDone = i === 0 || completedLessons.has(currentLessons[i-1].id)
                const locked = !prevDone && !done && i > 0

                return (
                  <TouchableOpacity key={lesson.id} style={[styles.lessonCard, done && { borderColor: meta.color }]}
                    onPress={() => !locked && router.push(`/lesson/${lesson.id}`)}
                    disabled={locked} activeOpacity={locked ? 1 : 0.8}>
                    <View style={[styles.lessonIcon, { backgroundColor: done ? meta.bg : locked ? '#f5f5f5' : meta.bg + '80' }]}>
                      <Text style={{ fontSize: 20 }}>
                        {done ? '✅' : locked ? '🔒' : lesson.lesson_type === 'video' ? '🎬' : '📖'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.lessonTitle, locked && { color: Colors.textMuted }]}>{lesson.title_ar}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                        <Text style={styles.lessonMeta}>⏱️ {Math.floor((lesson.video_duration_seconds || 600) / 60)}د</Text>
                        <Text style={[styles.lessonXp, { color: done ? Colors.green : meta.color }]}>+{lesson.xp_reward} XP</Text>
                      </View>
                    </View>
                    {!locked && !done && <Text style={{ fontSize: 18, color: '#ddd' }}>←</Text>}
                  </TouchableOpacity>
                )
              })
            )}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: Colors.text },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  pillTxt: { fontSize: 14, fontWeight: '800' },
  tabs: { maxHeight: 60 },
  tabsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border },
  tabTxt: { fontSize: 13, fontWeight: '700', color: Colors.text },
  lockedCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 2, borderColor: Colors.border },
  lockedTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  lockedDesc: { fontSize: 14, color: Colors.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  subscribeBtn: { backgroundColor: Colors.blue, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  subscribeBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  roadmapHeader: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: Colors.border },
  roadmapIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  roadmapTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, textAlign: 'right' },
  roadmapSub: { fontSize: 12, color: Colors.textSub, textAlign: 'right' },
  pct: { fontSize: 15, fontWeight: '800' },
  progressBg: { height: 10, backgroundColor: '#f0f0f0', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 2, borderColor: Colors.border },
  emptyTxt: { fontSize: 14, color: Colors.textSub },
  lessonCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: Colors.border, gap: 12 },
  lessonIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  lessonTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, textAlign: 'right', marginBottom: 4 },
  lessonMeta: { fontSize: 12, color: Colors.textSub },
  lessonXp: { fontSize: 12, fontWeight: '800' },
})
