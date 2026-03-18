import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/', '/api/auth', '/api/auth/client', '/api/campaigns/auto', '/api/webhook/callback']

function getSecret() {
  const secret = process.env.JWT_SECRET || 'htic-auto-secret-' + (process.env.APP_PASSWORD || 'default')
  return new TextEncoder().encode(secret)
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const adminToken = request.cookies.get('htic_session')?.value
  const clientToken = request.cookies.get('htic_client_session')?.value

  // Admin login page — redirect if already authenticated
  if (pathname === '/') {
    if (adminToken) {
      try {
        await jwtVerify(adminToken, getSecret())
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } catch {
        return NextResponse.next()
      }
    }
    return NextResponse.next()
  }

  // Portal routes — /portal/[loginId] is public (login page), subpages need client auth
  if (pathname.startsWith('/portal/')) {
    const parts = pathname.split('/').filter(Boolean) // ['portal', loginId, ...]
    const loginId = parts[1]

    // /portal/[loginId] — login page (public)
    if (parts.length === 2) {
      // If already authenticated as this client, redirect to dashboard
      if (clientToken) {
        try {
          const { payload } = await jwtVerify(clientToken, getSecret())
          if (payload.role === 'client' && payload.loginId === loginId) {
            return NextResponse.redirect(new URL(`/portal/${loginId}/dashboard`, request.url))
          }
        } catch {
          // Invalid token — show login
        }
      }
      return NextResponse.next()
    }

    // /portal/[loginId]/dashboard etc — need valid client session
    if (!clientToken) {
      return NextResponse.redirect(new URL(`/portal/${loginId}`, request.url))
    }
    try {
      const { payload } = await jwtVerify(clientToken, getSecret())
      if (payload.role !== 'client' || payload.loginId !== loginId) {
        return NextResponse.redirect(new URL(`/portal/${loginId}`, request.url))
      }
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL(`/portal/${loginId}`, request.url))
    }
  }

  // Client API routes — auth handled internally
  if (pathname.startsWith('/api/portal/') || pathname.startsWith('/api/auth/client/')) {
    return NextResponse.next()
  }

  // Allow other public paths and static assets
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Admin-protected routes
  if (!adminToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    await jwtVerify(adminToken, getSecret())
    return NextResponse.next()
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
