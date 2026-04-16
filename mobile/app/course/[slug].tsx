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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { user } = useAuth()
  const { isAr } = useLang()

  const [roadmap, setRoadmap]           = useState<any>(null)
  const [enrolled, setEnrolled]         = useState(false)
  const [sections, setSections]         = useState<any[]>([])   // [{section, lessons[]}]
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading]           = useState(true)
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
      // Fetch sections sorted by sort_order
      const [{ data: secs }, { data: ls }, { data: lp }] = await Promise.all([
        supabase.from('sections').select('*').eq('roadmap_id', rm.id).eq('is_active', true).order('sort_order'),
        supabase.from('lessons').select('*').eq('roadmap_id', rm.id).eq('is_active', true).order('sort_order'),
        supabase.from('user_lesson_progress').select('lesson_id').eq('user_id', user!.id).eq('completed', true),
      ])

      const completedSet = new Set(lp?.map((l: any) => l.lesson_id) || [])
      setCompletedIds(completedSet)

      // Build sections with their lessons in order
      const secList = (secs || []).map((sec: any) => ({
        ...sec,
        lessons: (ls || []).filter((l: any) => l.section_id === sec.id).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })).filter((sec: any) => sec.lessons.length > 0)

      // Also catch lessons with no section
      const orphans = (ls || []).filter((l: any) => !l.section_id)
      if (orphans.length > 0) {
        secList.push({ id: '__none__', title_ar: 'دروس عامة', lessons: orphans })
      }

      setSections(secList)

      // Open first section that has an incomplete lesson
      const firstIncomplete = secList.find(sec =>
        sec.lessons.some((l: any) => !completedSet.has(l.id))
      )
      if (firstIncomplete) setOpenSections(new Set([firstIncomplete.id]))
      else if (secList.length > 0) setOpenSections(new Set([secList[0].id]))
    }
    setLoading(false)
  }

  const toggleSection = (secId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(secId) ? next.delete(secId) : next.add(secId)
      return next
    })
  }

  // Build flat ordered list for lock logic
  const allLessons = sections.flatMap(sec => sec.lessons)

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
          <Text style={s.btnText}>← رجوع</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  const totalLessons    = allLessons.length
  const completedCount  = allLessons.filter(l => completedIds.has(l.id)).length
  const pct             = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{meta.emoji} {roadmap.title_ar}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Hero */}
        <View style={[s.hero, { backgroundColor: meta.bg }]}>
          <Text style={s.heroEmoji}>{meta.emoji}</Text>
          <Text style={[s.heroTitle, { color: meta.color }]}>{roadmap.title_ar}</Text>
          {roadmap.description_ar && <Text style={s.heroDesc}>{roadmap.description_ar}</Text>}
        </View>

        {enrolled ? (
          <>
            {/* Progress */}
            <View style={[s.progressCard, { borderColor: meta.color + '30' }]}>
              <View style={s.progressRow}>
                <Text style={s.progressLabel}>تقدمك في الكورس</Text>
                <Text style={[s.progressPct, { color: meta.color }]}>{pct}%</Text>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: meta.color }]} />
              </View>
              <Text style={s.progressSub}>{completedCount} / {totalLessons} درس مكتمل</Text>
            </View>

            {sections.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🔜</Text>
                <Text style={s.emptyText}>الدروس قادمة قريباً</Text>
              </View>
            ) : (
              sections.map((sec, secIdx) => {
                const isOpen   = openSections.has(sec.id)
                const secDone  = sec.lessons.filter((l: any) => completedIds.has(l.id)).length
                const secTotal = sec.lessons.length
                const secPct   = Math.round((secDone / secTotal) * 100)
                const allDone  = secDone === secTotal

                return (
                  <View key={sec.id} style={s.sectionWrapper}>

                    {/* Section header — always tappable */}
                    <TouchableOpacity
                      style={[s.sectionHeader, {
                        borderColor: meta.color + '50',
                        backgroundColor: isOpen ? meta.bg : '#fff',
                        borderBottomLeftRadius:  isOpen ? 0 : 14,
                        borderBottomRightRadius: isOpen ? 0 : 14,
                      }]}
                      onPress={() => toggleSection(sec.id)}
                      activeOpacity={0.75}
                    >
                      {/* Section info */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                          <Text style={[s.sectionTitle, { color: isOpen ? meta.color : Colors.text }]} numberOfLines={2}>
                            {sec.title_ar}
                          </Text>
                          <View style={[s.secNumBadge, { backgroundColor: meta.bg }]}>
                            <Text style={[s.secNumTxt, { color: meta.color }]}>{secIdx + 1}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                          <Text style={s.sectionMeta}>{secDone}/{secTotal} درس</Text>
                          {allDone && <Text style={{ color: Colors.green, fontSize: 12, fontWeight: '700' }}>✓ مكتمل</Text>}
                        </View>
                      </View>

                      {/* Mini progress + chevron */}
                      <View style={{ alignItems: 'center', gap: 4, marginLeft: 10 }}>
                        <View style={[s.miniRing, { borderColor: allDone ? Colors.green : meta.color + '50' }]}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: allDone ? Colors.green : meta.color }}>
                            {secPct}%
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, color: isOpen ? meta.color : '#94a3b8' }}>
                          {isOpen ? '▲' : '▼'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Lessons — only when open */}
                    {isOpen && (
                      <View style={[s.sectionBody, { borderColor: meta.color + '30' }]}>
                        <View style={[s.accentBar, { backgroundColor: meta.color }]} />
                        <View style={{ flex: 1 }}>
                          {sec.lessons.map((lesson: any, i: number) => {
                            const globalIdx = allLessons.findIndex((l: any) => l.id === lesson.id)
                            const done      = completedIds.has(lesson.id)
                            // Unlock first lesson always; after that unlock if previous is done
                            const locked    = globalIdx > 0 && !done && !completedIds.has(allLessons[globalIdx - 1]?.id)

                            return (
                              <TouchableOpacity
                                key={lesson.id}
                                style={[
                                  s.lessonRow,
                                  done && { backgroundColor: meta.bg },
                                  i < sec.lessons.length - 1 && s.lessonBorder,
                                  locked && { opacity: 0.45 },
                                ]}
                                onPress={() => !locked && router.push(('/lesson/' + lesson.id) as any)}
                                disabled={locked}
                                activeOpacity={0.75}
                              >
                                {/* Status circle */}
                                <View style={[s.lessonIcon, {
                                  backgroundColor: done ? meta.color : locked ? '#e2e8f0' : 'transparent',
                                  borderColor: done ? meta.color : locked ? '#cbd5e1' : meta.color + '60',
                                }]}>
                                  <Text style={{ fontSize: 13, fontWeight: '900', color: done ? '#fff' : locked ? '#94a3b8' : meta.color }}>
                                    {done ? '✓' : locked ? '🔒' : String(i + 1)}
                                  </Text>
                                </View>

                                {/* Title + meta */}
                                <View style={{ flex: 1 }}>
                                  <Text style={[s.lessonTitle, locked && { color: '#94a3b8' }]}>
                                    {lesson.title_ar}
                                  </Text>
                                  <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 3 }}>
                                    <Text style={s.lessonMeta}>
                                      ⏱️ {Math.floor((lesson.video_duration_seconds || 600) / 60)}د
                                    </Text>
                                    <Text style={[s.lessonMeta, { color: done ? Colors.green : meta.color, fontWeight: '800' }]}>
                                      +{lesson.xp_reward} XP
                                    </Text>
                                  </View>
                                </View>

                                {!locked && (
                                  <Text style={{ fontSize: 16, color: done ? Colors.green : meta.color }}>
                                    {done ? '✓' : '←'}
                                  </Text>
                                )}
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
        ) : (
          /* NOT ENROLLED */
          <>
            <View style={[s.priceCard, { borderColor: meta.color + '30' }]}>
              <View style={s.priceRow}>
                <View>
                  <Text style={s.priceLabel}>السعر</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                    <Text style={[s.price, { color: meta.color }]}>
                      {roadmap.price_egp > 0 ? `${roadmap.price_egp?.toLocaleString()} ج.م` : 'مجاني'}
                    </Text>
                    {roadmap.original_price_egp > roadmap.price_egp && (
                      <Text style={s.originalPrice}>{roadmap.original_price_egp?.toLocaleString()} ج.م</Text>
                    )}
                  </View>
                </View>
                {roadmap.original_price_egp > roadmap.price_egp && (
                  <View style={[s.discountBadge, { backgroundColor: Colors.red }]}>
                    <Text style={s.discountText}>{Math.round((1 - roadmap.price_egp / roadmap.original_price_egp) * 100)}%</Text>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>خصم</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={s.featuresCard}>
              <Text style={[s.featuresTitle, { color: meta.color }]}>ماذا ستحصل؟</Text>
              {['✅ وصول كامل لجميع الدروس','🎬 فيديوهات عالية الجودة','⚡ اكسب XP وتقدم في المستويات','📿 تحديات تفاعلية مع كل درس','🏆 شهادة إتمام الكورس'].map((f, i) => (
                <Text key={i} style={s.featureItem}>{f}</Text>
              ))}
            </View>

            <View style={[s.lockedBanner, { borderColor: meta.color + '40', backgroundColor: meta.bg }]}>
              <Text style={{ fontSize: 28 }}>🔒</Text>
              <Text style={[s.lockedText, { color: meta.color }]}>هذا الكورس للمشتركين فقط</Text>
            </View>
            <Text style={s.contactNote}>📞 للاشتراك تواصل مع الإدارة</Text>
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

  // Sections
  sectionWrapper: { marginBottom: 10 },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 2 },
  secNumBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  secNumTxt:      { fontSize: 12, fontWeight: '900' },
  sectionTitle:   { fontSize: 14, fontWeight: '800', textAlign: 'right', flexShrink: 1 },
  sectionMeta:    { fontSize: 12, color: Colors.textSub },
  miniRing:       { width: 44, height: 44, borderRadius: 22, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },

  sectionBody:   { borderWidth: 2, borderTopWidth: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#fff' },
  accentBar:     { width: 4, borderRadius: 2, margin: 6 },

  lessonRow:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 12 },
  lessonBorder:  { borderBottomWidth: 1, borderBottomColor: Colors.border },
  lessonIcon:    { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, flexShrink: 0 },
  lessonTitle:   { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  lessonMeta:    { fontSize: 11, color: Colors.textSub },

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
