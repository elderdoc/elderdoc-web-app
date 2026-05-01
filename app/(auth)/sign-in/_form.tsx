'use client'

import { useState, useTransition, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, Heart, ShieldCheck } from 'lucide-react'
import { registerUser } from '@/domains/auth/register'
import { useRouter, useSearchParams } from 'next/navigation'

interface Stats {
  caregivers: number
  families: number
  matches: number
}

function SignInInner({ stats }: { stats: Stats }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? null
  const defaultTab = searchParams.get('tab') === 'register' ? 'register' : 'signin'
  const defaultRole = searchParams.get('role') === 'caregiver' ? 'caregiver' : searchParams.get('role') === 'client' ? 'client' : ''

  const [tab, setTab] = useState<'signin' | 'register'>(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'client' | 'caregiver' | ''>(defaultRole)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const inputClass =
    'h-11 w-full rounded-[10px] border border-input bg-card px-3.5 text-[15px] text-foreground placeholder:text-muted-foreground/70 outline-none transition-all hover:border-foreground/30 focus:border-primary focus:ring-[3px] focus:ring-primary/15'

  function roleRedirect(userRole: string | null) {
    if (callbackUrl) return callbackUrl
    if (userRole === 'client') return '/client/dashboard'
    if (userRole === 'caregiver') return '/caregiver/dashboard'
    return '/get-started'
  }

  function handleGoogleSignIn() {
    signIn('google', { callbackUrl: callbackUrl ?? '/get-started' })
  }

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('Invalid email or password')
      } else {
        const { getSession } = await import('next-auth/react')
        const session = await getSession()
        window.location.href = roleRedirect((session?.user as any)?.role ?? null)
      }
    })
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!role) { setError('Please select your account type'); return }
    startTransition(async () => {
      const result = await registerUser(email, password, name, role as 'client' | 'caregiver')
      if (result.error) {
        setError(result.error)
        return
      }
      const signInResult = await signIn('credentials', { email, password, redirect: false })
      if (signInResult?.error) {
        setError('Account created. Please sign in.')
        setTab('signin')
      } else {
        window.location.href = role === 'caregiver' ? '/get-started/caregiver/step-1' : '/client/dashboard'
      }
    })
  }

  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k+` : n === 0 ? '—' : String(n)

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Soft glow background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full bg-[var(--forest-soft)] blur-3xl opacity-50" />
        <div className="absolute left-[-15%] bottom-[-30%] h-[500px] w-[500px] rounded-full bg-[var(--cream-deep)] blur-3xl opacity-60" />
      </div>

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left informational pane */}
        <div className="hidden lg:flex flex-col justify-between border-r border-border px-12 xl:px-16 py-12">
          <Link href="/" className="text-[22px] font-semibold tracking-tight">
            Elderdoc
          </Link>

          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--forest-soft)] px-3 py-1.5 text-[13px] font-medium text-[var(--forest-deep)]">
              <Heart className="h-3.5 w-3.5" />
              Welcome back
            </span>
            <h1 className="mt-5 text-[44px] xl:text-[56px] font-semibold tracking-[-0.025em] leading-[1.05]">
              The right care, made simple.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-[1.6] text-foreground/70">
              Sign in to coordinate care, review caregiver matches, and manage the people who matter most.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-sm">
              {[
                { v: stats.caregivers, l: 'caregivers' },
                { v: stats.families, l: 'families' },
                { v: stats.matches, l: 'matches' },
              ].map((s) => (
                <div key={s.l} className="rounded-[12px] border border-border bg-card px-3 py-4 text-center">
                  <div className="text-[20px] font-semibold tabular-nums tracking-tight">{formatNum(s.v)}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Background-checked &amp; verified caregivers</span>
          </div>
        </div>

        {/* Right form pane */}
        <div className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-[420px]">
            <div className="lg:hidden mb-8">
              <Link href="/" className="text-[22px] font-semibold tracking-tight">
                Elderdoc
              </Link>
            </div>

            <div>
              <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-[1.15]">
                {tab === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="mt-2 text-[14.5px] text-muted-foreground">
                {tab === 'signin' ? 'Sign in to continue.' : 'Get started in minutes.'}
              </p>
            </div>

            {/* Pill tab switcher */}
            <div className="mt-8 inline-flex p-1 bg-muted rounded-full">
              <button
                type="button"
                onClick={() => { setTab('signin'); setError(null) }}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all ${
                  tab === 'signin'
                    ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(15,20,16,0.08)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setError(null) }}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all ${
                  tab === 'register'
                    ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(15,20,16,0.08)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Register
              </button>
            </div>

            <div className="mt-7">
              {tab === 'signin' ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">Email</label>
                    <input type="email" autoComplete="email" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">Password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
                        value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pr-11`} required />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="rounded-[10px] border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[13px] text-destructive">
                      {error}
                    </div>
                  )}
                  <button type="submit" disabled={isPending}
                    className="group/cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)] disabled:opacity-50">
                    {isPending ? 'Signing in…' : (
                      <>
                        Sign in
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">I am a</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['client', 'caregiver'] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`relative rounded-[12px] border-2 p-4 text-left transition-all ${
                            role === r
                              ? 'border-primary bg-[var(--forest-soft)] text-foreground'
                              : 'border-border bg-card text-foreground hover:border-primary/40'
                          }`}
                        >
                          <div className="text-[12px] text-muted-foreground">
                            {r === 'client' ? 'Family' : 'Provider'}
                          </div>
                          <div className="mt-1 text-[15px] font-semibold capitalize">
                            {r === 'client' ? 'Client' : 'Caregiver'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">Full name</label>
                    <input type="text" autoComplete="name" placeholder="Jane Smith"
                      value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">Email</label>
                    <input type="email" autoComplete="email" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">Password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Min. 8 characters"
                        value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pr-11`} required />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="rounded-[10px] border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[13px] text-destructive">
                      {error}
                    </div>
                  )}
                  <button type="submit" disabled={isPending}
                    className="group/cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)] disabled:opacity-50">
                    {isPending ? 'Creating account…' : (
                      <>
                        Create account
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[12px] text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-border bg-card text-[14px] font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-muted"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
                By continuing, you agree to our{' '}
                <span className="underline underline-offset-2 hover:text-foreground">Terms</span>
                {' '}and{' '}
                <span className="underline underline-offset-2 hover:text-foreground">Privacy Policy</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SignInClient({ stats }: { stats: Stats }) {
  return (
    <Suspense fallback={null}>
      <SignInInner stats={stats} />
    </Suspense>
  )
}
