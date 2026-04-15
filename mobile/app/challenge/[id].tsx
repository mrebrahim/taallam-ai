import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as DocumentPicker from 'expo-document-picker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { isAr } = useLang()

  const [challenge, setChallenge]   = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<number | null>(null)
  const [answered, setAnswered]     = useState(false)
  const [isCorrect, setIsCorrect]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submission, setSubmission] = useState<any>(null)
  const [pickedFile, setPickedFile] = useState<any>(null)
  const [uploading, setUploading]   = useState(false)

  useEffect(() => { if (id) load() }, [id])

  const load = async () => {
    const { data } = await supabase.from('challenges').select('*').eq('id', id).single()
    setChallenge(data)
    setLoading(false)

    if (user && data) {
      if (data.challenge_type === 'complete_sentence') {
        const { data: att } = await supabase
          .from('user_challenge_attempts')
          .select('is_correct, selected_answer')
          .eq('user_id', user.id).eq('challenge_id', id).maybeSingle()
        if (att) { setSelected(att.selected_answer); setAnswered(true); setIsCorrect(att.is_correct) }
      }
      if (data.challenge_type === 'node_analysis') {
        const { data: sub } = await supabase
          .from('task_submissions')
          .select('*').eq('user_id', user.id).eq('challenge_id', id).maybeSingle()
        if (sub) setSubmission(sub)
      }
    }
  }

  // ── MCQ Submit ──────────────────────────────────────────────
  const submitMCQ = async () => {
    if (selected === null || !user || !challenge) return
    setSubmitting(true)
    const correct = selected === challenge.correct_answer
    setIsCorrect(correct)
    setAnswered(true)

    await supabase.from('user_challenge_attempts').upsert({
      user_id: user.id, challenge_id: challenge.id,
      selected_answer: selected, is_correct: correct, score: correct ? 100 : 0,
    }, { onConflict: 'user_id,challenge_id' })

    if (correct) {
      await supabase.from('users')
        .update({ xp_total: (user.xp_total || 0) + (challenge.xp_reward || 50) })
        .eq('id', user.id)
    }
    setSubmitting(false)
  }

  // ── Pick File ───────────────────────────────────────────────
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      const file = result.assets[0]
      if (file.size && file.size > MAX_SIZE) {
        Alert.alert(
          isAr ? '❌ الملف كبير' : '❌ File too large',
          isAr ? 'الحد الأقصى 10 ميجابايت' : 'Maximum 10MB per file'
        )
        return
      }
      setPickedFile(file)
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message)
    }
  }

  // ── Upload & Submit ─────────────────────────────────────────
  const uploadAndSubmit = async () => {
    if (!pickedFile || !user || !challenge) return
    setUploading(true)
    try {
      // Read file
      const response = await fetch(pickedFile.uri)
      const blob = await response.blob()

      const ext = pickedFile.name.split('.').pop() || 'jpg'
      const filePath = `${user.id}/${challenge.id}_${Date.now()}.${ext}`

      // Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('task-submissions')
        .upload(filePath, blob, {
          contentType: pickedFile.mimeType || 'image/jpeg',
          upsert: true,
        })

      if (uploadErr) throw new Error(isAr ? 'فشل رفع الصورة: ' + uploadErr.message : 'Upload failed: ' + uploadErr.message)

      // Get URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-submissions')
        .getPublicUrl(filePath)

      // Save submission
      const { error: subErr } = await supabase.from('task_submissions').upsert({
        user_id: user.id,
        challenge_id: challenge.id,
        file_url: publicUrl,
        file_name: pickedFile.name,
        file_size_bytes: pickedFile.size || 0,
        file_type: pickedFile.mimeType || 'image/jpeg',
        status: 'pending',
      }, { onConflict: 'user_id,challenge_id' })

      if (subErr) throw subErr

      // Admin notification
      await supabase.from('admin_notifications').insert({
        type: 'task_submission',
        title: '📩 تسليم تحدي صورة',
        body: `${user.full_name || user.email} رفع صورة للتحدي: ${challenge.title_ar}`,
        data: {
          user_id: user.id,
          user_name: user.full_name || user.email,
          challenge_id: challenge.id,
          challenge_title: challenge.title_ar,
          file_url: publicUrl,
          file_name: pickedFile.name,
        },
      })

      setPickedFile(null)
      load() // Refresh to show submission status
      Alert.alert(
        isAr ? '✅ تم الرفع!' : '✅ Uploaded!',
        isAr ? 'تم رفع الصورة وسيتم تحليلها قريباً' : 'Image uploaded and will be analyzed soon'
      )
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message)
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
          <Text style={s.btnText}>← {isAr ? 'رجوع' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  const isNodeAnalysis = challenge.challenge_type === 'node_analysis'
  const isMCQ          = challenge.challenge_type === 'complete_sentence'

  const statusColors: Record<string, string> = {
    pending: Colors.orange, reviewing: Colors.blue,
    approved: Colors.green, rejected: Colors.red,
  }
  const statusLabels: Record<string, string> = {
    pending:   isAr ? '⏳ في انتظار المراجعة' : '⏳ Pending Review',
    reviewing: isAr ? '👀 قيد المراجعة' : '👀 Under Review',
    approved:  isAr ? '✅ تمت الموافقة' : '✅ Approved',
    rejected:  isAr ? '❌ مرفوض' : '❌ Rejected',
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
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

        {/* Type badge */}
        <View style={s.typeBadge}>
          <Text style={s.typeText}>
            {isNodeAnalysis
              ? (isAr ? '📸 تحدي رفع صورة + تحليل AI' : '📸 Image Upload + AI Analysis')
              : (isAr ? '❓ سؤال اختياري' : '❓ Multiple Choice')}
          </Text>
        </View>

        {/* ════ NODE ANALYSIS (Image Upload) ════ */}
        {isNodeAnalysis && (
          <>
            <View style={s.questionBox}>
              <Text style={s.questionText}>
                {challenge.question_ar || challenge.description_ar ||
                  (isAr ? 'ارفع صورة الـ Node المطلوب' : 'Upload the required Node screenshot')}
              </Text>
            </View>

            {/* Already submitted */}
            {submission ? (
              <View style={[s.statusCard, {
                borderColor: (statusColors[submission.status] || Colors.orange) + '60',
                backgroundColor: (statusColors[submission.status] || Colors.orange) + '15',
              }]}>
                <Text style={[s.statusTitle, { color: statusColors[submission.status] || Colors.orange }]}>
                  {statusLabels[submission.status] || submission.status}
                </Text>
                <Text style={s.submittedFile}>📎 {submission.file_name}</Text>

                {submission.admin_notes && (
                  <View style={s.adminNotes}>
                    <Text style={s.adminNotesLabel}>{isAr ? '💬 ملاحظة:' : '💬 Note:'}</Text>
                    <Text style={s.adminNotesText}>{submission.admin_notes}</Text>
                  </View>
                )}

                {submission.status === 'approved' && (
                  <Text style={s.xpEarned}>🎉 +{challenge.xp_reward} XP!</Text>
                )}

                {/* Allow resubmit if rejected */}
                {submission.status === 'rejected' && (
                  <TouchableOpacity style={[s.pickBtn, { marginTop: 12 }]} onPress={pickFile}>
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>📁</Text>
                    <Text style={s.pickText}>{isAr ? 'رفع صورة جديدة' : 'Upload new image'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              /* Upload section */
              <View style={s.uploadCard}>
                <Text style={s.uploadTitle}>{isAr ? '📤 ارفع صورتك' : '📤 Upload Your Image'}</Text>
                <Text style={s.uploadNote}>
                  {isAr
                    ? 'ارفع صورة PNG أو JPG للـ Node المطلوب — سيتم مراجعتها وإضافة XP عند الموافقة'
                    : 'Upload PNG or JPG of the required Node — will be reviewed and XP awarded on approval'}
                </Text>

                {pickedFile ? (
                  /* File picked - show preview */
                  <View style={s.filePreview}>
                    <View style={s.filePreviewInfo}>
                      <Text style={s.filePreviewName} numberOfLines={1}>🖼️ {pickedFile.name}</Text>
                      <Text style={s.filePreviewSize}>
                        {((pickedFile.size || 0) / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setPickedFile(null)} style={s.removeBtn}>
                      <Text style={{ color: '#fca5a5', fontSize: 14, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Pick button */
                  <TouchableOpacity style={s.pickBtn} onPress={pickFile}>
                    <Text style={{ fontSize: 40, marginBottom: 8 }}>📷</Text>
                    <Text style={s.pickText}>{isAr ? 'اختر صورة (JPG / PNG)' : 'Choose image (JPG / PNG)'}</Text>
                    <Text style={s.pickNote}>{isAr ? 'الحد الأقصى: 10 ميجابايت' : 'Max: 10MB'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        {/* ════ MCQ ════ */}
        {isMCQ && (
          <>
            <View style={s.questionBox}>
              <Text style={s.questionText}>{challenge.question_ar}</Text>
            </View>

            {(challenge.options || []).map((opt: string, i: number) => {
              let bg = '#1e293b', border = '#334155', txtColor = '#e2e8f0'
              if (answered) {
                if (i === challenge.correct_answer) { bg = '#166534'; border = Colors.green; txtColor = '#bbf7d0' }
                else if (i === selected) { bg = '#7f1d1d'; border = Colors.red; txtColor = '#fca5a5' }
              } else if (selected === i) {
                bg = '#1e3a5f'; border = Colors.blue; txtColor = '#93c5fd'
              }
              return (
                <TouchableOpacity key={i}
                  style={[s.option, { backgroundColor: bg, borderColor: border }]}
                  onPress={() => !answered && setSelected(i)} disabled={answered}>
                  <View style={[s.optLabel, {
                    backgroundColor: answered && i === challenge.correct_answer ? Colors.green
                      : selected === i && !answered ? Colors.blue : '#334155'
                  }]}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                      {answered && i === challenge.correct_answer ? '✓'
                        : answered && i === selected ? '✗'
                        : isAr ? ['أ','ب','ج','د'][i] : ['A','B','C','D'][i]}
                    </Text>
                  </View>
                  <Text style={{ color: txtColor, fontSize: 14, flex: 1, textAlign: isAr ? 'right' : 'left', fontWeight: selected === i ? '700' : '400' }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              )
            })}

            {answered && challenge.explanation_ar && (
              <View style={[s.explanation, { borderColor: isCorrect ? Colors.green + '40' : Colors.red + '40' }]}>
                <Text style={s.explanationTitle}>{isAr ? '💡 الشرح:' : '💡 Explanation:'}</Text>
                <Text style={s.explanationText}>{challenge.explanation_ar}</Text>
                {isCorrect && <Text style={s.xpEarned}>🎉 +{challenge.xp_reward} XP!</Text>}
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        {/* MCQ footer */}
        {isMCQ && (
          answered ? (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: isCorrect ? Colors.green : Colors.blue }]}
              onPress={() => router.back()}>
              <Text style={s.actionBtnText}>
                {isCorrect ? (isAr ? '🎉 رائع! رجوع' : '🎉 Great! Back') : (isAr ? 'رجوع' : 'Back')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: selected === null ? '#334155' : Colors.purple }]}
              onPress={submitMCQ}
              disabled={selected === null || submitting}>
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={[s.actionBtnText, { color: selected === null ? '#64748b' : '#fff' }]}>
                    {isAr ? '✅ تأكيد الإجابة' : '✅ Confirm Answer'}
                  </Text>}
            </TouchableOpacity>
          )
        )}

        {/* Node analysis footer */}
        {isNodeAnalysis && !submission && pickedFile && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: Colors.purple, opacity: uploading ? 0.7 : 1 }]}
            onPress={uploadAndSubmit}
            disabled={uploading}>
            {uploading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.actionBtnText}>{isAr ? '🚀 رفع الصورة' : '🚀 Upload Image'}</Text>}
          </TouchableOpacity>
        )}

        {isNodeAnalysis && (!pickedFile || submission) && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#334155' }]} onPress={() => router.back()}>
            <Text style={s.actionBtnText}>{isAr ? '← رجوع' : '← Back'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0f172a' },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  header:           { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn:          { width: 36, height: 36, justifyContent: 'center' },
  backText:         { fontSize: 22, color: Colors.purple, fontWeight: '700' },
  headerTitle:      { flex: 1, fontSize: 15, fontWeight: '800', color: '#fff' },
  xpBadge:          { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  xpText:           { fontSize: 13, fontWeight: '800' },
  scroll:           { padding: 16 },
  typeBadge:        { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-end', marginBottom: 12 },
  typeText:         { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  questionBox:      { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  questionText:     { fontSize: 15, fontWeight: '700', color: '#e2e8f0', textAlign: 'right', lineHeight: 24 },
  uploadCard:       { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  uploadTitle:      { fontSize: 15, fontWeight: '800', color: '#e2e8f0', textAlign: 'right', marginBottom: 6 },
  uploadNote:       { fontSize: 13, color: '#94a3b8', textAlign: 'right', marginBottom: 14, lineHeight: 20 },
  pickBtn:          { borderRadius: 12, borderWidth: 2, borderColor: '#334155', borderStyle: 'dashed', padding: 28, alignItems: 'center' },
  pickText:         { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  pickNote:         { color: '#475569', fontSize: 11, marginTop: 4 },
  filePreview:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, padding: 12, marginBottom: 4 },
  filePreviewInfo:  { flex: 1 },
  filePreviewName:  { color: '#e2e8f0', fontSize: 14, fontWeight: '600', textAlign: 'right' },
  filePreviewSize:  { color: '#64748b', fontSize: 12, textAlign: 'right', marginTop: 2 },
  removeBtn:        { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7f1d1d', justifyContent: 'center', alignItems: 'center' },
  statusCard:       { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 2 },
  statusTitle:      { fontSize: 16, fontWeight: '900', marginBottom: 8, textAlign: 'right' },
  submittedFile:    { fontSize: 13, color: '#64748b', textAlign: 'right', marginBottom: 8 },
  adminNotes:       { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 12, marginTop: 8 },
  adminNotesLabel:  { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 4 },
  adminNotesText:   { fontSize: 13, color: '#e2e8f0', lineHeight: 20 },
  xpEarned:         { fontSize: 15, fontWeight: '800', color: Colors.green, textAlign: 'center', marginTop: 10 },
  option:           { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optLabel:         { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  explanation:      { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 2 },
  explanationTitle: { fontSize: 13, fontWeight: '800', color: '#94a3b8', marginBottom: 6 },
  explanationText:  { fontSize: 14, color: '#e2e8f0', lineHeight: 22, textAlign: 'right' },
  footer:           { padding: 16, borderTopWidth: 1, borderTopColor: '#1e293b' },
  actionBtn:        { borderRadius: 14, padding: 17, alignItems: 'center' },
  actionBtnText:    { fontSize: 16, fontWeight: '900', color: '#fff' },
  btn:              { backgroundColor: Colors.blue, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnText:          { color: '#fff', fontWeight: '800', fontSize: 14 },
})
