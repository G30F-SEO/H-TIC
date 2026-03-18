import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/', '/api/auth', '/api/campaigns/auto', '/api/webhook/callback']

function getSecret() {
  const secret = process.env.JWT_SECRET || 'htic-auto-secret-' + (process.env.APP_PASSWORD || 'default')
  return new TextEncoder().encode(secret)
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('htic_session')?.value

  // If user is on the login page, check if already authenticated
  if (pathname === '/') {
    if (token) {
      try {
        await jwtVerify(token, getSecret())
        // Already logged in — redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } catch {
        // Invalid token — let them see login page
        return NextResponse.next()
      }
    }
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

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    await jwtVerify(token, getSecret())
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
