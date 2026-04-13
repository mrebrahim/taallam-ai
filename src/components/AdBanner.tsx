'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AdBannerProps {
  userId: string
  enrolledRoadmapSlugs: string[]
  placement?: 'home' | 'learn' | 'challenges'
}

function getEmbedUrl(ad: any): string | null {
  if (ad.vimeo_id) return `https://player.vimeo.com/video/${ad.vimeo_id}?title=0&byline=0&portrait=0&autoplay=1`
  if (ad.vimeo_url) {
    const m = ad.vimeo_url.match(/vimeo\.com\/(\d+)/)
    if (m) return `https://player.vimeo.com/video/${m[1]}?title=0&byline=0&portrait=0&autoplay=1`
  }
  if (ad.video_url) {
    const m = ad.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0`
  }
  return null
}

export default function AdBanner({ userId, enrolledRoadmapSlugs, placement = 'home' }: AdBannerProps) {
  const [ad, setAd]         = useState<any>(null)
  const [playing, setPlaying] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    loadAd()
  }, [userId])

  const loadAd = async () => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    // Get all active ads
    const { data: ads } = await supabase
      .from('ads')
      .select('*')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .order('sort_order')

    if (!ads || ads.length === 0) return

    // Determine user's subscription status
    const isSubscribed = enrolledRoadmapSlugs.length > 0
    const hasBundle = enrolledRoadmapSlugs.length >= 3

    // Filter by audience targeting
    const eligible = ads.filter(a => {
      const audiences: string[] = a.target_audience || ['all']
      if (audiences.includes('all')) return true
      if (audiences.includes('non_subscribers') && !isSubscribed) return true
      if (audiences.includes('n8n_subscribers') && enrolledRoadmapSlugs.includes('n8n_automation')) return true
      if (audiences.includes('ai_video_subscribers') && enrolledRoadmapSlugs.includes('ai_video')) return true
      if (audiences.includes('vibe_coding_subscribers') && enrolledRoadmapSlugs.includes('vibe_coding')) return true
      if (audiences.includes('bundle_subscribers') && hasBundle) return true
      return false
    })

    if (eligible.length === 0) return

    // Check which ads user has already seen (for 'once' frequency)
    const { data: views } = await supabase
      .from('ad_views')
      .select('ad_id, viewed_at')
      .eq('user_id', userId)

    const viewedMap: Record<string, string> = {}
    views?.forEach((v: any) => { viewedMap[v.ad_id] = v.viewed_at })

    // Find the first ad user should see
    const toShow = eligible.find(a => {
      if (a.show_frequency === 'always') return true
      if (a.show_frequency === 'once') return !viewedMap[a.id]
      if (a.show_frequency === 'daily') {
        const lastView = viewedMap[a.id]
        if (!lastView) return true
        return lastView.split('T')[0] < today
      }
      return false
    })

    if (!toShow) return
    setAd(toShow)

    // Record view
    await supabase.from('ad_views').upsert({
      user_id: userId,
      ad_id: toShow.id,
      viewed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,ad_id' })

    // Increment view count
    await supabase.rpc('increment_ad_views', { ad_id: toShow.id }).catch(() => {})
  }

  const handleClick = async () => {
    if (!ad) return
    const supabase = createClient()
    await supabase.from('ad_views').update({ clicked: true }).eq('user_id', userId).eq('ad_id', ad.id)
    await supabase.rpc('increment_ad_clicks', { ad_id: ad.id }).catch(() => {})
    if (ad.cta_url) window.open(ad.cta_url, '_blank')
  }

  if (!ad || dismissed) return null

  const embedUrl = getEmbedUrl(ad)
  const hasVideo = !!embedUrl

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b, #0f172a)',
      borderRadius: 18, margin: '0 0 16px', overflow: 'hidden',
      border: '2px solid #334155', position: 'relative',
    }}>
      {/* Dismiss button */}
      <button onClick={() => setDismissed(true)} style={{
        position: 'absolute', top: 10, left: 10, zIndex: 10,
        width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(0,0,0,0.5)', border: 'none',
        color: '#fff', cursor: 'pointer', fontSize: 14,
      }}>✕</button>

      {/* Ad badge */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 10,
        background: 'rgba(0,0,0,0.5)', borderRadius: 6,
        padding: '2px 8px', fontSize: 10, color: '#94a3b8',
      }}>إعلان</div>

      {/* Video */}
      {hasVideo && playing && (
        <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
          <iframe src={embedUrl!} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; fullscreen" allowFullScreen />
        </div>
      )}

      {/* Thumbnail / Play button */}
      {hasVideo && !playing && (
        <div onClick={() => setPlaying(true)} style={{ cursor: 'pointer', position: 'relative' }}>
          {ad.thumbnail_url ? (
            <img src={ad.thumbnail_url} alt="" style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
          ) : (
            <div style={{ background: 'linear-gradient(135deg, #1CB0F620, #1CB0F640)', height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 24, color: '#64748b' }}>🎬</div>
            </div>
          )}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>▶️</div>
          </div>
        </div>
      )}

      {/* Image only (no video) */}
      {!hasVideo && ad.thumbnail_url && (
        <img src={ad.thumbnail_url} alt="" style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
      )}

      {/* Text content */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 800, color: '#e2e8f0', fontSize: 15, marginBottom: 4, direction: 'rtl' }}>
          {ad.title_ar}
        </div>
        {ad.description_ar && (
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12, direction: 'rtl', lineHeight: 1.5 }}>
            {ad.description_ar}
          </div>
        )}
        {ad.cta_text_ar && (
          <button onClick={handleClick} style={{
            width: '100%', padding: '12px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #1CB0F6, #0090CC)',
            color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer',
            direction: 'rtl',
          }}>
            {ad.cta_text_ar}
          </button>
        )}
      </div>
    </div>
  )
}
