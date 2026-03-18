import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { ensureLoaded, getClient } from '@/lib/db'

function getSecret() {
  const secret = process.env.JWT_SECRET || 'htic-auto-secret-' + (process.env.APP_PASSWORD || 'default')
  return new TextEncoder().encode(secret)
}

export async function GET(request) {
  const token = request.cookies.get('htic_client_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.role !== 'client') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureLoaded()
    const client = getClient(payload.clientId)
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    // Return client info without password
    const { password, ...safe } = client
    return NextResponse.json(safe)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
