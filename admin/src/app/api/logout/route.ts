import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.delete('admin-auth')
  return NextResponse.redirect(new URL('/login', 'http://localhost'))
}
