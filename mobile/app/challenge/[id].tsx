import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
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

  const [challenge, setChallenge] = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<number | null>(null)
  const [answered, setAnswered]   = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (id) load() }, [id])

  const load = async () => {
    const { data } = await supabase.from('challenges').select('*').eq('id', id).single()
    setChallenge(data)
    setLoading(false)

    // Check if already answered
    if (user && data) {
      const { data: att } = await supabase
        .from('user_challenge_attempts')
        .select('is_correct, selected_answer')
        .eq('user_id', user.id)
        .eq('challenge_id', id)
        .maybeSingle()
      if (att) {
        setSelected(att.selected_answer)
        setAnswered(true)
        setIsCorrect(att.is_correct)
      }
    }
  }

  const submit = async () => {
    if (selected === null || !user || !challenge) return
    setSubmitting(true)
    const correct = selected === challenge.correct_answer
    setIsCorrect(correct)
    setAnswered(true)

    await supabase.from('user_challenge_attempts').upsert({
      user_id: user.id,
      challenge_id: challenge.id,
      selected_answer: selected,
      is_correct: correct,
      score: correct ? 100 : 0,
    }, { onConflict: 'user_id,challenge_id' })

    if (correct) {
      await supabase.from('users')
        .update({ xp_total: (user.xp_total || 0) + (challenge.xp_reward || 50) })
        .eq('id', user.id)
    }
    setSubmitting(false)
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

  const DIFF_LABELS: Record<number, string> = { 1: isAr ? 'سهل' : 'Easy', 2: isAr ? 'متوسط' : 'Medium', 3: isAr ? 'صعب' : 'Hard' }
  const DIFF_COLORS: Record<number, string> = { 1: Colors.green, 2: Colors.blue, 3: Colors.orange }

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

        {/* Difficulty badge */}
        <View style={s.meta}>
          <View style={[s.diffBadge, { backgroundColor: (DIFF_COLORS[challenge.difficulty] || Colors.green) + '20' }]}>
            <Text style={[s.diffText, { color: DIFF_COLORS[challenge.difficulty] || Colors.green }]}>
              {DIFF_LABELS[challenge.difficulty] || 'سهل'}
            </Text>
          </View>
          {answered && (
            <View style={[s.diffBadge, { backgroundColor: isCorrect ? '#D7FFB8' : '#FFE5E5' }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: isCorrect ? '#27500A' : '#7f1d1d' }}>
                {isCorrect ? (isAr ? '✅ أحسنت' : '✅ Correct') : (isAr ? '❌ خطأ' : '❌ Wrong')}
              </Text>
            </View>
          )}
        </View>

        {/* Question */}
        <View style={s.questionBox}>
          <Text style={s.questionText}>{challenge.question_ar}</Text>
        </View>

        {/* Options */}
        {(challenge.options || []).map((opt: string, i: number) => {
          let bg = '#1e293b', border = '#334155', txtColor = '#e2e8f0'
          if (answered) {
            if (i === challenge.correct_answer) { bg = '#166534'; border = Colors.green; txtColor = '#bbf7d0' }
            else if (i === selected) { bg = '#7f1d1d'; border = Colors.red; txtColor = '#fca5a5' }
          } else if (selected === i) {
            bg = '#1e3a5f'; border = Colors.blue; txtColor = '#93c5fd'
          }
          return (
            <TouchableOpacity
              key={i}
              style={[s.option, { backgroundColor: bg, borderColor: border }]}
              onPress={() => !answered && setSelected(i)}
              disabled={answered}>
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

        {/* Explanation */}
        {answered && challenge.explanation_ar && (
          <View style={[s.explanation, { borderColor: isCorrect ? Colors.green + '40' : Colors.red + '40' }]}>
            <Text style={s.explanationTitle}>{isAr ? '💡 الشرح:' : '💡 Explanation:'}</Text>
            <Text style={s.explanationText}>{challenge.explanation_ar}</Text>
            {isCorrect && (
              <Text style={s.xpEarned}>🎉 +{challenge.xp_reward} XP {isAr ? 'تم إضافتها!' : 'earned!'}</Text>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        {answered ? (
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
            onPress={submit}
            disabled={selected === null || submitting}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={[s.actionBtnText, { color: selected === null ? '#64748b' : '#fff' }]}>
                  {isAr ? '✅ تأكيد الإجابة' : '✅ Confirm Answer'}
                </Text>}
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
  meta:            { flexDirection: 'row', gap: 8, marginBottom: 14 },
  diffBadge:       { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  diffText:        { fontSize: 12, fontWeight: '700' },
  questionBox:     { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  questionText:    { fontSize: 16, fontWeight: '700', color: '#e2e8f0', textAlign: 'right', lineHeight: 26 },
  option:          { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optLabel:        { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  explanation:     { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 2 },
  explanationTitle:{ fontSize: 13, fontWeight: '800', color: '#94a3b8', marginBottom: 6 },
  explanationText: { fontSize: 14, color: '#e2e8f0', lineHeight: 22, textAlign: 'right' },
  xpEarned:        { fontSize: 15, fontWeight: '800', color: Colors.green, textAlign: 'center', marginTop: 10 },
  footer:          { padding: 16, borderTopWidth: 1, borderTopColor: '#1e293b' },
  actionBtn:       { borderRadius: 14, padding: 17, alignItems: 'center' },
  actionBtnText:   { fontSize: 16, fontWeight: '900', color: '#fff' },
  btn:             { backgroundColor: Colors.blue, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnText:         { color: '#fff', fontWeight: '800', fontSize: 14 },
})
