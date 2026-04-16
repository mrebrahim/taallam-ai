import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
  LayoutAnimation, Platform, UIManager, Linking,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors, ROADMAP_META } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const SUPPORT_WHATSAPP = 'https://wa.me/201000000000?text=أريد الاشتراك في كورس تعلم'

export default function LearnScreen() {
  const { user } = useAuth()
  const { isAr } = useLang()

  const [roadmaps, setRoadmaps]             = useState<any[]>([])
  const [enrolledIds, setEnrolledIds]       = useState<Set<string>>(new Set())
  const [sectionsMap, setSectionsMap]       = useState<Record<string, any[]>>({})   // roadmapId → [{sec, lessons[]}]
  const [completedSet, setCompletedSet]     = useState<Set<string>>(new Set())
  const [selected, setSelected]             = useState<string | null>(null)
  const [loading, setLoading]               = useState(true)
  const [loadingRmId, setLoadingRmId]       = useState<string | null>(null)
  const [openSections, setOpenSections]     = useState<Set<string>>(new Set())

  // ── Load roadmaps + enrollments + progress ───────────────
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: rm }, { data: en }, { data: lp }] = await Promise.all([
        supabase.from('roadmaps').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('course_enrollments').select('roadmap_id, expires_at').eq('user_id', user.id).eq('is_active', true),
        supabase.from('user_lesson_progress').select('lesson_id').eq('user_id', user.id).eq('completed', true),
      ])
      setRoadmaps(rm || [])
      setCompletedSet(new Set(lp?.map((d: any) => d.lesson_id) || []))
      const now   = new Date()
      const valid = new Set<string>((en || []).filter((e: any) => !e.expires_at || new Date(e.expires_at) > now).map((e: any) => e.roadmap_id))
      setEnrolledIds(valid)
      // Auto-select first enrolled roadmap
      const first = (rm || []).find((r: any) => valid.has(r.id))
      setSelected(first?.id || null)
      setLoading(false)
    }
    load()
  }, [user])

  // ── Load sections+lessons for selected roadmap ────────────
  useEffect(() => {
    if (!selected || !user) return
    if (!enrolledIds.has(selected)) return
    if (sectionsMap[selected]) return   // already loaded

    setLoadingRmId(selected)
    const fetchData = async () => {
      const [{ data: secs }, { data: ls }] = await Promise.all([
        supabase.from('sections').select('*').eq('roadmap_id', selected).eq('is_active', true).order('sort_order'),
        supabase.from('lessons').select('*').eq('roadmap_id', selected).eq('is_active', true).order('sort_order'),
      ])
      const built = (secs || []).map((sec: any) => ({
        ...sec,
        lessons: (ls || []).filter((l: any) => l.section_id === sec.id).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })).filter((sec: any) => sec.lessons.length > 0)

      const orphans = (ls || []).filter((l: any) => !l.section_id)
      if (orphans.length > 0) built.push({ id: '__none__', title_ar: 'دروس عامة', lessons: orphans })

      setSectionsMap(prev => ({ ...prev, [selected]: built }))

      // Auto-open first incomplete section
      const comp = completedSet
      const firstInc = built.find((sec: any) => sec.lessons.some((l: any) => !comp.has(l.id)))
      if (firstInc) setOpenSections(new Set([firstInc.id]))
      else if (built.length > 0) setOpenSections(new Set([built[0].id]))

      setLoadingRmId(null)
    }
    fetchData()
  }, [selected, enrolledIds])

  const toggleSection = (secId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(secId) ? next.delete(secId) : next.add(secId)
      return next
    })
  }

  if (loading || !user) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}><ActivityIndicator size="large" color={Colors.green} /></View>
    </SafeAreaView>
  )

  const enrolledRoadmaps   = roadmaps.filter(r => enrolledIds.has(r.id))
  const unenrolledRoadmaps = roadmaps.filter(r => !enrolledIds.has(r.id))
  const currentRoadmap     = roadmaps.find(r => r.id === selected)
  const meta               = currentRoadmap ? ROADMAP_META[currentRoadmap.slug as keyof typeof ROADMAP_META] : null
  const currentSections    = selected ? (sectionsMap[selected] || []) : []
  const allLessons         = currentSections.flatMap((sec: any) => sec.lessons)
  const completedCount     = allLessons.filter((l: any) => completedSet.has(l.id)).length
  const pct                = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>📚 {isAr ? 'تعلّم' : 'Learn'}</Text>
      </View>

      {/* Enrolled course tabs */}
      {enrolledRoadmaps.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={s.tabs} contentContainerStyle={s.tabsContent}>
          {enrolledRoadmaps.map(rm => {
            const m    = ROADMAP_META[rm.slug as keyof typeof ROADMAP_META]
            const active = selected === rm.id
            return (
              <TouchableOpacity key={rm.id}
                style={[s.tab, active && { borderColor: m?.color, backgroundColor: m?.bg }]}
                onPress={() => setSelected(rm.id)}>
                <Text style={{ fontSize: 18 }}>{m?.emoji}</Text>
                <Text style={[s.tabTxt, active && { color: m?.color }]} numberOfLines={1}>{m?.label || rm.title_ar}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ══ ENROLLED COURSE CONTENT ══ */}
        {enrolledRoadmaps.length > 0 && currentRoadmap && meta && (
          <>
            {/* Course header + progress */}
            <View style={[s.courseHeader, { borderColor: meta.color + '40' }]}>
              <View style={s.courseRow}>
                <View style={[s.courseIcon, { backgroundColor: meta.bg }]}>
                  <Text style={{ fontSize: 28 }}>{meta.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.courseTitle}>{meta.label || currentRoadmap.title_ar}</Text>
                  <Text style={s.courseSub}>
                    {allLessons.length} درس · {completedCount} مكتمل
                  </Text>
                </View>
                <View style={[s.pctBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[s.pctTxt, { color: meta.color }]}>{pct}%</Text>
                </View>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: meta.color }]} />
              </View>
            </View>

            {/* Sections accordion */}
            {loadingRmId === selected ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator color={meta.color} />
              </View>
            ) : currentSections.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🔜</Text>
                <Text style={s.emptyTxt}>الدروس قادمة قريباً</Text>
              </View>
            ) : (
              currentSections.map((sec: any, secIdx: number) => {
                const isOpen  = openSections.has(sec.id)
                const secDone = sec.lessons.filter((l: any) => completedSet.has(l.id)).length
                const secPct  = Math.round((secDone / sec.lessons.length) * 100)
                const allDone = secDone === sec.lessons.length

                return (
                  <View key={sec.id} style={s.sectionWrapper}>
                    {/* Section toggle */}
                    <TouchableOpacity
                      style={[s.sectionHeader, {
                        borderColor: meta.color + '50',
                        backgroundColor: isOpen ? meta.bg : '#fff',
                        borderBottomLeftRadius: isOpen ? 0 : 14,
                        borderBottomRightRadius: isOpen ? 0 : 14,
                      }]}
                      onPress={() => toggleSection(sec.id)} activeOpacity={0.75}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                          <Text style={[s.secTitle, { color: isOpen ? meta.color : Colors.text }]} numberOfLines={2}>
                            {sec.title_ar}
                          </Text>
                          <View style={[s.secNum, { backgroundColor: meta.bg }]}>
                            <Text style={[s.secNumTxt, { color: meta.color }]}>{secIdx + 1}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 3 }}>
                          <Text style={s.secMeta}>{secDone}/{sec.lessons.length} درس</Text>
                          {allDone && <Text style={{ color: Colors.green, fontSize: 11, fontWeight: '700' }}>✓ مكتمل</Text>}
                        </View>
                      </View>
                      <View style={{ alignItems: 'center', gap: 4, marginLeft: 10 }}>
                        <View style={[s.miniRing, { borderColor: allDone ? Colors.green : meta.color + '50' }]}>
                          <Text style={{ fontSize: 10, fontWeight: '900', color: allDone ? Colors.green : meta.color }}>{secPct}%</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: isOpen ? meta.color : '#94a3b8' }}>{isOpen ? '▲' : '▼'}</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Lessons */}
                    {isOpen && (
                      <View style={[s.secBody, { borderColor: meta.color + '30' }]}>
                        <View style={[s.accentBar, { backgroundColor: meta.color }]} />
                        <View style={{ flex: 1 }}>
                          {sec.lessons.map((lesson: any, i: number) => {
                            const globalIdx = allLessons.findIndex((l: any) => l.id === lesson.id)
                            const done      = completedSet.has(lesson.id)
                            const locked    = globalIdx > 0 && !done && !completedSet.has(allLessons[globalIdx - 1]?.id)
                            return (
                              <TouchableOpacity key={lesson.id}
                                style={[s.lessonRow, done && { backgroundColor: meta.bg }, i < sec.lessons.length - 1 && s.lessonBorder, locked && { opacity: 0.45 }]}
                                onPress={() => !locked && router.push(('/lesson/' + lesson.id) as any)}
                                disabled={locked} activeOpacity={0.75}>
                                <View style={[s.lessonIcon, {
                                  backgroundColor: done ? meta.color : locked ? '#e2e8f0' : 'transparent',
                                  borderColor: done ? meta.color : locked ? '#cbd5e1' : meta.color + '60',
                                }]}>
                                  <Text style={{ fontSize: 12, fontWeight: '900', color: done ? '#fff' : locked ? '#94a3b8' : meta.color }}>
                                    {done ? '✓' : locked ? '🔒' : String(i + 1)}
                                  </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[s.lessonTitle, locked && { color: '#94a3b8' }]}>{lesson.title_ar}</Text>
                                  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-end', marginTop: 3 }}>
                                    <Text style={s.lessonMeta}>⏱️ {Math.floor((lesson.video_duration_seconds || 600) / 60)}د</Text>
                                    <Text style={[s.lessonMeta, { color: done ? Colors.green : meta.color, fontWeight: '800' }]}>+{lesson.xp_reward} XP</Text>
                                  </View>
                                </View>
                                {!locked && <Text style={{ fontSize: 15, color: done ? Colors.green : meta.color }}>{done ? '✓' : '←'}</Text>}
                              </TouchableOpacity>
                            )
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                )
              })
            )}
          </>
        )}

        {/* ══ NO ENROLLED COURSES ══ */}
        {enrolledRoadmaps.length === 0 && (
          <View style={s.noEnrollCard}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>📚</Text>
            <Text style={s.noEnrollTitle}>ابدأ رحلة التعلم!</Text>
            <Text style={s.noEnrollSub}>اشترك في كورس وابدأ رحلتك مع التعلم والتحديات</Text>
          </View>
        )}

        {/* ══ ALL COURSES (enrolled shown with ✓, unenrolled CTA) ══ */}
        <View style={s.allCoursesSection}>
          <Text style={s.allCoursesTitle}>🎓 الكورسات المتاحة</Text>
          {roadmaps.map(rm => {
            const m        = ROADMAP_META[rm.slug as keyof typeof ROADMAP_META]
            const isEnr    = enrolledIds.has(rm.id)
            return (
              <View key={rm.id} style={[s.courseCard, { borderColor: isEnr ? (m?.color + '60' || Colors.border) : Colors.border }]}>
                <View style={s.courseCardRow}>
                  <View style={[s.courseCardIcon, { backgroundColor: m?.bg || '#f1f5f9' }]}>
                    <Text style={{ fontSize: 28 }}>{m?.emoji || '📘'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.courseCardTitle}>{m?.label || rm.title_ar}</Text>
                    <Text style={s.courseCardSub} numberOfLines={2}>{rm.description_ar || ''}</Text>
                    {isEnr ? (
                      <View style={[s.enrolledBadge, { backgroundColor: Colors.green + '20' }]}>
                        <Text style={{ color: Colors.green, fontSize: 11, fontWeight: '800' }}>✓ مشترك</Text>
                      </View>
                    ) : (
                      <Text style={[s.courseCardPrice, { color: m?.color || Colors.blue }]}>
                        {rm.price_egp > 0 ? `${rm.price_egp?.toLocaleString()} ج.م` : 'مجاني'}
                      </Text>
                    )}
                  </View>
                </View>
                {isEnr ? (
                  <TouchableOpacity style={[s.courseCardBtn, { backgroundColor: m?.color || Colors.blue }]}
                    onPress={() => { setSelected(rm.id); }}>
                    <Text style={s.courseCardBtnTxt}>▶ متابعة الكورس</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[s.courseCardBtn, { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: Colors.border }]}
                    onPress={() => Linking.openURL(SUPPORT_WHATSAPP)}>
                    <Text style={[s.courseCardBtnTxt, { color: Colors.text }]}>💬 تواصل مع الدعم للاشتراك</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:           { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: Colors.border },
  headerTitle:      { fontSize: 22, fontWeight: '900', color: Colors.text },

  tabs:             { flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabsContent:      { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  tab:              { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 2, borderColor: Colors.border },
  tabTxt:           { fontSize: 13, fontWeight: '700', color: Colors.text, maxWidth: 120 },

  scroll:           { padding: 14 },

  // Enrolled header
  courseHeader:     { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 14, borderWidth: 2 },
  courseRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  courseIcon:       { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  courseTitle:      { fontSize: 16, fontWeight: '900', color: Colors.text, textAlign: 'right' },
  courseSub:        { fontSize: 12, color: Colors.textSub, marginTop: 2, textAlign: 'right' },
  pctBadge:         { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  pctTxt:           { fontSize: 16, fontWeight: '900' },
  progressBg:       { height: 8, backgroundColor: Colors.border, borderRadius: 99, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 99 },

  // Sections
  sectionWrapper:   { marginBottom: 8 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 14, borderWidth: 2 },
  secNum:           { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  secNumTxt:        { fontSize: 11, fontWeight: '900' },
  secTitle:         { fontSize: 13, fontWeight: '800', textAlign: 'right', flexShrink: 1 },
  secMeta:          { fontSize: 11, color: Colors.textSub },
  miniRing:         { width: 40, height: 40, borderRadius: 20, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  secBody:          { borderWidth: 2, borderTopWidth: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#fff' },
  accentBar:        { width: 4, borderRadius: 2, margin: 5 },
  lessonRow:        { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 10 },
  lessonBorder:     { borderBottomWidth: 1, borderBottomColor: Colors.border },
  lessonIcon:       { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, flexShrink: 0 },
  lessonTitle:      { fontSize: 13, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  lessonMeta:       { fontSize: 10, color: Colors.textSub },

  // Empty
  emptyCard:        { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 2, borderColor: Colors.border, marginBottom: 14 },
  emptyTxt:         { fontSize: 15, fontWeight: '700', color: Colors.textSub },

  // No enroll
  noEnrollCard:     { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: Colors.border },
  noEnrollTitle:    { fontSize: 20, fontWeight: '900', color: Colors.text, marginBottom: 8 },
  noEnrollSub:      { fontSize: 13, color: Colors.textSub, textAlign: 'center', lineHeight: 20 },

  // All courses
  allCoursesSection:{ marginTop: 10 },
  allCoursesTitle:  { fontSize: 17, fontWeight: '900', color: Colors.text, marginBottom: 12, textAlign: 'right' },
  courseCard:       { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 2 },
  courseCardRow:    { flexDirection: 'row', gap: 12, marginBottom: 12 },
  courseCardIcon:   { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  courseCardTitle:  { fontSize: 15, fontWeight: '900', color: Colors.text, textAlign: 'right', marginBottom: 4 },
  courseCardSub:    { fontSize: 12, color: Colors.textSub, textAlign: 'right', lineHeight: 18 },
  courseCardPrice:  { fontSize: 14, fontWeight: '800', marginTop: 4, textAlign: 'right' },
  enrolledBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end', marginTop: 4 },
  courseCardBtn:    { borderRadius: 12, padding: 12, alignItems: 'center' },
  courseCardBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
})
