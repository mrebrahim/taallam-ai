import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { RoadmapSlug } from '@/types'

const ROADMAP_CONTEXT: Record<RoadmapSlug, string> = {
  n8n_automation: 'n8n automation tool, workflows, nodes, triggers, webhooks, HTTP requests, data transformation, integrations like Gmail/Slack/Airtable',
  ai_video: 'AI video production tools like Runway, Pika, Kling, HeyGen, ElevenLabs, video editing, AI avatars, voiceover, scripting',
  vibe_coding: 'vibe coding with AI tools like Cursor, v0, Bolt, Replit, building apps without traditional coding, prompting for code',
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { lesson_id, roadmap_slug, topic, question_count = 5 } = await request.json()

    const context = ROADMAP_CONTEXT[roadmap_slug as RoadmapSlug] || 'AI and automation tools'

    const prompt = `You are a quiz generator for an Arabic learning app about AI and automation.

Generate ${question_count} quiz questions about: ${topic || context}
Roadmap: ${roadmap_slug}

Rules:
- Questions must be in Arabic
- Each question has 4 options (A, B, C, D)
- Mark the correct answer
- Mix question types: conceptual, practical, "what does X do"
- Difficulty: beginner to intermediate

Return ONLY valid JSON, no markdown, no explanation:
{
  "questions": [
    {
      "question": "السؤال هنا",
      "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
      "correct_index": 0,
      "explanation": "شرح مختصر للإجابة الصح"
    }
  ]
}`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('OpenAI error:', err)
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
    }

    const aiData = await res.json()
    const content = aiData.choices[0]?.message?.content
    const parsed = JSON.parse(content)

    // Save quiz to DB
    const serviceClient = await createServiceClient()
    const { data: quiz, error } = await serviceClient
      .from('quizzes')
      .insert({
        lesson_id: lesson_id || null,
        roadmap_id: null,
        questions: parsed.questions,
        ai_generated: true,
        xp_reward: question_count * 4,
        coins_reward: question_count * 2,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ quiz, questions: parsed.questions })

  } catch (error) {
    console.error('Quiz generation error:', error)
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 })
  }
}
