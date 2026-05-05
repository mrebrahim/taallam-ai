import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Image, ActivityIndicator, Linking
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

export default function StoreScreen() {
  const { isAr } = useLang()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('digital_products')
        .select('*, variants:product_variants(*)')
        .eq('is_active', true)
        .order('sort_order')
      setProducts(data || [])
      // Default select first variant per product
      const sel: Record<string, string> = {}
      ;(data || []).forEach((p: any) => {
        const active = (p.variants || []).filter((v: any) => v.is_active).sort((a: any, b: any) => a.sort_order - b.sort_order)
        if (active[0]) sel[p.id] = active[0].id
      })
      setSelected(sel)
      setLoading(false)
    }
    load()
  }, [])

  const getSelectedVariant = (product: any) => {
    const active = (product.variants || []).filter((v: any) => v.is_active)
    return active.find((v: any) => v.id === selected[product.id]) || active[0]
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>→</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isAr ? '🛍️ المتجر الرقمي' : '🛍️ Digital Store'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={Colors.green} size="large" />
        </View>
      ) : products.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🛍️</Text>
          <Text style={{ color: Colors.textSub, fontSize: 15, textAlign: 'center' }}>
            {isAr ? 'مفيش منتجات متاحة دلوقتي' : 'No products available yet'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.subtitle}>
            {isAr ? 'اختار المنتج المناسب ليك' : 'Choose the right product for you'}
          </Text>

          {products.map((p: any) => {
            const activeVariants = (p.variants || []).filter((v: any) => v.is_active).sort((a: any, b: any) => a.sort_order - b.sort_order)
            const selectedVariant = getSelectedVariant(p)

            return (
              <View key={p.id} style={s.card}>
                {/* Product Image */}
                {p.image_url ? (
                  <Image source={{ uri: p.image_url }} style={s.productImg} />
                ) : (
                  <View style={[s.productImg, s.placeholderImg]}>
                    <Text style={{ fontSize: 40 }}>🛍️</Text>
                  </View>
                )}

                {/* Product Info */}
                <View style={s.info}>
                  <Text style={s.productName}>{isAr ? p.name_ar : (p.name_en || p.name_ar)}</Text>
                  {(isAr ? p.description_ar : p.description_en || p.description_ar) ? (
                    <Text style={s.productDesc}>{isAr ? p.description_ar : (p.description_en || p.description_ar)}</Text>
                  ) : null}
                </View>

                {/* Variants selector */}
                {activeVariants.length > 1 && (
                  <View style={s.variantsSection}>
                    <Text style={s.variantsLabel}>{isAr ? 'اختار الباقة:' : 'Choose plan:'}</Text>
                    <View style={s.variantsRow}>
                      {activeVariants.map((v: any) => {
                        const isActive = selected[p.id] === v.id
                        return (
                          <TouchableOpacity
                            key={v.id}
                            style={[s.variantChip, isActive && s.variantChipActive]}
                            onPress={() => setSelected({ ...selected, [p.id]: v.id })}
                          >
                            <Text style={[s.variantChipLabel, isActive && s.variantChipLabelActive]}>
                              {isAr ? v.label_ar : (v.label_en || v.label_ar)}
                            </Text>
                            <Text style={[s.variantChipPrice, isActive && s.variantChipPriceActive]}>
                              {v.price} {v.currency}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                )}

                {/* Price + CTA */}
                <View style={s.footer}>
                  <View>
                    <Text style={s.priceLabel}>{isAr ? 'السعر' : 'Price'}</Text>
                    <Text style={s.price}>
                      {selectedVariant?.price} {selectedVariant?.currency}
                      <Text style={s.pricePeriod}>
                        {' / '}{isAr
                          ? selectedVariant?.period === 'monthly' ? 'شهرياً'
                          : selectedVariant?.period === 'yearly' ? 'سنوياً'
                          : selectedVariant?.period === 'lifetime' ? 'مدى الحياة'
                          : selectedVariant?.label_ar
                          : selectedVariant?.period === 'monthly' ? 'mo'
                          : selectedVariant?.period === 'yearly' ? 'yr'
                          : selectedVariant?.period === 'lifetime' ? 'lifetime'
                          : selectedVariant?.label_en}
                      </Text>
                    </Text>
                  </View>
                  <TouchableOpacity style={s.buyBtn}>
                    <Text style={s.buyBtnTxt}>{isAr ? 'اشترِ دلوقتي' : 'Buy Now'}</Text>
                  </TouchableOpacity>
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
  container:            { flex: 1, backgroundColor: Colors.bg },
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: Colors.border },
  backBtn:              { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  backArrow:            { fontSize: 18, color: Colors.text },
  headerTitle:          { fontSize: 17, fontWeight: '900', color: Colors.text },
  center:               { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:               { padding: 16 },
  subtitle:             { fontSize: 14, color: Colors.textSub, textAlign: 'right', marginBottom: 16 },
  card:                 { backgroundColor: '#fff', borderRadius: 20, borderWidth: 2, borderColor: Colors.border, marginBottom: 16, overflow: 'hidden' },
  productImg:           { width: '100%', height: 180 },
  placeholderImg:       { backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  info:                 { padding: 16, paddingBottom: 8 },
  productName:          { fontSize: 18, fontWeight: '900', color: Colors.text, textAlign: 'right', marginBottom: 6 },
  productDesc:          { fontSize: 14, color: Colors.textSub, textAlign: 'right', lineHeight: 22 },
  variantsSection:      { paddingHorizontal: 16, paddingBottom: 12 },
  variantsLabel:        { fontSize: 12, color: Colors.textSub, textAlign: 'right', marginBottom: 8 },
  variantsRow:          { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  variantChip:          { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 2, borderColor: Colors.border, backgroundColor: '#f8fafc' },
  variantChipActive:    { borderColor: Colors.green, backgroundColor: '#f0fdf4' },
  variantChipLabel:     { fontSize: 12, fontWeight: '700', color: Colors.textSub, marginBottom: 2 },
  variantChipLabelActive: { color: Colors.green },
  variantChipPrice:     { fontSize: 15, fontWeight: '900', color: Colors.text },
  variantChipPriceActive: { color: '#166534' },
  footer:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: '#f8fafc' },
  priceLabel:           { fontSize: 11, color: Colors.textSub, textAlign: 'right', marginBottom: 2 },
  price:                { fontSize: 22, fontWeight: '900', color: Colors.text, textAlign: 'right' },
  pricePeriod:          { fontSize: 13, fontWeight: '600', color: Colors.textSub },
  buyBtn:               { backgroundColor: Colors.green, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, shadowColor: Colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buyBtnTxt:            { fontSize: 15, fontWeight: '900', color: '#fff' },
})
