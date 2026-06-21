import { NextRequest, NextResponse } from 'next/server'

const AUTH_PAGES = ['/login', '/signup']
const PROTECTED = ['/dashboard', '/onboarding']

export function proxy(req: NextRequest) {
  const token = req.cookies.get('refreshToken')?.value
  const path = req.nextUrl.pathname

  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + '/'))
  const isAuthPage = AUTH_PAGES.includes(path)

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
