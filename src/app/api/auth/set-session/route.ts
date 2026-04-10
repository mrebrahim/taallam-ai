import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { access_token, refresh_token } = await req.json()
  
  const supabase = await createClient()
  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  })
  
  if (error || !data.session) {
    return NextResponse.json({ error: 'Failed to set session' }, { status: 400 })
  }
  
  return NextResponse.json({ ok: true })
}
