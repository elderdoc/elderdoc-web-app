'use client'

import { useState, useTransition, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { registerUser } from '@/domains/auth/register'
import { useRouter, useSearchParams } from 'next/navigation'

function SignInInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  const [tab, setTab] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const inputClass =
    'w-full rounded-[8px] border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20'
  const labelClass = 'block text-xs font-medium text-muted-foreground uppercase tracking-[0.06em] mb-1.5'

  function handleGoogleSignIn() {
    signIn('google', { callbackUrl })
  }

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push(callbackUrl)
      }
    })
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await registerUser(email, password, name)
      if (result.error) {
        setError(result.error)
        return
      }
      const signInResult = await signIn('credentials', { email, password, redirect: false })
      if (signInResult?.error) {
        setError('Account created. Please sign in.')
        setTab('signin')
      } else {
        router.push(callbackUrl)
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
            ElderDoc
          </Link>
        </div>

        <div className="rounded-[16px] border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          {/* Tabs */}
          <div className="mb-6 flex rounded-[8px] border border-border p-1 gap-1">
            <button
              type="button"
              onClick={() => { setTab('signin'); setError(null) }}
              className={`flex-1 rounded-[6px] py-1.5 text-sm font-medium transition-colors ${
                tab === 'signin'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setError(null) }}
              className={`flex-1 rounded-[6px] py-1.5 text-sm font-medium transition-colors ${
                tab === 'register'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Register
            </button>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-[8px] border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-hover)]"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" autoComplete="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input type="password" autoComplete="current-password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} className={inputClass} required />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button type="submit" disabled={isPending}
                className="w-full rounded-[8px] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                {isPending ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className={labelClass}>Full Name</label>
                <input type="text" autoComplete="name" placeholder="Jane Smith"
                  value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" autoComplete="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input type="password" autoComplete="new-password" placeholder="Min. 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)} className={inputClass} required />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button type="submit" disabled={isPending}
                className="w-full rounded-[8px] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                {isPending ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <span className="underline underline-offset-2">Terms of Service</span>
            {' '}and{' '}
            <span className="underline underline-offset-2">Privacy Policy</span>.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          New to ElderDoc?{' '}
          <Link href="/get-started" className="font-medium text-primary hover:underline">
            Get started
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  )
}
