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

      <style jsx global>{`
        .up-page { min-height: 100vh; padding: 40px 20px; background: var(--color-background-tertiary); font-family: var(--font-sans); }
        .up-header { text-align: center; margin-bottom: 32px; }
        .up-header h1 { font-size: 28px; font-weight: 600; color: var(--color-text-primary); margin: 0 0 8px; }
        .up-header p { font-size: 15px; color: var(--color-text-secondary); margin: 0; }
        .up-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; max-width: 900px; margin: 0 auto; }
        .up-card { background: var(--color-background-primary); border: 1px solid var(--color-border-tertiary); border-radius: 20px; padding: 28px 24px; position: relative; display: flex; flex-direction: column; gap: 16px; }
        .up-card-current { border-color: var(--plan-color); box-shadow: 0 0 0 2px var(--plan-color); }
        .up-badge { position: absolute; top: -12px; right: 20px; background: #7F77DD; color: #fff; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 99px; }
        .up-plan-name { font-size: 20px; font-weight: 700; color: var(--color-text-primary); }
        .up-price { display: flex; align-items: baseline; gap: 4px; }
        .up-price-amount { font-size: 36px; font-weight: 700; color: var(--color-text-primary); }
        .up-price-interval { font-size: 13px; color: var(--color-text-secondary); }
        .up-features { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .up-features li { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--color-text-secondary); }
        .up-check { font-weight: 700; font-size: 15px; }
        .up-btn { width: 100%; padding: 13px; border-radius: 12px; border: none; background: var(--plan-color, #7F77DD); color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; margin-top: 8px; }
        .up-btn:hover { opacity: 0.88; }
        .up-btn-disabled { background: var(--color-background-secondary); color: var(--color-text-tertiary); cursor: not-allowed; }
        .up-current-badge { text-align: center; padding: 12px; background: var(--color-background-secondary); border-radius: 10px; font-size: 14px; color: var(--color-text-secondary); font-weight: 500; margin-top: 8px; }
        .up-alert { max-width: 600px; margin: 0 auto 24px; padding: 14px 18px; border-radius: 12px; font-size: 14px; text-align: center; }
        .up-alert-success { background: #EAF3DE; color: #27500A; }
        .up-alert-warn { background: #FAEEDA; color: #633806; }
        .up-loading { min-height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); }
      `}</style>
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
