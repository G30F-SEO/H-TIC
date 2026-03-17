import { NextResponse } from 'next/server'
import { createSession, SESSION_KEY } from '@/lib/auth'

export async function POST(request) {
  const { password } = await request.json()
  const expected = process.env.APP_PASSWORD || 'htic2025'

  if (password !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = await createSession()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_KEY, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60,
    path: '/',
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(SESSION_KEY)
  return response
}
