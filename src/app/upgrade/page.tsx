'use client'
import { useUser } from '@/hooks/useUser'
import { CheckoutButton } from '@/components/payment/CheckoutButton'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const plans = [
  {
    plan: 'free' as const,
    name: 'مجاني',
    price: '$0',
    interval: '',
    color: '#888780',
    features: [
      'دروس محدودة لكل مسار',
      'XP عادي',
      'التحديات العامة',
      'Leaderboard عام',
    ],
    cta: 'خطتك الحالية',
    disabled: true,
  },
  {
    plan: 'pro' as const,
    name: 'Pro',
    price: '$10',
    interval: '/ شهر',
    color: '#378ADD',
    badge: 'الأكثر شعبية',
    features: [
      'دروس غير محدودة',
      'XP مضاعف ×2',
      'تحديات حصرية',
      'بدون إعلانات',
      'باج Pro مميز',
      'اجتماع شهري مباشر',
    ],
    cta: 'اشترك في Pro',
    disabled: false,
  },
  {
    plan: 'elite' as const,
    name: 'Elite',
    price: '$100',
    interval: '/ سنة',
    color: '#BA7517',
    badge: 'Ibrahim Elite',
    features: [
      'كل مميزات Pro',
      'مدرب AI شخصي',
      'بطولات VIP',
      'رفع مستوى فوري',
      'باج Ibrahim Elite ⭐',
      '500 كوين إضافية سنوياً',
    ],
    cta: 'اشترك في Elite',
    disabled: false,
  },
]

function UpgradeContent() {
  const { user, loading } = useUser()
  const params = useSearchParams()
  const success = params.get('success')
  const cancelled = params.get('cancelled')

  if (!loading && !user) { if (typeof window !== "undefined") window.location.replace("/auth/login"); return null }
  if (loading) return <div className="up-loading">جاري التحميل...</div>

  return (
    <main className="up-page" dir="rtl">
      <div className="up-header">
        <h1>اختار خطتك</h1>
        <p>ارقى بتجربة التعلم — استثمر في نفسك</p>
      </div>

      {success && (
        <div className="up-alert up-alert-success">
          تم الاشتراك بنجاح! 🎉 خطتك الجديدة فعّالة دلوقتي.
        </div>
      )}
      {cancelled && (
        <div className="up-alert up-alert-warn">
          تم إلغاء عملية الدفع. تقدر تحاول تاني في أي وقت.
        </div>
      )}

      <div className="up-grid">
        {plans.map(p => (
          <div
            key={p.plan}
            className={`up-card ${user?.subscription_plan === p.plan ? 'up-card-current' : ''}`}
            style={{ '--plan-color': p.color } as React.CSSProperties}
          >
            {p.badge && (
              <div className="up-badge" style={{ background: p.color }}>
                {p.badge}
              </div>
            )}
            <div className="up-plan-name">{p.name}</div>
            <div className="up-price">
              <span className="up-price-amount">{p.price}</span>
              <span className="up-price-interval">{p.interval}</span>
            </div>

            <ul className="up-features">
              {p.features.map((f, i) => (
                <li key={i}>
                  <span className="up-check" style={{ color: p.color }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {user?.subscription_plan === p.plan ? (
              <div className="up-current-badge">خطتك الحالية</div>
            ) : p.disabled ? (
              <button className="up-btn up-btn-disabled" disabled>{p.cta}</button>
            ) : (
              <CheckoutButton
                plan={p.plan}
                label={p.cta}
                className="up-btn"
                disabled={user?.subscription_plan === p.plan}
              />
            )}
          </div>
        ))}
      </div>
    </main>
  )
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>جاري التحميل...</div>}>
      <UpgradeContent />
    </Suspense>
  )
}
