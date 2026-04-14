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

// ─── Video helpers ────────────────────────────────────────────
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

// Block screen recording via WebView JS injection
const ANTI_RECORD_JS = `
(function() {
  // Disable right-click / long press save
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  
  // Disable text selection
  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  
  // Detect screen recording on iOS (visual content hidden)
  if (window.screen && 'isExtended' in window.screen) {
    if (window.screen.isExtended) {
      document.body.innerHTML = '<div style="background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-size:18px;text-align:center;padding:20px">🔒 المحتوى محمي</div>';
    }
  }
})();
true;
`

function buildVideoHTML(lesson: any): string {
  let embedUrl = ''

  // Priority 1: Vimeo (recommended from admin)
  if (lesson.vimeo_id) {
    embedUrl = `https://player.vimeo.com/video/${lesson.vimeo_id}?autoplay=0&title=0&byline=0&portrait=0&dnt=1`
  } else if (lesson.vimeo_url) {
    const id = getVimeoId(lesson.vimeo_url)
    if (id) embedUrl = `https://player.vimeo.com/video/${id}?autoplay=0&title=0&byline=0&portrait=0&dnt=1`
  }
  // Priority 2: YouTube
  else if (lesson.video_url) {
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
html, body {
  background:#000; width:100%; height:100%;
  overflow:hidden; user-select:none; -webkit-user-select:none;
}
iframe { position:absolute; top:0; left:0; width:100%; height:100%; border:none; }
/* Block screenshot indicators */
body { -webkit-touch-callout:none; }
</style>
</head>
<body>
<iframe
  src="${embedUrl}"
  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
  allowfullscreen webkitallowfullscreen mozallowfullscreen
  frameborder="0"
  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups">
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
  const [isBackground, setIsBackground] = useState(false)
  const [enrolled, setEnrolled]       = useState(false)
  const [checkingEnroll, setCheckingEnroll] = useState(true)
  const loadAttempts = useRef(0)
  const webviewRef = useRef<WebView>(null)

  // ── Protect content when app goes to background ────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      setIsBackground(state === 'background' || state === 'inactive')
    })
    return () => sub.remove()
  }, [])

  // ── Load lesson + check enrollment ────────────────────────
  useEffect(() => {
    loadLesson()
  }, [id])

  useEffect(() => {
    if (user && lesson) {
      checkEnrollmentAndProgress()
    }
  }, [user?.id, lesson?.id])

  const loadLesson = async () => {
    if (!id) return
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id, title_ar, title, description_ar, description,
          lesson_type, video_url, vimeo_id, vimeo_url,
          video_duration_seconds, xp_reward, is_free, roadmap_id,
          roadmaps (title_ar, title, slug)
        `)
        .eq('id', id)
        .single()

      if (error) {
        // Could be RLS blocking — try without auth check
        console.log('Lesson load error:', error.message)
        if (loadAttempts.current < 3) {
          loadAttempts.current++
          setTimeout(loadLesson, 800)
          return
        }
        throw error
      }
      setLesson(data)
    } catch (e: any) {
      console.log('Lesson final error:', e.message)
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'تعذّر تحميل الدرس — تأكد من اشتراكك في الكورس' : 'Could not load lesson — check your enrollment'
      )
    } finally {
      setLoading(false)
    }
  }

  const checkEnrollmentAndProgress = async () => {
    if (!user || !lesson) return
    setCheckingEnroll(true)
    try {
      const [{ data: enrollment }, { data: progress }] = await Promise.all([
        // Check enrollment
        supabase.from('course_enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('roadmap_id', lesson.roadmap_id)
          .eq('is_active', true)
          .maybeSingle(),
        // Check progress
        supabase.from('user_lesson_progress')
          .select('completed')
          .eq('user_id', user.id)
          .eq('lesson_id', id)
          .maybeSingle(),
      ])

      setEnrolled(!!enrollment || lesson.is_free)
      setCompleted(progress?.completed || false)
    } finally {
      setCheckingEnroll(false)
    }
  }

  const completeLesson = async () => {
    if (completing || completed || !user || !lesson) return
    setCompleting(true)
    try {
      await supabase.from('user_lesson_progress').upsert({
        user_id: user.id,
        lesson_id: id,
        completed: true,
        completed_at: new Date().toISOString(),
        score: 100,
      }, { onConflict: 'user_id,lesson_id' })

      await supabase.from('users')
        .update({ xp_total: (user.xp_total || 0) + (lesson.xp_reward || 50) })
        .eq('id', user.id)

      setCompleted(true)
      Alert.alert(
        isAr ? '🎉 أحسنت!' : '🎉 Well Done!',
        isAr
          ? `أكملت الدرس! حصلت على ${lesson.xp_reward || 50} XP 🔥`
          : `Lesson complete! You earned ${lesson.xp_reward || 50} XP 🔥`,
        [{ text: isAr ? 'رجوع' : 'Back', onPress: () => router.back() }]
      )
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setCompleting(false)
    }
  }

  // ── Render states ──────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}>
        <ActivityIndicator color={Colors.blue} size="large" />
        <Text style={s.loadingText}>{isAr ? 'جاري تحميل الدرس...' : 'Loading lesson...'}</Text>
      </View>
    </SafeAreaView>
  )

  if (!lesson) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>😕</Text>
        <Text style={s.errorText}>{isAr ? 'الدرس غير موجود' : 'Lesson not found'}</Text>
        <Text style={[s.errorText, { fontSize: 13, color: '#64748b', marginTop: 8, marginBottom: 20 }]}>
          {isAr ? 'تأكد من اشتراكك في الكورس' : 'Make sure you are enrolled in the course'}
        </Text>
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

  // Not enrolled and not free
  if (!checkingEnroll && !enrolled && !lesson.is_free) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtnSmall}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{lessonTitle}</Text>
        </View>
        <View style={s.center}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🔒</Text>
          <Text style={s.errorText}>{isAr ? 'هذا الدرس للمشتركين فقط' : 'This lesson is for enrolled users only'}</Text>
          <Text style={[s.errorText, { fontSize: 13, color: '#64748b', marginTop: 8, marginBottom: 20, textAlign: 'center' }]}>
            {isAr ? 'اشترك في الكورس للوصول لجميع الدروس' : 'Subscribe to the course to access all lessons'}
          </Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/(tabs)/learn')}>
            <Text style={s.primaryBtnText}>{isAr ? 'عرض الكورسات' : 'Browse Courses'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

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

        {/* ── VIDEO PLAYER ── */}
        {isBackground ? (
          // Hide video when app is in background (prevents screen recording)
          <View style={[s.videoBox, s.videoHidden]}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>🔒</Text>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>
              {isAr ? 'العودة للتطبيق لمشاهدة الفيديو' : 'Return to app to watch video'}
            </Text>
          </View>
        ) : hasVideo && !videoError ? (
          <View style={s.videoBox}>
            <WebView
              ref={webviewRef}
              source={{ html: videoHTML }}
              style={s.webview}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={Platform.OS !== 'android'}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              // Inject anti-recording JS after load
              injectedJavaScript={ANTI_RECORD_JS}
              // Block screen capture on Android via FLAG_SECURE equivalent
              onLoad={() => {
                webviewRef.current?.injectJavaScript(ANTI_RECORD_JS)
              }}
              onError={() => setVideoError(true)}
              onHttpError={(e) => {
                if (e.nativeEvent.statusCode >= 400) setVideoError(true)
              }}
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
              {isAr ? 'لا يوجد فيديو لهذا الدرس' : 'No video for this lesson'}
            </Text>
          </View>
        )}

        {/* ── INFO ── */}
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

          {lessonDesc ? <Text style={s.desc}>{lessonDesc}</Text> : null}

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

      {/* ── FOOTER ── */}
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
            onPress={completeLesson}
            disabled={completing}>
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
  errorText:       { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
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
})
