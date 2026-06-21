import { NextRequest, NextResponse } from 'next/server'

/**
 * Gate: checks that the refreshToken httpOnly cookie is present.
 * The cookie is set by Express on login/signup — no client JS needed.
 * Actual token validity + role enforcement happen server-side per request.
 */
export function proxy(req: NextRequest) {
  const token = req.cookies.get('refreshToken')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding'],
}
