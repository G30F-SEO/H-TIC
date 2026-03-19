import { NextResponse } from 'next/server'
import { createClientSession, CLIENT_SESSION_KEY } from '@/lib/auth'
import { ensureLoaded, getClientByLoginId } from '@/lib/db'

export async function POST(request) {
  await ensureLoaded()
  const { loginId, password } = await request.json()

  const client = getClientByLoginId(loginId)
  if (!client || client.password !== password) {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
  }
  if (!client.active) {
    return NextResponse.json({ error: 'Compte desactive' }, { status: 403 })
  }

  const token = await createClientSession(client.id, client.loginId)
  const response = NextResponse.json({ ok: true, loginId: client.loginId })
  response.cookies.set(CLIENT_SESSION_KEY, token, {
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
  response.cookies.delete(CLIENT_SESSION_KEY)
  return response
}
