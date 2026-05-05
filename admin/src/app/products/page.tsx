'use client'
import { useEffect, useState } from 'react'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
// Use service role for writes, anon for reads
const H_READ = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
const H = { 'apikey': SERVICE_KEY || ANON_KEY, 'Authorization': `Bearer ${SERVICE_KEY || ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

type Variant = { id?: string; label_ar: string; label_en: string; price: string; currency: string; period: string; is_active: boolean; sort_order: number }
type Product = { id?: string; name_ar: string; name_en: string; description_ar: string; description_en: string; image_url: string; is_active: boolean; sort_order: number; variants?: Variant[] }

const EMPTY_PRODUCT: Product = { name_ar: '', name_en: '', description_ar: '', description_en: '', image_url: '', is_active: true, sort_order: 0 }
const EMPTY_VARIANT: Variant = { label_ar: 'شهري', label_en: 'Monthly', price: '', currency: 'EGP', period: 'monthly', is_active: true, sort_order: 0 }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    setLoading(true)
    const [pr, va] = await Promise.all([
      fetch(`${URL}/rest/v1/digital_products?select=*&order=sort_order`, { headers: H }).then(r => r.json()),
      fetch(`${URL}/rest/v1/product_variants?select=*&order=sort_order`, { headers: H }).then(r => r.json()),
    ])
    const list = (pr || []).map((p: Product) => ({ ...p, variants: (va || []).filter((v: Variant & { product_id: string }) => v.product_id === p.id) }))
    setProducts(list)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing({ ...EMPTY_PRODUCT }); setVariants([{ ...EMPTY_VARIANT }]) }
  const openEdit = (p: Product) => { setEditing({ ...p }); setVariants(p.variants?.length ? p.variants.map(v => ({ ...v })) : [{ ...EMPTY_VARIANT }]) }
  const closeEdit = () => { setEditing(null); setVariants([]) }

  const saveProduct = async () => {
    if (!editing) return
    if (!editing.name_ar) return setMsg('⚠️ اسم المنتج بالعربي مطلوب')
    setSaving(true)
    try {
      let productId = editing.id
      const body = { name_ar: editing.name_ar, name_en: editing.name_en, description_ar: editing.description_ar, description_en: editing.description_en, image_url: editing.image_url, is_active: editing.is_active, sort_order: editing.sort_order, updated_at: new Date().toISOString() }

      if (productId) {
        await fetch(`${URL}/rest/v1/digital_products?id=eq.${productId}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) })
      } else {
        const r = await fetch(`${URL}/rest/v1/digital_products`, { method: 'POST', headers: H, body: JSON.stringify(body) })
        const d = await r.json()
        productId = d[0]?.id
      }

      // Save variants
      const existingIds = variants.filter(v => v.id).map(v => v.id)
      // Delete removed variants
      if (editing.id) {
        const oldVariants = editing.variants || []
        const toDelete = oldVariants.filter((v: any) => !existingIds.includes(v.id))
        for (const v of toDelete) {
          await fetch(`${URL}/rest/v1/product_variants?id=eq.${v.id}`, { method: 'DELETE', headers: H })
        }
      }
      // Upsert variants
      for (const v of variants) {
        const vBody = { label_ar: v.label_ar, label_en: v.label_en, price: parseFloat(v.price) || 0, currency: v.currency, period: v.period, is_active: v.is_active, sort_order: v.sort_order, product_id: productId }
        if (v.id) {
          await fetch(`${URL}/rest/v1/product_variants?id=eq.${v.id}`, { method: 'PATCH', headers: H, body: JSON.stringify(vBody) })
        } else {
          await fetch(`${URL}/rest/v1/product_variants`, { method: 'POST', headers: H, body: JSON.stringify(vBody) })
        }
      }
      setMsg('✅ تم الحفظ!')
      await load()
      closeEdit()
    } catch (e) { setMsg('❌ خطأ في الحفظ') }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('حذف المنتج ده؟')) return
    await fetch(`${URL}/rest/v1/digital_products?id=eq.${id}`, { method: 'DELETE', headers: H })
    await load()
  }

  const S: Record<string, any> = {
    page: { minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'system-ui, sans-serif' },
    header: { background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    main: { padding: 32, maxWidth: 1100, margin: '0 auto' },
    btn: (c = '#58CC02') => ({ background: c, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }),
    card: { background: '#1e293b', borderRadius: 14, padding: 20, border: '1px solid #334155', display: 'flex', gap: 16, alignItems: 'flex-start' },
    input: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, width: '100%', boxSizing: 'border-box' as const },
    label: { fontSize: 12, color: '#94a3b8', marginBottom: 4, display: 'block' },
    overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: '#1e293b', borderRadius: 16, padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' as const, border: '1px solid #334155' },
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>← الرئيسية</a>
          <span style={{ color: '#334155' }}>|</span>
          <span style={{ fontSize: 20 }}>🛍️</span>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#58CC02' }}>المنتجات الرقمية</h1>
        </div>
        <button style={S.btn()} onClick={openNew}>+ منتج جديد</button>
      </header>

      <main style={S.main}>
        {msg && <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '12px 20px', marginBottom: 20, fontSize: 14 }}>{msg}</div>}

        {loading ? <p style={{ color: '#64748b' }}>جاري التحميل...</p> : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛍️</div>
            <p>مفيش منتجات لسه — اضغط "+ منتج جديد"</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {products.map((p: any) => (
              <div key={p.id} style={S.card}>
                {p.image_url ? <img src={p.image_url} style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 72, height: 72, borderRadius: 12, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🛍️</div>}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{p.name_ar}</span>
                    {p.name_en && <span style={{ color: '#64748b', fontSize: 13 }}>{p.name_en}</span>}
                    <span style={{ background: p.is_active ? '#166534' : '#7f1d1d', color: p.is_active ? '#86efac' : '#fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{p.is_active ? 'نشط' : 'مخفي'}</span>
                  </div>
                  {p.description_ar && <p style={{ margin: '0 0 8px', color: '#94a3b8', fontSize: 13 }}>{p.description_ar}</p>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(p.variants || []).map((v: any) => (
                      <span key={v.id} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#58CC02' }}>
                        {v.label_ar} — {v.price} {v.currency}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button style={S.btn('#1e40af')} onClick={() => openEdit(p)}>✏️ تعديل</button>
                  <button style={S.btn('#7f1d1d')} onClick={() => deleteProduct(p.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {editing && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && closeEdit()}>
          <div style={S.modal}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>{editing.id ? 'تعديل المنتج' : 'منتج جديد'}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div><label style={S.label}>الاسم بالعربي *</label><input style={S.input} value={editing.name_ar} onChange={e => setEditing({ ...editing, name_ar: e.target.value })} /></div>
              <div><label style={S.label}>الاسم بالإنجليزي</label><input style={S.input} value={editing.name_en} onChange={e => setEditing({ ...editing, name_en: e.target.value })} /></div>
            </div>
            <div style={{ marginBottom: 14 }}><label style={S.label}>الوصف بالعربي</label><textarea style={{ ...S.input, height: 70, resize: 'vertical' }} value={editing.description_ar} onChange={e => setEditing({ ...editing, description_ar: e.target.value })} /></div>
            <div style={{ marginBottom: 14 }}><label style={S.label}>الوصف بالإنجليزي</label><textarea style={{ ...S.input, height: 70, resize: 'vertical' }} value={editing.description_en} onChange={e => setEditing({ ...editing, description_en: e.target.value })} /></div>
            <div style={{ marginBottom: 14 }}><label style={S.label}>رابط الصورة</label><input style={S.input} value={editing.image_url} onChange={e => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div><label style={S.label}>الترتيب</label><input style={S.input} type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: +e.target.value })} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
                <input type="checkbox" checked={editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} id="active" />
                <label htmlFor="active" style={{ color: '#fff', fontSize: 14, cursor: 'pointer' }}>نشط (ظاهر للمستخدمين)</label>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #334155', paddingTop: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>💰 الأسعار والباقات</h3>
                <button style={S.btn('#0f172a')} onClick={() => setVariants([...variants, { ...EMPTY_VARIANT, sort_order: variants.length }])}>+ إضافة باقة</button>
              </div>
              {variants.map((v, i) => (
                <div key={i} style={{ background: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 10, border: '1px solid #334155' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                    <div><label style={S.label}>الاسم بالعربي</label><input style={S.input} value={v.label_ar} onChange={e => { const n = [...variants]; n[i].label_ar = e.target.value; setVariants(n) }} /></div>
                    <div><label style={S.label}>السعر</label><input style={S.input} type="number" value={v.price} onChange={e => { const n = [...variants]; n[i].price = e.target.value; setVariants(n) }} /></div>
                    <div><label style={S.label}>العملة</label>
                      <select style={S.input} value={v.currency} onChange={e => { const n = [...variants]; n[i].currency = e.target.value; setVariants(n) }}>
                        <option value="EGP">EGP</option><option value="SAR">SAR</option><option value="USD">USD</option><option value="AED">AED</option>
                      </select>
                    </div>
                    <div><label style={S.label}>النوع</label>
                      <select style={S.input} value={v.period} onChange={e => { const n = [...variants]; n[i].period = e.target.value; setVariants(n) }}>
                        <option value="monthly">شهري</option><option value="yearly">سنوي</option><option value="lifetime">مدى الحياة</option><option value="custom">مخصص</option>
                      </select>
                    </div>
                    <button style={{ ...S.btn('#7f1d1d'), padding: '10px 12px' }} onClick={() => setVariants(variants.filter((_, j) => j !== i))}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={S.btn('#334155')} onClick={closeEdit}>إلغاء</button>
              <button style={S.btn()} onClick={saveProduct} disabled={saving}>{saving ? 'جاري الحفظ...' : '💾 حفظ المنتج'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
