import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const { password } = await req.json()
  if (password !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const cookieStore = await cookies()
  cookieStore.set('admin-auth', process.env.ADMIN_SECRET!, { httpOnly:true, maxAge: 60*60*24*7, path:'/' })
  return NextResponse.json({ ok: true })
}
