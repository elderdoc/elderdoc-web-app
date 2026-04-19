import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const isAuthenticated = !!session?.user?.id
  const role = (session?.user as any)?.role as string | null | undefined

  // Redirect authenticated users away from / and /sign-in to their dashboard
  if (isAuthenticated && (pathname === '/' || pathname === '/sign-in')) {
    if (role === 'caregiver') return NextResponse.redirect(new URL('/caregiver/dashboard', req.url))
    if (role === 'client') return NextResponse.redirect(new URL('/client/dashboard', req.url))
    // Logged in but no role yet → let them pick via get-started
    return NextResponse.redirect(new URL('/get-started', req.url))
  }

  // Caregiver onboarding requires auth and caregiver role
  if (pathname.startsWith('/get-started/caregiver')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(
        new URL(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`, req.url)
      )
    }
    if (role === 'client') return NextResponse.redirect(new URL('/client/dashboard', req.url))
    // Caregivers are allowed through — this is their onboarding
  }

  // Protect client dashboard
  if (pathname.startsWith('/client')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`, req.url))
    }
    if (role !== 'client') {
      return NextResponse.redirect(new URL('/caregiver/dashboard', req.url))
    }
  }

  // Protect caregiver dashboard
  if (pathname.startsWith('/caregiver')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`, req.url))
    }
    if (role !== 'caregiver') {
      return NextResponse.redirect(new URL('/client/dashboard', req.url))
    }
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
