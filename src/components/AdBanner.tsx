'use client'
import { useEffect, useState } from 'react'
import CTABanner from './CTABanner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
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

export default function AdBanner({ userId, enrolledRoadmapSlugs, placement = 'home' }: Props) {
  const router = useRouter()
  const [ad, setAd]           = useState<any>(null)
  const [playing, setPlaying] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showCTA, setShowCTA] = useState(false)

  useEffect(() => { loadAd() }, [userId])

  const loadAd = async () => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const { data: ads } = await supabase.from('ads').select('*').eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`).order('sort_order')
    if (!ads || ads.length === 0) return

    const isSubscribed   = enrolledRoadmapSlugs.length > 0
    const hasBundle      = enrolledRoadmapSlugs.length >= 3

    const eligible = ads.filter((a: any) => {
      const aud: string[] = a.target_audience || ['all']
      if (aud.includes('all')) return true
      if (aud.includes('non_subscribers') && !isSubscribed) return true
      if (aud.includes('n8n_subscribers')          && enrolledRoadmapSlugs.includes('n8n_automation')) return true
      if (aud.includes('ai_video_subscribers')     && enrolledRoadmapSlugs.includes('ai_video'))       return true
      if (aud.includes('vibe_coding_subscribers')  && enrolledRoadmapSlugs.includes('vibe_coding'))    return true
      if (aud.includes('bundle_subscribers')       && hasBundle) return true
      return false
    })
    if (eligible.length === 0) return

    const { data: views } = await supabase.from('ad_views').select('ad_id,viewed_at').eq('user_id', userId)
    const viewedMap: Record<string, string> = {}
    views?.forEach((v: any) => { viewedMap[v.ad_id] = v.viewed_at })

    const toShow = eligible.find((a: any) => {
      if (a.show_frequency === 'always') return true
      if (a.show_frequency === 'once')   return !viewedMap[a.id]
      if (a.show_frequency === 'daily')  return !viewedMap[a.id] || viewedMap[a.id].split('T')[0] < today
      return false
    })
    if (!toShow) return

    setAd(toShow)
    // Show CTA banner 3s after ad loads (if banner image exists)
    if (toShow.cta_banner_image_url || toShow.cta_banner_title_ar) {
      setTimeout(() => setShowCTA(true), 3000)
    }
    await supabase.from('ad_views').upsert({ user_id: userId, ad_id: toShow.id, viewed_at: new Date().toISOString() }, { onConflict: 'user_id,ad_id' })
    try { await supabase.rpc('increment_ad_views', { ad_id: toShow.id }) } catch {}
  }

  const handleCTA = async () => {
    if (!ad) return
    const supabase = createClient()
    await supabase.from('ad_views').update({ clicked: true }).eq('user_id', userId).eq('ad_id', ad.id)
    try { await supabase.rpc('increment_ad_clicks', { ad_id: ad.id }) } catch {}

    if (ad.cta_type === 'external' && ad.cta_url) {
      window.open(ad.cta_url, '_blank')
    } else {
      // Navigate within the app — no external navigation
      const section = ad.cta_section || 'learn'
      router.push(`/${section}`)
    }
  }

  if (!ad || dismissed) return null

  const embedUrl = getEmbedUrl(ad)
  const hasBanner = !!ad.banner_image_url
  const hasVideo  = !!embedUrl
  const priceLabel = ad.price_label || (ad.price_egp === 0 ? 'EGP 0.00' : `EGP ${ad.price_egp}`)
  const ctaText = ad.cta_text_ar || `جرّبه مقابل ${priceLabel}`

  return (
    <div style={{
      background:'linear-gradient(135deg,#1a237e,#283593,#1565c0)',
      borderRadius:20, overflow:'hidden', marginBottom:16,
      position:'relative', direction:'rtl',
    }}>
      {/* Dismiss */}
      <button onClick={() => setDismissed(true)} style={{
        position:'absolute', top:10, left:10, zIndex:10,
        width:26, height:26, borderRadius:'50%',
        background:'rgba(0,0,0,0.45)', border:'none',
        color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:13, lineHeight:1,
      }}>✕</button>

      {/* Ad badge */}
      <div style={{ position:'absolute', top:10, right:10, zIndex:10, background:'rgba(0,0,0,0.4)', borderRadius:5, padding:'2px 7px', fontSize:10, color:'rgba(255,255,255,0.5)' }}>إعلان</div>

      {/* Banner image */}
      {hasBanner && !playing && (
        <div style={{ position:'relative' }} onClick={hasVideo ? () => setPlaying(true) : undefined}>
          <img src={ad.banner_image_url} alt="" style={{ width:'100%', display:'block', maxHeight:220, objectFit:'cover' }} />
          {hasVideo && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.25)' }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(255,255,255,0.88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>▶️</div>
            </div>
          )}
        </div>
      )}

      {/* Video player */}
      {hasVideo && playing && (
        <div style={{ position:'relative', paddingBottom:'56.25%', background:'#000' }}>
          <iframe src={embedUrl!} style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none' }} allow="autoplay; fullscreen" allowFullScreen />
        </div>
      )}

      {/* No banner + no video */}
      {!hasBanner && !playing && (
        <div style={{ height:80, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, opacity:0.5 }}>📢</div>
      )}

      {/* Text content */}
      <div style={{ padding:'14px 16px 18px' }}>
        {/* Title */}
        {ad.title_ar && (
          <div style={{ fontSize:17, fontWeight:900, color:'#fff', marginBottom:10, lineHeight:1.4, textAlign:'right' }}>
            {ad.title_ar}
          </div>
        )}

        {/* Speech bubble notification text */}
        {ad.notification_text && (
          <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:12, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#fff', textAlign:'right', lineHeight:1.6 }}>
            {ad.notification_text.replace('بيومين', '')}
            {ad.notification_text.includes('بيومين') && (
              <span style={{ color:'#69F0AE', fontWeight:700 }}> بيومين</span>
            )}
          </div>
        )}

        {/* Description */}
        {ad.description_ar && (
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', textAlign:'center', marginBottom:12, lineHeight:1.5 }}>
            {ad.description_ar}
          </div>
        )}

        {/* CTA Button with price */}
        <button onClick={handleCTA} style={{
          width:'100%', background:'#fff', border:'none',
          borderRadius:14, padding:'15px 16px',
          cursor:'pointer', textAlign:'center',
        }}>
          <div style={{ fontSize:17, fontWeight:900, color:'#1a237e' }}>{ctaText}</div>
          {ad.price_egp === 0 && ad.trial_days && (
            <div style={{ fontSize:11, color:'#666', marginTop:2 }}>
              {ad.trial_days} أيام مجاناً — بدون رسوم
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
