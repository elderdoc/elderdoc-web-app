import Link from 'next/link'
import { Shield, Heart, CheckCircle2, ArrowRight, Star, Quote, Clock, MapPin, Lock, Award, MessageCircle } from 'lucide-react'

const PILLARS = [
  {
    icon: Shield,
    title: 'Verified caregivers',
    body: 'Every caregiver is background-checked, credentialed, and personally vetted before joining our network.',
  },
  {
    icon: Heart,
    title: 'Matched to your needs',
    body: 'We weigh care type, schedule, location, language, and personality — surfacing your top five matches.',
  },
  {
    icon: Lock,
    title: 'Care, accounted for',
    body: 'Transparent escrow billing, weekly invoicing, and a 7-day dispute window. Built to protect your trust.',
  },
]

const STEPS = [
  { n: 1, t: 'Choose care type',         d: 'Personal care, companionship, memory care, and more. Select everything that applies.', img: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=600&q=70' },
  { n: 2, t: 'Add your recipient',        d: 'Tell us who is receiving care — their conditions, mobility, and daily routine.', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=70' },
  { n: 3, t: 'Set the location',          d: 'Enter where care will happen — home, assisted living, or anywhere in between.', img: 'https://images.unsplash.com/photo-1581579186913-45ac3e6efe93?auto=format&fit=crop&w=600&q=70' },
  { n: 4, t: 'Build the schedule',        d: 'Pick frequency, days, and shift times. One-time visits or ongoing care — we handle both.', img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=70' },
  { n: 5, t: 'Share care details',        d: 'Supplies needed, health status, and safety measures so caregivers arrive prepared.', img: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=600&q=70' },
  { n: 6, t: 'Set preferences & budget',  d: 'Caregiver gender, transportation, languages, and your hourly or daily rate.', img: 'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?auto=format&fit=crop&w=600&q=70' },
  { n: 7, t: 'Write a care plan',         d: 'Optional shift-by-shift instructions so your caregiver knows exactly what to do.', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=70' },
  { n: 8, t: 'Review & go live',          d: 'Preview your listing, generate an AI description, and submit for matching.', img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=70' },
]

const TRUST = [
  { icon: Shield, label: 'Background-checked' },
  { icon: Award,  label: 'Credentialed' },
  { icon: Lock,   label: 'Escrow protected' },
  { icon: Heart,  label: 'Compassion-first' },
]

const TESTIMONIALS = [
  {
    quote: 'After three weeks of dead ends, Elderdoc matched mom with Margaret in two days. We finally exhaled.',
    name: 'Sarah K.',
    role: 'Daughter, Boston',
    img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  },
  {
    quote: 'The matching actually thinks about language, schedule, and personality. Not just the cheapest option.',
    name: 'David M.',
    role: 'Son, Chicago',
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  },
  {
    quote: 'Weekly billing, transparent fees, and the dispute window means I can sleep at night.',
    name: 'Patricia L.',
    role: 'Daughter, Atlanta',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
  },
]

const FAQ = [
  { q: 'How does Elderdoc verify caregivers?',
    a: 'Every caregiver completes a background check, identity verification, and credential review. We also conduct a personal vetting interview before they join.' },
  { q: 'How much does it cost?',
    a: 'Browsing is free. You only pay the caregiver\'s hourly rate plus an 11% platform fee (8% convenience + 3% trust & support). All billing is transparent and weekly.' },
  { q: 'What if something goes wrong?',
    a: 'You have a 7-day window to dispute any shift. Funds are held in escrow and released to caregivers only after the dispute window closes. We resolve disputes within 24 hours.' },
  { q: 'How fast can I find a caregiver?',
    a: 'Most families review their top 5 matches within 24 hours and begin care within 2–3 days. Same-day care is sometimes available depending on your area.' },
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
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[20px] font-semibold tracking-[-0.01em]">Elderdoc</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-[14px]">
            <Link href="#how" className="hidden text-foreground/70 hover:text-foreground sm:inline-block px-3 py-2 rounded-full hover:bg-muted">
              How it works
            </Link>
            <Link href="#values" className="hidden text-foreground/70 hover:text-foreground sm:inline-block px-3 py-2 rounded-full hover:bg-muted">
              Why us
            </Link>
            <Link href="#stories" className="hidden text-foreground/70 hover:text-foreground md:inline-block px-3 py-2 rounded-full hover:bg-muted">
              Stories
            </Link>
            <Link href="/sign-in" className="text-foreground hover:text-primary px-3 py-2">
              Sign in
            </Link>
            <Link
              href="/get-started"
              className="ml-1 inline-flex h-10 items-center rounded-full bg-foreground px-5 text-[13.5px] font-medium text-background transition-all hover:bg-foreground/90 hover:shadow-[0_8px_18px_-6px_rgba(15,20,16,0.3)]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO — image right, content left */}
        <section className="relative">
          {/* soft gradient mesh background */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute right-[-15%] top-[-30%] h-[700px] w-[700px] rounded-full bg-[var(--forest-soft)] blur-[120px] opacity-60" />
            <div className="absolute left-[-20%] top-[40%] h-[500px] w-[500px] rounded-full bg-[var(--cream-deep)] blur-[120px] opacity-80" />
          </div>

          <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-12 lg:pt-20 pb-20 lg:pb-28">
            <div className="grid grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* LEFT: Content */}
              <div className="col-span-12 lg:col-span-6 xl:col-span-7">
                {/* Trust pill */}
                <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-2.5 py-1.5 text-[12.5px] font-medium animate-rise shadow-[0_2px_8px_-4px_rgba(15,20,16,0.08)]">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-foreground">Trusted by {formatNum(stats.families)} families</span>
                  <span className="mx-1 h-3 w-px bg-border" />
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-foreground/80">4.9/5</span>
                </div>

                <h1 className="mt-7 text-[44px] sm:text-[56px] md:text-[68px] lg:text-[78px] font-semibold tracking-[-0.035em] leading-[0.98] animate-rise" style={{ animationDelay: '60ms' }}>
                  The right care<br />
                  for the people who{' '}
                  <span className="font-serif italic font-normal text-primary">raised you</span>.
                </h1>

                <p className="mt-7 max-w-xl text-[17px] md:text-[18px] leading-[1.55] text-foreground/75 animate-rise" style={{ animationDelay: '120ms' }}>
                  Elderdoc connects families with verified caregivers — matched to your loved one&apos;s
                  conditions, schedule, language, and the small things that make a difference.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3 animate-rise" style={{ animationDelay: '180ms' }}>
                  <Link
                    href="/get-started"
                    className="group/cta inline-flex h-13 h-12 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[15px] font-medium text-primary-foreground transition-all hover:translate-y-[-1px] hover:bg-[var(--forest-deep)] hover:shadow-[0_14px_32px_-10px_rgba(15,77,52,0.5)]"
                  >
                    Find a caregiver
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
                  </Link>
                  <Link
                    href="#how"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-sm px-5 text-[15px] font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-card"
                  >
                    See how it works
                  </Link>
                </div>

                {/* Trust badges */}
                <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 animate-rise" style={{ animationDelay: '240ms' }}>
                  {TRUST.map(({ icon: Icon, label }) => (
                    <div key={label} className="inline-flex items-center gap-1.5 text-[13px] text-foreground/65">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: Photo + floating cards */}
              <div className="col-span-12 lg:col-span-6 xl:col-span-5 relative animate-rise" style={{ animationDelay: '300ms' }}>
                <div className="relative">
                  {/* Main hero image */}
                  <div className="relative aspect-[4/5] sm:aspect-[5/6] rounded-[28px] overflow-hidden bg-[var(--cream-deep)] shadow-[0_24px_60px_-20px_rgba(15,20,16,0.25)]">
                    <img
                      src="https://images.unsplash.com/photo-1581579186913-45ac3e6efe93?auto=format&fit=crop&w=1000&q=80"
                      alt="Caregiver with elderly woman"
                      className="h-full w-full object-cover"
                    />
                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent" />
                  </div>

                  {/* Floating stat card top-left */}
                  <div className="absolute -top-4 -left-4 sm:-left-8 rounded-[16px] bg-card shadow-[0_12px_32px_-12px_rgba(15,20,16,0.2)] border border-border/60 p-3 pr-5 flex items-center gap-3 max-w-[220px] animate-rise" style={{ animationDelay: '480ms' }}>
                    <div className="flex -space-x-2">
                      {[
                        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=80',
                        'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=80&q=80',
                        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&q=80',
                      ].map((u, i) => (
                        <img key={i} src={u} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-card" />
                      ))}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold leading-tight">{formatNum(stats.caregivers)} verified</div>
                      <div className="text-[11px] text-muted-foreground">caregivers nearby</div>
                    </div>
                  </div>

                  {/* Floating quote card bottom-right */}
                  <div className="absolute -bottom-6 -right-4 sm:-right-8 max-w-[260px] rounded-[16px] bg-card shadow-[0_12px_32px_-12px_rgba(15,20,16,0.2)] border border-border/60 p-4 animate-rise" style={{ animationDelay: '600ms' }}>
                    <div className="flex items-center gap-1 mb-1.5">
                      {[1,2,3,4,5].map((i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-[13px] leading-snug text-foreground">
                      &ldquo;Mom finally has someone she actually <span className="font-medium">trusts</span>.&rdquo;
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80" alt="" className="h-6 w-6 rounded-full object-cover" />
                      <div className="text-[11px] text-muted-foreground">Sarah K., Boston</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 py-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 items-center text-center">
              <div>
                <div className="text-[28px] sm:text-[32px] font-semibold tabular-nums tracking-tight">{formatNum(stats.caregivers)}</div>
                <div className="mt-1 text-[12.5px] text-muted-foreground">Verified caregivers</div>
              </div>
              <div>
                <div className="text-[28px] sm:text-[32px] font-semibold tabular-nums tracking-tight">{formatNum(stats.families)}</div>
                <div className="mt-1 text-[12.5px] text-muted-foreground">Families served</div>
              </div>
              <div>
                <div className="text-[28px] sm:text-[32px] font-semibold tabular-nums tracking-tight">{formatNum(stats.shifts)}</div>
                <div className="mt-1 text-[12.5px] text-muted-foreground">Shifts completed</div>
              </div>
              <div>
                <div className="text-[28px] sm:text-[32px] font-semibold tracking-tight">4.9<span className="text-muted-foreground text-[18px]">/5</span></div>
                <div className="mt-1 text-[12.5px] text-muted-foreground">Average rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* PILLARS */}
        <section id="values" className="relative py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-8 lg:gap-12 mb-12 md:mb-16 items-end">
              <div className="col-span-12 lg:col-span-7">
                <span className="eyebrow">Why Elderdoc</span>
                <h2 className="mt-3 text-[36px] sm:text-[44px] md:text-[52px] font-semibold tracking-[-0.03em] leading-[1.05]">
                  Care that respects{' '}
                  <span className="font-serif italic font-normal text-primary">everyone</span>{' '}
                  involved.
                </h2>
              </div>
              <div className="col-span-12 lg:col-span-5">
                <p className="text-[16px] md:text-[17px] leading-[1.6] text-foreground/70">
                  We&apos;ve thought carefully about every part of the experience — from the verification
                  process to the way we handle disputes — so you can focus on what matters.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PILLARS.map(({ icon: Icon, title, body }, i) => (
                <div
                  key={title}
                  className="group/p relative rounded-[20px] border border-border bg-card p-7 transition-all hover:border-foreground/15 hover:shadow-[0_8px_30px_-12px_rgba(15,20,16,0.12)] hover:-translate-y-1"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--forest-soft)] transition-transform group-hover/p:scale-110">
                    <Icon className="h-5 w-5 text-[var(--forest-deep)]" />
                  </div>
                  <h3 className="mt-6 text-[20px] font-semibold tracking-[-0.015em]">{title}</h3>
                  <p className="mt-2.5 text-[14.5px] leading-[1.6] text-foreground/70">{body}</p>
                  <div className="mt-5 flex items-center gap-1 text-[13px] font-medium text-primary opacity-0 transition-opacity group-hover/p:opacity-100">
                    Learn more <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS — visual steps with images */}
        <section id="how" className="relative py-20 md:py-28 bg-card border-y border-border">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
              <span className="eyebrow">How it works</span>
              <h2 className="mt-3 text-[36px] sm:text-[44px] md:text-[52px] font-semibold tracking-[-0.03em] leading-[1.05]">
                Eight steps. About{' '}
                <span className="font-serif italic font-normal text-primary">fifteen minutes</span>.
              </h2>
              <p className="mt-4 text-[16px] text-muted-foreground">From first request to first shift — here&apos;s exactly how it works.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {STEPS.map((step, i) => (
                <div
                  key={step.n}
                  className="group/step relative animate-rise"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Image */}
                  <div className="aspect-[3/4] rounded-[18px] overflow-hidden bg-[var(--cream-deep)] mb-5 relative">
                    <img
                      src={step.img}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 group-hover/step:scale-105"
                    />
                    <div className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-card text-[14px] font-semibold tabular-nums shadow-[0_2px_8px_-2px_rgba(15,20,16,0.15)]">
                      {step.n}
                    </div>
                  </div>
                  <h3 className="text-[18px] font-semibold tracking-[-0.01em] leading-tight">{step.t}</h3>
                  <p className="mt-1.5 text-[14px] leading-[1.55] text-foreground/65">{step.d}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 text-center">
              <Link
                href="/get-started"
                className="group/cta inline-flex h-12 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[15px] font-medium text-primary-foreground transition-all hover:translate-y-[-1px] hover:bg-[var(--forest-deep)] hover:shadow-[0_12px_28px_-8px_rgba(15,77,52,0.5)]"
              >
                Start your match
                <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="stories" className="relative py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-8 lg:gap-12 mb-12 md:mb-16">
              <div className="col-span-12 lg:col-span-5">
                <span className="eyebrow">Real families</span>
                <h2 className="mt-3 text-[36px] sm:text-[44px] md:text-[52px] font-semibold tracking-[-0.03em] leading-[1.05]">
                  Stories from people who&apos;ve been{' '}
                  <span className="font-serif italic font-normal text-primary">where you are</span>.
                </h2>
              </div>
              <div className="col-span-12 lg:col-span-7 flex items-end">
                <p className="text-[16px] md:text-[17px] leading-[1.6] text-foreground/70 max-w-xl">
                  We talk to every family after their first month. The honest feedback shapes
                  how we match, how we vet, and how we handle the hard moments.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={t.name}
                  className="relative rounded-[20px] border border-border bg-card p-7 transition-all hover:border-foreground/15 hover:shadow-[0_8px_30px_-12px_rgba(15,20,16,0.1)]"
                >
                  <Quote className="h-7 w-7 text-primary/30" />
                  <p className="mt-4 text-[15.5px] leading-[1.55] text-foreground/85">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <img src={t.img} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-card shadow-sm" />
                    <div>
                      <div className="text-[14px] font-semibold">{t.name}</div>
                      <div className="text-[12.5px] text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MEET A CAREGIVER — featured spotlight */}
        <section className="relative py-20 md:py-28 bg-foreground text-background overflow-hidden">
          <div className="absolute inset-0 -z-0 opacity-40 pointer-events-none">
            <div className="absolute right-[-10%] top-[-30%] h-[600px] w-[600px] rounded-full bg-primary/40 blur-[100px]" />
          </div>
          <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="col-span-12 lg:col-span-6">
                <div className="aspect-[4/5] rounded-[24px] overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1000&q=80"
                    alt="Caregiver portrait"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div className="col-span-12 lg:col-span-6">
                <span className="text-[12.5px] font-medium text-primary uppercase tracking-wide">Meet a caregiver</span>
                <h2 className="mt-4 text-[36px] sm:text-[44px] md:text-[56px] font-semibold tracking-[-0.03em] leading-[1.05]">
                  &ldquo;I treat every client like my own{' '}
                  <span className="font-serif italic font-normal text-primary">grandmother</span>.&rdquo;
                </h2>
                <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
                  <div>
                    <div className="text-[24px] font-semibold tabular-nums">12</div>
                    <div className="text-[12px] text-background/60 mt-0.5">Years caring</div>
                  </div>
                  <div>
                    <div className="text-[24px] font-semibold tabular-nums">238</div>
                    <div className="text-[12px] text-background/60 mt-0.5">Shifts completed</div>
                  </div>
                  <div>
                    <div className="text-[24px] font-semibold tabular-nums">4.98</div>
                    <div className="text-[12px] text-background/60 mt-0.5">Avg rating</div>
                  </div>
                </div>
                <p className="mt-8 text-[16px] leading-[1.6] text-background/80 max-w-md">
                  Margaret has been on Elderdoc for 18 months. She speaks three languages and
                  specializes in dementia care.
                </p>
                <Link
                  href="/get-started"
                  className="group/cta mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-background pl-6 pr-5 text-[14.5px] font-medium text-foreground transition-all hover:translate-y-[-1px] hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.4)]"
                >
                  Find your match
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-4xl px-6 lg:px-10">
            <div className="text-center mb-12 md:mb-16">
              <span className="eyebrow">Common questions</span>
              <h2 className="mt-3 text-[36px] sm:text-[44px] md:text-[52px] font-semibold tracking-[-0.03em] leading-[1.05]">
                Things people often ask.
              </h2>
            </div>

            <div className="space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group/faq rounded-[16px] border border-border bg-card overflow-hidden transition-colors hover:border-foreground/15 open:border-foreground/15"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-[16px] font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted transition-transform group-open/faq:rotate-45">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-[14.5px] leading-[1.6] text-foreground/70">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>

            <div className="mt-12 rounded-[20px] bg-[var(--forest-soft)] border border-[var(--forest-soft)] p-6 text-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card mb-3">
                <MessageCircle className="h-5 w-5 text-[var(--forest-deep)]" />
              </div>
              <h3 className="text-[18px] font-semibold">Still have questions?</h3>
              <p className="mt-1.5 text-[14px] text-foreground/70">
                Our team is happy to walk you through it.
              </p>
              <Link
                href="/get-started"
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-5 text-[13.5px] font-medium text-background transition-all hover:bg-foreground/90"
              >
                Get started — talk to us
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative pb-20 md:pb-28">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="relative rounded-[28px] overflow-hidden">
              {/* Background image */}
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1600&q=80"
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/85 to-foreground/40" />
              </div>

              <div className="relative px-8 md:px-16 py-16 md:py-24 max-w-2xl">
                <h2 className="text-[36px] sm:text-[48px] md:text-[60px] font-semibold tracking-[-0.03em] leading-[1] text-background">
                  Ready to find the{' '}
                  <span className="font-serif italic font-normal text-[var(--forest-soft)]">right one</span>?
                </h2>
                <p className="mt-5 text-[16px] md:text-[18px] leading-[1.55] text-background/80 max-w-md">
                  Free to browse. No fee until you choose. Most matches happen within 24 hours.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link
                    href="/get-started"
                    className="group/cta inline-flex h-13 h-12 items-center gap-2 rounded-full bg-background pl-6 pr-5 text-[15px] font-medium text-foreground transition-all hover:translate-y-[-1px] hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)]"
                  >
                    Get started
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/sign-in"
                    className="text-[14.5px] font-medium text-background/80 hover:text-background underline-offset-4 hover:underline"
                  >
                    Already have an account?
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 py-12">
            <div className="grid grid-cols-12 gap-6 mb-10">
              <div className="col-span-12 md:col-span-5">
                <div className="text-[20px] font-semibold tracking-tight">Elderdoc</div>
                <p className="mt-2 text-[14px] text-muted-foreground max-w-sm leading-relaxed">
                  Trusted, considered care for the people who raised you.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {TRUST.map(({ icon: Icon, label }) => (
                    <div key={label} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11.5px] text-foreground/70">
                      <Icon className="h-3 w-3 text-primary" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-6 md:col-span-2">
                <div className="text-[13px] font-semibold mb-3">Families</div>
                <ul className="space-y-2 text-[14px]">
                  <li><Link href="/get-started" className="text-foreground/70 hover:text-primary">Get started</Link></li>
                  <li><Link href="/sign-in" className="text-foreground/70 hover:text-primary">Sign in</Link></li>
                  <li><Link href="#values" className="text-foreground/70 hover:text-primary">Why Elderdoc</Link></li>
                </ul>
              </div>
              <div className="col-span-6 md:col-span-2">
                <div className="text-[13px] font-semibold mb-3">Caregivers</div>
                <ul className="space-y-2 text-[14px]">
                  <li><Link href="/get-started" className="text-foreground/70 hover:text-primary">Apply to join</Link></li>
                </ul>
              </div>
              <div className="col-span-12 md:col-span-3">
                <div className="text-[13px] font-semibold mb-3">Stay in touch</div>
                <p className="text-[13px] text-muted-foreground mb-3">
                  Updates from our team — never spam.
                </p>
                <form className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Email"
                    className="flex-1 h-10 rounded-full border border-border bg-background px-4 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                  <button type="submit" className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors">
                    Join
                  </button>
                </form>
              </div>
            </div>
            <div className="border-t border-border pt-6 flex flex-col sm:flex-row gap-3 justify-between text-[12px] text-muted-foreground">
              <div>© {new Date().getFullYear()} Elderdoc. All rights reserved.</div>
              <div className="flex gap-5">
                <Link href="#" className="hover:text-foreground">Privacy</Link>
                <Link href="#" className="hover:text-foreground">Terms</Link>
                <Link href="#" className="hover:text-foreground">Contact</Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
