import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { WebView } from 'react-native-webview'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function buildVideoHTML(ch: any): string {
  let embedUrl = ''
  if (ch.vimeo_id) {
    embedUrl = `https://player.vimeo.com/video/${ch.vimeo_id}?autoplay=0&title=0&byline=0&portrait=0`
  } else if (ch.vimeo_url) {
    const m = ch.vimeo_url.match(/vimeo\.com\/(\d+)/)
    if (m) embedUrl = `https://player.vimeo.com/video/${m[1]}?autoplay=0&title=0&byline=0&portrait=0`
  } else if (ch.video_url) {
    const patterns = [/youtu\.be\/([^?&]+)/, /youtube\.com\/watch\?v=([^?&]+)/]
    for (const p of patterns) {
      const m = ch.video_url.match(p)
      if (m) { embedUrl = `https://www.youtube.com/embed/${m[1]}?rel=0&playsinline=1`; break }
    }
  }
  if (!embedUrl) return ''
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
<style>*{margin:0;padding:0}html,body{background:#000;width:100%;height:100%;overflow:hidden}
iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}</style></head>
<body><iframe src="${embedUrl}" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen frameborder="0"></iframe></body></html>`
}

export default function TaskChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { isAr } = useLang()

  const [challenge, setChallenge]     = useState<any>(null)
  const [submission, setSubmission]   = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [uploading, setUploading]     = useState(false)

  useEffect(() => { if (id) loadChallenge() }, [id])
  useEffect(() => { if (user && challenge) checkSubmission() }, [user?.id, challenge?.id])

  const loadChallenge = async () => {
    const { data, error } = await supabase.from('challenges').select('*').eq('id', id).single()
    if (!error) setChallenge(data)
    setLoading(false)
  }

  const checkSubmission = async () => {
    if (!user) return
    const { data } = await supabase.from('task_submissions')
      .select('*').eq('user_id', user.id).eq('challenge_id', id).maybeSingle()
    setSubmission(data)
  }

  const pickFile = async () => {
    try {
      // Use document picker - expo-document-picker needed
      // Fallback: show info about how to add document picker
      Alert.alert(
        isAr ? 'رفع ملف' : 'Upload File',
        isAr
          ? 'لتفعيل رفع الملفات، يجب إضافة expo-document-picker في الـ Build القادم.\nتواصل مع المشرف.'
          : 'To enable file uploads, expo-document-picker needs to be added in the next build.',
        [{ text: isAr ? 'حسناً' : 'OK' }]
      )
    } catch {}
  }

  const submitTask = async (fileUrl: string, fileName: string, fileSize: number, fileType: string) => {
    if (!user || !challenge) return
    setUploading(true)
    try {
      const { error } = await supabase.from('task_submissions').upsert({
        user_id: user.id,
        challenge_id: challenge.id,
        file_url: fileUrl,
        file_name: fileName,
        file_size_bytes: fileSize,
        file_type: fileType,
        status: 'pending',
      }, { onConflict: 'user_id,challenge_id' })

      if (error) throw error

      await supabase.from('admin_notifications').insert({
        type: 'task_submission',
        title: '📩 تسليم تاسك جديد',
        body: `${user.full_name || user.email} سلّم التاسك: ${challenge.title_ar}`,
        data: {
          user_id: user.id,
          user_name: user.full_name || user.email,
          challenge_id: challenge.id,
          challenge_title: challenge.title_ar,
          file_url: fileUrl,
          file_name: fileName,
        },
      })

      setSelectedFile(null)
      checkSubmission()
      Alert.alert(
        isAr ? '✅ تم الرفع!' : '✅ Submitted!',
        isAr ? 'تم رفع التاسك وسيتم مراجعته قريباً' : 'Task submitted and will be reviewed soon'
      )
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}><ActivityIndicator color={Colors.purple} size="large" /></View>
    </SafeAreaView>
  )

  if (!challenge) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}>
        <Text style={{ color: '#fff', fontSize: 16 }}>{isAr ? 'التحدي غير موجود' : 'Not found'}</Text>
        <TouchableOpacity style={s.btn} onPress={() => router.back()}>
          <Text style={s.btnText}>{isAr ? '← رجوع' : '← Back'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  const videoHTML = buildVideoHTML(challenge)
  const statusColor: Record<string, string> = {
    pending: Colors.orange, reviewing: Colors.blue, approved: Colors.green, rejected: Colors.red
  }
  const statusLabel: Record<string, string> = {
    pending: isAr ? '⏳ في انتظار المراجعة' : '⏳ Pending Review',
    reviewing: isAr ? '👀 قيد المراجعة' : '👀 Under Review',
    approved: isAr ? '✅ تمت الموافقة' : '✅ Approved',
    rejected: isAr ? '❌ مرفوض' : '❌ Rejected',
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{challenge.title_ar}</Text>
        <View style={[s.xpBadge, { backgroundColor: Colors.purple + '20' }]}>
          <Text style={[s.xpText, { color: Colors.purple }]}>⚡{challenge.xp_reward}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {videoHTML ? (
          <View style={s.videoBox}>
            <WebView source={{ html: videoHTML }} style={s.webview}
              allowsFullscreenVideo allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={Platform.OS !== 'android'}
              javaScriptEnabled scrollEnabled={false} />
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.cardTitle}>{isAr ? '📋 تعليمات التاسك' : '📋 Task Instructions'}</Text>
          <Text style={s.instructions}>
            {isAr
              ? (challenge.task_instructions_ar || challenge.description_ar || 'ارفع ملفك للإجابة على هذا التحدي')
              : (challenge.task_instructions || challenge.task_instructions_ar || 'Upload your file to complete this challenge')}
          </Text>
          <View style={s.limitNote}>
            <Text style={s.limitText}>
              📎 {isAr ? 'الحد الأقصى: 10 ميجابايت — أي صيغة مقبولة' : 'Max: 10MB — Any format accepted'}
            </Text>
          </View>
        </View>

        {submission && (
          <View style={[s.statusCard, { borderColor: (statusColor[submission.status] || Colors.orange) + '60', backgroundColor: (statusColor[submission.status] || Colors.orange) + '15' }]}>
            <Text style={[s.statusTitle, { color: statusColor[submission.status] || Colors.orange }]}>
              {statusLabel[submission.status] || submission.status}
            </Text>
            <Text style={s.submittedFile}>📎 {submission.file_name}</Text>
            {submission.admin_notes && (
              <View style={s.adminNotes}>
                <Text style={s.adminNotesLabel}>{isAr ? '💬 ملاحظة المراجع:' : '💬 Reviewer Note:'}</Text>
                <Text style={s.adminNotesText}>{submission.admin_notes}</Text>
              </View>
            )}
            {submission.status === 'approved' && (
              <Text style={s.xpEarned}>🎉 {isAr ? `حصلت على ${challenge.xp_reward} XP` : `You earned ${challenge.xp_reward} XP`}</Text>
            )}
          </View>
        )}

        {(!submission || submission.status === 'rejected') && (
          <View style={s.uploadCard}>
            <Text style={s.uploadTitle}>{isAr ? '📤 رفع الملف' : '📤 Upload File'}</Text>
            <TouchableOpacity style={s.pickBtn} onPress={pickFile}>
              <Text style={s.pickIcon}>📁</Text>
              <Text style={s.pickText}>{isAr ? 'اختر الملف (حتى 10MB)' : 'Choose file (up to 10MB)'}</Text>
            </TouchableOpacity>
            {submission?.status === 'rejected' && (
              <Text style={{ color: Colors.textSub, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                {isAr ? 'يمكنك رفع ملف جديد' : 'You can upload a new file'}
              </Text>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0f172a' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  header:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn:      { width: 36, height: 36, justifyContent: 'center' },
  backText:     { fontSize: 22, color: Colors.purple, fontWeight: '700' },
  headerTitle:  { flex: 1, fontSize: 15, fontWeight: '800', color: '#fff' },
  xpBadge:      { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  xpText:       { fontSize: 13, fontWeight: '800' },
  videoBox:     { width: '100%', aspectRatio: 16/9, backgroundColor: '#000' },
  webview:      { flex: 1, backgroundColor: '#000' },
  scroll:       { padding: 16 },
  card:         { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  cardTitle:    { fontSize: 15, fontWeight: '800', color: '#e2e8f0', marginBottom: 10, textAlign: 'right' },
  instructions: { fontSize: 14, color: '#94a3b8', lineHeight: 22, textAlign: 'right' },
  limitNote:    { backgroundColor: '#0f172a', borderRadius: 8, padding: 10, marginTop: 12 },
  limitText:    { fontSize: 12, color: '#475569', textAlign: 'center' },
  statusCard:   { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 2 },
  statusTitle:  { fontSize: 16, fontWeight: '900', marginBottom: 8, textAlign: 'right' },
  submittedFile:{ fontSize: 13, color: '#64748b', textAlign: 'right', marginBottom: 8 },
  adminNotes:   { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 12, marginTop: 8 },
  adminNotesLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 4 },
  adminNotesText: { fontSize: 13, color: '#e2e8f0', lineHeight: 20 },
  xpEarned:     { fontSize: 15, fontWeight: '800', color: Colors.green, textAlign: 'center', marginTop: 10 },
  uploadCard:   { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  uploadTitle:  { fontSize: 15, fontWeight: '800', color: '#e2e8f0', marginBottom: 14, textAlign: 'right' },
  pickBtn:      { borderRadius: 12, borderWidth: 2, borderColor: '#334155', borderStyle: 'dashed', padding: 28, alignItems: 'center' },
  pickIcon:     { fontSize: 36, marginBottom: 8 },
  pickText:     { color: '#64748b', fontSize: 14 },
  btn:          { backgroundColor: Colors.blue, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnText:      { color: '#fff', fontWeight: '800', fontSize: 14 },
})
