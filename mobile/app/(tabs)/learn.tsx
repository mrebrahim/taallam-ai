import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors, ROADMAP_META } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

export default function LearnScreen() {
  const { user } = useAuth()
  const { isAr } = useLang()

  const [roadmaps, setRoadmaps]               = useState<any[]>([])
  const [enrolledIds, setEnrolledIds]         = useState<Set<string>>(new Set())
  const [lessons, setLessons]                 = useState<Record<string, any[]>>({})
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  const [selected, setSelected]               = useState<string | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [loadingLessons, setLoadingLessons]   = useState(false)

  // ── Load roadmaps + enrollments ──────────────────────────
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [
        { data: rm },
        { data: en },
        { data: lp },
      ] = await Promise.all([
        supabase.from('roadmaps').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('course_enrollments')
          .select('roadmap_id, expires_at')
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase.from('user_lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('completed', true),
      ])

      setRoadmaps(rm || [])
      setCompletedLessons(new Set(lp?.map((d: any) => d.lesson_id) || []))

      // Only count non-expired enrollments
      const now = new Date()
      const valid = (en || []).filter((e: any) =>
        !e.expires_at || new Date(e.expires_at) > now
      )
      const validIds = new Set<string>(valid.map((e: any) => e.roadmap_id))
      setEnrolledIds(validIds)

      // Auto-select first enrolled roadmap
      const firstEnrolled = rm?.find((r: any) => validIds.has(r.id))
      setSelected(firstEnrolled?.slug || rm?.[0]?.slug || null)

      setLoading(false)
    }
    load()
  }, [user])

  // ── Load lessons for selected enrolled roadmap ────────────
  useEffect(() => {
    if (!selected || !user) return
    const roadmap = roadmaps.find(r => r.slug === selected)
    if (!roadmap) return

    // Only load if enrolled
    if (!enrolledIds.has(roadmap.id)) return

    // Already loaded
    if (lessons[roadmap.id]) return

    setLoadingLessons(true)
    supabase
      .from('lessons')
      .select('*')
      .eq('roadmap_id', roadmap.id)
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setLessons(prev => ({ ...prev, [roadmap.id]: data }))
        setLoadingLessons(false)
      })
  }, [selected, roadmaps, enrolledIds])

  if (loading || !user) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    </SafeAreaView>
  )

  const currentRoadmap = roadmaps.find(r => r.slug === selected)
  const isEnrolled     = currentRoadmap ? enrolledIds.has(currentRoadmap.id) : false
  const currentLessons = currentRoadmap ? (lessons[currentRoadmap.id] || []) : []
  const meta           = selected ? ROADMAP_META[selected as keyof typeof ROADMAP_META] : null
  const completedCount = currentLessons.filter(l => completedLessons.has(l.id)).length
  const pct            = currentLessons.length > 0
    ? Math.round((completedCount / currentLessons.length) * 100)
    : 0

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{isAr ? 'المسارات' : 'Courses'}</Text>
        <View style={s.pills}>
          <View style={[s.pill, { backgroundColor: Colors.orangeL }]}>
            <Text style={[s.pillTxt, { color: '#A56644' }]}>🔥 {user.streak_current || 0}</Text>
          </View>
          <View style={[s.pill, { backgroundColor: Colors.blueL }]}>
            <Text style={[s.pillTxt, { color: '#1453A3' }]}>⚡ {(user.xp_total || 0).toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* ── Roadmap Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabs}
        contentContainerStyle={s.tabsContent}>
        {roadmaps.map(r => {
          const m       = ROADMAP_META[r.slug as keyof typeof ROADMAP_META]
          const active  = selected === r.slug
          const enrolled = enrolledIds.has(r.id)
          return (
            <TouchableOpacity
              key={r.id}
              onPress={() => setSelected(r.slug)}
              style={[
                s.tab,
                active && {
                  backgroundColor: m?.color || Colors.green,
                  shadowColor: m?.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                },
                !enrolled && !active && s.tabLocked,
              ]}>
              <Text style={{ fontSize: 18 }}>{m?.emoji}</Text>
              <Text style={[s.tabTxt, active && { color: '#fff' }]}>
                {isAr ? (m?.label || r.title_ar) : r.slug}
              </Text>
              {!enrolled && (
                <View style={s.lockBadge}>
                  <Text style={s.lockBadgeText}>🔒</Text>
                </View>
              )}
              {enrolled && !active && (
                <View style={[s.enrolledDot, { backgroundColor: m?.color }]} />
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* ── Content ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {!currentRoadmap ? (
          <View style={s.center}>
            <ActivityIndicator color={Colors.green} />
          </View>
        ) : isEnrolled ? (
          // ══ ENROLLED — Show Lessons ══
          <>
            {/* Roadmap Header */}
            <View style={[s.roadmapHeader, { borderColor: meta?.color + '40' || Colors.border }]}>
              <View style={s.roadmapRow}>
                <View style={[s.roadmapIcon, { backgroundColor: meta?.bg }]}>
                  <Text style={{ fontSize: 26 }}>{meta?.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.roadmapTitle}>
                    {isAr ? (meta?.label || currentRoadmap.title_ar) : currentRoadmap.title_ar}
                  </Text>
                  <Text style={s.roadmapSub}>
                    {currentLessons.length} {isAr ? 'درس' : 'lessons'} · {completedCount} {isAr ? 'مكتمل' : 'done'}
                  </Text>
                </View>
                <View style={[s.pctBadge, { backgroundColor: meta?.bg }]}>
                  <Text style={[s.pctText, { color: meta?.color }]}>{pct}%</Text>
                </View>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: meta?.color }]} />
              </View>
            </View>

            {/* Lessons List */}
            {loadingLessons ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator color={meta?.color || Colors.blue} />
              </View>
            ) : currentLessons.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🔜</Text>
                <Text style={s.emptyTxt}>{isAr ? 'الدروس قادمة قريباً' : 'Lessons coming soon'}</Text>
              </View>
            ) : (
              currentLessons.map((lesson, i) => {
                const done     = completedLessons.has(lesson.id)
                const prevDone = i === 0 || completedLessons.has(currentLessons[i-1].id)
                const locked   = !done && !prevDone && i > 0

                return (
                  <TouchableOpacity
                    key={lesson.id}
                    style={[
                      s.lessonCard,
                      done && { borderColor: meta?.color, borderWidth: 2 },
                      locked && { opacity: 0.6 },
                    ]}
                    onPress={() => !locked && router.push(`/lesson/${lesson.id}` as any)}
                    disabled={locked}
                    activeOpacity={locked ? 1 : 0.8}>

                    {/* Lesson number indicator */}
                    <View style={[
                      s.lessonNum,
                      {
                        backgroundColor: done ? meta?.color : locked ? Colors.border : meta?.bg,
                        borderColor: done ? meta?.color : locked ? Colors.border : meta?.color + '60',
                      }
                    ]}>
                      <Text style={{
                        fontSize: done ? 16 : 14,
                        fontWeight: '800',
                        color: done ? '#fff' : locked ? Colors.textMuted : meta?.color,
                      }}>
                        {done ? '✓' : locked ? '🔒' : lesson.lesson_type === 'video' ? '▶' : String(i + 1)}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[s.lessonTitle, locked && { color: Colors.textMuted }]}>
                        {isAr ? lesson.title_ar : (lesson.title || lesson.title_ar)}
                      </Text>
                      <View style={s.lessonMeta}>
                        <Text style={s.lessonMetaTxt}>
                          ⏱️ {Math.floor((lesson.video_duration_seconds || 600) / 60)}{isAr ? 'د' : 'm'}
                        </Text>
                        {lesson.vimeo_id || lesson.vimeo_url ? (
                          <Text style={[s.lessonMetaTxt, { color: '#1AB7EA' }]}>🎬 Vimeo</Text>
                        ) : lesson.video_url ? (
                          <Text style={[s.lessonMetaTxt, { color: '#FF0000' }]}>▶ YT</Text>
                        ) : null}
                        <Text style={[s.lessonXp, { color: done ? Colors.green : meta?.color }]}>
                          +{lesson.xp_reward} XP
                        </Text>
                      </View>
                    </View>

                    {!locked && !done && (
                      <Text style={{ fontSize: 18, color: meta?.color }}>←</Text>
                    )}
                  </TouchableOpacity>
                )
              })
            )}
          </>
        ) : (
          // ══ NOT ENROLLED — Show Locked with Price ══
          <View style={s.lockedContainer}>
            {/* Course info */}
            <View style={[s.lockedHeader, { backgroundColor: meta?.bg || '#f5f5f5' }]}>
              <Text style={{ fontSize: 56, marginBottom: 8 }}>{meta?.emoji || '📚'}</Text>
              <Text style={[s.lockedTitle, { color: meta?.color }]}>
                {isAr ? (meta?.label || currentRoadmap.title_ar) : currentRoadmap.title_ar}
              </Text>
              {(currentRoadmap.description_ar || meta?.desc) && (
                <Text style={s.lockedDesc}>
                  {isAr
                    ? (currentRoadmap.description_ar || meta?.desc)
                    : (currentRoadmap.description || currentRoadmap.description_ar || meta?.desc)}
                </Text>
              )}
            </View>

            {/* Price card */}
            <View style={s.priceCard}>
              <View style={s.priceRow}>
                <View>
                  <Text style={s.priceLabel}>{isAr ? 'السعر' : 'Price'}</Text>
                  <View style={s.priceNumbers}>
                    <Text style={[s.price, { color: meta?.color }]}>
                      {currentRoadmap.price_egp > 0
                        ? `${currentRoadmap.price_egp.toLocaleString()} ج.م`
                        : (isAr ? 'مجاني' : 'Free')}
                    </Text>
                    {currentRoadmap.original_price_egp > 0 && currentRoadmap.original_price_egp > currentRoadmap.price_egp && (
                      <Text style={s.originalPrice}>
                        {currentRoadmap.original_price_egp.toLocaleString()} ج.م
                      </Text>
                    )}
                  </View>
                </View>
                {currentRoadmap.original_price_egp > currentRoadmap.price_egp && (
                  <View style={[s.discountBadge, { backgroundColor: Colors.red }]}>
                    <Text style={s.discountText}>
                      {Math.round((1 - currentRoadmap.price_egp / currentRoadmap.original_price_egp) * 100)}%
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>خصم</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Features */}
            <View style={s.featuresCard}>
              {[
                isAr ? '✅ وصول كامل لجميع الدروس' : '✅ Full access to all lessons',
                isAr ? '🎬 فيديوهات Vimeo عالية الجودة' : '🎬 High-quality Vimeo videos',
                isAr ? '⚡ اكسب XP وتقدم في المستويات' : '⚡ Earn XP and level up',
                isAr ? '📿 تحديات جماعية مع الزملاء' : '📿 Group challenges with peers',
                isAr ? '🏆 شهادة إتمام الكورس' : '🏆 Course completion certificate',
              ].map((f, i) => (
                <Text key={i} style={s.featureItem}>{f}</Text>
              ))}
            </View>

            {/* CTA */}
            <View style={s.ctaSection}>
              <Text style={s.ctaNote}>
                {isAr
                  ? 'للاشتراك تواصل مع الإدارة عبر واتساب'
                  : 'Contact admin via WhatsApp to subscribe'}
              </Text>
              <View style={[s.lockedBanner, { borderColor: meta?.color + '40', backgroundColor: meta?.bg }]}>
                <Text style={{ fontSize: 28 }}>🔒</Text>
                <Text style={[s.lockedBannerText, { color: meta?.color }]}>
                  {isAr ? 'هذا الكورس للمشتركين فقط' : 'This course is for subscribers only'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle:  { fontSize: 22, fontWeight: '900', color: Colors.text },
  pills:        { flexDirection: 'row', gap: 8 },
  pill:         { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
  pillTxt:      { fontSize: 13, fontWeight: '800' },

  // Tabs
  tabs:         { flexGrow: 0 },
  tabsContent:  { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: Colors.border, position: 'relative' },
  tabLocked:    { opacity: 0.7 },
  tabTxt:       { fontSize: 13, fontWeight: '700', color: Colors.text },
  lockBadge:    { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  lockBadgeText:{ fontSize: 9 },
  enrolledDot:  { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4 },

  scrollContent:{ padding: 16 },

  // Roadmap header (enrolled)
  roadmapHeader:{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 2 },
  roadmapRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  roadmapIcon:  { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  roadmapTitle: { fontSize: 17, fontWeight: '900', color: Colors.text, textAlign: 'right' },
  roadmapSub:   { fontSize: 12, color: Colors.textSub, marginTop: 2, textAlign: 'right' },
  pctBadge:     { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  pctText:      { fontSize: 16, fontWeight: '900' },
  progressBg:   { height: 10, backgroundColor: Colors.border, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },

  // Lesson card
  lessonCard:   { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lessonNum:    { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, flexShrink: 0 },
  lessonTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text, textAlign: 'right', marginBottom: 5 },
  lessonMeta:   { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  lessonMetaTxt:{ fontSize: 11, color: Colors.textSub },
  lessonXp:     { fontSize: 11, fontWeight: '800' },
  emptyCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 2, borderColor: Colors.border },
  emptyTxt:     { fontSize: 15, fontWeight: '700', color: Colors.textSub },

  // Locked state
  lockedContainer:{ gap: 14 },
  lockedHeader: { borderRadius: 20, padding: 24, alignItems: 'center' },
  lockedTitle:  { fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  lockedDesc:   { fontSize: 14, color: Colors.textSub, textAlign: 'center', lineHeight: 20 },

  // Price
  priceCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 2, borderColor: Colors.border },
  priceRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel:   { fontSize: 12, color: Colors.textSub, fontWeight: '600', marginBottom: 4, textAlign: 'right' },
  priceNumbers: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  price:        { fontSize: 28, fontWeight: '900' },
  originalPrice:{ fontSize: 16, color: Colors.textSub, textDecorationLine: 'line-through' },
  discountBadge:{ borderRadius: 10, padding: 8, alignItems: 'center', justifyContent: 'center', minWidth: 48 },
  discountText: { color: '#fff', fontSize: 18, fontWeight: '900' },

  // Features
  featuresCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, borderWidth: 2, borderColor: Colors.border },
  featureItem:  { fontSize: 14, color: Colors.text, textAlign: 'right', lineHeight: 20 },

  // CTA
  ctaSection:   { gap: 10 },
  ctaNote:      { fontSize: 13, color: Colors.textSub, textAlign: 'center' },
  lockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16, borderWidth: 2 },
  lockedBannerText: { fontSize: 15, fontWeight: '800', flex: 1, textAlign: 'right' },
})
