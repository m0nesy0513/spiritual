import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/register', '/reset-password', '/terms', '/privacy', '/disclaimer']
const STATIC_PREFIXES = ['/_next', '/favicon.ico']
const PUBLIC_API = ['/api/auth/send-code', '/api/auth/login', '/api/auth/register', '/api/auth/reset-password']

function isPublic(pathname: string): boolean {
  for (const p of PUBLIC_PATHS) if (pathname.startsWith(p)) return true
  for (const p of STATIC_PREFIXES) if (pathname.startsWith(p)) return true
  for (const p of PUBLIC_API) if (pathname.startsWith(p)) return true
  return false
}

function isAdmin(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  const token = request.cookies.get('spiritual_refuge_token')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 },
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = await verifyToken(token)
  if (!session) {
    const resp = pathname.startsWith('/api/')
      ? NextResponse.json({ success: false, error: { code: 'SESSION_EXPIRED', message: '登录已过期' } }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
    resp.cookies.delete('spiritual_refuge_token')
    return resp
  }

  if (isAdmin(pathname) && !session.isAdmin) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: '无权限' } }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/home', request.url))
  }

  const headers = new Headers(request.headers)
  headers.set('x-user-id', session.userId)
  headers.set('x-user-is-admin', String(session.isAdmin))
  headers.set('x-user-username', encodeURIComponent(session.username))

  return NextResponse.next({ request: { headers } })
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
