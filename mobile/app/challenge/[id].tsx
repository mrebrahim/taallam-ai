import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as DocumentPicker from 'expo-document-picker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

const MAX_SIZE = 10 * 1024 * 1024

// ── Helpers ──────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { isAr } = useLang()

  const [challenge, setChallenge]     = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [submission, setSubmission]   = useState<any>(null)
  const [submitting, setSubmitting]   = useState(false)

  // MCQ / TrueFalse state
  const [selected, setSelected]       = useState<number | null>(null)
  const [answered, setAnswered]       = useState(false)
  const [isCorrect, setIsCorrect]     = useState(false)

  // Ordering state
  const [orderItems, setOrderItems]   = useState<any[]>([])
  const [orderChecked, setOrderChecked] = useState(false)
  const [orderCorrect, setOrderCorrect] = useState(false)

  // Matching state
  const [matchLeft, setMatchLeft]     = useState<any[]>([])
  const [matchRight, setMatchRight]   = useState<any[]>([])
  const [matchSel, setMatchSel]       = useState<string | null>(null)
  const [matchPairs, setMatchPairs]   = useState<Record<string, string>>({})
  const [matchChecked, setMatchChecked] = useState(false)
  const [matchCorrect, setMatchCorrect] = useState(false)

  // File upload state
  const [pickedFile, setPickedFile]   = useState<any>(null)
  const [uploading, setUploading]     = useState(false)

  // YouTube / Text state
  const [ytUrl, setYtUrl]             = useState('')
  const [textAnswer, setTextAnswer]   = useState('')

  useEffect(() => { if (id) load() }, [id])

  const load = async () => {
    const { data: ch } = await supabase.from('challenges').select('*').eq('id', id).single()
    setChallenge(ch)
    setLoading(false)
    if (!ch || !user) return

    const t = ch.challenge_type
    if (t === 'mcq' || t === 'complete_sentence' || t === 'true_false') {
      const { data: att } = await supabase.from('user_challenge_attempts')
        .select('is_correct, selected_answer').eq('user_id', user.id).eq('challenge_id', id).maybeSingle()
      if (att) { setSelected(att.selected_answer); setAnswered(true); setIsCorrect(att.is_correct) }
    }
    if (t === 'ordering' && ch.items) {
      setOrderItems(shuffle(ch.items))
    }
    if (t === 'matching' && ch.pairs) {
      setMatchLeft(ch.pairs.map((p: any, i: number) => ({ id: String(i), text: p.left })))
      setMatchRight(shuffle(ch.pairs.map((p: any, i: number) => ({ id: String(i), text: p.right }))))
    }
    if (t === 'node_analysis' || t === 'video_submission') {
      const { data: sub } = await supabase.from('task_submissions')
        .select('*').eq('user_id', user.id).eq('challenge_id', id).maybeSingle()
      if (sub) setSubmission(sub)
    }
    if (t === 'text_submission') {
      const { data: sub } = await supabase.from('text_submissions')
        .select('*').eq('user_id', user.id).eq('challenge_id', id).maybeSingle()
      if (sub) setSubmission(sub)
    }
  }

  // ── Award XP helper ──────────────────────────────────────────
  const awardXP = async () => {
    if (!user || !challenge) return
    await supabase.from('users')
      .update({ xp_total: (user.xp_total || 0) + (challenge.xp_reward || 50) })
      .eq('id', user.id)
  }

  // ── MCQ / TrueFalse / CompleteSentence ──────────────────────
  const submitChoice = async () => {
    if (selected === null || !user || !challenge) return
    setSubmitting(true)
    const correct = selected === challenge.correct_answer
    setIsCorrect(correct); setAnswered(true)
    await supabase.from('user_challenge_attempts').upsert({
      user_id: user.id, challenge_id: challenge.id,
      selected_answer: selected, is_correct: correct, score: correct ? 100 : 0,
    }, { onConflict: 'user_id,challenge_id' })
    if (correct) await awardXP()
    setSubmitting(false)
  }

  // ── Ordering ─────────────────────────────────────────────────
  const moveItem = (from: number, dir: -1 | 1) => {
    const to = from + dir
    if (to < 0 || to >= orderItems.length) return
    const next = [...orderItems]
    ;[next[from], next[to]] = [next[to], next[from]]
    setOrderItems(next)
  }
  const checkOrder = async () => {
    if (!challenge?.correct_order || !user) return
    const correct = challenge.correct_order.every(
      (idx: number, pos: number) => challenge.items[idx]?.id === orderItems[pos]?.id
    )
    setOrderCorrect(correct); setOrderChecked(true)
    await supabase.from('user_challenge_attempts').upsert({
      user_id: user.id, challenge_id: challenge.id,
      selected_answer: 0, is_correct: correct, score: correct ? 100 : 0,
    }, { onConflict: 'user_id,challenge_id' })
    if (correct) await awardXP()
  }

  // ── Matching ─────────────────────────────────────────────────
  const handleMatchTap = (side: 'left' | 'right', item: any) => {
    if (matchChecked) return
    const key = side + ':' + item.id
    if (!matchSel) { setMatchSel(key); return }
    const [selSide, selId] = matchSel.split(':')
    if (selSide === side) { setMatchSel(key); return }
    const leftId  = side === 'left'  ? item.id : selId
    const rightId = side === 'right' ? item.id : selId
    setMatchPairs(prev => ({ ...prev, [leftId]: rightId }))
    setMatchSel(null)
  }
  const checkMatch = async () => {
    if (!challenge?.pairs || !user) return
    const correct = challenge.pairs.every(
      (_: any, i: number) => matchPairs[String(i)] === String(i)
    )
    setMatchCorrect(correct); setMatchChecked(true)
    await supabase.from('user_challenge_attempts').upsert({
      user_id: user.id, challenge_id: challenge.id,
      selected_answer: 0, is_correct: correct, score: correct ? 100 : 0,
    }, { onConflict: 'user_id,challenge_id' })
    if (correct) await awardXP()
  }

  // ── Image Upload ─────────────────────────────────────────────
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true })
      if (result.canceled) return
      const file = result.assets[0]
      if (file.size && file.size > MAX_SIZE) {
        Alert.alert(isAr ? '❌ الملف كبير' : '❌ Too large', 'Max 10MB')
        return
      }
      setPickedFile(file)
    } catch (e: any) { Alert.alert('Error', e.message) }
  }

  const uploadImage = async () => {
    if (!pickedFile || !user || !challenge) return
    setUploading(true)
    try {
      const res = await fetch(pickedFile.uri)
      const blob = await res.blob()
      const ext = pickedFile.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${challenge.id}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('task-submissions').upload(path, blob, { contentType: pickedFile.mimeType || 'image/jpeg', upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('task-submissions').getPublicUrl(path)
      const { error: subErr } = await supabase.from('task_submissions').upsert({
        user_id: user.id, challenge_id: challenge.id,
        file_url: publicUrl, file_name: pickedFile.name,
        file_size_bytes: pickedFile.size || 0,
        file_type: pickedFile.mimeType || 'image/jpeg',
        submission_type: 'file', status: 'pending',
      }, { onConflict: 'user_id,challenge_id' })
      if (subErr) throw subErr
      await supabase.from('admin_notifications').insert({
        type: 'task_submission', title: '📸 صورة جديدة',
        body: `${user.full_name || user.email} | ${challenge.title_ar}`,
        data: { user_id: user.id, challenge_id: challenge.id, challenge_title: challenge.title_ar, file_url: publicUrl },
      })
      setPickedFile(null); load()
    } catch (e: any) { Alert.alert('Error', e.message) }
    setUploading(false)
  }

  // ── YouTube ──────────────────────────────────────────────────
  const isValidYT = (url: string) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/.test(url.trim())

  const submitYT = async () => {
    if (!isValidYT(ytUrl) || !user || !challenge) return
    setSubmitting(true)
    try {
      await supabase.from('task_submissions').upsert({
        user_id: user.id, challenge_id: challenge.id,
        file_url: ytUrl.trim(), file_name: 'youtube_video',
        file_size_bytes: 0, file_type: 'video/youtube',
        youtube_url: ytUrl.trim(), submission_type: 'youtube', status: 'pending',
      }, { onConflict: 'user_id,challenge_id' })
      await supabase.from('admin_notifications').insert({
        type: 'task_submission', title: '🎥 فيديو يوتيوب',
        body: `${user.full_name || user.email} | ${challenge.title_ar}`,
        data: { user_id: user.id, challenge_id: challenge.id, youtube_url: ytUrl.trim() },
      })
      setYtUrl(''); load()
    } catch (e: any) { Alert.alert('Error', e.message) }
    setSubmitting(false)
  }

  // ── Text Submission ──────────────────────────────────────────
  const submitText = async () => {
    if (!textAnswer.trim() || !user || !challenge) return
    setSubmitting(true)
    try {
      await supabase.from('text_submissions').upsert({
        user_id: user.id, challenge_id: challenge.id,
        answer_text: textAnswer.trim(), status: 'pending',
      }, { onConflict: 'user_id,challenge_id' })
      await supabase.from('admin_notifications').insert({
        type: 'task_submission', title: '✍️ إجابة نصية',
        body: `${user.full_name || user.email} | ${challenge.title_ar}`,
        data: { user_id: user.id, challenge_id: challenge.id },
      })
      setTextAnswer(''); load()
    } catch (e: any) { Alert.alert('Error', e.message) }
    setSubmitting(false)
  }

  // ── Status shared component ──────────────────────────────────
  const statusColors: Record<string, string> = {
    pending: Colors.orange, reviewing: Colors.blue, approved: Colors.green, rejected: Colors.red
  }
  const statusLabels: Record<string, string> = {
    pending: isAr ? '⏳ في انتظار المراجعة من الفريق' : '⏳ Pending team review',
    reviewing: isAr ? '👀 قيد المراجعة' : '👀 Under Review',
    approved: isAr ? '✅ تمت الموافقة' : '✅ Approved',
    rejected: isAr ? '❌ مرفوض' : '❌ Rejected',
  }

  // ── Render ───────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={s.cont} edges={['top']}>
      <View style={s.center}><ActivityIndicator color={Colors.purple} size="large" /></View>
    </SafeAreaView>
  )
  if (!challenge) return (
    <SafeAreaView style={s.cont} edges={['top']}>
      <View style={s.center}>
        <Text style={{ color: '#fff', fontSize: 16 }}>{isAr ? 'غير موجود' : 'Not found'}</Text>
        <TouchableOpacity style={s.btn} onPress={() => router.back()}>
          <Text style={s.btnTxt}>← {isAr ? 'رجوع' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  const t = challenge.challenge_type
  const typeBadges: Record<string, string> = {
    mcq: isAr ? '❓ اختر الإجابة' : '❓ Multiple Choice',
    complete_sentence: isAr ? '✏️ أكمل الجملة' : '✏️ Fill in the Blank',
    true_false: isAr ? '✅❌ صح أو غلط' : '✅❌ True or False',
    ordering: isAr ? '🔢 رتب الخطوات' : '🔢 Order the Steps',
    matching: isAr ? '🔗 وصل بين' : '🔗 Match the Pairs',
    node_analysis: isAr ? '📸 رفع صورة' : '📸 Image Upload',
    video_submission: isAr ? '🎥 فيديو يوتيوب' : '🎥 YouTube Video',
    text_submission: isAr ? '✍️ إجابة مفتوحة' : '✍️ Open Answer',
  }

  return (
    <SafeAreaView style={s.cont} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={s.htitle} numberOfLines={1}>{challenge.title_ar}</Text>
        <View style={[s.xpBadge, { backgroundColor: Colors.purple + '20' }]}>
          <Text style={[s.xpTxt, { color: Colors.purple }]}>⚡{challenge.xp_reward}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Type badge */}
        <View style={s.typeBadge}>
          <Text style={s.typeTxt}>{typeBadges[t] || t}</Text>
        </View>

        {/* Question */}
        <View style={s.qBox}>
          <Text style={s.qTxt}>
            {t === 'complete_sentence' && challenge.blank_sentence
              ? challenge.blank_sentence
              : challenge.question_ar || challenge.description_ar || challenge.task_instructions_ar || ''}
          </Text>
        </View>

        {/* ══ MCQ ══ */}
        {(t === 'mcq' || t === 'complete_sentence') && (challenge.options || []).map((opt: string, i: number) => {
          let bg = '#1e293b', border = '#334155', tc = '#e2e8f0'
          if (answered) {
            if (i === challenge.correct_answer) { bg = '#166534'; border = Colors.green; tc = '#bbf7d0' }
            else if (i === selected) { bg = '#7f1d1d'; border = Colors.red; tc = '#fca5a5' }
          } else if (selected === i) { bg = '#1e3a5f'; border = Colors.blue; tc = '#93c5fd' }
          return (
            <TouchableOpacity key={i} style={[s.opt, { backgroundColor: bg, borderColor: border }]}
              onPress={() => !answered && setSelected(i)} disabled={answered}>
              <View style={[s.optLbl, {
                backgroundColor: answered && i === challenge.correct_answer ? Colors.green
                  : selected === i && !answered ? Colors.blue : '#334155'
              }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                  {answered && i === challenge.correct_answer ? '✓'
                    : answered && i === selected ? '✗'
                    : isAr ? ['أ','ب','ج','د'][i] : ['A','B','C','D'][i]}
                </Text>
              </View>
              <Text style={{ color: tc, fontSize: 14, flex: 1, textAlign: isAr ? 'right' : 'left', fontWeight: selected === i ? '700' : '400' }}>{opt}</Text>
            </TouchableOpacity>
          )
        })}

        {/* ══ TRUE / FALSE ══ */}
        {t === 'true_false' && [
          { label: isAr ? '✅ صح' : '✅ True', val: 1 },
          { label: isAr ? '❌ غلط' : '❌ False', val: 0 },
        ].map(({ label, val }) => {
          const isCorr = answered && challenge.correct_answer === val
          const isSel  = selected === val
          let bg = '#1e293b', border = '#334155', tc = '#e2e8f0'
          if (answered) {
            if (isCorr) { bg = '#166534'; border = Colors.green; tc = '#bbf7d0' }
            else if (isSel) { bg = '#7f1d1d'; border = Colors.red; tc = '#fca5a5' }
          } else if (isSel) { bg = '#1e3a5f'; border = Colors.blue; tc = '#fff' }
          return (
            <TouchableOpacity key={val} style={[s.tfBtn, { backgroundColor: bg, borderColor: border }]}
              onPress={() => !answered && setSelected(val)} disabled={answered}>
              <Text style={{ fontSize: 28 }}>{val === 1 ? '✅' : '❌'}</Text>
              <Text style={{ color: tc, fontSize: 18, fontWeight: '800' }}>{label}</Text>
            </TouchableOpacity>
          )
        })}

        {/* ══ ORDERING ══ */}
        {t === 'ordering' && (
          <View style={{ gap: 8 }}>
            {orderItems.map((item: any, i: number) => (
              <View key={item.id} style={s.orderRow}>
                <View style={s.orderNum}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>{i + 1}</Text>
                </View>
                <Text style={{ color: '#e2e8f0', flex: 1, fontSize: 14, textAlign: 'right' }}>{item.text}</Text>
                <View style={{ gap: 4 }}>
                  <TouchableOpacity style={s.arrowBtn} onPress={() => moveItem(i, -1)} disabled={orderChecked}>
                    <Text style={{ color: '#94a3b8', fontSize: 16 }}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.arrowBtn} onPress={() => moveItem(i, 1)} disabled={orderChecked}>
                    <Text style={{ color: '#94a3b8', fontSize: 16 }}>↓</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {orderChecked && (
              <View style={[s.resultBox, { borderColor: orderCorrect ? Colors.green + '40' : Colors.red + '40' }]}>
                <Text style={{ color: orderCorrect ? Colors.green : Colors.red, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
                  {orderCorrect ? (isAr ? '🎉 ترتيب صحيح!' : '🎉 Correct order!') : (isAr ? '❌ ترتيب خاطئ، حاول مجدداً' : '❌ Wrong order, try again')}
                </Text>
                {orderCorrect && <Text style={s.xpEarned}>+{challenge.xp_reward} XP 🎉</Text>}
              </View>
            )}
          </View>
        )}

        {/* ══ MATCHING ══ */}
        {t === 'matching' && (
          <View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginBottom: 4 }}>
                  {isAr ? 'العناصر' : 'Items'}
                </Text>
                {matchLeft.map((item: any) => {
                  const isPaired   = matchPairs[item.id] !== undefined
                  const isSelected = matchSel === 'left:' + item.id
                  const isCorrectMatch = matchChecked && matchPairs[item.id] === item.id
                  const isWrong    = matchChecked && matchPairs[item.id] !== undefined && matchPairs[item.id] !== item.id
                  return (
                    <TouchableOpacity key={item.id}
                      style={[s.matchCard, {
                        borderColor: isSelected ? Colors.purple
                          : isCorrectMatch ? Colors.green
                          : isWrong ? Colors.red
                          : isPaired ? Colors.blue + '80' : '#334155',
                        backgroundColor: isSelected ? Colors.purple + '20' : '#1e293b'
                      }]}
                      onPress={() => handleMatchTap('left', item)}>
                      <Text style={{ color: '#e2e8f0', fontSize: 13, textAlign: 'center' }}>{item.text}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              <View style={{ width: 24, justifyContent: 'space-evenly', alignItems: 'center' }}>
                {matchLeft.map((_: any, i: number) => (
                  <Text key={i} style={{ color: '#334155', fontSize: 18 }}>→</Text>
                ))}
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginBottom: 4 }}>
                  {isAr ? 'الوظائف' : 'Functions'}
                </Text>
                {matchRight.map((item: any) => {
                  const isSelected = matchSel === 'right:' + item.id
                  const isPaired   = Object.values(matchPairs).includes(item.id)
                  const isCorrectMatch = matchChecked && matchPairs[item.id] === item.id
                  return (
                    <TouchableOpacity key={item.id}
                      style={[s.matchCard, {
                        borderColor: isSelected ? Colors.purple
                          : isCorrectMatch ? Colors.green
                          : isPaired ? Colors.blue + '80' : '#334155',
                        backgroundColor: isSelected ? Colors.purple + '20' : '#1e293b'
                      }]}
                      onPress={() => handleMatchTap('right', item)}>
                      <Text style={{ color: '#e2e8f0', fontSize: 13, textAlign: 'center' }}>{item.text}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
            {matchChecked && (
              <View style={[s.resultBox, { marginTop: 12, borderColor: matchCorrect ? Colors.green + '40' : Colors.red + '40' }]}>
                <Text style={{ color: matchCorrect ? Colors.green : Colors.red, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
                  {matchCorrect ? (isAr ? '🎉 كل الأزواج صحيحة!' : '🎉 All pairs correct!') : (isAr ? '❌ بعض الأزواج خاطئة' : '❌ Some pairs are wrong')}
                </Text>
                {matchCorrect && <Text style={s.xpEarned}>+{challenge.xp_reward} XP 🎉</Text>}
              </View>
            )}
          </View>
        )}

        {/* ══ IMAGE UPLOAD ══ */}
        {t === 'node_analysis' && (
          submission ? (
            <SubmissionStatus sub={submission} ch={challenge} isAr={isAr}
              statusColors={statusColors} statusLabels={statusLabels}
              onResubmit={submission.status === 'rejected' ? () => setSubmission(null) : undefined} />
          ) : (
            <View style={s.uploadCard}>
              <Text style={s.uploadTitle}>{isAr ? '📤 ارفع صورتك' : '📤 Upload Your Image'}</Text>
              <Text style={s.uploadNote}>
                {isAr ? 'ارفع PNG أو JPG — سيراجعها الفريق ويضيف XP عند الموافقة'
                       : 'Upload PNG or JPG — team reviews and awards XP on approval'}
              </Text>
              {pickedFile ? (
                <View style={s.filePreview}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fileName} numberOfLines={1}>🖼️ {pickedFile.name}</Text>
                    <Text style={s.fileSize}>{((pickedFile.size||0)/1024/1024).toFixed(2)} MB</Text>
                  </View>
                  <TouchableOpacity onPress={() => setPickedFile(null)} style={s.removeBtn}>
                    <Text style={{ color: '#fca5a5', fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.pickBtn} onPress={pickFile}>
                  <Text style={{ fontSize: 40, marginBottom: 8 }}>📷</Text>
                  <Text style={s.pickText}>{isAr ? 'اختر صورة' : 'Choose image'}</Text>
                  <Text style={s.pickNote}>JPG / PNG — Max 10MB</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        )}

        {/* ══ YOUTUBE ══ */}
        {t === 'video_submission' && (
          submission ? (
            <SubmissionStatus sub={submission} ch={challenge} isAr={isAr}
              statusColors={statusColors} statusLabels={statusLabels}
              onResubmit={submission.status === 'rejected' ? () => setSubmission(null) : undefined} />
          ) : (
            <View style={s.uploadCard}>
              <Text style={s.uploadTitle}>{isAr ? '🎥 أدخل رابط الفيديو' : '🎥 Enter Video URL'}</Text>
              <Text style={s.uploadNote}>
                {isAr ? 'ارفع فيديوك على يوتيوب ثم الصق الرابط هنا'
                       : 'Upload your video to YouTube then paste the link here'}
              </Text>
              <View style={s.ytInputWrap}>
                <Text style={{ fontSize: 18, marginLeft: 8 }}>🔗</Text>
                <TextInput style={s.ytInput} value={ytUrl} onChangeText={setYtUrl}
                  placeholder="https://youtube.com/watch?v=..."
                  placeholderTextColor="#475569" autoCapitalize="none"
                  autoCorrect={false} keyboardType="url" />
              </View>
              {ytUrl.length > 10 && (
                <Text style={{ fontSize: 12, textAlign: 'right', marginTop: 4, color: isValidYT(ytUrl) ? Colors.green : Colors.red }}>
                  {isValidYT(ytUrl) ? '✅ رابط صحيح' : '❌ رابط غير صحيح'}
                </Text>
              )}
            </View>
          )
        )}

        {/* ══ TEXT SUBMISSION ══ */}
        {t === 'text_submission' && (
          submission ? (
            <SubmissionStatus sub={submission} ch={challenge} isAr={isAr}
              statusColors={statusColors} statusLabels={statusLabels}
              onResubmit={submission.status === 'rejected' ? () => setSubmission(null) : undefined}
              isText />
          ) : (
            <View style={s.uploadCard}>
              <Text style={s.uploadTitle}>{isAr ? '✍️ اكتب إجابتك' : '✍️ Write Your Answer'}</Text>
              <TextInput
                style={s.textArea}
                value={textAnswer}
                onChangeText={setTextAnswer}
                placeholder={isAr ? 'اكتب إجابتك هنا...' : 'Write your answer here...'}
                placeholderTextColor="#475569"
                multiline numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={{ color: '#475569', fontSize: 11, textAlign: 'right', marginTop: 4 }}>
                {textAnswer.length} {isAr ? 'حرف' : 'chars'}
              </Text>
            </View>
          )
        )}

        {/* Explanation (MCQ / TF) */}
        {answered && challenge.explanation_ar && (t === 'mcq' || t === 'complete_sentence' || t === 'true_false') && (
          <View style={[s.explanation, { borderColor: isCorrect ? Colors.green + '40' : Colors.red + '40' }]}>
            <Text style={s.explanationTitle}>{isAr ? '💡 الشرح:' : '💡 Explanation:'}</Text>
            <Text style={s.explanationText}>{challenge.explanation_ar}</Text>
            {isCorrect && <Text style={s.xpEarned}>+{challenge.xp_reward} XP 🎉</Text>}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        {/* Choice-based */}
        {(t === 'mcq' || t === 'complete_sentence' || t === 'true_false') && (
          answered ? (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: isCorrect ? Colors.green : Colors.blue }]} onPress={() => router.back()}>
              <Text style={s.actionBtnTxt}>{isCorrect ? (isAr ? '🎉 رائع! رجوع' : '🎉 Back') : (isAr ? 'رجوع' : 'Back')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: selected === null ? '#334155' : Colors.purple }]}
              onPress={submitChoice} disabled={selected === null || submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> :
                <Text style={[s.actionBtnTxt, { color: selected === null ? '#64748b' : '#fff' }]}>
                  {isAr ? '✅ تأكيد الإجابة' : '✅ Confirm'}
                </Text>}
            </TouchableOpacity>
          )
        )}
        {/* Ordering */}
        {t === 'ordering' && (
          orderChecked ? (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: orderCorrect ? Colors.green : Colors.orange }]}
              onPress={() => { if (!orderCorrect) { setOrderItems(shuffle(challenge.items)); setOrderChecked(false) } else router.back() }}>
              <Text style={s.actionBtnTxt}>{orderCorrect ? (isAr ? '🎉 رجوع' : '🎉 Back') : (isAr ? '🔄 حاول مجدداً' : '🔄 Try Again')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.purple }]} onPress={checkOrder}>
              <Text style={s.actionBtnTxt}>{isAr ? '✅ تحقق من الترتيب' : '✅ Check Order'}</Text>
            </TouchableOpacity>
          )
        )}
        {/* Matching */}
        {t === 'matching' && (
          matchChecked ? (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: matchCorrect ? Colors.green : Colors.orange }]}
              onPress={() => { if (!matchCorrect) { setMatchPairs({}); setMatchSel(null); setMatchChecked(false) } else router.back() }}>
              <Text style={s.actionBtnTxt}>{matchCorrect ? (isAr ? '🎉 رجوع' : '🎉 Back') : (isAr ? '🔄 حاول مجدداً' : '🔄 Try Again')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: Object.keys(matchPairs).length === matchLeft.length ? Colors.purple : '#334155' }]}
              onPress={checkMatch} disabled={Object.keys(matchPairs).length < matchLeft.length}>
              <Text style={[s.actionBtnTxt, { color: Object.keys(matchPairs).length === matchLeft.length ? '#fff' : '#64748b' }]}>
                {isAr ? '✅ تحقق من التطابق' : '✅ Check Matches'}
              </Text>
            </TouchableOpacity>
          )
        )}
        {/* Image */}
        {t === 'node_analysis' && !submission && pickedFile && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.purple, opacity: uploading ? 0.7 : 1 }]}
            onPress={uploadImage} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#fff" /> :
              <Text style={s.actionBtnTxt}>{isAr ? '🚀 إرسال للمراجعة' : '🚀 Send for Review'}</Text>}
          </TouchableOpacity>
        )}
        {t === 'node_analysis' && !pickedFile && !submission && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#334155' }]} onPress={() => router.back()}>
            <Text style={s.actionBtnTxt}>{isAr ? '← رجوع' : '← Back'}</Text>
          </TouchableOpacity>
        )}
        {/* YouTube */}
        {t === 'video_submission' && !submission && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: isValidYT(ytUrl) ? Colors.purple : '#334155', opacity: submitting ? 0.7 : 1 }]}
            onPress={submitYT} disabled={!isValidYT(ytUrl) || submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> :
              <Text style={[s.actionBtnTxt, { color: isValidYT(ytUrl) ? '#fff' : '#64748b' }]}>
                {isAr ? '🎥 إرسال الفيديو' : '🎥 Submit Video'}
              </Text>}
          </TouchableOpacity>
        )}
        {/* Text */}
        {t === 'text_submission' && !submission && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: textAnswer.trim().length > 10 ? Colors.purple : '#334155', opacity: submitting ? 0.7 : 1 }]}
            onPress={submitText} disabled={textAnswer.trim().length <= 10 || submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> :
              <Text style={[s.actionBtnTxt, { color: textAnswer.trim().length > 10 ? '#fff' : '#64748b' }]}>
                {isAr ? '✍️ إرسال الإجابة' : '✍️ Submit Answer'}
              </Text>}
          </TouchableOpacity>
        )}
        {/* Back for review types when submitted */}
        {(t === 'node_analysis' || t === 'video_submission' || t === 'text_submission') && submission && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#334155' }]} onPress={() => router.back()}>
            <Text style={s.actionBtnTxt}>{isAr ? '← رجوع' : '← Back'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

// ── Submission Status Card ────────────────────────────────────
function SubmissionStatus({ sub, ch, isAr, statusColors, statusLabels, onResubmit, isText }: any) {
  const color = statusColors[sub?.status] || Colors.orange
  return (
    <View style={[ss.card, { borderColor: color + '60', backgroundColor: color + '12' }]}>
      <Text style={[ss.title, { color }]}>{statusLabels[sub?.status] || sub?.status}</Text>
      {isText
        ? <View style={ss.textBox}><Text style={ss.textAnswer}>{sub?.answer_text}</Text></View>
        : sub?.submission_type === 'youtube'
          ? <Text style={ss.file} numberOfLines={2}>🎥 {sub?.youtube_url}</Text>
          : <Text style={ss.file}>📎 {sub?.file_name}</Text>}
      {sub?.admin_notes && (
        <View style={ss.notes}>
          <Text style={ss.notesLbl}>{isAr ? '💬 تعليق الفريق:' : '💬 Team comment:'}</Text>
          <Text style={ss.notesTxt}>{sub.admin_notes}</Text>
        </View>
      )}
      {sub?.status === 'approved' && (
        <Text style={ss.xp}>🎉 +{ch?.xp_reward} XP!</Text>
      )}
      {sub?.status === 'rejected' && onResubmit && (
        <TouchableOpacity style={ss.resubmit} onPress={onResubmit}>
          <Text style={ss.resubmitTxt}>{isAr ? '🔄 إعادة الإرسال' : '🔄 Resubmit'}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const ss = StyleSheet.create({
  card:       { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 2 },
  title:      { fontSize: 16, fontWeight: '900', marginBottom: 10, textAlign: 'right' },
  file:       { fontSize: 13, color: '#64748b', textAlign: 'right', marginBottom: 8 },
  textBox:    { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, marginBottom: 8 },
  textAnswer: { fontSize: 14, color: '#e2e8f0', lineHeight: 22, textAlign: 'right' },
  notes:      { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 12, marginTop: 8 },
  notesLbl:   { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 4 },
  notesTxt:   { fontSize: 14, color: '#e2e8f0', lineHeight: 22 },
  xp:         { fontSize: 15, fontWeight: '800', color: Colors.green, textAlign: 'center', marginTop: 10 },
  resubmit:   { marginTop: 10, backgroundColor: '#334155', borderRadius: 10, padding: 10, alignItems: 'center' },
  resubmitTxt:{ color: '#94a3b8', fontSize: 13, fontWeight: '700' },
})

const s = StyleSheet.create({
  cont:           { flex: 1, backgroundColor: '#0f172a' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  header:         { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  back:           { width: 36, height: 36, justifyContent: 'center' },
  backTxt:        { fontSize: 22, color: Colors.purple, fontWeight: '700' },
  htitle:         { flex: 1, fontSize: 15, fontWeight: '800', color: '#fff' },
  xpBadge:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  xpTxt:          { fontSize: 13, fontWeight: '800' },
  scroll:         { padding: 16 },
  typeBadge:      { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-end', marginBottom: 12 },
  typeTxt:        { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  qBox:           { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  qTxt:           { fontSize: 15, fontWeight: '700', color: '#e2e8f0', textAlign: 'right', lineHeight: 24 },
  opt:            { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optLbl:         { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  tfBtn:          { borderRadius: 14, padding: 20, marginBottom: 12, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  orderRow:       { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderNum:       { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.purple + '30', justifyContent: 'center', alignItems: 'center' },
  arrowBtn:       { width: 28, height: 28, backgroundColor: '#334155', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  matchCard:      { borderRadius: 10, padding: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  resultBox:      { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 2 },
  xpEarned:       { fontSize: 14, fontWeight: '800', color: Colors.green, textAlign: 'center', marginTop: 8 },
  uploadCard:     { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  uploadTitle:    { fontSize: 15, fontWeight: '800', color: '#e2e8f0', textAlign: 'right', marginBottom: 6 },
  uploadNote:     { fontSize: 13, color: '#94a3b8', textAlign: 'right', marginBottom: 14, lineHeight: 20 },
  pickBtn:        { borderRadius: 12, borderWidth: 2, borderColor: '#334155', borderStyle: 'dashed', padding: 28, alignItems: 'center' },
  pickText:       { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  pickNote:       { color: '#475569', fontSize: 11, marginTop: 4 },
  filePreview:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, padding: 12 },
  fileName:       { color: '#e2e8f0', fontSize: 14, fontWeight: '600', textAlign: 'right' },
  fileSize:       { color: '#64748b', fontSize: 12, textAlign: 'right', marginTop: 2 },
  removeBtn:      { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7f1d1d', justifyContent: 'center', alignItems: 'center' },
  ytInputWrap:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 2, borderColor: '#334155', paddingHorizontal: 12 },
  ytInput:        { flex: 1, color: '#e2e8f0', fontSize: 13, paddingVertical: 14 },
  textArea:       { backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', color: '#e2e8f0', fontSize: 14, padding: 14, minHeight: 140, textAlign: 'right' },
  explanation:    { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 2 },
  explanationTitle:{ fontSize: 13, fontWeight: '800', color: '#94a3b8', marginBottom: 6 },
  explanationText: { fontSize: 14, color: '#e2e8f0', lineHeight: 22, textAlign: 'right' },
  footer:         { padding: 16, borderTopWidth: 1, borderTopColor: '#1e293b' },
  actionBtn:      { borderRadius: 14, padding: 17, alignItems: 'center' },
  actionBtnTxt:   { fontSize: 16, fontWeight: '900', color: '#fff' },
  btn:            { backgroundColor: Colors.blue, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnTxt:         { color: '#fff', fontWeight: '800', fontSize: 14 },
})
