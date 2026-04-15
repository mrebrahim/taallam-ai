import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
  Platform,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

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

  useEffect(() => { if (id) load() }, [id])

  const load = async () => {
    const { data } = await supabase.from('challenges').select('*').eq('id', id).single()
    setChallenge(data)
    setLoading(false)

    if (user && data) {
      // Check MCQ attempt
      if (data.challenge_type === 'complete_sentence') {
        const { data: att } = await supabase
          .from('user_challenge_attempts')
          .select('is_correct, selected_answer')
          .eq('user_id', user.id).eq('challenge_id', id).maybeSingle()
        if (att) { setSelected(att.selected_answer); setAnswered(true); setIsCorrect(att.is_correct) }
      }
      // Check image submission
      if (data.challenge_type === 'node_analysis') {
        const { data: sub } = await supabase
          .from('task_submissions')
          .select('*').eq('user_id', user.id).eq('challenge_id', id).maybeSingle()
        if (sub) setSubmission(sub)
      }
    }
  }

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

  const pickAndUploadFile = async () => {
    if (!user || !challenge) return
    Alert.alert(
      isAr ? '📤 رفع الصورة' : '📤 Upload Image',
      isAr
        ? 'لرفع صورة، استخدم التطبيق على الموبايل بعد تحديث البناء.\n\nالنسخة الحالية تدعم رفع الملفات في الـ Build القادم.'
        : 'Image upload will be fully available in the next build.\n\nPlease update the app to access this feature.',
      [{ text: isAr ? 'حسناً' : 'OK' }]
    )
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
  const isMCQ = challenge.challenge_type === 'complete_sentence'

  const statusColors: Record<string, string> = {
    pending: Colors.orange, reviewing: Colors.blue,
    approved: Colors.green, rejected: Colors.red
  }
  const statusLabels: Record<string, string> = {
    pending: isAr ? '⏳ في انتظار المراجعة' : '⏳ Pending Review',
    reviewing: isAr ? '👀 قيد المراجعة' : '👀 Under Review',
    approved: isAr ? '✅ تمت الموافقة' : '✅ Approved',
    rejected: isAr ? '❌ مرفوض' : '❌ Rejected',
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

        {/* Challenge type badge */}
        <View style={s.typeBadge}>
          <Text style={s.typeText}>
            {isNodeAnalysis
              ? (isAr ? '📸 تحدي رفع صورة' : '📸 Image Upload Challenge')
              : (isAr ? '❓ سؤال اختياري' : '❓ Multiple Choice')}
          </Text>
        </View>

        {/* ── NODE ANALYSIS (Image Upload) ── */}
        {isNodeAnalysis && (
          <>
            <View style={s.questionBox}>
              <Text style={s.questionText}>
                {challenge.question_ar || challenge.description_ar ||
                  (isAr ? 'ارفع صورة للـ Node المطلوب' : 'Upload an image of the required Node')}
              </Text>
            </View>

            {/* Reference image if exists */}
            {challenge.image_url && (
              <View style={s.refImageBox}>
                <Text style={s.refImageLabel}>
                  {isAr ? '📌 الصورة المرجعية:' : '📌 Reference image:'}
                </Text>
              </View>
            )}

            {/* Submission status */}
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
              </View>
            ) : (
              <View style={s.uploadCard}>
                <Text style={s.uploadTitle}>{isAr ? '📤 ارفع صورتك' : '📤 Upload Your Image'}</Text>
                <Text style={s.uploadNote}>
                  {isAr
                    ? 'ارفع صورة الـ Node المطلوب — سيتم تحليلها بواسطة Gemini AI'
                    : 'Upload the required Node screenshot — it will be analyzed by Gemini AI'}
                </Text>
                <TouchableOpacity style={s.uploadBtn} onPress={pickAndUploadFile}>
                  <Text style={{ fontSize: 40, marginBottom: 8 }}>📁</Text>
                  <Text style={s.uploadBtnText}>
                    {isAr ? 'اختر صورة (JPG / PNG)' : 'Choose image (JPG / PNG)'}
                  </Text>
                  <Text style={s.uploadBtnNote}>
                    {isAr ? 'الحد الأقصى: 10MB' : 'Max: 10MB'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ── MCQ CHALLENGE ── */}
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
        {isNodeAnalysis && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#334155' }]} onPress={() => router.back()}>
            <Text style={s.actionBtnText}>{isAr ? '← رجوع' : '← Back'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0f172a' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  header:          { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn:         { width: 36, height: 36, justifyContent: 'center' },
  backText:        { fontSize: 22, color: Colors.purple, fontWeight: '700' },
  headerTitle:     { flex: 1, fontSize: 15, fontWeight: '800', color: '#fff' },
  xpBadge:         { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  xpText:          { fontSize: 13, fontWeight: '800' },
  scroll:          { padding: 16 },
  typeBadge:       { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-end', marginBottom: 12 },
  typeText:        { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  questionBox:     { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  questionText:    { fontSize: 15, fontWeight: '700', color: '#e2e8f0', textAlign: 'right', lineHeight: 24 },
  refImageBox:     { marginBottom: 12 },
  refImageLabel:   { color: '#64748b', fontSize: 12, marginBottom: 6 },
  uploadCard:      { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  uploadTitle:     { fontSize: 15, fontWeight: '800', color: '#e2e8f0', textAlign: 'right', marginBottom: 6 },
  uploadNote:      { fontSize: 13, color: '#94a3b8', textAlign: 'right', marginBottom: 14, lineHeight: 20 },
  uploadBtn:       { borderRadius: 12, borderWidth: 2, borderColor: '#334155', borderStyle: 'dashed', padding: 24, alignItems: 'center' },
  uploadBtnText:   { color: '#64748b', fontSize: 14, fontWeight: '600' },
  uploadBtnNote:   { color: '#475569', fontSize: 11, marginTop: 4 },
  statusCard:      { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 2 },
  statusTitle:     { fontSize: 16, fontWeight: '900', marginBottom: 8, textAlign: 'right' },
  submittedFile:   { fontSize: 13, color: '#64748b', textAlign: 'right', marginBottom: 8 },
  adminNotes:      { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 12, marginTop: 8 },
  adminNotesLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 4 },
  adminNotesText:  { fontSize: 13, color: '#e2e8f0', lineHeight: 20 },
  xpEarned:        { fontSize: 15, fontWeight: '800', color: Colors.green, textAlign: 'center', marginTop: 10 },
  option:          { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optLabel:        { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  explanation:     { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 2 },
  explanationTitle:{ fontSize: 13, fontWeight: '800', color: '#94a3b8', marginBottom: 6 },
  explanationText: { fontSize: 14, color: '#e2e8f0', lineHeight: 22, textAlign: 'right' },
  footer:          { padding: 16, borderTopWidth: 1, borderTopColor: '#1e293b' },
  actionBtn:       { borderRadius: 14, padding: 17, alignItems: 'center' },
  actionBtnText:   { fontSize: 16, fontWeight: '900', color: '#fff' },
  btn:             { backgroundColor: Colors.blue, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnText:         { color: '#fff', fontWeight: '800', fontSize: 14 },
})
