'use client'

import { useState, useTransition, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { registerUser } from '@/domains/auth/register'
import { useRouter, useSearchParams } from 'next/navigation'

function SignInInner() {
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
    'w-full rounded-[6px] border border-input bg-card/60 px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-foreground focus:bg-card focus:ring-[3px] focus:ring-foreground/[0.06]'
  const labelClass = 'block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground mb-2'

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Editorial corner marks */}
      <div className="pointer-events-none fixed left-6 top-6 z-50 hidden md:block font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/55">
        Elderdoc · Sign in
      </div>
      <div className="pointer-events-none fixed right-6 top-6 z-50 hidden md:block font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/55">
        Vol. 1 · Issue 01
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-12">
        {/* Left editorial pane */}
        <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between border-r border-border px-12 xl:px-16 py-12">
          <Link href="/" className="font-display text-[28px] tracking-[-0.045em] leading-none">
            Elderdoc
          </Link>

          <div>
            <p className="ed-eyebrow">An invitation</p>
            <h1 className="ed-display mt-5 text-[64px] xl:text-[88px]">
              Welcome,{' '}
              <span className="italic font-light text-[var(--forest-deep)]">again</span>.
            </h1>
            <p className="mt-8 max-w-md text-[16px] leading-[1.6] text-foreground/75">
              Sign in to coordinate care, review caregiver matches,
              and manage the people who matter most.
            </p>
            <div className="mt-12 grid grid-cols-2 gap-px bg-border w-fit">
              {[
                { num: '1,240', l: 'caregivers' },
                { num: '94%', l: 'satisfaction' },
              ].map((s) => (
                <div key={s.l} className="bg-background pr-12 pt-6">
                  <div className="ed-figure text-[36px] leading-[1] tracking-[-0.04em]">{s.num}</div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            © {new Date().getFullYear()} Elderdoc · Care, considered.
          </div>
        </div>

        {/* Right form pane */}
        <div className="flex items-center justify-center px-6 py-12 lg:col-span-6 xl:col-span-5 sm:px-10">
          <div className="w-full max-w-[420px]">
            <div className="lg:hidden mb-8 flex items-center justify-between">
              <Link href="/" className="font-display text-[24px] tracking-[-0.04em] leading-none">
                Elderdoc
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Sign in
              </span>
            </div>

            <div>
              <p className="ed-eyebrow">{tab === 'signin' ? 'Returning' : 'New here'}</p>
              <h2 className="ed-display mt-3 text-[40px] sm:text-[44px]">
                {tab === 'signin' ? (
                  <>Sign in to <span className="italic font-light">continue</span>.</>
                ) : (
                  <>Begin with <span className="italic font-light">care</span>.</>
                )}
              </h2>
            </div>

            {/* Editorial tabs */}
            <div className="mt-8 flex gap-1 border-b border-foreground/15">
              <button
                type="button"
                onClick={() => { setTab('signin'); setError(null) }}
                className={`relative px-1 pb-3 pt-1 text-[13px] font-medium transition-colors ${
                  tab === 'signin' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
                {tab === 'signin' && <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-foreground" />}
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setError(null) }}
                className={`relative ml-4 px-1 pb-3 pt-1 text-[13px] font-medium transition-colors ${
                  tab === 'register' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Register
                {tab === 'register' && <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-foreground" />}
              </button>
            </div>

            <div className="mt-7">
              {tab === 'signin' ? (
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div>
                    <label className={labelClass}>01 · Email</label>
                    <input type="email" autoComplete="email" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>02 · Password</label>
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
                    <div className="rounded-md border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[12px] text-destructive">
                      {error}
                    </div>
                  )}
                  <button type="submit" disabled={isPending}
                    className="group/cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-[14px] font-medium text-background transition-all hover:translate-y-[-1px] hover:shadow-[0_10px_24px_-8px_rgba(15,20,16,0.3)] disabled:opacity-50 disabled:hover:translate-y-0">
                    {isPending ? 'Signing in…' : (
                      <>
                        Sign In
                        <span className="ml-1 transition-transform group-hover/cta:translate-x-1">→</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-5">
                  <div>
                    <label className={labelClass}>01 · I am a</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['client', 'caregiver'] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`relative rounded-md border px-3 py-3 text-left text-[13px] font-medium transition-all capitalize ${
                            role === r
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border text-foreground/70 hover:border-foreground/40 hover:text-foreground'
                          }`}
                        >
                          <div className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-70">
                            {r === 'client' ? 'Family' : 'Provider'}
                          </div>
                          <div className="mt-1 font-display text-[15px] tracking-tight">
                            {r === 'client' ? 'Client' : 'Caregiver'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>02 · Full Name</label>
                    <input type="text" autoComplete="name" placeholder="Jane Smith"
                      value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>03 · Email</label>
                    <input type="email" autoComplete="email" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>04 · Password</label>
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
                    <div className="rounded-md border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[12px] text-destructive">
                      {error}
                    </div>
                  )}
                  <button type="submit" disabled={isPending}
                    className="group/cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[14px] font-medium text-primary-foreground transition-all hover:translate-y-[-1px] hover:bg-[var(--forest-deep)] hover:shadow-[0_12px_28px_-8px_rgba(15,77,52,0.4)] disabled:opacity-50 disabled:hover:translate-y-0">
                    {isPending ? 'Creating account…' : (
                      <>
                        Create Account
                        <span className="ml-1 transition-transform group-hover/cta:translate-x-1">→</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-foreground/15 bg-card text-[13px] font-medium text-foreground transition-all hover:border-foreground/40 hover:bg-foreground/[0.025]"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
                By continuing, you agree to our{' '}
                <span className="underline underline-offset-2 decoration-border hover:decoration-foreground">Terms</span>
                {' '}and{' '}
                <span className="underline underline-offset-2 decoration-border hover:decoration-foreground">Privacy Policy</span>.
              </p>
            </div>
          </div>
        </div>
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
