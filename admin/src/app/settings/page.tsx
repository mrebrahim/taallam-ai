'use client'
import { useEffect, useState } from 'react'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const H = { 'apikey': SERVICE || KEY, 'Authorization': `Bearer ${SERVICE || KEY}`, 'Content-Type': 'application/json' }
const H_READ = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }

export default function SettingsPage() {
  const [phone, setPhone] = useState('201027555789')
  const [prefix, setPrefix] = useState('أريد الاستفسار عن')
  const [testProduct, setTestProduct] = useState('كورس n8n للمبتدئين')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [roadmaps, setRoadmaps] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch(`${URL}/rest/v1/app_settings?select=*`, { headers: H_READ }).then(r => r.json()),
      fetch(`${URL}/rest/v1/digital_products?select=id,name_ar&is_active=eq.true&order=sort_order`, { headers: H_READ }).then(r => r.json()),
      fetch(`${URL}/rest/v1/roadmaps?select=id,name,slug&is_active=eq.true&order=sort_order`, { headers: H_READ }).then(r => r.json()),
    ]).then(([settings, prods, roads]) => {
      const s: any = {}
      ;(settings || []).forEach((x: any) => { s[x.key] = x.value })
      if (s.whatsapp_number) setPhone(s.whatsapp_number)
      if (s.whatsapp_message_prefix) setPrefix(s.whatsapp_message_prefix)
      setProducts(prods || [])
      setRoadmaps(roads || [])
    })
  }, [])

  const save = async () => {
    setSaving(true)
    await Promise.all([
      fetch(`${URL}/rest/v1/app_settings?key=eq.whatsapp_number`, {
        method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ value: phone, updated_at: new Date().toISOString() })
      }),
      fetch(`${URL}/rest/v1/app_settings?key=eq.whatsapp_message_prefix`, {
        method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ value: prefix, updated_at: new Date().toISOString() })
      }),
    ])
    setMsg('✅ تم الحفظ!')
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const buildLink = (productName: string) => {
    const msg = `${prefix} ${productName}`
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    setMsg('✅ تم نسخ الرابط!')
    setTimeout(() => setMsg(''), 2000)
  }

  const S: Record<string, any> = {
    page: { minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'system-ui, sans-serif' },
    header: { background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 },
    main: { padding: 32, maxWidth: 900, margin: '0 auto' },
    card: { background: '#1e293b', borderRadius: 16, padding: 24, border: '1px solid #334155', marginBottom: 24 },
    label: { fontSize: 12, color: '#94a3b8', marginBottom: 6, display: 'block' },
    input: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 15, width: '100%', boxSizing: 'border-box' as const, direction: 'ltr' as const },
    btn: (c = '#25D366') => ({ background: c, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }),
    linkBox: { background: '#0f172a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#64748b', wordBreak: 'break-all' as const, direction: 'ltr' as const, marginTop: 8, border: '1px solid #334155' },
    row: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 },
    productRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #1e293b' },
  }

  const previewLink = buildLink(testProduct)

  return (
    <div style={S.page}>
      <header style={S.header}>
        <a href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>← الرئيسية</a>
        <span style={{ color: '#334155' }}>|</span>
        <span style={{ fontSize: 20 }}>⚙️</span>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#58CC02' }}>الإعدادات</h1>
      </header>

      <main style={S.main}>
        {msg && <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '12px 20px', marginBottom: 20, fontSize: 14 }}>{msg}</div>}

        {/* WhatsApp Settings */}
        <div style={S.card}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>💬</span> إعدادات واتساب
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={S.label}>رقم واتساب (بدون +)</label>
              <input style={S.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="201027555789" />
            </div>
            <div>
              <label style={S.label}>بداية الرسالة</label>
              <input style={{ ...S.input, direction: 'rtl' }} value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="أريد الاستفسار عن" />
            </div>
          </div>

          <button style={S.btn('#58CC02')} onClick={save} disabled={saving}>
            {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
          </button>
        </div>

        {/* Link Builder */}
        <div style={S.card}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔗</span> بناء رابط واتساب
          </h2>

          <label style={S.label}>اسم المنتج / الكورس للتجربة</label>
          <input style={{ ...S.input, direction: 'rtl' }} value={testProduct} onChange={e => setTestProduct(e.target.value)} />

          <div style={S.linkBox}>{previewLink}</div>

          <div style={S.row}>
            <button style={S.btn()} onClick={() => window.open(previewLink, '_blank')}>
              🟢 اختبر الرابط
            </button>
            <button style={S.btn('#1e40af')} onClick={() => copyLink(previewLink)}>
              📋 نسخ الرابط
            </button>
          </div>
        </div>

        {/* Products Links */}
        {products.length > 0 && (
          <div style={S.card}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>🛍️ روابط المنتجات الرقمية</h2>
            {products.map((p: any) => {
              const link = buildLink(p.name_ar)
              return (
                <div key={p.id} style={S.productRow}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name_ar}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ ...S.btn(), padding: '6px 14px', fontSize: 12 }} onClick={() => window.open(link, '_blank')}>🟢 اختبر</button>
                    <button style={{ ...S.btn('#1e40af'), padding: '6px 14px', fontSize: 12 }} onClick={() => copyLink(link)}>📋 نسخ</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Roadmaps Links */}
        {roadmaps.length > 0 && (
          <div style={S.card}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>🗺️ روابط الكورسات</h2>
            {roadmaps.map((r: any) => {
              const link = buildLink(r.name)
              return (
                <div key={r.id} style={S.productRow}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ ...S.btn(), padding: '6px 14px', fontSize: 12 }} onClick={() => window.open(link, '_blank')}>🟢 اختبر</button>
                    <button style={{ ...S.btn('#1e40af'), padding: '6px 14px', fontSize: 12 }} onClick={() => copyLink(link)}>📋 نسخ</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
