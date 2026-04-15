import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Platform,
  AppState, AppStateStatus,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { WebView } from 'react-native-webview'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'
import { Analytics } from '@/lib/analytics'

function getYouTubeId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /youtu\.be\/([^?&\n#]+)/,
    /youtube\.com\/watch\?v=([^?&\n#]+)/,
    /youtube\.com\/embed\/([^?&\n#]+)/,
    /youtube\.com\/shorts\/([^?&\n#]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function getVimeoId(input: string): string | null {
  if (!input) return null
  if (/^\d+$/.test(input.trim())) return input.trim()
  const m = input.match(/vimeo\.com\/(\d+)/)
  return m ? m[1] : null
}

function buildVideoHTML(lesson: any): string {
  let embedUrl = ''
  if (lesson.vimeo_id) {
    embedUrl = `https://player.vimeo.com/video/${lesson.vimeo_id}?autoplay=0&title=0&byline=0&portrait=0&dnt=1`
  } else if (lesson.vimeo_url) {
    const id = getVimeoId(lesson.vimeo_url)
    if (id) embedUrl = `https://player.vimeo.com/video/${id}?autoplay=0&title=0&byline=0&portrait=0&dnt=1`
  } else if (lesson.video_url) {
    const ytId = getYouTubeId(lesson.video_url)
    if (ytId) embedUrl = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`
  }
  if (!embedUrl) return ''
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { background:#000; width:100%; height:100%; overflow:hidden; user-select:none; -webkit-user-select:none; }
iframe { position:absolute; top:0; left:0; width:100%; height:100%; border:none; }
</style>
</head>
<body>
<iframe src="${embedUrl}"
  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
  allowfullscreen webkitallowfullscreen mozallowfullscreen frameborder="0">
</iframe>
</body>
</html>`
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { isAr } = useLang()

  const [lesson, setLesson]           = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [completed, setCompleted]     = useState(false)
  const [completing, setCompleting]   = useState(false)
  const [videoError, setVideoError]   = useState(false)
  const [linkedChallenge, setLinkedChallenge] = useState<any>(null)
  const [showChallengeBanner, setShowChallengeBanner] = useState(false)
  const [isBackground, setIsBackground] = useState(false)
  const loadAttempts = useRef(0)

  // Hide video when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      setIsBackground(state === 'background' || state === 'inactive')
    })
    return () => sub.remove()
  }, [])

  // Load lesson on mount
  useEffect(() => {
    loadLesson()
  }, [id])

  // Check progress when user is ready
  useEffect(() => {
    if (user && lesson) checkProgress()
  }, [user?.id, lesson?.id])

  const loadLesson = async () => {
    if (!id) return
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id, title_ar, description_ar,
          lesson_type, video_url, vimeo_id, vimeo_url,
          video_duration_seconds, xp_reward, is_free, roadmap_id,
          linked_challenge_id,
          roadmaps (title_ar, slug)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (loadAttempts.current < 3) {
          loadAttempts.current++
          setTimeout(loadLesson, 1000)
          return
        }
        throw error
      }
      setLesson(data)
      Analytics.lessonStart(data.id, data.title_ar || '')
      // Load linked challenge if exists
      if (data.linked_challenge_id) {
        const { data: ch } = await supabase
          .from('challenges')
          .select('id, title_ar, xp_reward, difficulty, challenge_type')
          .eq('id', data.linked_challenge_id)
          .single()
        if (ch) setLinkedChallenge(ch)
      }
    } catch (e: any) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'تعذّر تحميل الدرس' : 'Could not load lesson'
      )
    } finally {
      setLoading(false)
    }
  }

  const checkProgress = async () => {
    if (!user || !id) return
    const { data } = await supabase
      .from('user_lesson_progress')
      .select('completed')
      .eq('user_id', user.id)
      .eq('lesson_id', id)
      .maybeSingle()
    setCompleted(data?.completed || false)
  }

  const completeLesson = async () => {
    if (completing || completed || !user || !lesson) return
    setCompleting(true)
    try {
      await supabase.from('user_lesson_progress').upsert({
        user_id: user.id, lesson_id: id,
        completed: true, completed_at: new Date().toISOString(), score: 100,
      }, { onConflict: 'user_id,lesson_id' })
      await supabase.from('users')
        .update({ xp_total: (user.xp_total || 0) + (lesson.xp_reward || 50) })
        .eq('id', user.id)
      setCompleted(true)
      Analytics.lessonComplete(id as string, lesson.xp_reward || 50)
      if (linkedChallenge) {
        setShowChallengeBanner(true)
        return
      }
      Alert.alert(
        isAr ? '🎉 أحسنت!' : '🎉 Well Done!',
        isAr ? `حصلت على ${lesson.xp_reward || 50} XP 🔥` : `You earned ${lesson.xp_reward || 50} XP 🔥`,
        [{ text: isAr ? 'رجوع' : 'Back', onPress: () => router.back() }]
      )
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setCompleting(false)
    }
  }

  if (loading) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}>
        <ActivityIndicator color={Colors.blue} size="large" />
        <Text style={s.loadingText}>{isAr ? 'جاري التحميل...' : 'Loading...'}</Text>
      </View>
    </SafeAreaView>
  )

  if (!lesson) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>😕</Text>
        <Text style={s.errorText}>{isAr ? 'الدرس غير موجود' : 'Lesson not found'}</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.back()}>
          <Text style={s.primaryBtnText}>{isAr ? '← رجوع' : '← Back'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  const videoHTML   = buildVideoHTML(lesson)
  const hasVideo    = !!videoHTML
  const lessonTitle = isAr ? lesson.title_ar : (lesson.title || lesson.title_ar)
  const lessonDesc  = isAr ? lesson.description_ar : (lesson.description || lesson.description_ar)
  const isVimeo     = !!(lesson.vimeo_id || lesson.vimeo_url)

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtnSmall}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{lessonTitle}</Text>
        {completed && <View style={s.doneBadge}><Text style={{ fontSize: 12 }}>✅</Text></View>}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Video */}
        {isBackground ? (
          <View style={[s.videoBox, s.videoHidden]}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>🔒</Text>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>
              {isAr ? 'العودة للتطبيق لمشاهدة الفيديو' : 'Return to app to watch video'}
            </Text>
          </View>
        ) : hasVideo && !videoError ? (
          <View style={s.videoBox}>
            <WebView
              source={{ html: videoHTML }}
              style={s.webview}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={Platform.OS !== 'android'}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              onError={() => setVideoError(true)}
              scrollEnabled={false}
              bounces={false}
              startInLoadingState
              renderLoading={() => (
                <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
                  <ActivityIndicator color={Colors.blue} size="large" />
                </View>
              )}
            />
          </View>
        ) : videoError ? (
          <View style={[s.videoBox, s.videoHidden]}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>📹</Text>
            <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>
              {isAr ? 'تعذّر تشغيل الفيديو' : 'Could not play video'}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: Colors.blue, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8 }}
              onPress={() => setVideoError(false)}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{isAr ? 'إعادة المحاولة' : 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.videoBox, s.videoHidden]}>
            <Text style={{ fontSize: 48 }}>📖</Text>
            <Text style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>
              {isAr ? 'لا يوجد فيديو' : 'No video'}
            </Text>
          </View>
        )}

        {/* Info */}
        <View style={s.info}>
          <Text style={s.title}>{lessonTitle}</Text>
          <View style={s.metaRow}>
            <View style={s.chip}>
              <Text style={s.chipText}>⏱️ {Math.floor((lesson.video_duration_seconds || 600) / 60)}{isAr ? ' دقيقة' : ' min'}</Text>
            </View>
            <View style={[s.chip, { backgroundColor: '#FFF5D3' }]}>
              <Text style={[s.chipText, { color: '#A56644' }]}>⚡ {lesson.xp_reward || 50} XP</Text>
            </View>
            {isVimeo && (
              <View style={[s.chip, { backgroundColor: '#1AB7EA20' }]}>
                <Text style={[s.chipText, { color: '#1AB7EA' }]}>🎬 Vimeo</Text>
              </View>
            )}
            {completed && (
              <View style={[s.chip, { backgroundColor: '#D7FFB8' }]}>
                <Text style={[s.chipText, { color: '#27500A' }]}>✅ {isAr ? 'مكتمل' : 'Done'}</Text>
              </View>
            )}
          </View>
          {lessonDesc && <Text style={s.desc}>{lessonDesc}</Text>}
          {lesson.roadmaps && (
            <View style={s.roadmapTag}>
              <Text style={s.roadmapText}>
                📚 {isAr ? lesson.roadmaps.title_ar : (lesson.roadmaps.title || lesson.roadmaps.title_ar)}
              </Text>
            </View>
          )}
          <View style={s.protectionTag}>
            <Text style={s.protectionText}>
              🔒 {isAr ? 'المحتوى محمي — التسجيل غير مسموح' : 'Protected content — Recording not allowed'}
            </Text>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Challenge Banner after lesson completion */}
      {showChallengeBanner && linkedChallenge && (
        <View style={s.challengeBannerOverlay}>
          <View style={s.challengeBanner}>
            <Text style={s.challengeBannerTitle}>🎉 {isAr ? 'أحسنت! أكملت الدرس' : 'Well Done! Lesson Complete'}</Text>
            <Text style={s.challengeBannerXP}>+{lesson?.xp_reward || 50} XP {isAr ? 'تم إضافتها' : 'earned'} ⚡</Text>
            <View style={s.challengeBannerCard}>
              <Text style={s.challengeBannerNext}>{isAr ? '⚔️ يوجد تحدي بعد هذا الدرس!' : '⚔️ There is a challenge for this lesson!'}</Text>
              <Text style={s.challengeBannerName}>{linkedChallenge.title_ar}</Text>
              <Text style={s.challengeBannerXP2}>+{linkedChallenge.xp_reward} XP</Text>
            </View>
            <View style={s.challengeBannerBtns}>
              <TouchableOpacity
                style={s.challengeStartBtn}
                onPress={() => {
                  setShowChallengeBanner(false)
                  router.replace(`/challenge/${linkedChallenge.id}` as any)
                }}>
                <Text style={s.challengeStartBtnText}>{isAr ? '⚔️ ابدأ التحدي' : '⚔️ Start Challenge'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.challengeSkipBtn}
                onPress={() => { setShowChallengeBanner(false); router.back() }}>
                <Text style={s.challengeSkipBtnText}>{isAr ? 'تخطي' : 'Skip'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={s.footer}>
        {!user ? (
          <View style={s.loginNote}>
            <Text style={s.loginNoteText}>{isAr ? 'سجّل دخولك لمتابعة التقدم' : 'Login to track progress'}</Text>
          </View>
        ) : completed ? (
          <View style={[s.completeBtn, { backgroundColor: Colors.green, opacity: 0.85 }]}>
            <Text style={s.completeBtnText}>✅ {isAr ? 'أكملت هذا الدرس' : 'Lesson Completed'}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.completeBtn, completing && { opacity: 0.7 }]}
            onPress={completeLesson} disabled={completing}>
            {completing
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.completeBtnText}>{isAr ? '✅ أكملت الدرس' : '✅ Mark as Complete'}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0f172a' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText:     { color: '#64748b', fontSize: 14, marginTop: 12 },
  errorText:       { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 20 },
  primaryBtn:      { backgroundColor: Colors.blue, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  primaryBtnText:  { color: '#fff', fontWeight: '800', fontSize: 15 },
  header:          { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtnSmall:    { width: 36, height: 36, justifyContent: 'center' },
  backText:        { fontSize: 22, color: Colors.blue, fontWeight: '700' },
  headerTitle:     { flex: 1, fontSize: 16, fontWeight: '800', color: '#fff' },
  doneBadge:       { width: 28, height: 28, borderRadius: 14, backgroundColor: '#D7FFB8', justifyContent: 'center', alignItems: 'center' },
  videoBox:        { width: '100%', aspectRatio: 16/9, backgroundColor: '#000', overflow: 'hidden' },
  videoHidden:     { backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  webview:         { flex: 1, backgroundColor: '#000' },
  scroll:          { flexGrow: 1 },
  info:            { padding: 16 },
  title:           { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 12, textAlign: 'right' },
  metaRow:         { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 14 },
  chip:            { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chipText:        { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  desc:            { fontSize: 14, color: '#94a3b8', lineHeight: 22, textAlign: 'right', marginBottom: 14 },
  roadmapTag:      { backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-end', marginBottom: 10 },
  roadmapText:     { color: '#60a5fa', fontSize: 13, fontWeight: '700' },
  protectionTag:   { backgroundColor: '#1e293b', borderRadius: 10, padding: 10, marginTop: 4 },
  protectionText:  { color: '#475569', fontSize: 12, textAlign: 'center' },
  footer:          { padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: '#1e293b' },
  completeBtn:     { backgroundColor: Colors.blue, borderRadius: 14, padding: 17, alignItems: 'center', shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  completeBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  loginNote:       { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, alignItems: 'center' },
  loginNoteText:   { color: '#64748b', fontSize: 14 },
  // Challenge banner
  challengeBannerOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 100 },
  challengeBanner: { backgroundColor: '#1e293b', borderRadius: 20, padding: 24, width: '100%', borderWidth: 2, borderColor: '#334155' },
  challengeBannerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4 },
  challengeBannerXP: { fontSize: 14, color: Colors.green, textAlign: 'center', fontWeight: '700', marginBottom: 16 },
  challengeBannerCard: { backgroundColor: '#0f172a', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 2, borderColor: Colors.purple + '40' },
  challengeBannerNext: { fontSize: 14, color: Colors.purple, fontWeight: '700', textAlign: 'right', marginBottom: 6 },
  challengeBannerName: { fontSize: 16, fontWeight: '900', color: '#fff', textAlign: 'right', marginBottom: 4 },
  challengeBannerXP2: { fontSize: 13, color: Colors.orange, fontWeight: '700', textAlign: 'right' },
  challengeBannerBtns: { gap: 10 },
  challengeStartBtn: { backgroundColor: Colors.purple, borderRadius: 14, padding: 16, alignItems: 'center' },
  challengeStartBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  challengeSkipBtn: { backgroundColor: '#334155', borderRadius: 12, padding: 12, alignItems: 'center' },
  challengeSkipBtnText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
})
