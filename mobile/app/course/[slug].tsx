import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors, ROADMAP_META } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { user } = useAuth()
  const { isAr } = useLang()

  const [roadmap, setRoadmap]     = useState<any>(null)
  const [enrolled, setEnrolled]   = useState(false)
  const [lessons, setLessons]     = useState<any[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading]     = useState(true)

  const meta = slug ? ROADMAP_META[slug as keyof typeof ROADMAP_META] : null

  useEffect(() => {
    if (!slug || !user) return
    load()
  }, [slug, user])

  const load = async () => {
    setLoading(true)
    const [
      { data: rm },
      { data: en },
    ] = await Promise.all([
      supabase.from('roadmaps').select('*').eq('slug', slug).single(),
      supabase.from('course_enrollments')
        .select('id, expires_at')
        .eq('user_id', user!.id)
        .eq('is_active', true),
    ])

    setRoadmap(rm)

    const now = new Date()
    const isEnrolled = (en || []).some((e: any) => {
      if (e.roadmap_id === rm?.id) {
        return !e.expires_at || new Date(e.expires_at) > now
      }
      return false
    })

    // Re-check properly
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id, expires_at')
      .eq('user_id', user!.id)
      .eq('roadmap_id', rm?.id)
      .eq('is_active', true)
      .maybeSingle()

    const validEnrolled = enrollment
      ? (!enrollment.expires_at || new Date(enrollment.expires_at) > now)
      : false

    setEnrolled(validEnrolled)

    if (validEnrolled && rm) {
      const [{ data: ls }, { data: lp }] = await Promise.all([
        supabase.from('lessons').select('*').eq('roadmap_id', rm.id).eq('is_active', true).order('sort_order'),
        supabase.from('user_lesson_progress').select('lesson_id').eq('user_id', user!.id).eq('completed', true),
      ])
      setLessons(ls || [])
      setCompletedIds(new Set(lp?.map((l: any) => l.lesson_id) || []))
    }

    setLoading(false)
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
            <Text style={s.heroDesc}>
              {isAr ? roadmap.description_ar : (roadmap.description || roadmap.description_ar)}
            </Text>
          )}
        </View>

        {enrolled ? (
          // ══ ENROLLED — Show Lessons ══
          <>
            {/* Progress */}
            <View style={[s.progressCard, { borderColor: meta.color + '30' }]}>
              <View style={s.progressRow}>
                <Text style={s.progressLabel}>{isAr ? 'تقدمك' : 'Progress'}</Text>
                <Text style={[s.progressPct, { color: meta.color }]}>{pct}%</Text>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: meta.color }]} />
              </View>
              <Text style={s.progressSub}>
                {completedCount} / {lessons.length} {isAr ? 'درس مكتمل' : 'lessons done'}
              </Text>
            </View>

            {/* Lessons */}
            {lessons.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🔜</Text>
                <Text style={s.emptyText}>{isAr ? 'الدروس قادمة قريباً' : 'Lessons coming soon'}</Text>
              </View>
            ) : (
              lessons.map((lesson, i) => {
                const done     = completedIds.has(lesson.id)
                const prevDone = i === 0 || completedIds.has(lessons[i-1].id)
                const locked   = !done && !prevDone && i > 0
                return (
                  <TouchableOpacity
                    key={lesson.id}
                    style={[s.lessonCard, done && { borderColor: meta.color, borderWidth: 2 }, locked && { opacity: 0.6 }]}
                    onPress={() => !locked && router.push(`/lesson/${lesson.id}` as any)}
                    disabled={locked}
                    activeOpacity={locked ? 1 : 0.8}>
                    <View style={[s.lessonNum, {
                      backgroundColor: done ? meta.color : locked ? Colors.border : meta.bg,
                      borderColor: done ? meta.color : locked ? Colors.border : meta.color + '60',
                    }]}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: done ? '#fff' : locked ? Colors.textMuted : meta.color }}>
                        {done ? '✓' : locked ? '🔒' : String(i + 1)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.lessonTitle, locked && { color: Colors.textMuted }]}>
                        {isAr ? lesson.title_ar : (lesson.title || lesson.title_ar)}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                        <Text style={s.lessonMeta}>⏱️ {Math.floor((lesson.video_duration_seconds || 600) / 60)}{isAr ? 'د' : 'm'}</Text>
                        <Text style={[s.lessonMeta, { color: done ? Colors.green : meta.color, fontWeight: '800' }]}>+{lesson.xp_reward} XP</Text>
                      </View>
                    </View>
                    {!locked && !done && <Text style={{ fontSize: 18, color: meta.color }}>←</Text>}
                  </TouchableOpacity>
                )
              })
            )}
          </>
        ) : (
          // ══ NOT ENROLLED — Show Price ══
          <>
            {/* Price Card */}
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

            {/* Features */}
            <View style={s.featuresCard}>
              <Text style={[s.featuresTitle, { color: meta.color }]}>
                {isAr ? 'ماذا ستحصل؟' : 'What you get'}
              </Text>
              {[
                isAr ? '✅ وصول كامل لجميع الدروس' : '✅ Full access to all lessons',
                isAr ? '🎬 فيديوهات Vimeo عالية الجودة' : '🎬 High-quality Vimeo videos',
                isAr ? '⚡ اكسب XP وتقدم في المستويات' : '⚡ Earn XP and level up',
                isAr ? '📿 تحديات جماعية مع الزملاء' : '📿 Group challenges with peers',
                isAr ? '🏆 شهادة إتمام الكورس' : '🏆 Completion certificate',
              ].map((f, i) => (
                <Text key={i} style={s.featureItem}>{f}</Text>
              ))}
            </View>

            {/* CTA */}
            <View style={[s.lockedBanner, { borderColor: meta.color + '40', backgroundColor: meta.bg }]}>
              <Text style={{ fontSize: 28 }}>🔒</Text>
              <Text style={[s.lockedText, { color: meta.color }]}>
                {isAr ? 'هذا الكورس للمشتركين فقط' : 'Subscribers only'}
              </Text>
            </View>
            <Text style={s.contactNote}>
              {isAr
                ? '📞 للاشتراك تواصل مع الإدارة'
                : '📞 Contact admin to subscribe'}
            </Text>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:    { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 20 },

  header:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: Colors.border },
  backBtn:      { width: 36, height: 36, justifyContent: 'center' },
  backText:     { fontSize: 22, color: Colors.blue, fontWeight: '700' },
  headerTitle:  { flex: 1, fontSize: 17, fontWeight: '900', color: Colors.text },

  scroll:       { padding: 16 },

  hero:         { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  heroEmoji:    { fontSize: 56, marginBottom: 10 },
  heroTitle:    { fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  heroDesc:     { fontSize: 14, color: Colors.textSub, textAlign: 'center', lineHeight: 20 },

  progressCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 2 },
  progressRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel:{ fontSize: 14, fontWeight: '700', color: Colors.text },
  progressPct:  { fontSize: 18, fontWeight: '900' },
  progressBg:   { height: 10, backgroundColor: Colors.border, borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 99 },
  progressSub:  { fontSize: 12, color: Colors.textSub, textAlign: 'right' },

  emptyCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 2, borderColor: Colors.border },
  emptyText:    { fontSize: 15, fontWeight: '700', color: Colors.textSub },

  lessonCard:   { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lessonNum:    { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, flexShrink: 0 },
  lessonTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text, textAlign: 'right', marginBottom: 5 },
  lessonMeta:   { fontSize: 11, color: Colors.textSub },

  priceCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 2 },
  priceRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel:   { fontSize: 12, color: Colors.textSub, fontWeight: '600', marginBottom: 4 },
  price:        { fontSize: 28, fontWeight: '900' },
  originalPrice:{ fontSize: 16, color: Colors.textSub, textDecorationLine: 'line-through' },
  discountBadge:{ borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 48 },
  discountText: { color: '#fff', fontSize: 18, fontWeight: '900' },

  featuresCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: Colors.border },
  featuresTitle:{ fontSize: 16, fontWeight: '900', marginBottom: 12, textAlign: 'right' },
  featureItem:  { fontSize: 14, color: Colors.text, textAlign: 'right', lineHeight: 22 },

  lockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16, borderWidth: 2, marginBottom: 10 },
  lockedText:   { fontSize: 15, fontWeight: '800', flex: 1, textAlign: 'right' },
  contactNote:  { fontSize: 13, color: Colors.textSub, textAlign: 'center' },

  btn:          { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnText:      { color: '#fff', fontWeight: '800', fontSize: 15 },
})
