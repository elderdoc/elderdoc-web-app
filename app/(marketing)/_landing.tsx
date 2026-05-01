import Link from 'next/link'

const PILLARS = [
  {
    index: '01',
    title: 'Verified, every one.',
    body: 'Every caregiver is background-checked, credentialed, and personally vetted before joining. No exceptions, no shortcuts.',
  },
  {
    index: '02',
    title: 'Considered matching.',
    body: 'We weigh care type, schedule, location, language, and personality — surfacing your three best options, not three hundred.',
  },
  {
    index: '03',
    title: 'Care, accounted for.',
    body: 'Transparent escrow, weekly billing, and a 7-day dispute window. The work is sacred. So is the trust.',
  },
]

const STEPS = [
  { n: '01', t: 'Tell us about your loved one.', d: 'Name, conditions, mobility, language preference, the kind of mornings they like. We keep it private. Always.' },
  { n: '02', t: 'Describe the care you need.', d: 'Hourly or live-in, weekday mornings or weekend overnights, a budget that respects everyone. We meet you where you are.' },
  { n: '03', t: 'Review your top five matches.', d: 'Curated, ranked, and explained. Read why each one fits. Talk to them. No fee until you choose.' },
  { n: '04', t: 'Begin care, with confidence.', d: 'Weekly billing on a saved card. Funds held in escrow until the work is done. A 7-day window for any disputes.' },
]

