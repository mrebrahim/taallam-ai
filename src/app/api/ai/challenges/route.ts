import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { RoadmapSlug } from '@/types'

// Called by a cron job (Vercel Cron) every Monday
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // Get all roadmaps
  const { data: roadmaps } = await supabase.from('roadmaps').select('id, slug, title_ar')
  if (!roadmaps?.length) return NextResponse.json({ error: 'No roadmaps' }, { status: 400 })

  const challengeTypes = ['quiz_battle', 'speed_quiz', 'puzzle', 'memory_game', 'ai_mission']
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const prompt = `Generate 3 creative weekly challenge titles in Arabic for an AI learning app.
Roadmap: {ROADMAP}
Challenge type: {TYPE}

Return ONLY JSON: {"title": "عنوان التحدي", "description": "وصف مختصر"}
Make it exciting, motivating, and relevant to the roadmap topic.`

  const created: any[] = []

  for (const roadmap of roadmaps) {
    for (let i = 0; i < 2; i++) {
      const type = challengeTypes[Math.floor(Math.random() * challengeTypes.length)]
      const difficulty = Math.floor(Math.random() * 3) + 1

      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{
              role: 'user',
              content: prompt
                .replace('{ROADMAP}', roadmap.title_ar)
                .replace('{TYPE}', type),
            }],
            temperature: 0.9,
            max_tokens: 200,
            response_format: { type: 'json_object' },
          }),
        })

        const aiData = await res.json()
        const content = JSON.parse(aiData.choices[0]?.message?.content || '{}')

        const { data } = await supabase.from('challenges').insert({
          roadmap_id: roadmap.id,
          title_ar: content.title || `تحدي ${roadmap.title_ar} الأسبوعي`,
          challenge_type: type,
          xp_reward: difficulty * 30 + 20,
          coins_reward: difficulty * 15 + 10,
          difficulty,
          ai_generated: true,
          ai_prompt_used: prompt,
          is_active: true,
          starts_at: now.toISOString(),
          ends_at: weekEnd.toISOString(),
        }).select().single()

        if (data) created.push(data)

      } catch (e) {
        console.error('Challenge gen error:', e)
      }
    }
  }

  return NextResponse.json({ created: created.length, challenges: created })
}
