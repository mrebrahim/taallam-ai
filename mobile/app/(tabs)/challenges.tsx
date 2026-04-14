import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

const DIFF_LABELS = ['', 'سهل', 'متوسط', 'صعب', 'خبير', 'أسطوري']
const DIFF_COLORS = ['', Colors.green, Colors.blue, Colors.orange, Colors.purple, Colors.red]

export default function ChallengesScreen() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<any[]>([])
  const [attempts, setAttempts] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<any>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: ch }, { data: att }] = await Promise.all([
        supabase.from('challenges').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('user_challenge_attempts').select('*').eq('user_id', user.id),
      ])
      setChallenges(ch || [])
      const m: Record<string, any> = {}
      att?.forEach((a: any) => { m[a.challenge_id] = a })
      setAttempts(m)
      setLoading(false)
    }
    load()
  }, [user])

  const openChallenge = (ch: any) => {
    setActive(ch)
    setSelected(null)
    setAnswered(false)
    setIsCorrect(false)
  }

  const submit = async () => {
    if (selected === null || !active || !user) return
    setSubmitting(true)
    const correct = selected === active.correct_answer
    setIsCorrect(correct)
    setAnswered(true)
    await supabase.from('user_challenge_attempts').upsert({
      user_id: user.id,
      challenge_id: active.id,
      selected_answer: selected,
      is_correct: correct,
      score: correct ? 100 : 0,
    }, { onConflict: 'user_id,challenge_id' })
    if (correct) {
      try {
        await supabase.rpc('award_xp', {
          p_user_id: user.id,
          p_amount: active.xp_reward,
          p_reason: 'challenge_complete',
          p_reference_id: active.id,
        })
      } catch {}
    }
    setAttempts(prev => ({ ...prev, [active.id]: { is_correct: correct } }))
    setSubmitting(false)
  }

  const completed = Object.values(attempts).filter((a: any) => a.is_correct).length

  if (loading) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}><ActivityIndicator color={Colors.blue} size="large" /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>⚔️ التحديات</Text>
        <View style={s.badge}><Text style={s.badgeText}>{completed}/{challenges.length} ✅</Text></View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Sadaqat Banner */}
        <TouchableOpacity style={s.sadaqatBanner} onPress={() => router.push('/sadaqat' as any)}>
          <Text style={s.sadaqatEmoji}>📿</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.sadaqatTitle}>صدقة العلم</Text>
            <Text style={s.sadaqatSub}>حل التحديات مع زملائك واكسب XP أكتر!</Text>
          </View>
          <Text style={{ color: Colors.orange, fontSize: 18 }}>←</Text>
        </TouchableOpacity>

        {challenges.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>🔜</Text>
            <Text style={s.emptyTitle}>التحديات قادمة قريباً!</Text>
          </View>
        ) : challenges.map(ch => {
          const att = attempts[ch.id]
          const done = att?.is_correct
          const color = DIFF_COLORS[ch.difficulty] || Colors.green

          return (
            <TouchableOpacity key={ch.id} style={[s.card, done && { borderColor: Colors.green }]}
              onPress={() => !done && openChallenge(ch)} disabled={done}>
              <View style={[s.cardAccent, { backgroundColor: color }]} />
              <View style={[s.iconBox, { backgroundColor: done ? '#D7FFB8' : color + '20' }]}>
                <Text style={{ fontSize: 24 }}>{done ? '✅' : '⚔️'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{ch.title_ar}</Text>
                <View style={s.tags}>
                  <View style={[s.tag, { backgroundColor: color + '20' }]}>
                    <Text style={[s.tagText, { color }]}>{DIFF_LABELS[ch.difficulty]}</Text>
                  </View>
                  <View style={[s.tag, { backgroundColor: '#FFF5D3' }]}>
                    <Text style={[s.tagText, { color: '#A56644' }]}>+{ch.xp_reward} XP</Text>
                  </View>
                </View>
              </View>
              {!done && <Text style={{ color: '#ddd', fontSize: 18 }}>←</Text>}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Challenge Modal */}
      <Modal visible={!!active} animationType="slide" presentationStyle="pageSheet">
        {active && (
          <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setActive(null)}>
                <Text style={{ fontSize: 15, color: Colors.blue, fontWeight: '700' }}>✕ إغلاق</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>{active.title_ar}</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={s.question}><Text style={s.questionText}>{active.question_ar}</Text></View>

              {(active.options || []).map((opt: string, i: number) => {
                let bg = '#fff', border = '#f0f0f0', color = '#333'
                if (answered) {
                  if (i === active.correct_answer) { bg = '#D7FFB8'; border = Colors.green; color = '#27500A' }
                  else if (i === selected) { bg = '#FFE5E5'; border = Colors.red; color = '#7f1d1d' }
                } else if (selected === i) {
                  bg = '#DDF4FF'; border = Colors.blue; color = '#1453A3'
                }
                return (
                  <TouchableOpacity key={i} style={[s.option, { backgroundColor: bg, borderColor: border }]}
                    onPress={() => !answered && setSelected(i)} disabled={answered}>
                    <View style={[s.optBadge, { backgroundColor: answered && i === active.correct_answer ? Colors.green : selected === i && !answered ? Colors.blue : '#f0f0f0' }]}>
                      <Text style={{ color: (answered && i === active.correct_answer) || (selected === i && !answered) ? '#fff' : '#999', fontWeight: '800', fontSize: 12 }}>
                        {answered && i === active.correct_answer ? '✓' : answered && i === selected ? '✗' : ['أ','ب','ج','د'][i]}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color, fontWeight: selected === i ? '700' : '400', flex: 1 }}>{opt}</Text>
                  </TouchableOpacity>
                )
              })}

              {answered && (
                <View style={[s.feedback, { backgroundColor: isCorrect ? '#D7FFB8' : '#FFE5E5', borderColor: isCorrect ? Colors.green : Colors.red }]}>
                  <Text style={[s.feedbackTitle, { color: isCorrect ? '#27500A' : '#7f1d1d' }]}>
                    {isCorrect ? '🎉 أحسنت! إجابة صحيحة' : '❌ إجابة خاطئة'}
                  </Text>
                  {active.explanation_ar && <Text style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{active.explanation_ar}</Text>}
                  {isCorrect && <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.orange, marginTop: 6 }}>+{active.xp_reward} XP 🎯</Text>}
                </View>
              )}
            </ScrollView>

            <View style={s.modalFooter}>
              {answered ? (
                <TouchableOpacity style={[s.btn, { backgroundColor: isCorrect ? Colors.green : Colors.blue }]}
                  onPress={() => setActive(null)}>
                  <Text style={s.btnText}>{isCorrect ? '🎉 رائع!' : 'رجوع'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[s.btn, { backgroundColor: selected === null ? '#e0e0e0' : Colors.blue }]}
                  onPress={submit} disabled={selected === null || submitting}>
                  <Text style={[s.btnText, { color: selected === null ? '#aaa' : '#fff' }]}>
                    {submitting ? '⏳ جاري التحقق...' : '✅ تأكيد الإجابة'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: Colors.text },
  badge: { backgroundColor: '#D7FFB8', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 5 },
  badgeText: { fontSize: 13, fontWeight: '800', color: '#27500A' },
  scroll: { padding: 16 },
  sadaqatBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF5D3', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 2, borderColor: Colors.orange + '40' },
  sadaqatEmoji: { fontSize: 32 },
  sadaqatTitle: { fontSize: 15, fontWeight: '800', color: '#A56644', textAlign: 'right' },
  sadaqatSub: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 2 },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden' },
  cardAccent: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 4 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 6, textAlign: 'right' },
  tags: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end' },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '700' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 16, fontWeight: '900', color: Colors.text, flex: 1, textAlign: 'center' },
  question: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: Colors.border },
  questionText: { fontSize: 15, fontWeight: '700', color: Colors.text, textAlign: 'right', lineHeight: 24 },
  option: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optBadge: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  feedback: { borderRadius: 14, padding: 14, borderWidth: 2, marginTop: 8 },
  feedbackTitle: { fontSize: 15, fontWeight: '900' },
  modalFooter: { padding: 16, backgroundColor: '#fff', borderTopWidth: 2, borderTopColor: Colors.border },
  btn: { borderRadius: 14, padding: 16, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
})
