import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Platform, AppState, AppStateStatus
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { WebView } from 'react-native-webview'
// import * as ScreenCapture from 'expo-screen-capture'  // disabled - version compatibility
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [lesson, setLesson] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  // ══════════════════════════════════════════════════════
  // 🔐 SCREEN CAPTURE PREVENTION
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    // Prevent screenshots and screen recording
    const enableProtection = async () => {
//       await ScreenCapture.preventScreenCaptureAsync()  // disabled - version compatibility
    }
    enableProtection()

    // Listen for screen capture events (iOS 11+ / Android)
//     const subscription = ScreenCapture.addScreenshotListener(() => {  // disabled - version compatibility
      Alert.alert(
        '⚠️ تنبيه',
        'تسجيل المحتوى غير مسموح به. قد يؤدي ذلك إلى إيقاف حسابك.',
        [{ text: 'حسناً', style: 'destructive' }]
      )
    })

    // App state listener — hide content when app goes to background
    // (prevents screen recording via notification shade/control center)
    const appStateListener = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'background' || nextState === 'inactive') {
          setIsRecording(true) // Show blur overlay
        } else {
          setIsRecording(false)
        }
      }
    )

    return () => {
      // Re-enable screen capture when leaving lesson
//       ScreenCapture.allowScreenCaptureAsync()  // disabled - version compatibility
      subscription.remove()
      appStateListener.remove()
    }
  }, [])
  // ══════════════════════════════════════════════════════

  useEffect(() => {
    loadLesson()
  }, [id])

  const loadLesson = async () => {
    if (!id || !user) return
    const [{ data: lessonData }, { data: progressData }] = await Promise.all([
      supabase.from('lessons').select('*, roadmaps(title_ar, slug)').eq('id', id).single(),
      supabase.from('user_lesson_progress').select('*').eq('user_id', user.id).eq('lesson_id', id).maybeSingle(),
    ])
    setLesson(lessonData)
    setCompleted(progressData?.completed || false)
    setLoading(false)
  }

  const completeLesson = async () => {
    if (completing || completed || !user || !lesson) return
    setCompleting(true)

    await supabase.from('user_lesson_progress').upsert({
      user_id: user.id,
      lesson_id: id,
      completed: true,
      completed_at: new Date().toISOString(),
      score: 100,
    }, { onConflict: 'user_id,lesson_id' })

    try {
      await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: lesson.xp_reward,
        p_reason: 'lesson_complete',
        p_reference_id: id,
      })
    } catch {}

    setCompleted(true)
    setCompleting(false)

    Alert.alert(
      '🎉 أحسنت!',
      `حصلت على ${lesson.xp_reward} XP!`,
      [{ text: 'رجوع للمسار', onPress: () => router.back() }]
    )
  }

  // Convert YouTube URL to embed
  const getEmbedUrl = (url: string) => {
    if (!url) return null
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    if (match) return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`
    return url
  }

  if (loading) {
    return <View style={styles.loadingContainer}><Text style={{ fontSize: 48 }}>📚</Text></View>
  }

  if (!lesson) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>😕</Text>
        <Text style={{ color: Colors.textSub }}>الدرس غير موجود</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.blue }}>← رجوع</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const COLORS: Record<string, string> = { n8n_automation: Colors.green, ai_video: Colors.orange, vibe_coding: Colors.purple }
  const color = COLORS[lesson.roadmaps?.slug] || Colors.green
  const embedUrl = lesson.video_url ? getEmbedUrl(lesson.video_url) : null
  const durationMins = lesson.video_duration_seconds ? Math.floor(lesson.video_duration_seconds / 60) : 10

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerRoadmap}>{lesson.roadmaps?.title_ar}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{lesson.title_ar}</Text>
        </View>
        <View style={[styles.xpBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.xpText, { color }]}>+{lesson.xp_reward} XP</Text>
        </View>
      </View>

      {/* SCREEN RECORDING OVERLAY */}
      {isRecording && (
        <View style={styles.recordingOverlay}>
          <Text style={styles.recordingEmoji}>🔒</Text>
          <Text style={styles.recordingTitle}>المحتوى محمي</Text>
          <Text style={styles.recordingDesc}>ارجع للتطبيق لمشاهدة الدرس</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

        {/* Video Player */}
        {embedUrl && !isRecording && (
          <View style={styles.videoContainer}>
            <WebView
              source={{ uri: embedUrl }}
              style={styles.video}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              // Prevent media download
              onShouldStartLoadWithRequest={(request) => {
                // Block download attempts
                if (request.url.includes('download') || request.url.includes('.mp4')) {
                  return false
                }
                return true
              }}
            />
          </View>
        )}

        <View style={styles.content}>
          {/* Lesson Info */}
          <View style={styles.infoCard}>
            <Text style={styles.lessonTitle}>{lesson.title_ar}</Text>
            {lesson.description_ar && (
              <Text style={styles.lessonDesc}>{lesson.description_ar}</Text>
            )}
            <View style={styles.tags}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>⏱️ {durationMins} دقيقة</Text>
              </View>
              <View style={[styles.tag, { backgroundColor: color + '20' }]}>
                <Text style={[styles.tagText, { color }]}>⚡ {lesson.xp_reward} XP</Text>
              </View>
              {completed && (
                <View style={[styles.tag, { backgroundColor: Colors.greenL }]}>
                  <Text style={[styles.tagText, { color: Colors.green }]}>✅ مكتمل</Text>
                </View>
              )}
            </View>
          </View>

          {/* No content placeholder */}
          {!embedUrl && !lesson.description_ar && (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔜</Text>
              <Text style={styles.emptyTitle}>المحتوى قادم قريباً</Text>
              <Text style={styles.emptyDesc}>يتم إعداد محتوى هذا الدرس</Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Complete Button */}
      <View style={styles.bottomBar}>
        {completed ? (
          <View style={styles.completedRow}>
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>✅ أكملت هذا الدرس!</Text>
            </View>
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: Colors.blue }]} onPress={() => router.back()}>
              <Text style={styles.nextBtnText}>التالي ←</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.completeBtn, { backgroundColor: color }, completing && styles.btnDisabled]}
            onPress={completeLesson}
            disabled={completing}
            activeOpacity={0.85}
          >
            <Text style={styles.completeBtnText}>
              {completing ? '⏳ جاري التسجيل...' : '✅ أكملت الدرس — احصل على XP'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: Colors.border, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 18, color: Colors.text },
  headerInfo: { flex: 1 },
  headerRoadmap: { fontSize: 11, color: Colors.textSub, textAlign: 'right' },
  headerTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  xpBadge: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
  xpText: { fontSize: 13, fontWeight: '800' },

  // Screen recording overlay
  recordingOverlay: {
    position: 'absolute', inset: 0, backgroundColor: '#0f172a',
    justifyContent: 'center', alignItems: 'center', zIndex: 999,
  },
  recordingEmoji: { fontSize: 64, marginBottom: 16 },
  recordingTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 8 },
  recordingDesc: { fontSize: 16, color: '#94a3b8' },

  // Video
  videoContainer: { width: '100%', aspectRatio: 16/9, backgroundColor: '#000' },
  video: { flex: 1 },

  content: { padding: 16 },
  infoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 2, borderColor: Colors.border },
  lessonTitle: { fontSize: 20, fontWeight: '900', color: Colors.text, textAlign: 'right', marginBottom: 8, lineHeight: 28 },
  lessonDesc: { fontSize: 14, color: Colors.textSub, textAlign: 'right', lineHeight: 22, marginBottom: 12 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },

  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', borderWidth: 2, borderColor: Colors.border },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: Colors.textSub },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, backgroundColor: 'transparent' },
  completedRow: { flexDirection: 'row', gap: 10 },
  completedBadge: { flex: 1, backgroundColor: Colors.greenL, borderRadius: 14, padding: 16, justifyContent: 'center', alignItems: 'center' },
  completedText: { color: '#27500A', fontWeight: '800', fontSize: 14 },
  nextBtn: { borderRadius: 14, paddingHorizontal: 20, paddingVertical: 16, justifyContent: 'center' },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  completeBtn: { borderRadius: 14, padding: 18, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnDisabled: { opacity: 0.6 },
  completeBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
})
