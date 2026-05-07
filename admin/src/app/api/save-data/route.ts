import { NextRequest, NextResponse } from 'next/server'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const KEY = SERVICE || ANON

export async function POST(req: NextRequest) {
  try {
    const { table, id, ...body } = await req.json()
    const tbl = table || 'digital_products'

    const res = await fetch(
      id ? `${URL}/rest/v1/${tbl}?id=eq.${id}` : `${URL}/rest/v1/${tbl}`,
      {
        method: id ? 'PATCH' : 'POST',
        headers: {
          'apikey': KEY,
          'Authorization': `Bearer ${KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(body),
      }
    )
    const data = await res.json()
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
