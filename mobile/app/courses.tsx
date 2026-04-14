import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors, ROADMAP_META } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

export default function CoursesScreen() {
  const { user } = useAuth()
  const { isAr } = useLang()
  const [roadmaps, setRoadmaps]     = useState<any[]>([])
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: rm }, { data: en }] = await Promise.all([
        supabase.from('roadmaps').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('course_enrollments')
          .select('roadmap_id, expires_at')
          .eq('user_id', user.id)
          .eq('is_active', true),
      ])
      setRoadmaps(rm || [])
      const now = new Date()
      const valid = (en || []).filter((e: any) => !e.expires_at || new Date(e.expires_at) > now)
      setEnrolledIds(new Set(valid.map((e: any) => e.roadmap_id)))
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}><ActivityIndicator color={Colors.blue} size="large" /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isAr ? 'جميع الكورسات' : 'All Courses'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.subtitle}>
          {isAr ? `${roadmaps.length} كورس متاح` : `${roadmaps.length} courses available`}
        </Text>

        {roadmaps.map(r => {
          const meta       = ROADMAP_META[r.slug as keyof typeof ROADMAP_META]
          const enrolled   = enrolledIds.has(r.id)
          const discount   = r.original_price_egp > r.price_egp
            ? Math.round((1 - r.price_egp / r.original_price_egp) * 100)
            : 0

          return (
            <TouchableOpacity
              key={r.id}
              style={[s.card, enrolled && { borderColor: meta?.color + '60', borderWidth: 2 }]}
              onPress={() => router.push(`/course/${r.slug}` as any)}
              activeOpacity={0.85}>

              {/* Top accent */}
              <View style={[s.cardAccent, { backgroundColor: meta?.color }]} />

              {/* Enrolled badge */}
              {enrolled && (
                <View style={[s.enrolledBadge, { backgroundColor: meta?.color }]}>
                  <Text style={s.enrolledText}>{isAr ? '✓ مشترك' : '✓ Enrolled'}</Text>
                </View>
              )}

              {/* Discount badge */}
              {!enrolled && discount > 0 && (
                <View style={[s.discountBadge, { backgroundColor: Colors.red }]}>
                  <Text style={s.discountText}>{discount}%</Text>
                </View>
              )}

              <View style={s.cardBody}>
                <View style={[s.iconBox, { backgroundColor: meta?.bg }]}>
                  <Text style={{ fontSize: 32 }}>{meta?.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{isAr ? meta?.label || r.title_ar : r.title_ar}</Text>
                  <Text style={s.cardDesc} numberOfLines={2}>
                    {isAr ? r.description_ar || meta?.desc : r.description || r.description_ar || meta?.desc}
                  </Text>
                </View>
              </View>

              {/* Footer */}
              <View style={s.cardFooter}>
                {enrolled ? (
                  <View style={[s.openBadge, { backgroundColor: meta?.bg }]}>
                    <Text style={[s.openText, { color: meta?.color }]}>
                      🔓 {isAr ? 'مفتوح' : 'Open'}
                    </Text>
                  </View>
                ) : (
                  <View style={s.priceSection}>
                    <Text style={[s.price, { color: meta?.color }]}>
                      {r.price_egp > 0 ? `${r.price_egp?.toLocaleString()} ج.م` : (isAr ? 'مجاني' : 'Free')}
                    </Text>
                    {r.original_price_egp > r.price_egp && (
                      <Text style={s.originalPrice}>{r.original_price_egp?.toLocaleString()} ج.م</Text>
                    )}
                  </View>
                )}
                <Text style={[s.arrow, { color: meta?.color }]}>←</Text>
              </View>
            </TouchableOpacity>
          )
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: Colors.border },
  backBtn:       { width: 36, height: 36, justifyContent: 'center' },
  backText:      { fontSize: 22, color: Colors.blue, fontWeight: '700' },
  headerTitle:   { fontSize: 18, fontWeight: '900', color: Colors.text },
  scroll:        { padding: 16 },
  subtitle:      { fontSize: 13, color: Colors.textSub, marginBottom: 16, textAlign: 'right' },
  card:          { backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, borderWidth: 2, borderColor: Colors.border, overflow: 'hidden', position: 'relative' },
  cardAccent:    { height: 4, width: '100%' },
  enrolledBadge: { position: 'absolute', top: 12, left: 12, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  enrolledText:  { color: '#fff', fontSize: 11, fontWeight: '800' },
  discountBadge: { position: 'absolute', top: 12, left: 12, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  discountText:  { color: '#fff', fontSize: 12, fontWeight: '900' },
  cardBody:      { flexDirection: 'row', gap: 14, padding: 16, alignItems: 'center' },
  iconBox:       { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardTitle:     { fontSize: 17, fontWeight: '900', color: Colors.text, marginBottom: 4, textAlign: 'right' },
  cardDesc:      { fontSize: 12, color: Colors.textSub, textAlign: 'right', lineHeight: 18 },
  cardFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  openBadge:     { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  openText:      { fontSize: 13, fontWeight: '800' },
  priceSection:  { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  price:         { fontSize: 20, fontWeight: '900' },
  originalPrice: { fontSize: 13, color: Colors.textSub, textDecorationLine: 'line-through' },
  arrow:         { fontSize: 20, fontWeight: '700' },
})
