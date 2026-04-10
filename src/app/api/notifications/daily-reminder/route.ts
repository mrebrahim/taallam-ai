import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().split('T')[0]

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, streak_current, last_activity_date')
    .or(`last_activity_date.is.null,last_activity_date.lt.${today}`)
    .limit(500)

  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const MESSAGES = [
    { title: '🔥 لا تكسر الـ streak!', body: 'دخّل وخلّص درس واحد بس!' },
    { title: '⚡ إبراهيم سكول مشتاقلك!', body: 'مفيش وقت يضيع — درس سريع دلوقتي' },
    { title: '💡 تعلّم شيء جديد النهارده', body: 'كل يوم بتتعلم = خطوة للأمام 🚀' },
    { title: '🎯 هدفك بينتظرك!', body: 'كمّل مسيرتك مع الـ AI' },
  ]

  const logs = users.map(u => {
    const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
    return {
      user_id: u.id,
      type: 'daily_reminder',
      title_ar: msg.title,
      body_ar: u.streak_current > 0 ? `🔥 streak عندك ${u.streak_current} يوم — لا تكسره!` : msg.body,
      data: { streak: u.streak_current }
    }
  })

  await supabase.from('notification_logs').insert(logs)

  return NextResponse.json({ sent: users.length })
}