interface LandingStats {
  caregivers: number
  families:   number
  shifts:     number
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

export function Landing({ stats }: { stats: LandingStats }) {
  const STATS = [
    { num: formatNum(stats.caregivers), label: 'verified caregivers' },
    { num: formatNum(stats.families),   label: 'families served' },
    { num: formatNum(stats.shifts),     label: 'shifts completed' },
    { num: '7d',                        label: 'dispute window' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-foreground/10 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-6 md:px-10">
          <Link href="/" className="font-display text-[22px] tracking-[-0.045em] leading-none">
            Elderdoc
          </Link>
          <nav className="flex items-center gap-6 text-[13px]">
            <Link href="#values" className="hidden text-foreground/70 hover:text-foreground sm:inline">
              Values
            </Link>
            <Link href="#how" className="hidden text-foreground/70 hover:text-foreground sm:inline">
              The Method
            </Link>
            <Link href="/sign-in" className="text-foreground/80 hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/get-started"
              className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_18px_-6px_rgba(15,20,16,0.3)]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="px-6 md:px-10 pt-14 md:pt-20 lg:pt-24 pb-20">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid grid-cols-12 gap-x-6 gap-y-10 lg:gap-x-10">
              <aside className="col-span-12 md:col-span-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/55">
                  No. 001
                </div>
                <div className="mt-3 h-px w-12 bg-foreground" />
                <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/55 leading-relaxed">
                  A marketplace<br />for elder care
                </div>
              </aside>

              <div className="col-span-12 md:col-span-10">
                <p className="ed-eyebrow animate-ed-rise" style={{ animationDelay: '40ms' }}>
                  Care, considered.
                </p>
                <h1
                  className="ed-display mt-5 text-[40px] sm:text-[56px] md:text-[68px] lg:text-[84px] animate-ed-stagger leading-[0.98]"
                  style={{ animationDelay: '80ms' }}
                >
                  The right{' '}
                  <span className="italic font-light text-[var(--forest-deep)]">caregiver</span>
                  ,{' '}
                  for the people<br className="hidden md:block" />
                  {' '}who{' '}
                  <span className="relative inline-block">
                    <span className="italic font-light">raised you</span>
                    <span aria-hidden="true" className="absolute left-0 right-0 bottom-[0.05em] h-[3px] bg-[var(--terracotta)]/75" />
                  </span>
                  .
                </h1>
              </div>
            </div>

            <div className="mt-12 md:mt-16 grid grid-cols-12 gap-x-6 gap-y-10 lg:gap-x-10">
              <div className="col-span-12 md:col-start-3 md:col-span-6">
                <p className="text-[16px] md:text-[17px] leading-[1.6] text-foreground/80 animate-ed-rise" style={{ animationDelay: '180ms' }}>
                  Elderdoc connects families with verified, compassionate caregivers
                  — matched not by algorithm alone, but by care type, schedule,
                  language, and the small things that make a difference.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 animate-ed-rise" style={{ animationDelay: '260ms' }}>
                  <Link
                    href="/get-started"
                    className="group/cta inline-flex h-12 items-center gap-2.5 rounded-full bg-primary pl-6 pr-3 text-[14px] font-medium text-primary-foreground transition-all hover:translate-y-[-1px] hover:shadow-[0_14px_28px_-10px_rgba(14,77,52,0.5)]"
                  >
                    Get started
                    <span className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform group-hover/cta:translate-x-1">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </Link>
                  <Link href="#how" className="ed-link text-[14px]">
                    Read the method →
                  </Link>
                </div>
              </div>

              <div className="col-span-12 md:col-span-4 lg:col-start-9 animate-ed-rise" style={{ animationDelay: '340ms' }}>
                <div className="border-t border-foreground pt-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/60">
                    A note from the editors
                  </div>
                  <blockquote className="mt-3 font-display text-[17px] leading-[1.4] tracking-[-0.015em] text-foreground/90">
                    &ldquo;The opposite of a marketplace is a registry. We chose
                    neither — and built something more careful instead.&rdquo;
                  </blockquote>
                  <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                    — The Elderdoc team
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <section className="border-y border-foreground bg-foreground text-background overflow-hidden">
          <div className="flex animate-[ed-marquee_45s_linear_infinite] py-4 whitespace-nowrap">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex shrink-0 items-center gap-12 px-6 font-display text-[24px] md:text-[28px] tracking-[-0.02em]">
                <span>Verified caregivers</span>
                <span className="text-background/40">◆</span>
                <span className="italic font-light">Considered matching</span>
                <span className="text-background/40">◆</span>
                <span>Transparent billing</span>
                <span className="text-background/40">◆</span>
                <span className="italic font-light">7-day dispute window</span>
                <span className="text-background/40">◆</span>
                <span>Real families, real care</span>
                <span className="text-background/40">◆</span>
              </div>
            ))}
          </div>
        </section>

        {/* STATS — real DB numbers */}
        <section className="px-6 md:px-10 py-16 md:py-20">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="border-t border-foreground pt-4">
                  <div className="ed-figure text-[36px] sm:text-[48px] md:text-[56px] leading-[1] tracking-[-0.04em]">
                    {s.num}
                  </div>
                  <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/65">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PILLARS */}
        <section id="values" className="border-t border-border bg-[var(--cream-deep)]/50">
          <div className="mx-auto max-w-[1240px] px-6 md:px-10 py-16 md:py-20 lg:py-28">
            <div className="grid grid-cols-12 gap-x-6 gap-y-10 lg:gap-x-10">
              <div className="col-span-12 lg:col-span-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/55">
                  Our values
                </div>
                <div className="mt-3 h-px w-12 bg-foreground" />
                <h2 className="ed-display mt-6 text-[36px] md:text-[44px] lg:text-[52px] leading-[1] tracking-[-0.035em]">
                  Three things we won&apos;t compromise.
                </h2>
              </div>

              <div className="col-span-12 lg:col-start-6 lg:col-span-7">
                <ol className="grid gap-px bg-border md:grid-cols-3">
                  {PILLARS.map((p) => (
                    <li key={p.index} className="bg-background p-6 transition-colors hover:bg-card">
                      <div className="flex items-baseline gap-3">
                        <span className="font-display text-[40px] leading-none tracking-[-0.04em] text-[var(--forest-deep)]">
                          {p.index}
                        </span>
                        <span className="h-px flex-1 bg-foreground/15"></span>
                      </div>
                      <h3 className="mt-5 font-display text-[20px] leading-[1.15] tracking-[-0.02em]">
                        {p.title}
                      </h3>
                      <p className="mt-3 text-[13.5px] leading-[1.6] text-foreground/75">
                        {p.body}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* THE METHOD */}
        <section id="how" className="border-t border-border">
          <div className="mx-auto max-w-[1240px] px-6 md:px-10 py-16 md:py-20 lg:py-28">
            <div className="grid grid-cols-12 gap-x-6 gap-y-12 lg:gap-x-10">
              <div className="col-span-12 lg:col-span-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/55">
                  The method
                </div>
                <div className="mt-3 h-px w-12 bg-foreground" />
                <h2 className="ed-display mt-6 text-[36px] md:text-[44px] lg:text-[56px] leading-[1] tracking-[-0.035em]">
                  Unhurried, by{' '}
                  <span className="italic font-light">design</span>.
                </h2>
                <p className="mt-6 max-w-md text-[15px] leading-[1.6] text-foreground/75">
                  Care isn&apos;t a category. We move through it slowly — gathering what matters,
                  then matching with intent. Most families finish in under twelve minutes.
                </p>
              </div>

              <div className="col-span-12 lg:col-start-6 lg:col-span-7">
                <ol>
                  {STEPS.map((step, i, arr) => (
                    <li key={step.n} className={`flex gap-6 py-6 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] pt-1.5 text-foreground/55 w-8 shrink-0">
                        {step.n}
                      </div>
                      <div>
                        <h3 className="font-display text-[22px] md:text-[24px] leading-[1.15] tracking-[-0.025em]">
                          {step.t}
                        </h3>
                        <p className="mt-2 text-[14px] leading-[1.6] text-foreground/75">
                          {step.d}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Block */}
        <section className="border-t border-foreground bg-foreground text-background">
          <div className="mx-auto max-w-[1240px] px-6 md:px-10 py-16 md:py-20">
            <div className="grid grid-cols-12 items-end gap-x-6 gap-y-8 lg:gap-x-10">
              <div className="col-span-12 lg:col-span-8">
                <h2 className="ed-display text-[40px] sm:text-[56px] md:text-[72px] lg:text-[88px] leading-[0.98] tracking-[-0.04em] text-background">
                  Begin where{' '}
                  <span className="italic font-light text-[var(--terracotta)]">care</span>{' '}
                  begins.
                </h2>
              </div>
              <div className="col-span-12 lg:col-span-4 lg:text-right">
                <Link
                  href="/get-started"
                  className="group/cta inline-flex h-14 items-center gap-3 rounded-full bg-background pl-7 pr-3 text-[15px] font-medium text-foreground transition-all hover:translate-y-[-2px] hover:shadow-[0_18px_36px_-12px_rgba(0,0,0,0.5)]"
                >
                  Find a caregiver
                  <span className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform group-hover/cta:translate-x-1">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border">
          <div className="mx-auto max-w-[1240px] px-6 md:px-10 py-10">
            <div className="grid grid-cols-12 gap-x-6 gap-y-6 lg:gap-x-10">
              <div className="col-span-12 md:col-span-4">
                <div className="font-display text-[20px] tracking-[-0.03em]">Elderdoc</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Care, considered.
                </div>
              </div>
              <div className="col-span-12 md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-6 text-[13px]">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">For families</div>
                  <ul className="mt-3 space-y-1.5">
                    <li><Link href="/get-started" className="hover:underline">Get started</Link></li>
                    <li><Link href="/sign-in" className="hover:underline">Sign in</Link></li>
                  </ul>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">For caregivers</div>
                  <ul className="mt-3 space-y-1.5">
                    <li><Link href="/get-started" className="hover:underline">Apply to join</Link></li>
                  </ul>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Notes</div>
                  <ul className="mt-3 space-y-1.5">
                    <li><Link href="#values" className="hover:underline">Values</Link></li>
                    <li><Link href="#how" className="hover:underline">The method</Link></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-10 border-t border-border pt-6 text-[12px] text-muted-foreground">
              © {new Date().getFullYear()} Elderdoc. Care, considered.
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
