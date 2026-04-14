import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Platform,
  AppState, AppStateStatus,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { WebView } from 'react-native-webview'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ScreenCapture from 'expo-screen-capture'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

// ─── Video URL helpers ────────────────────────────────────────
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

// Build full HTML page for WebView — Vimeo first, YouTube fallback
function buildVideoHTML(lesson: any): string {
  let embedUrl = ''

  // Priority 1: Vimeo ID
  if (lesson.vimeo_id) {
    embedUrl = `https://player.vimeo.com/video/${lesson.vimeo_id}?autoplay=0&title=0&byline=0&portrait=0&dnt=1`
  }
  // Priority 2: Vimeo URL
  else if (lesson.vimeo_url) {
    const id = getVimeoId(lesson.vimeo_url)
    if (id) embedUrl = `https://player.vimeo.com/video/${id}?autoplay=0&title=0&byline=0&portrait=0&dnt=1`
  }
  // Priority 3: YouTube
  else if (lesson.video_url) {
    const ytId = getYouTubeId(lesson.video_url)
    if (ytId) {
      embedUrl = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`
    }
  }

  if (!embedUrl) return ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body {
  background:#000;
  width:100%; height:100%;
  overflow:hidden;
}
iframe {
  position:absolute;
  top:0; left:0;
  width:100%; height:100%;
  border:none;
}
</style>
</head>
<body>
<iframe
  src="${embedUrl}"
  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
  allowfullscreen
  webkitallowfullscreen
  mozallowfullscreen
  frameborder="0">
</iframe>
</body>
</html>`
}

// ─── Component ────────────────────────────────────────────────
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { isAr } = useLang()

  const [lesson, setLesson]         = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [completed, setCompleted]   = useState(false)
  const [completing, setCompleting] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [isBackground, setIsBackground] = useState(false)
  const loadAttempts = useRef(0)

  // ── Screen Capture Prevention ──────────────────────────────
  useEffect(() => {
    let screenSub: ScreenCapture.Subscription | null = null

    const enableProtection = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync()
        // Alert if someone tries to screenshot
        screenSub = ScreenCapture.addScreenshotListener(() => {
          Alert.alert(
            isAr ? '⚠️ تنبيه' : '⚠️ Warning',
            isAr
              ? 'تسجيل المحتوى غير مسموح به وقد يؤدي لإيقاف حسابك.'
              : 'Screen recording is not allowed and may result in account suspension.',
            [{ text: isAr ? 'حسناً' : 'OK', style: 'destructive' }]
          )
        })
      } catch (e) {
        // Silently fail if not supported on device
        console.log('Screen capture prevention not available:', e)
      }
    }

    enableProtection()

    // Hide content when app goes to background (prevents screen recording)
    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      setIsBackground(state === 'background' || state === 'inactive')
    })

    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {})
      screenSub?.remove()
      appStateSub.remove()
    }
  }, [])

  // ── Load Lesson ────────────────────────────────────────────
  useEffect(() => {
    loadLesson()
  }, [id])

  useEffect(() => {
    if (user && lesson) checkProgress()
  }, [user?.id, lesson?.id])

  const loadLesson = async () => {
    if (!id) return
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id, title_ar, title, description_ar, description,
          lesson_type, video_url, vimeo_id, vimeo_url,
          video_duration_seconds, xp_reward, is_free,
          roadmaps (title_ar, title, slug)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setLesson(data)
    } catch (e: any) {
      if (loadAttempts.current < 3) {
        loadAttempts.current++
        setTimeout(loadLesson, 800)
        return
      }
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'تعذّر تحميل الدرس' : 'Failed to load lesson')
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
        user_id: user.id,
        lesson_id: id,
        completed: true,
        completed_at: new Date().toISOString(),
        score: 100,
      }, { onConflict: 'user_id,lesson_id' })

      // Award XP safely
      await supabase.from('users')
        .update({ xp_total: (user.xp_total || 0) + (lesson.xp_reward || 50) })
        .eq('id', user.id)

      setCompleted(true)
      Alert.alert(
        isAr ? '🎉 أحسنت!' : '🎉 Well Done!',
        isAr
          ? `أكملت الدرس وحصلت على ${lesson.xp_reward || 50} XP 🔥`
          : `Lesson complete! You earned ${lesson.xp_reward || 50} XP 🔥`,
        [{ text: isAr ? 'رجوع' : 'Back', onPress: () => router.back() }]
      )
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setCompleting(false)
    }
  }

  // ── Loading State ──────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}>
        <ActivityIndicator color={Colors.blue} size="large" />
        <Text style={s.loadingText}>
          {isAr ? 'جاري تحميل الدرس...' : 'Loading lesson...'}
        </Text>
      </View>
    </SafeAreaView>
  )

  if (!lesson) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>😕</Text>
        <Text style={s.errorText}>{isAr ? 'الدرس غير موجود' : 'Lesson not found'}</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>{isAr ? '← رجوع' : '← Back'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  const videoHTML = buildVideoHTML(lesson)
  const hasVideo  = !!videoHTML
  const lessonTitle = isAr ? lesson.title_ar : (lesson.title || lesson.title_ar)
  const lessonDesc  = isAr ? lesson.description_ar : (lesson.description || lesson.description_ar)

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBackBtn}>
          <Text style={s.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{lessonTitle}</Text>
        {completed && (
          <View style={s.completedBadge}>
            <Text style={{ fontSize: 12 }}>✅</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Video Player */}
        {isBackground ? (
          // Hide video when app goes to background
          <View style={[s.videoContainer, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {isAr ? '🔒 العودة للتطبيق لمشاهدة الفيديو' : '🔒 Return to app to watch video'}
            </Text>
          </View>
        ) : hasVideo && !videoError ? (
          <View style={s.videoContainer}>
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
              onHttpError={(e) => {
                if (e.nativeEvent.statusCode >= 400) setVideoError(true)
              }}
              scrollEnabled={false}
              bounces={false}
              startInLoadingState
              renderLoading={() => (
                <View style={[s.videoContainer, { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator color={Colors.blue} size="large" />
                </View>
              )}
            />
          </View>
        ) : videoError ? (
          <View style={s.videoError}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>📹</Text>
            <Text style={s.videoErrorText}>
              {isAr ? 'تعذّر تشغيل الفيديو' : 'Could not play video'}
            </Text>
            <TouchableOpacity
              style={{ marginTop: 10, backgroundColor: Colors.blue, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8 }}
              onPress={() => setVideoError(false)}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {isAr ? 'إعادة المحاولة' : 'Retry'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.noVideo}>
            <Text style={{ fontSize: 48 }}>📖</Text>
            <Text style={s.noVideoText}>
              {isAr ? 'لا يوجد فيديو لهذا الدرس' : 'No video for this lesson'}
            </Text>
          </View>
        )}

        {/* Lesson Info */}
        <View style={s.info}>
          <Text style={s.lessonTitle}>{lessonTitle}</Text>

          <View style={s.metaRow}>
            <View style={s.metaBadge}>
              <Text style={s.metaText}>
                ⏱️ {Math.floor((lesson.video_duration_seconds || 600) / 60)}
                {isAr ? ' دقيقة' : ' min'}
              </Text>
            </View>
            <View style={[s.metaBadge, { backgroundColor: '#FFF5D3' }]}>
              <Text style={[s.metaText, { color: '#A56644' }]}>
                ⚡ {lesson.xp_reward || 50} XP
              </Text>
            </View>
            {/* Video source badge */}
            {(lesson.vimeo_id || lesson.vimeo_url) && (
              <View style={[s.metaBadge, { backgroundColor: '#1AB7EA20' }]}>
                <Text style={[s.metaText, { color: '#1AB7EA' }]}>🎬 Vimeo</Text>
              </View>
            )}
            {completed && (
              <View style={[s.metaBadge, { backgroundColor: '#D7FFB8' }]}>
                <Text style={[s.metaText, { color: '#27500A' }]}>
                  ✅ {isAr ? 'مكتمل' : 'Completed'}
                </Text>
              </View>
            )}
          </View>

          {lessonDesc && (
            <Text style={s.description}>{lessonDesc}</Text>
          )}

          {lesson.roadmaps && (
            <View style={s.roadmapBadge}>
              <Text style={s.roadmapText}>
                📚 {isAr ? lesson.roadmaps.title_ar : (lesson.roadmaps.title || lesson.roadmaps.title_ar)}
              </Text>
            </View>
          )}

          {/* Screen protection notice */}
          <View style={s.protectionNotice}>
            <Text style={s.protectionText}>
              🔒 {isAr ? 'المحتوى محمي — التسجيل غير مسموح' : 'Content protected — Recording not allowed'}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Complete Button */}
      <View style={s.footer}>
        {!user ? (
          <View style={s.loginPrompt}>
            <Text style={s.loginText}>
              {isAr ? 'سجّل دخولك لمتابعة التقدم' : 'Login to track your progress'}
            </Text>
          </View>
        ) : completed ? (
          <View style={[s.completeBtn, s.completedBtn]}>
            <Text style={s.completeBtnText}>
              ✅ {isAr ? 'أكملت هذا الدرس' : 'Lesson Completed'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.completeBtn, completing && { opacity: 0.7 }]}
            onPress={completeLesson}
            disabled={completing}
          >
            {completing
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.completeBtnText}>
                  {isAr ? '✅ أكملت الدرس' : '✅ Mark as Complete'}
                </Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0f172a' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText:    { color: '#64748b', fontSize: 14, marginTop: 12 },
  errorText:      { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 20 },
  backBtn:        { backgroundColor: Colors.blue, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },

  header:         { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerBackBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerBackText: { fontSize: 22, color: Colors.blue, fontWeight: '700' },
  headerTitle:    { flex: 1, fontSize: 16, fontWeight: '800', color: '#fff' },
  completedBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#D7FFB8', justifyContent: 'center', alignItems: 'center' },

  videoContainer: { width: '100%', aspectRatio: 16/9, backgroundColor: '#000', overflow: 'hidden' },
  webview:        { flex: 1, backgroundColor: '#000' },
  videoError:     { aspectRatio: 16/9, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', padding: 20 },
  videoErrorText: { color: '#94a3b8', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  noVideo:        { aspectRatio: 16/9, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', gap: 10 },
  noVideoText:    { color: '#64748b', fontSize: 14 },

  scroll:         { flexGrow: 1 },
  info:           { padding: 16 },
  lessonTitle:    { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 12, textAlign: 'right' },
  metaRow:        { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'flex-end' },
  metaBadge:      { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  metaText:       { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  description:    { fontSize: 14, color: '#94a3b8', lineHeight: 22, marginBottom: 14, textAlign: 'right' },
  roadmapBadge:   { backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-end', marginBottom: 12 },
  roadmapText:    { color: '#60a5fa', fontSize: 13, fontWeight: '700' },
  protectionNotice: { backgroundColor: '#1e293b', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  protectionText: { color: '#475569', fontSize: 12, flex: 1, textAlign: 'center' },

  footer:         { padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b' },
  completeBtn:    { backgroundColor: Colors.blue, borderRadius: 14, padding: 17, alignItems: 'center', shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  completedBtn:   { backgroundColor: Colors.green, opacity: 0.8 },
  completeBtnText:{ color: '#fff', fontSize: 16, fontWeight: '900' },
  loginPrompt:    { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, alignItems: 'center' },
  loginText:      { color: '#64748b', fontSize: 14 },
})
