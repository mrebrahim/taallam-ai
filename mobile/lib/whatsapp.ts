import { Linking } from 'react-native'
import { supabase } from './supabase'

let cachedPhone = '201027555789'
let cachedPrefix = 'أريد الاستفسار عن'
let loaded = false

export async function loadWASettings() {
  if (loaded) return
  const { data } = await supabase.from('app_settings').select('key,value')
  if (data) {
    data.forEach((s: any) => {
      if (s.key === 'whatsapp_number') cachedPhone = s.value
      if (s.key === 'whatsapp_message_prefix') cachedPrefix = s.value
    })
  }
  loaded = true
}

export function openWhatsApp(productName: string) {
  const message = `${cachedPrefix} ${productName}`
  const url = `https://wa.me/${cachedPhone}?text=${encodeURIComponent(message)}`
  Linking.openURL(url)
}
