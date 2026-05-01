'use client'

import { useState, useTransition, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, Heart, ShieldCheck, Star } from 'lucide-react'
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
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left photographic pane */}
        <div className="hidden lg:block relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1581579186913-45ac3e6efe93?auto=format&fit=crop&w=1200&q=80"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Dark gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/85 via-foreground/60 to-foreground/85" />

          {/* Content over photo */}
          <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16 text-background">
            <Link href="/" className="text-[22px] font-semibold tracking-tight">
              Elderdoc
            </Link>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-background/15 backdrop-blur-md border border-background/20 px-3 py-1.5 text-[13px] font-medium">
                <Heart className="h-3.5 w-3.5" />
                Welcome back
              </div>
              <h1 className="mt-6 text-[44px] xl:text-[60px] font-semibold tracking-[-0.025em] leading-[1.05]">
                Care that&apos;s already{' '}
                <span className="font-serif italic font-normal text-[var(--forest-soft)]">in motion</span>.
              </h1>
              <p className="mt-6 max-w-md text-[15px] leading-[1.6] text-background/80">
                Sign in to coordinate care, review caregiver matches, and manage the people who matter most.
              </p>

              {/* Floating glass card with stats */}
              <div className="mt-10 rounded-[18px] bg-background/10 backdrop-blur-xl border border-background/20 p-5 max-w-sm">
                <div className="flex items-center gap-2 mb-3 text-[12px] text-background/70">
                  <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                  <span className="font-medium text-background">4.9 / 5</span>
                  <span>· {formatNum(stats.families)} families</span>
                </div>
                <p className="text-[14px] leading-[1.55] text-background">
                  &ldquo;After three weeks of dead ends, Elderdoc matched mom with Margaret in two days.&rdquo;
                </p>
                <div className="mt-3 text-[11.5px] text-background/60">
                  — Sarah K., Boston
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[13px] text-background/70">
              <ShieldCheck className="h-4 w-4 text-[var(--forest-soft)]" />
              <span>Background-checked &amp; verified caregivers</span>
            </div>
          </div>
        </div>

        {/* Right form pane */}
        <div className="flex items-center justify-center px-6 py-12 sm:px-10 relative">
          {/* Subtle gradient bg for the form side */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute right-[-15%] top-[-20%] h-[400px] w-[400px] rounded-full bg-[var(--forest-soft)] blur-[100px] opacity-50" />
          </div>

          <div className="w-full max-w-[420px]">
            <div className="lg:hidden mb-8">
              <Link href="/" className="text-[22px] font-semibold tracking-tight">
                Elderdoc
              </Link>
            </div>

            <div>
              <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.02em] leading-[1.1]">
                {tab === 'signin' ? (
                  <>Welcome <span className="font-serif italic font-normal text-primary">back</span>.</>
                ) : (
                  <>Begin with <span className="font-serif italic font-normal text-primary">care</span>.</>
                )}
              </h2>
              <p className="mt-2 text-[14.5px] text-muted-foreground">
                {tab === 'signin' ? 'Sign in to continue.' : 'Create your account in seconds.'}
              </p>
            </div>

            {/* Pill tab switcher */}
            <div className="mt-7 inline-flex p-1 bg-muted rounded-full">
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

            <div className="mt-6">
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
