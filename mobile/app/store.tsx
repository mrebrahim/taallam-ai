import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Image, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

export default function StoreScreen() {
  const { isAr } = useLang()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('digital_products')
      .select('*, variants:product_variants(*)')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => { setProducts(data || []); setLoading(false) })
  }, [])

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backTxt}>→</Text>
        </TouchableOpacity>
        <Text style={s.title}>{isAr ? '🛍️ المتجر الرقمي' : '🛍️ Digital Store'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={Colors.green} size="large" /></View>
      ) : products.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🛍️</Text>
          <Text style={s.emptyTxt}>{isAr ? 'لا يوجد منتجات حالياً' : 'No products yet'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {products.map((p: any) => {
            const activeVariants = (p.variants || []).filter((v: any) => v.is_active).sort((a: any, b: any) => a.sort_order - b.sort_order)
            return (
              <View key={p.id} style={s.card}>
                {p.image_url
                  ? <Image source={{ uri: p.image_url }} style={s.img} resizeMode="cover" />
                  : <View style={[s.img, s.imgPlaceholder]}><Text style={{ fontSize: 36 }}>🛍️</Text></View>
                }
                <View style={s.cardBody}>
                  <Text style={s.productName}>{isAr ? p.name_ar : (p.name_en || p.name_ar)}</Text>
                  {(isAr ? p.description_ar : (p.description_en || p.description_ar))
                    ? <Text style={s.productDesc}>{isAr ? p.description_ar : (p.description_en || p.description_ar)}</Text>
                    : null}
                  {activeVariants.length > 0 && (
                    <View style={s.variantsWrap}>
                      {activeVariants.map((v: any) => (
                        <TouchableOpacity key={v.id} style={s.variantBtn} activeOpacity={0.8}>
                          <Text style={s.variantLabel}>{isAr ? v.label_ar : (v.label_en || v.label_ar)}</Text>
                          <Text style={s.variantPrice}>{v.price} {v.currency}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: Colors.border },
  backBtn:        { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backTxt:        { fontSize: 22, color: Colors.text },
  title:          { fontSize: 17, fontWeight: '900', color: Colors.text },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTxt:       { fontSize: 16, color: '#94a3b8', fontWeight: '600' },
  scroll:         { padding: 16 },
  card:           { backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, borderWidth: 2, borderColor: Colors.border, overflow: 'hidden' },
  img:            { width: '100%', height: 180 },
  imgPlaceholder: { backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  cardBody:       { padding: 16 },
  productName:    { fontSize: 18, fontWeight: '900', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  productDesc:    { fontSize: 13, color: '#64748b', textAlign: 'right', lineHeight: 20, marginBottom: 14 },
  variantsWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
  variantBtn:     { backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.green },
  variantLabel:   { fontSize: 12, color: Colors.green, fontWeight: '700', marginBottom: 2 },
  variantPrice:   { fontSize: 16, fontWeight: '900', color: '#166534' },
})
