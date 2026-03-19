import { jwtVerify } from 'jose'
import { ensureLoaded, getClient } from '@/lib/db'

function getSecret() {
  const secret = process.env.JWT_SECRET || 'htic-auto-secret-' + (process.env.APP_PASSWORD || 'default')
  return new TextEncoder().encode(secret)
}

export async function verifyClientRequest(request) {
  const token = request.cookies.get('htic_client_session')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.role !== 'client') return null

    await ensureLoaded()
    const client = getClient(payload.clientId)
    if (!client || !client.active) return null

    return client
  } catch {
    return null
  }
}
