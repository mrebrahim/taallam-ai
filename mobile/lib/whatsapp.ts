import { Linking } from 'react-native'
import { supabase } from './supabase'

// Start with empty - force load from Supabase every time
let cachedPhone = ''
let cachedPrefix = ''
let loadPromise: Promise<void> | null = null

async function fetchSettings(): Promise<void> {
  const { data } = await supabase.from('app_settings').select('key,value')
  if (data) {
    data.forEach((s: any) => {
      if (s.key === 'whatsapp_number') cachedPhone = s.value
      if (s.key === 'whatsapp_message_prefix') cachedPrefix = s.value
    })
  }
  // Fallback if Supabase fails
  if (!cachedPhone) cachedPhone = '201027555789'
  if (!cachedPrefix) cachedPrefix = 'أريد الاستفسار عن'
}

export function loadWASettings(): Promise<void> {
  if (!loadPromise) {
    loadPromise = fetchSettings()
  }
  return loadPromise
}

export function resetWACache() {
  loadPromise = null
  cachedPhone = ''
  cachedPrefix = ''
}

export async function openWhatsApp(productName: string) {
  await loadWASettings()
  const message = `${cachedPrefix} ${productName}`
  const url = `https://wa.me/${cachedPhone}?text=${encodeURIComponent(message)}`
  Linking.openURL(url)
}

export async function openCTA(type: string, url: string | null, productName: string) {
  if (type === 'whatsapp' || !url) {
    await openWhatsApp(productName)
  } else if (type === 'url' || type === 'payment') {
    Linking.openURL(url)
  }
}
