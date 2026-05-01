import Link from 'next/link'
import { Shield, Heart, CheckCircle2, ArrowRight } from 'lucide-react'

const PILLARS = [
  {
    icon: Shield,
    title: 'Verified caregivers',
    body: 'Every caregiver is background-checked, credentialed, and personally vetted before joining. No exceptions.',
  },
  {
    icon: Heart,
    title: 'Matched to your needs',
    body: 'We weigh care type, schedule, location, language, and personality to surface your top five matches.',
  },
  {
    icon: CheckCircle2,
    title: 'Care, accounted for',
    body: 'Transparent escrow billing, weekly invoicing, and a 7-day dispute window. Your trust is our work.',
  },
]

const STEPS = [
  { n: 1, t: 'Tell us about your loved one', d: 'Conditions, mobility, language preference, and routine — we keep it private, always.' },
  { n: 2, t: 'Describe the care you need',   d: 'Hourly or live-in, weekday mornings or weekend overnights, a budget that works for you.' },
  { n: 3, t: 'Review your top five matches', d: 'Curated and ranked, with a clear reason for each. Talk to them. No fee until you choose.' },
  { n: 4, t: 'Begin care, with confidence',  d: 'Weekly billing, escrow protection, and a 7-day dispute window — built in.' },
]

interface LandingStats {
  caregivers: number
  families:   number
  shifts:     number
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k+`
  if (n === 0) return '—'
  return String(n)
}

export function Landing({ stats }: { stats: LandingStats }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-[20px] font-semibold tracking-tight">
            Elderdoc
          </Link>
          <nav className="flex items-center gap-2 sm:gap-5 text-[14px]">
            <Link href="#how" className="hidden text-foreground/70 hover:text-foreground sm:inline px-2">
              How it works
            </Link>
            <Link href="#values" className="hidden text-foreground/70 hover:text-foreground sm:inline px-2">
              Why us
            </Link>
            <Link href="/sign-in" className="text-foreground hover:text-primary px-2">
              Sign in
            </Link>
            <Link
              href="/get-started"
              className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          {/* Soft green glow */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute right-[-10%] top-[-20%] h-[600px] w-[600px] rounded-full bg-[var(--forest-soft)] blur-3xl opacity-60" />
            <div className="absolute left-[-15%] bottom-[-30%] h-[500px] w-[500px] rounded-full bg-[var(--cream-deep)] blur-3xl opacity-70" />
          </div>

          <div className="mx-auto max-w-6xl px-6 pt-16 md:pt-24 pb-20 md:pb-28">
            <div className="grid grid-cols-12 gap-x-8 gap-y-10">
              <div className="col-span-12 lg:col-span-7">
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--forest-soft)] px-3 py-1.5 text-[13px] font-medium text-[var(--forest-deep)] animate-rise">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Trusted by {formatNum(stats.families)} families
                </span>
                <h1 className="mt-6 text-[40px] sm:text-[52px] md:text-[64px] lg:text-[72px] font-semibold tracking-[-0.03em] leading-[1.05] animate-rise" style={{ animationDelay: '60ms' }}>
                  Trusted care for the people you{' '}
                  <span className="text-primary">love</span>.
                </h1>
                <p className="mt-6 max-w-xl text-[17px] md:text-[18px] leading-[1.55] text-foreground/75 animate-rise" style={{ animationDelay: '120ms' }}>
                  Elderdoc connects families with verified, compassionate caregivers — matched to your loved one&apos;s
                  needs, schedule, and language preferences.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3 animate-rise" style={{ animationDelay: '180ms' }}>
                  <Link
                    href="/get-started"
                    className="group/cta inline-flex h-12 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[15px] font-medium text-primary-foreground transition-all hover:translate-y-[-1px] hover:bg-[var(--forest-deep)] hover:shadow-[0_12px_28px_-8px_rgba(15,77,52,0.5)]"
                  >
                    Find a caregiver
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
                  </Link>
                  <Link
                    href="#how"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5 text-[15px] font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-muted"
                  >
                    How it works
                  </Link>
                </div>
              </div>

              {/* Stats card on the side */}
              <div className="col-span-12 lg:col-span-5 lg:pl-8 animate-rise" style={{ animationDelay: '240ms' }}>
                <div className="rounded-[20px] border border-border bg-card shadow-[0_8px_30px_-12px_rgba(15,20,16,0.1)] overflow-hidden">
                  <div className="px-6 py-4 border-b border-border/60 bg-[var(--cream-deep)]/40">
                    <div className="text-[13px] font-medium text-muted-foreground">Our community</div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-border">
                    <div className="px-4 py-6 text-center">
                      <div className="text-[28px] font-semibold tabular-nums tracking-tight">{formatNum(stats.caregivers)}</div>
                      <div className="mt-1 text-[12px] text-muted-foreground">Caregivers</div>
                    </div>
                    <div className="px-4 py-6 text-center">
                      <div className="text-[28px] font-semibold tabular-nums tracking-tight">{formatNum(stats.families)}</div>
                      <div className="mt-1 text-[12px] text-muted-foreground">Families</div>
                    </div>
                    <div className="px-4 py-6 text-center">
                      <div className="text-[28px] font-semibold tabular-nums tracking-tight">{formatNum(stats.shifts)}</div>
                      <div className="mt-1 text-[12px] text-muted-foreground">Shifts</div>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-card border-t border-border/60">
                    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      Background-checked &amp; verified
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILLARS — clean three-up */}
        <section id="values" className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <div className="max-w-2xl">
              <span className="eyebrow">Why Elderdoc</span>
              <h2 className="mt-3 text-[32px] sm:text-[38px] md:text-[44px] font-semibold tracking-[-0.025em] leading-[1.1]">
                Care that respects everyone involved.
              </h2>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
              {PILLARS.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-[16px] border border-border bg-background p-6 md:p-7 transition-all hover:border-foreground/15 hover:shadow-[0_8px_24px_-12px_rgba(15,20,16,0.08)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--forest-soft)]">
                    <Icon className="h-5 w-5 text-[var(--forest-deep)]" />
                  </div>
                  <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.01em]">{title}</h3>
                  <p className="mt-2 text-[14.5px] leading-[1.55] text-foreground/70">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <div className="max-w-2xl mb-12">
              <span className="eyebrow">How it works</span>
              <h2 className="mt-3 text-[32px] sm:text-[38px] md:text-[44px] font-semibold tracking-[-0.025em] leading-[1.1]">
                Four simple steps. Most families finish in twelve minutes.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
              {STEPS.map((step) => (
                <div key={step.n} className="flex gap-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--forest-soft)] text-[var(--forest-deep)] text-[16px] font-semibold tabular-nums">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{step.t}</h3>
                    <p className="mt-1.5 text-[14.5px] leading-[1.55] text-foreground/70">{step.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <div className="rounded-[24px] bg-foreground text-background overflow-hidden relative">
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute right-[-10%] top-[-30%] h-[400px] w-[400px] rounded-full bg-primary/40 blur-3xl" />
              </div>
              <div className="relative px-8 md:px-12 py-12 md:py-16 grid grid-cols-12 gap-x-8 gap-y-8 items-end">
                <div className="col-span-12 md:col-span-8">
                  <h2 className="text-[32px] sm:text-[44px] md:text-[52px] font-semibold tracking-[-0.025em] leading-[1.05]">
                    Ready to find the right caregiver?
                  </h2>
                  <p className="mt-4 text-[16px] md:text-[17px] leading-[1.55] text-background/75 max-w-md">
                    Free to browse. No fee until you choose. Most matches happen within a day.
                  </p>
                </div>
                <div className="col-span-12 md:col-span-4 md:text-right">
                  <Link
                    href="/get-started"
                    className="group/cta inline-flex h-13 h-12 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[15px] font-medium text-primary-foreground transition-all hover:translate-y-[-1px] hover:bg-[var(--forest-deep)] hover:shadow-[0_14px_32px_-10px_rgba(15,77,52,0.6)]"
                  >
                    Get started
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-4">
                <div className="text-[18px] font-semibold tracking-tight">Elderdoc</div>
                <div className="mt-2 text-[13px] text-muted-foreground">
                  Trusted care for the people you love.
                </div>
              </div>
              <div className="col-span-12 md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-6 text-[14px]">
                <div>
                  <div className="text-[13px] font-medium text-muted-foreground">For families</div>
                  <ul className="mt-3 space-y-2">
                    <li><Link href="/get-started" className="text-foreground/80 hover:text-primary">Get started</Link></li>
                    <li><Link href="/sign-in" className="text-foreground/80 hover:text-primary">Sign in</Link></li>
                  </ul>
                </div>
                <div>
                  <div className="text-[13px] font-medium text-muted-foreground">For caregivers</div>
                  <ul className="mt-3 space-y-2">
                    <li><Link href="/get-started" className="text-foreground/80 hover:text-primary">Apply to join</Link></li>
                  </ul>
                </div>
                <div>
                  <div className="text-[13px] font-medium text-muted-foreground">Learn more</div>
                  <ul className="mt-3 space-y-2">
                    <li><Link href="#values" className="text-foreground/80 hover:text-primary">Why us</Link></li>
                    <li><Link href="#how" className="text-foreground/80 hover:text-primary">How it works</Link></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-10 border-t border-border pt-6 text-[12px] text-muted-foreground">
              © {new Date().getFullYear()} Elderdoc.
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
