import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, LayoutAnimation, Platform, UIManager,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors, ROADMAP_META } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { user } = useAuth()
  const { isAr } = useLang()

  const [roadmap, setRoadmap]         = useState<any>(null)
  const [enrolled, setEnrolled]       = useState(false)
  const [lessons, setLessons]         = useState<any[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading]         = useState(true)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  const meta = slug ? ROADMAP_META[slug as keyof typeof ROADMAP_META] : null

  useEffect(() => { if (slug && user) load() }, [slug, user])

  const load = async () => {
    setLoading(true)
    const { data: rm } = await supabase.from('roadmaps').select('*').eq('slug', slug).single()
    setRoadmap(rm)

    const now = new Date()
    const { data: enrollment } = await supabase
      .from('course_enrollments').select('id, expires_at')
      .eq('user_id', user!.id).eq('roadmap_id', rm?.id).eq('is_active', true).maybeSingle()

    const validEnrolled = enrollment
      ? (!enrollment.expires_at || new Date(enrollment.expires_at) > now) : false
    setEnrolled(validEnrolled)

    if (validEnrolled && rm) {
      const [{ data: ls }, { data: lp }] = await Promise.all([
        supabase.from('lessons')
          .select('*, sections(id, title_ar, sort_order, description_ar)')
          .eq('roadmap_id', rm.id).eq('is_active', true).order('sort_order'),
        supabase.from('user_lesson_progress')
          .select('lesson_id').eq('user_id', user!.id).eq('completed', true),
      ])
      const fetchedLessons = ls || []
      setLessons(fetchedLessons)
      setCompletedIds(new Set(lp?.map((l: any) => l.lesson_id) || []))

      // Group sections and open the first incomplete one by default
      const secIds = [...new Set(fetchedLessons.map((l: any) => l.section_id || '__none__'))]
      const completedSet = new Set(lp?.map((l: any) => l.lesson_id) || [])
      const firstIncomplete = secIds.find(secId => {
        const secLessons = fetchedLessons.filter((l: any) => (l.section_id || '__none__') === secId)
        return secLessons.some((l: any) => !completedSet.has(l.id))
      })
      if (firstIncomplete) setOpenSections(new Set([firstIncomplete]))
      else if (secIds.length > 0) setOpenSections(new Set([secIds[0]]))
    }
    setLoading(false)
  }

  const toggleSection = (secId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(secId)) next.delete(secId)
      else next.add(secId)
      return next
    })
  }

  if (loading) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}><ActivityIndicator color={meta?.color || Colors.blue} size="large" /></View>
    </SafeAreaView>
  )

  if (!roadmap || !meta) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>😕</Text>
        <Text style={s.errorText}>{isAr ? 'الكورس غير موجود' : 'Course not found'}</Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: Colors.blue }]} onPress={() => router.back()}>
          <Text style={s.btnText}>{isAr ? '← رجوع' : '← Back'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  const completedCount = lessons.filter(l => completedIds.has(l.id)).length
  const pct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0

  // Group lessons by section, sort by sort_order
  const sectionsMap: Record<string, any[]> = {}
  for (const lesson of lessons) {
    const key = lesson.section_id || '__none__'
    if (!sectionsMap[key]) sectionsMap[key] = []
    sectionsMap[key].push(lesson)
  }
  const sortedSectionEntries = Object.entries(sectionsMap).sort(([aKey, aLessons], [bKey, bLessons]) => {
    if (aKey === '__none__') return 1
    if (bKey === '__none__') return -1
    const aOrder = (aLessons[0] as any)?.sections?.sort_order || 999
    const bOrder = (bLessons[0] as any)?.sections?.sort_order || 999
    return aOrder - bOrder
  })

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {meta.emoji} {isAr ? meta.label : roadmap.title_ar}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Hero */}
        <View style={[s.hero, { backgroundColor: meta.bg }]}>
          <Text style={s.heroEmoji}>{meta.emoji}</Text>
          <Text style={[s.heroTitle, { color: meta.color }]}>
            {isAr ? meta.label : roadmap.title_ar}
          </Text>
          {roadmap.description_ar && (
            <Text style={s.heroDesc}>{roadmap.description_ar}</Text>
          )}
        </View>

        {enrolled ? (
          <>
            {/* Progress bar */}
            <View style={[s.progressCard, { borderColor: meta.color + '30' }]}>
              <View style={s.progressRow}>
                <Text style={s.progressLabel}>{isAr ? 'تقدمك في الكورس' : 'Your Progress'}</Text>
                <Text style={[s.progressPct, { color: meta.color }]}>{pct}%</Text>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: meta.color }]} />
              </View>
              <Text style={s.progressSub}>
                {completedCount} / {lessons.length} {isAr ? 'درس مكتمل' : 'lessons done'}
              </Text>
            </View>

            {lessons.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🔜</Text>
                <Text style={s.emptyText}>{isAr ? 'الدروس قادمة قريباً' : 'Lessons coming soon'}</Text>
              </View>
            ) : (
              // ── Sections accordion ──
              sortedSectionEntries.map(([secId, secLessons], secIdx) => {
                const secInfo   = secId === '__none__' ? null : (secLessons[0] as any)?.sections
                const isOpen    = openSections.has(secId)
                const secDone   = (secLessons as any[]).filter(l => completedIds.has(l.id)).length
                const secTotal  = (secLessons as any[]).length
                const secPct    = Math.round((secDone / secTotal) * 100)
                const allDone   = secDone === secTotal

                // Compute global offset for locked logic
                const globalOffset = lessons.indexOf(secLessons[0])

                return (
                  <View key={secId} style={[s.sectionWrapper, allDone && { opacity: 0.85 }]}>
                    {/* Section toggle header */}
                    <TouchableOpacity
                      style={[s.sectionHeader, {
                        borderColor: meta.color + '40',
                        backgroundColor: isOpen ? meta.bg : '#fff',
                        borderBottomLeftRadius: isOpen ? 0 : 14,
                        borderBottomRightRadius: isOpen ? 0 : 14,
                      }]}
                      onPress={() => toggleSection(secId)}
                      activeOpacity={0.8}
                    >
                      {/* Right side: number + title */}
                      <View style={{ flex: 1 }}>
                        {secInfo ? (
                          <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                              <Text style={[s.sectionTitle, { color: isOpen ? meta.color : Colors.text }]}>
                                {secInfo.title_ar}
                              </Text>
                              <View style={[s.sectionNumBadge, { backgroundColor: meta.bg }]}>
                                <Text style={[s.sectionNumText, { color: meta.color }]}>{secIdx + 1}</Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                              <Text style={s.sectionMeta}>
                                {secDone}/{secTotal} {isAr ? 'درس' : 'lessons'}
                              </Text>
                              {allDone && <Text style={{ color: Colors.green, fontSize: 12, fontWeight: '700' }}>✓ مكتمل</Text>}
                            </View>
                          </>
                        ) : (
                          <Text style={[s.sectionTitle, { color: isOpen ? meta.color : Colors.text }]}>
                            {isAr ? 'دروس عامة' : 'General Lessons'}
                          </Text>
                        )}
                      </View>

                      {/* Left side: mini progress + chevron */}
                      <View style={{ alignItems: 'center', gap: 4 }}>
                        {/* Mini circular progress */}
                        <View style={[s.miniProgress, { borderColor: allDone ? Colors.green : meta.color + '40' }]}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: allDone ? Colors.green : meta.color }}>
                            {secPct}%
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, color: isOpen ? meta.color : Colors.textSub, marginTop: 2 }}>
                          {isOpen ? '▲' : '▼'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Lessons list — only when open */}
                    {isOpen && (
                      <View style={[s.sectionBody, { borderColor: meta.color + '30' }]}>
                        {/* Thin color bar on left */}
                        <View style={[s.sectionAccentBar, { backgroundColor: meta.color }]} />

                        {(secLessons as any[]).map((lesson, i) => {
                          const globalIdx = globalOffset + i
                          const done      = completedIds.has(lesson.id)
                          const prevDone  = globalIdx === 0 || completedIds.has(lessons[globalIdx - 1]?.id)
                          const locked    = !done && !prevDone && globalIdx > 0

                          return (
                            <TouchableOpacity
                              key={lesson.id}
                              style={[
                                s.lessonRow,
                                done && { backgroundColor: meta.bg },
                                i < secLessons.length - 1 && s.lessonRowBorder,
                                locked && { opacity: 0.5 },
                              ]}
                              onPress={() => !locked && router.push(('/lesson/' + lesson.id) as any)}
                              disabled={locked}
                              activeOpacity={0.75}
                            >
                              {/* Status icon */}
                              <View style={[s.lessonStatusIcon, {
                                backgroundColor: done ? meta.color : locked ? Colors.border : 'transparent',
                                borderColor: done ? meta.color : locked ? Colors.border : meta.color + '50',
                              }]}>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: done ? '#fff' : locked ? Colors.textMuted : meta.color }}>
                                  {done ? '✓' : locked ? '🔒' : String(i + 1)}
                                </Text>
                              </View>

                              {/* Title + meta */}
                              <View style={{ flex: 1 }}>
                                <Text style={[s.lessonTitle, locked && { color: Colors.textMuted }]}>
                                  {lesson.title_ar}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 3 }}>
                                  <Text style={s.lessonMetaTxt}>
                                    ⏱️ {Math.floor((lesson.video_duration_seconds || 600) / 60)}{isAr ? 'د' : 'm'}
                                  </Text>
                                  <Text style={[s.lessonMetaTxt, { color: done ? Colors.green : meta.color, fontWeight: '800' }]}>
                                    +{lesson.xp_reward} XP
                                  </Text>
                                </View>
                              </View>

                              {/* Arrow */}
                              {!locked && (
                                <Text style={{ fontSize: 16, color: done ? Colors.green : meta.color }}>
                                  {done ? '✓' : '←'}
                                </Text>
                              )}
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    )}
                  </View>
                )
              })
            )}
          </>
        ) : (
          // NOT ENROLLED
          <>
            <View style={[s.priceCard, { borderColor: meta.color + '30' }]}>
              <View style={s.priceRow}>
                <View>
                  <Text style={s.priceLabel}>{isAr ? 'السعر' : 'Price'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                    <Text style={[s.price, { color: meta.color }]}>
                      {roadmap.price_egp > 0
                        ? `${roadmap.price_egp?.toLocaleString()} ج.م`
                        : (isAr ? 'مجاني' : 'Free')}
                    </Text>
                    {roadmap.original_price_egp > roadmap.price_egp && (
                      <Text style={s.originalPrice}>{roadmap.original_price_egp?.toLocaleString()} ج.م</Text>
                    )}
                  </View>
                </View>
                {roadmap.original_price_egp > roadmap.price_egp && (
                  <View style={[s.discountBadge, { backgroundColor: Colors.red }]}>
                    <Text style={s.discountText}>
                      {Math.round((1 - roadmap.price_egp / roadmap.original_price_egp) * 100)}%
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>خصم</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={s.featuresCard}>
              <Text style={[s.featuresTitle, { color: meta.color }]}>{isAr ? 'ماذا ستحصل؟' : 'What you get'}</Text>
              {[
                '✅ وصول كامل لجميع الدروس',
                '🎬 فيديوهات عالية الجودة',
                '⚡ اكسب XP وتقدم في المستويات',
                '📿 تحديات تفاعلية مع كل درس',
                '🏆 شهادة إتمام الكورس',
              ].map((f, i) => <Text key={i} style={s.featureItem}>{f}</Text>)}
            </View>

            <View style={[s.lockedBanner, { borderColor: meta.color + '40', backgroundColor: meta.bg }]}>
              <Text style={{ fontSize: 28 }}>🔒</Text>
              <Text style={[s.lockedText, { color: meta.color }]}>
                {isAr ? 'هذا الكورس للمشتركين فقط' : 'Subscribers only'}
              </Text>
            </View>
            <Text style={s.contactNote}>{isAr ? '📞 للاشتراك تواصل مع الإدارة' : '📞 Contact admin to subscribe'}</Text>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:     { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 20 },

  header:        { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: Colors.border },
  backBtn:       { width: 36, height: 36, justifyContent: 'center' },
  backText:      { fontSize: 22, color: Colors.blue, fontWeight: '700' },
  headerTitle:   { flex: 1, fontSize: 17, fontWeight: '900', color: Colors.text },

  scroll:        { padding: 16 },

  hero:          { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  heroEmoji:     { fontSize: 56, marginBottom: 10 },
  heroTitle:     { fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  heroDesc:      { fontSize: 14, color: Colors.textSub, textAlign: 'center', lineHeight: 20 },

  progressCard:  { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 2 },
  progressRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  progressPct:   { fontSize: 18, fontWeight: '900' },
  progressBg:    { height: 10, backgroundColor: Colors.border, borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  progressFill:  { height: '100%', borderRadius: 99 },
  progressSub:   { fontSize: 12, color: Colors.textSub, textAlign: 'right' },

  emptyCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 2, borderColor: Colors.border },
  emptyText:     { fontSize: 15, fontWeight: '700', color: Colors.textSub },

  // ── Accordion ──
  sectionWrapper: { marginBottom: 10, borderRadius: 14, overflow: 'hidden' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 2,
  },
  sectionNumBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  sectionNumText:  { fontSize: 12, fontWeight: '900' },
  sectionTitle:    { fontSize: 15, fontWeight: '800', textAlign: 'right' },
  sectionMeta:     { fontSize: 12, color: Colors.textSub },

  miniProgress: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
  },

  sectionBody: {
    backgroundColor: '#fff', borderWidth: 2, borderTopWidth: 0,
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    flexDirection: 'row', overflow: 'hidden',
  },
  sectionAccentBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, margin: 6 },

  lessonRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 12, backgroundColor: '#fff',
  },
  lessonRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  lessonStatusIcon: {
    width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, flexShrink: 0,
  },
  lessonTitle:  { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  lessonMetaTxt:{ fontSize: 11, color: Colors.textSub },

  // Not enrolled
  priceCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 2 },
  priceRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel:    { fontSize: 12, color: Colors.textSub, fontWeight: '600', marginBottom: 4 },
  price:         { fontSize: 28, fontWeight: '900' },
  originalPrice: { fontSize: 16, color: Colors.textSub, textDecorationLine: 'line-through' },
  discountBadge: { borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 48 },
  discountText:  { color: '#fff', fontSize: 18, fontWeight: '900' },

  featuresCard:  { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: Colors.border },
  featuresTitle: { fontSize: 16, fontWeight: '900', marginBottom: 12, textAlign: 'right' },
  featureItem:   { fontSize: 14, color: Colors.text, textAlign: 'right', lineHeight: 24 },

  lockedBanner:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16, borderWidth: 2, marginBottom: 10 },
  lockedText:    { fontSize: 15, fontWeight: '800', flex: 1, textAlign: 'right' },
  contactNote:   { fontSize: 13, color: Colors.textSub, textAlign: 'center' },

  btn:           { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 12 },
  btnText:       { color: '#fff', fontWeight: '800', fontSize: 15 },
})
