import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Dimensions
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'
import { openCTA, loadWASettings } from '@/lib/whatsapp'

const { width } = Dimensions.get('window')
const VIDEO_H = width * 9 / 16

function getVideoInfo(url: string): { type: 'youtube' | 'vimeo' | null, id: string | null } {
  if (!url) return { type: null, id: null }
  // YouTube
  const yt = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return { type: 'youtube', id: yt[1] }
  // Vimeo
  const vm = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/)
  if (vm) return { type: 'vimeo', id: vm[1] }
  return { type: null, id: null }
}

export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { user } = useAuth()
  const { isAr } = useLang()

  const [roadmap, setRoadmap]       = useState<any>(null)
  const [enrolled, setEnrolled]     = useState(false)
  const [lessons, setLessons]       = useState<any[]>([])
  const [completedIds, setCompleted] = useState<Set<string>>(new Set())
  const [loading, setLoading]       = useState(true)
  const [showAll, setShowAll]       = useState(false)
  const PREVIEW_COUNT = 4

  useEffect(() => { if (slug) load(); loadWASettings() }, [slug])

  const load = async () => {
    setLoading(true)
    const { data: rm } = await supabase.from('roadmaps').select('*').eq('slug', slug).single()
    setRoadmap(rm)

    let validEnrolled = false
    if (user) {
      const { data: enrollment } = await supabase
        .from('course_enrollments').select('id,expires_at')
        .eq('user_id', user.id).eq('roadmap_id', rm?.id).eq('is_active', true).maybeSingle()
      validEnrolled = enrollment
        ? (!enrollment.expires_at || new Date(enrollment.expires_at) > new Date()) : false
    }
    setEnrolled(validEnrolled)

    const { data: ls } = await supabase
      .from('lessons').select('id,title,title_ar,duration_seconds,sort_order,is_free_preview')
      .eq('roadmap_id', rm?.id).eq('is_active', true).order('sort_order')
    setLessons(ls || [])

    if (validEnrolled && user) {
      const { data: lp } = await supabase
        .from('user_lesson_progress').select('lesson_id')
        .eq('user_id', user.id).eq('completed', true)
      setCompleted(new Set(lp?.map((l: any) => l.lesson_id) || []))
    }
    setLoading(false)
  }

  if (loading) return (
    <View style={s.center}><ActivityIndicator color={Colors.green} size="large" /></View>
  )
  if (!roadmap) return (
    <View style={s.center}><Text style={{ color: '#fff' }}>الكورس مش موجود</Text></View>
  )

  const videoInfo = getVideoInfo(roadmap.intro_video_url || '')
  const visibleLessons = showAll ? lessons : lessons.slice(0, PREVIEW_COUNT)
  const price = roadmap.price_egp
  const origPrice = roadmap.original_price_egp
  const levelMap: any = { beginner: '🟢 مبتدئ', intermediate: '🟡 متوسط', advanced: '🔴 متقدم' }

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>

        {/* Header */}
        <View style={s.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backTxt}>→</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>
            {isAr ? roadmap.title_ar : (roadmap.title || roadmap.title_ar)}
          </Text>
        </View>

        {/* Video or Cover Image */}
        {videoInfo.type && videoInfo.id ? (
          <View style={s.videoWrap}>
            <WebView
              style={{ width, height: VIDEO_H }}
              source={{ uri: videoInfo.type === 'vimeo'
                ? `https://player.vimeo.com/video/${videoInfo.id}?autoplay=0&title=0&byline=0&portrait=0`
                : `https://www.youtube.com/embed/${videoInfo.id}?rel=0&modestbranding=1`
              }}
              allowsFullscreenVideo
              javaScriptEnabled
            />
          </View>
        ) : (roadmap.cover_image_url || roadmap.thumbnail_url) ? (
          <Image source={{ uri: roadmap.cover_image_url || roadmap.thumbnail_url }} style={s.coverImg} resizeMode="cover" />
        ) : (
          <View style={[s.coverImg, { backgroundColor: roadmap.color_hex || '#1e293b', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 64 }}>{roadmap.icon || '📚'}</Text>
          </View>
        )}

        {/* Course Info */}
        <View style={s.infoBox}>
          <Text style={s.courseTitle}>{isAr ? roadmap.title_ar : (roadmap.title || roadmap.title_ar)}</Text>
          {roadmap.description_ar ? <Text style={s.courseDesc}>{isAr ? roadmap.description_ar : (roadmap.description || roadmap.description_ar)}</Text> : null}

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.stat}><Text style={s.statTxt}>📚 {lessons.length} درس</Text></View>
            {roadmap.level && <View style={s.stat}><Text style={s.statTxt}>{levelMap[roadmap.level] || '🟢 مبتدئ'}</Text></View>}
            {roadmap.duration_hours > 0 && <View style={s.stat}><Text style={s.statTxt}>⏱️ {roadmap.duration_hours} ساعة</Text></View>}
          </View>

          {/* Price */}
          {!enrolled && (
            <View style={s.priceRow}>
              <Text style={s.price}>{price > 0 ? `${price.toLocaleString()} ج.م` : '🎁 مجاني'}</Text>
              {origPrice > 0 && origPrice > price && (
                <Text style={s.origPrice}>{origPrice.toLocaleString()} ج.م</Text>
              )}
              {origPrice > 0 && origPrice > price && (
                <View style={s.discountBadge}>
                  <Text style={s.discountTxt}>وفّر {Math.round((1 - price/origPrice)*100)}%</Text>
                </View>
              )}
            </View>
          )}
          {enrolled && (
            <View style={[s.stat, { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#f0fdf4', borderColor: Colors.green }]}>
              <Text style={[s.statTxt, { color: Colors.green, fontWeight: '800' }]}>✅ مسجّل في الكورس</Text>
            </View>
          )}
        </View>

        {/* Lessons List */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{isAr ? '📋 محتوى الكورس' : '📋 Course Content'}</Text>
          <Text style={s.lessonsCount}>{lessons.length} درس</Text>

          {visibleLessons.map((lesson, idx) => {
            const isCompleted = completedIds.has(lesson.id)
            const isLocked = !enrolled && !lesson.is_free_preview
            const mins = lesson.duration_seconds ? Math.ceil(lesson.duration_seconds / 60) : null

            return (
              <TouchableOpacity
                key={lesson.id}
                style={[s.lessonRow, isCompleted && s.lessonDone]}
                onPress={() => {
                  if (isLocked) return
                  router.push(`/lesson/${lesson.id}`)
                }}
                activeOpacity={isLocked ? 1 : 0.7}
              >
                <View style={s.lessonNum}>
                  {isCompleted
                    ? <Text style={{ fontSize: 14 }}>✅</Text>
                    : isLocked
                    ? <Text style={{ fontSize: 14 }}>🔒</Text>
                    : <Text style={s.lessonNumTxt}>{idx + 1}</Text>
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.lessonTitle, isLocked && { color: '#64748b' }]} numberOfLines={2}>
                    {isAr ? (lesson.title_ar || lesson.title) : (lesson.title || lesson.title_ar)}
                  </Text>
                  {lesson.is_free_preview && !enrolled && (
                    <Text style={s.freeBadge}>مجاني للمعاينة</Text>
                  )}
                </View>
                {mins && <Text style={s.duration}>{mins} د</Text>}
              </TouchableOpacity>
            )
          })}

          {/* See More / Less */}
          {lessons.length > PREVIEW_COUNT && (
            <TouchableOpacity style={s.seeMoreBtn} onPress={() => setShowAll(!showAll)}>
              <Text style={s.seeMoreTxt}>
                {showAll
                  ? '▲ عرض أقل'
                  : `▼ عرض ${lessons.length - PREVIEW_COUNT} درس إضافي`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA - Fixed */}
      {!enrolled && (price > 0 || roadmap.cta_label_ar) && (
        <View style={s.bottomCTA}>
          <View style={s.ctaRow}>
            {roadmap.cta_label_ar && (
              <TouchableOpacity
                style={[s.ctaBtn, { flex: roadmap.cta2_label_ar ? 1 : undefined, minWidth: 160 }]}
                onPress={() => openCTA(roadmap.cta_type || 'whatsapp', roadmap.cta_url || null, isAr ? roadmap.title_ar : roadmap.title)}
              >
                <Text style={s.ctaBtnTxt}>
                  {roadmap.cta_type === 'payment' ? '💳 ' : roadmap.cta_type === 'url' ? '🔗 ' : '💬 '}
                  {isAr ? roadmap.cta_label_ar : (roadmap.cta_label_en || roadmap.cta_label_ar)}
                </Text>
              </TouchableOpacity>
            )}
            {roadmap.cta2_label_ar && (
              <TouchableOpacity
                style={[s.ctaBtn, s.ctaBtn2, { flex: 1 }]}
                onPress={() => openCTA(roadmap.cta2_type || 'whatsapp', roadmap.cta2_url || null, isAr ? roadmap.title_ar : roadmap.title)}
              >
                <Text style={s.ctaBtnTxt}>
                  {roadmap.cta2_type === 'payment' ? '💳 ' : roadmap.cta2_type === 'url' ? '🔗 ' : '💬 '}
                  {isAr ? roadmap.cta2_label_ar : (roadmap.cta2_label_en || roadmap.cta2_label_ar)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f8fafc' },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  headerBar:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn:       { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backTxt:       { fontSize: 22, color: '#fff', fontWeight: '700' },
  headerTitle:   { flex: 1, fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'right' },
  videoWrap:     { width, height: VIDEO_H, backgroundColor: '#000' },
  coverImg:      { width, height: VIDEO_H },
  infoBox:       { backgroundColor: '#0f172a', padding: 20 },
  courseTitle:   { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'right', marginBottom: 10 },
  courseDesc:    { fontSize: 14, color: '#94a3b8', textAlign: 'right', lineHeight: 22, marginBottom: 14 },
  statsRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 14 },
  stat:          { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#334155' },
  statTxt:       { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  priceRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end' },
  price:         { fontSize: 24, fontWeight: '900', color: Colors.green },
  origPrice:     { fontSize: 15, color: '#64748b', textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  discountTxt:   { fontSize: 11, color: '#92400e', fontWeight: '800' },
  section:       { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle:  { fontSize: 16, fontWeight: '900', color: '#0f172a', textAlign: 'right', marginBottom: 4 },
  lessonsCount:  { fontSize: 12, color: '#64748b', textAlign: 'right', marginBottom: 14 },
  lessonRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  lessonDone:    { opacity: 0.7 },
  lessonNum:     { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  lessonNumTxt:  { fontSize: 13, fontWeight: '800', color: '#475569' },
  lessonTitle:   { fontSize: 14, fontWeight: '700', color: '#0f172a', textAlign: 'right' },
  freeBadge:     { fontSize: 10, color: Colors.green, fontWeight: '700', textAlign: 'right', marginTop: 2 },
  duration:      { fontSize: 11, color: '#94a3b8', minWidth: 28, textAlign: 'center' },
  seeMoreBtn:    { marginTop: 12, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  seeMoreTxt:    { fontSize: 14, fontWeight: '800', color: Colors.blue },
  bottomCTA:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', padding: 16, paddingBottom: 24 },
  ctaRow:        { flexDirection: 'row', gap: 10 },
  ctaBtn:        { backgroundColor: Colors.green, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  ctaBtn2:       { backgroundColor: '#1e40af' },
  ctaBtnTxt:     { fontSize: 15, fontWeight: '900', color: '#fff' },
})
