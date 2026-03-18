import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export const SESSION_KEY = 'htic_session'
export const CLIENT_SESSION_KEY = 'htic_client_session'

function getSecret() {
  const secret = process.env.JWT_SECRET || 'htic-auto-secret-' + (process.env.APP_PASSWORD || 'default')
  return new TextEncoder().encode(secret)
}

export async function createSession() {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function createClientSession(clientId, loginId) {
  return new SignJWT({ role: 'client', clientId, loginId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function getSession() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(SESSION_KEY)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, getSecret())
    return payload
  } catch {
    return null
  }
}

export async function getClientSession() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(CLIENT_SESSION_KEY)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.role !== 'client') return null
    return payload
  } catch {
    return null
  }
}
