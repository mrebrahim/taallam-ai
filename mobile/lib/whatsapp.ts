import { Linking } from 'react-native'
import { supabase } from './supabase'

let cachedPhone = '201027555789'
let cachedPrefix = 'أريد الاستفسار عن'
let loaded = false
let loadingPromise: Promise<void> | null = null

export function loadWASettings(): Promise<void> {
  if (loaded) return Promise.resolve()
  if (loadingPromise) return loadingPromise
  
  loadingPromise = supabase
    .from('app_settings')
    .select('key,value')
    .then(({ data }) => {
      if (data) {
        data.forEach((s: any) => {
          if (s.key === 'whatsapp_number') cachedPhone = s.value
          if (s.key === 'whatsapp_message_prefix') cachedPrefix = s.value
        })
      }
      loaded = true
    })
    .catch(() => { loaded = true }) // Use defaults if fails
  
  return loadingPromise
}

export async function openWhatsApp(productName: string) {
  // Always ensure settings are loaded before opening
  await loadWASettings()
  const message = `${cachedPrefix} ${productName}`
  const url = `https://wa.me/${cachedPhone}?text=${encodeURIComponent(message)}`
  Linking.openURL(url)
}
