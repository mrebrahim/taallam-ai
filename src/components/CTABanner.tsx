'use client'
import { useRouter } from 'next/navigation'

interface CTABannerProps {
  bannerImageUrl?: string
  titleAr?: string
  subtitleAr?: string
  priceEgp?: number
  priceLabelAr?: string
  internalSection?: string
  ctaUrl?: string
  onDismiss?: () => void
}

const SECTION_ROUTES: Record<string, string> = {
  home:        '/home',
  learn:       '/learn',
  challenges:  '/challenges',
  leaderboard: '/leaderboard',
  profile:     '/profile',
  n8n:         '/learn?roadmap=n8n_automation',
  ai_video:    '/learn?roadmap=ai_video',
  vibe_coding: '/learn?roadmap=vibe_coding',
}

export default function CTABanner({
  bannerImageUrl, titleAr, subtitleAr,
  priceEgp = 0, priceLabelAr = 'جرّبه مقابل',
  internalSection, ctaUrl, onDismiss,
}: CTABannerProps) {
  const router = useRouter()

  const handleCTA = () => {
    if (internalSection && SECTION_ROUTES[internalSection]) {
      router.push(SECTION_ROUTES[internalSection])
    } else if (ctaUrl && !ctaUrl.startsWith('http')) {
      router.push(ctaUrl)
    } else if (ctaUrl) {
      window.open(ctaUrl, '_blank')
    }
    if (onDismiss) onDismiss()
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a237e 0%, #1565c0 50%, #0288d1 100%)',
      borderRadius: 20, overflow: 'hidden', position: 'relative',
      margin: '0 0 16px',
    }}>
      {/* Dismiss */}
      {onDismiss && (
        <button onClick={onDismiss} style={{
          position: 'absolute', top: 10, left: 10, zIndex: 10,
          width: 26, height: 26, borderRadius: '50%',
          background: 'rgba(0,0,0,0.35)', border: 'none',
          color: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: 1,
        }}>✕</button>
      )}

      {/* Banner Image (390×160) */}
      {bannerImageUrl ? (
        <div style={{ width: '100%', height: 160, overflow: 'hidden', position: 'relative' }}>
          <img src={bannerImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          {/* Gradient overlay at bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(transparent, rgba(18,52,130,0.8))' }} />
        </div>
      ) : (
        /* Placeholder if no image */
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 64 }}>🤖</div>
        </div>
      )}

      {/* Text Content */}
      <div style={{ padding: '16px 20px 8px', textAlign: 'center' }}>
        {titleAr && (
          <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.4, direction: 'rtl' }}>
            {titleAr}
          </h2>
        )}

        {subtitleAr && (
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: 12,
            padding: '10px 16px', marginBottom: 14, direction: 'rtl',
          }}>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
              {subtitleAr}
            </p>
          </div>
        )}

        {/* Price disclaimer */}
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.65)', direction: 'rtl' }}>
          يمكنك إلغاء الاشتراك بسهولة، دون غرامات أو رسوم
        </p>

        {/* CTA Button with Price */}
        <button onClick={handleCTA} style={{
          width: '100%', padding: '14px 20px',
          borderRadius: 14, border: 'none',
          background: '#fff',
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          marginBottom: 8,
        }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#1a237e', direction: 'rtl' }}>
            {priceLabelAr}{' '}
            <span style={{ color: '#1565c0' }}>
              EGP {Number(priceEgp).toFixed(2)}
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}
