export default function DeleteAccount() {
  return (
    <div style={{
      maxWidth: 800, margin: '0 auto', padding: '40px 24px',
      fontFamily: 'Arial, sans-serif', direction: 'rtl', color: '#1e293b', lineHeight: 1.8
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, color: '#0f172a' }}>
        حذف الحساب — فاهم
      </h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>آخر تحديث: أبريل 2026</p>

      {/* Warning box */}
      <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 12, padding: 20, marginBottom: 32 }}>
        <p style={{ color: '#991b1b', fontWeight: 700, margin: 0, fontSize: 15 }}>
          ⚠️ تحذير: حذف الحساب لا يمكن التراجع عنه. جميع بياناتك ستُحذف نهائياً.
        </p>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>كيفية طلب حذف الحساب</h2>
        <p>لحذف حسابك في تطبيق <strong>فاهم</strong>، اتبع الخطوات التالية:</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {[
            { num: '١', text: 'أرسل بريداً إلكترونياً إلى: ebrahimkhlil01@gmail.com' },
            { num: '٢', text: 'اكتب في موضوع الرسالة: "طلب حذف حساب فاهم"' },
            { num: '٣', text: 'اذكر في الرسالة: البريد الإلكتروني المرتبط بحسابك' },
            { num: '٤', text: 'سنتحقق من هويتك ونعالج طلبك خلال 7 أيام عمل' },
          ].map(step => (
            <div key={step.num} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', background: '#f8fafc', borderRadius: 10, padding: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                {step.num}
              </div>
              <p style={{ margin: 0, fontSize: 15, paddingTop: 6 }}>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>البيانات التي ستُحذف</h2>
        <p>عند حذف حسابك، سيتم حذف البيانات التالية <strong>نهائياً وبشكل كامل</strong>:</p>
        <ul style={{ paddingRight: 24, marginTop: 12 }}>
          {[
            'معلومات الحساب (الاسم، البريد الإلكتروني)',
            'تقدمك في الدروس والكورسات',
            'نقاط XP والمستوى',
            'التحديات المكتملة وإجاباتك',
            'الصور والملفات التي رفعتها',
            'إعدادات الإشعارات ورمز الجهاز',
            'جميع البيانات المرتبطة بحسابك',
          ].map((item, i) => (
            <li key={i} style={{ marginBottom: 8, color: '#dc2626' }}>🗑️ {item}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>البيانات التي قد تُحتفظ بها مؤقتاً</h2>
        <ul style={{ paddingRight: 24 }}>
          <li style={{ marginBottom: 8 }}>
            <strong>سجلات النظام:</strong> قد تُحتفظ بها لمدة 30 يوماً لأغراض أمنية ثم تُحذف تلقائياً
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>بيانات المعاملات المالية:</strong> إن وجدت، قد تُحتفظ بها وفقاً للمتطلبات القانونية
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>مدة المعالجة</h2>
        <p>
          سيتم معالجة طلبك وحذف جميع بياناتك خلال <strong>7 أيام عمل</strong> من استلام طلبك.
          ستتلقى رسالة تأكيد بالبريد الإلكتروني عند اكتمال الحذف.
        </p>
      </section>

      <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: 20, marginBottom: 32 }}>
        <h3 style={{ color: '#166534', margin: '0 0 8px', fontSize: 16 }}>💡 بديل للحذف</h3>
        <p style={{ color: '#15803d', margin: 0 }}>
          إذا كنت تريد فقط إيقاف الإشعارات أو التوقف مؤقتاً عن استخدام التطبيق،
          يمكنك إيقاف الإشعارات من إعدادات هاتفك دون الحاجة لحذف حسابك.
        </p>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>تواصل معنا</h2>
        <p>لأي استفسار:</p>
        <ul style={{ paddingRight: 24, marginTop: 8 }}>
          <li style={{ marginBottom: 8 }}>
            البريد الإلكتروني: <a href="mailto:ebrahimkhlil01@gmail.com" style={{ color: '#6366f1', fontWeight: 700 }}>ebrahimkhlil01@gmail.com</a>
          </li>
        </ul>
      </section>

      <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 24, marginTop: 32, color: '#94a3b8', fontSize: 13 }}>
        <p>© 2026 فاهم — جميع الحقوق محفوظة</p>
      </div>
    </div>
  )
}
