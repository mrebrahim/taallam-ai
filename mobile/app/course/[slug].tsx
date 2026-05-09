import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions, LayoutAnimation } from 'react-native'
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

function getVideoEmbed(url: string): string | null {
  if (!url) return null
  const vm = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=0&title=0&byline=0`
  const yt = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`
  return null
}

function dur(secs: number): string {
  if (!secs) return ''
  const m = Math.ceil(secs / 60)
  return m >= 60 ? `${Math.floor(m/60)}س ${m%60}د` : `${m} د`
}

export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { user } = useAuth()
  const { isAr } = useLang()
  const [roadmap, setRoadmap]         = useState<any>(null)
  const [enrolled, setEnrolled]       = useState(false)
  const [sections, setSections]       = useState<any[]>([])
  const [completedIds, setCompleted]  = useState<Set<string>>(new Set())
  const [loading, setLoading]         = useState(true)
  const [openSecs, setOpenSecs]       = useState<Set<string>>(new Set())
  const [showAllSecs, setShowAllSecs] = useState(false)
  const PREVIEW_SECS = 3

  useEffect(() => { if (slug) load(); loadWASettings() }, [slug, user])

  const load = async () => {
    setLoading(true)
    const { data: rm, error } = await supabase.from('roadmaps').select('*').eq('slug', slug).single()
    if (error || !rm) { setLoading(false); return }
    setRoadmap(rm)
    const [{ data: secs }, { data: ls }] = await Promise.all([
      supabase.from('sections').select('*').eq('roadmap_id', rm.id).eq('is_active', true).order('sort_order'),
      supabase.from('lessons').select('id,title,title_ar,duration_seconds,sort_order,is_free_preview,section_id').eq('roadmap_id', rm.id).eq('is_active', true).order('sort_order'),
    ])
    const built = (secs || []).map((sec: any) => ({ ...sec, lessons: (ls || []).filter((l: any) => l.section_id === sec.id) }))
    setSections(built)
    if (built.length > 0) setOpenSecs(new Set([built[0].id]))
    if (user) {
      const { data: enr } = await supabase.from('course_enrollments').select('id,expires_at').eq('user_id', user.id).eq('roadmap_id', rm.id).eq('is_active', true).maybeSingle()
      const valid = enr ? (!enr.expires_at || new Date(enr.expires_at) > new Date()) : false
      setEnrolled(valid)
      if (valid) {
        const { data: lp } = await supabase.from('user_lesson_progress').select('lesson_id').eq('user_id', user.id).eq('completed', true)
        setCompleted(new Set(lp?.map((l: any) => l.lesson_id) || []))
      }
    }
    setLoading(false)
  }

  const toggleSec = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpenSecs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={Colors.green} size="large" /></View>
  if (!roadmap) return <View style={s.center}><Text style={{ color: '#fff' }}>الكورس غير موجود</Text></View>

  const embedUrl     = getVideoEmbed(roadmap.intro_video_url || '')
  const price        = roadmap.price_egp || 0
  const origPrice    = roadmap.original_price_egp || 0
  const totalLessons = sections.reduce((sum: number, sec: any) => sum + sec.lessons.length, 0)
  const levelMap: any = { beginner: '🟢 مبتدئ', intermediate: '🟡 متوسط', advanced: '🔴 متقدم' }
  const visibleSecs  = showAllSecs ? sections : sections.slice(0, PREVIEW_SECS)
  const whatYouLearn: string[] = Array.isArray(roadmap.what_you_learn) ? roadmap.what_you_learn : []
  const requirements: string[] = Array.isArray(roadmap.requirements) ? roadmap.requirements : []
  const name = isAr ? roadmap.title_ar : (roadmap.title || roadmap.title_ar)

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>

        {/* Header */}
        <View style={s.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backTxt}>→</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{name}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Video / Cover */}
        {embedUrl ? (
          <View style={{ width, height: VIDEO_H, backgroundColor: '#000' }}>
            <WebView style={{ width, height: VIDEO_H }} source={{ uri: embedUrl }} allowsFullscreenVideo javaScriptEnabled />
          </View>
        ) : (roadmap.cover_image_url || roadmap.thumbnail_url) ? (
          <Image source={{ uri: roadmap.cover_image_url || roadmap.thumbnail_url }} style={{ width, height: VIDEO_H }} resizeMode="cover" />
        ) : (
          <View style={{ width, height: VIDEO_H * 0.6, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 64 }}>📚</Text>
          </View>
        )}

        {/* Course Info */}
        <View style={s.infoBox}>
          <Text style={s.courseTitle}>{name}</Text>
          {(isAr ? roadmap.description_ar : roadmap.description || roadmap.description_ar) ? (
            <Text style={s.courseDesc}>{isAr ? roadmap.description_ar : (roadmap.description || roadmap.description_ar)}</Text>
          ) : null}

          {/* Stats Row */}
          <View style={s.statsRow}>
            <View style={s.stat}><Text style={s.statTxt}>📚 {totalLessons} درس</Text></View>
            <View style={s.stat}><Text style={s.statTxt}>{sections.length} سكشن</Text></View>
            {roadmap.level && <View style={s.stat}><Text style={s.statTxt}>{levelMap[roadmap.level]}</Text></View>}
            {roadmap.duration_hours > 0 && <View style={s.stat}><Text style={s.statTxt}>⏱️ {roadmap.duration_hours} ساعة</Text></View>}
            {roadmap.rating > 0 && <View style={s.stat}><Text style={s.statTxt}>⭐ {roadmap.rating}</Text></View>}
          </View>

          {/* Enrolled badge */}
          {enrolled && (
            <View style={[s.stat, { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#f0fdf4', borderColor: Colors.green }]}>
              <Text style={[s.statTxt, { color: Colors.green, fontWeight: '800' }]}>✅ مشترك في الكورس</Text>
            </View>
          )}

          {/* Price */}
          {!enrolled && (
            <View style={s.priceRow}>
              <Text style={s.price}>{price > 0 ? `${price.toLocaleString()} ج.م` : '🎁 مجاني'}</Text>
              {origPrice > 0 && origPrice > price && (
                <>
                  <Text style={s.origPrice}>{origPrice.toLocaleString()} ج.م</Text>
                  <View style={s.discountBadge}>
                    <Text style={s.discountTxt}>وفّر {Math.round((1 - price/origPrice)*100)}%</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* What you'll learn */}
        {whatYouLearn.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>💡 ماذا ستتعلم</Text>
            {whatYouLearn.map((item: string, i: number) => (
              <View key={i} style={s.checkRow}>
                <Text style={s.checkIcon}>✓</Text>
                <Text style={s.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Curriculum */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📋 محتوى الكورس</Text>
          <Text style={s.subText}>{sections.length} سكشن • {totalLessons} درس</Text>

          {visibleSecs.map((sec: any) => {
            const isOpen = openSecs.has(sec.id)
            return (
              <View key={sec.id} style={s.secBox}>
                {/* Section Header */}
                <TouchableOpacity style={s.secHeader} onPress={() => toggleSec(sec.id)}>
                  <Text style={s.secToggle}>{isOpen ? '−' : '+'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.secTitle}>{isAr ? (sec.title_ar || sec.title) : (sec.title || sec.title_ar)}</Text>
                    <Text style={s.secMeta}>{sec.lessons.length} درس</Text>
                  </View>
                </TouchableOpacity>

                {/* Lessons */}
                {isOpen && sec.lessons.map((lesson: any, idx: number) => {
                  const isCompleted = completedIds.has(lesson.id)
                  const isLocked = !enrolled && !lesson.is_free_preview
                  const canPress = enrolled || lesson.is_free_preview
                  return (
                    <TouchableOpacity
                      key={lesson.id}
                      style={[s.lessonRow, idx === 0 && { borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}
                      onPress={() => canPress && router.push(`/lesson/${lesson.id}` as any)}
                      activeOpacity={canPress ? 0.7 : 1}
                    >
                      <Text style={s.lessonIcon}>{isCompleted ? '✅' : isLocked ? '🔒' : '▶'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.lessonTitle, isLocked && { color: '#94a3b8' }]} numberOfLines={2}>
                          {isAr ? (lesson.title_ar || lesson.title) : (lesson.title || lesson.title_ar)}
                        </Text>
                        {lesson.is_free_preview && !enrolled && (
                          <Text style={s.previewBadge}>معاينة مجانية</Text>
                        )}
                      </View>
                      {lesson.duration_seconds > 0 && (
                        <Text style={s.duration}>{dur(lesson.duration_seconds)}</Text>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            )
          })}

          {sections.length > PREVIEW_SECS && (
            <TouchableOpacity style={s.seeMoreBtn} onPress={() => setShowAllSecs(!showAllSecs)}>
              <Text style={s.seeMoreTxt}>
                {showAllSecs ? '▲ عرض أقل' : `▼ عرض ${sections.length - PREVIEW_SECS} سكشن إضافي`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Requirements */}
        {requirements.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📌 المتطلبات</Text>
            {requirements.map((item: string, i: number) => (
              <View key={i} style={s.checkRow}>
                <Text style={s.checkIcon}>•</Text>
                <Text style={s.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Instructor */}
        {roadmap.instructor_name && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>👨‍🏫 المحاضر</Text>
            <View style={s.instructorRow}>
              {roadmap.instructor_avatar ? (
                <Image source={{ uri: roadmap.instructor_avatar }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, { backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 28 }}>👤</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.instructorName}>{roadmap.instructor_name}</Text>
                {roadmap.instructor_title && <Text style={s.instructorTitle}>{roadmap.instructor_title}</Text>}
                {roadmap.total_students > 0 && <Text style={s.instructorMeta}>👥 {roadmap.total_students.toLocaleString()} طالب</Text>}
              </View>
            </View>
            {roadmap.instructor_bio && <Text style={s.instructorBio}>{roadmap.instructor_bio}</Text>}
          </View>
        )}

        <View style={{ height: enrolled ? 24 : 100 }} />
      </ScrollView>

      {/* Bottom CTA - only for non-enrolled */}
      {!enrolled && (price > 0 || roadmap.cta_label_ar) && (
        <View style={s.bottomCTA}>
          <View style={s.ctaRow}>
            {roadmap.cta_label_ar && (
              <TouchableOpacity
                style={[s.ctaBtn, { flex: roadmap.cta2_label_ar ? 1 : undefined, backgroundColor: roadmap.cta_type === 'payment' ? '#1e40af' : Colors.green }]}
                onPress={() => openCTA(roadmap.cta_type || 'whatsapp', roadmap.cta_url || null, name)}
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
                onPress={() => openCTA(roadmap.cta2_type || 'whatsapp', roadmap.cta2_url || null, name)}
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
  container:      { flex: 1, backgroundColor: '#f8fafc' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  headerBar:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn:        { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backTxt:        { fontSize: 22, color: '#fff', fontWeight: '700' },
  headerTitle:    { flex: 1, fontSize: 15, fontWeight: '800', color: '#fff', textAlign: 'right' },
  infoBox:        { backgroundColor: '#0f172a', padding: 20 },
  courseTitle:    { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'right', marginBottom: 10 },
  courseDesc:     { fontSize: 14, color: '#94a3b8', textAlign: 'right', lineHeight: 22, marginBottom: 14 },
  statsRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 14 },
  stat:           { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#334155' },
  statTxt:        { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  priceRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end' },
  price:          { fontSize: 24, fontWeight: '900', color: Colors.green },
  origPrice:      { fontSize: 14, color: '#64748b', textDecorationLine: 'line-through' },
  discountBadge:  { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  discountTxt:    { fontSize: 11, color: '#92400e', fontWeight: '800' },
  section:        { backgroundColor: '#fff', margin: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle:   { fontSize: 16, fontWeight: '900', color: '#0f172a', textAlign: 'right', marginBottom: 6 },
  subText:        { fontSize: 12, color: '#64748b', textAlign: 'right', marginBottom: 14 },
  checkRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, justifyContent: 'flex-end' },
  checkIcon:      { fontSize: 14, color: Colors.green, fontWeight: '900', marginTop: 2 },
  checkText:      { flex: 1, fontSize: 13, color: '#334155', textAlign: 'right', lineHeight: 20 },
  secBox:         { borderRadius: 10, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  secHeader:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#f8fafc' },
  secToggle:      { fontSize: 18, color: '#475569', fontWeight: '900', width: 24, textAlign: 'center' },
  secTitle:       { fontSize: 14, fontWeight: '800', color: '#0f172a', textAlign: 'right' },
  secMeta:        { fontSize: 11, color: '#64748b', textAlign: 'right', marginTop: 2 },
  lessonRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#f1f5f9' },
  lessonIcon:     { fontSize: 14, width: 22, textAlign: 'center' },
  lessonTitle:    { fontSize: 13, fontWeight: '600', color: '#0f172a', textAlign: 'right' },
  previewBadge:   { fontSize: 10, color: Colors.green, fontWeight: '700', textAlign: 'right', marginTop: 2 },
  duration:       { fontSize: 11, color: '#94a3b8', minWidth: 32, textAlign: 'center' },
  seeMoreBtn:     { paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 4 },
  seeMoreTxt:     { fontSize: 14, fontWeight: '800', color: Colors.blue },
  instructorRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  avatar:         { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f1f5f9' },
  instructorName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  instructorTitle:{ fontSize: 12, color: '#64748b', marginTop: 2 },
  instructorMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  instructorBio:  { fontSize: 13, color: '#475569', lineHeight: 20, textAlign: 'right' },
  bottomCTA:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', padding: 16, paddingBottom: 24 },
  ctaRow:         { flexDirection: 'row', gap: 10 },
  ctaBtn:         { backgroundColor: Colors.green, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  ctaBtn2:        { backgroundColor: '#1e40af' },
  ctaBtnTxt:      { fontSize: 15, fontWeight: '900', color: '#fff' },
})
