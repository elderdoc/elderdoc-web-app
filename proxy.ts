import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const isAuthenticated = !!session?.user
  const role = session?.user?.role

  if (pathname.startsWith('/get-started/caregiver')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(
        new URL(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`, req.url)
      )
    }
    if (role === 'caregiver') {
      return NextResponse.redirect(new URL('/caregiver/dashboard', req.url))
    }
    if (role === 'client') {
      return NextResponse.redirect(new URL('/client/dashboard', req.url))
    }
  }

  if (pathname.startsWith('/client')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`, req.url))
    }
    if (role !== 'client') {
      return NextResponse.redirect(new URL('/caregiver/dashboard', req.url))
    }
  }

  if (pathname.startsWith('/caregiver')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`, req.url))
    }
    if (role !== 'caregiver') {
      return NextResponse.redirect(new URL('/client/dashboard', req.url))
    }
  }

  if (isAuthenticated && !role && pathname === '/') {
    return NextResponse.redirect(new URL('/get-started', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/client/:path*',
    '/caregiver/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
