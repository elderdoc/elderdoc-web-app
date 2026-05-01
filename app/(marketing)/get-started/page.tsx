import Link from 'next/link'
import { ArrowLeft, ArrowRight, Heart, Briefcase, Star, Shield } from 'lucide-react'

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Soft mesh gradient bg */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full bg-[var(--forest-soft)] blur-[120px] opacity-60" />
        <div className="absolute left-[-15%] bottom-[-30%] h-[500px] w-[500px] rounded-full bg-[var(--cream-deep)] blur-[120px] opacity-70" />
      </div>

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="group/back inline-flex items-center gap-1.5 text-[14px] text-foreground/70 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover/back:-translate-x-0.5" />
            Back
          </Link>
          <Link href="/" className="text-[18px] font-semibold tracking-tight">
            Elderdoc
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-12 md:py-20">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto animate-rise">
          <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1.5 text-[13px] font-medium shadow-[0_2px_8px_-4px_rgba(15,20,16,0.08)]">
            <Heart className="h-3.5 w-3.5 text-primary" />
            Welcome to Elderdoc
          </div>
          <h1 className="mt-6 text-[40px] sm:text-[52px] md:text-[60px] font-semibold tracking-[-0.03em] leading-[1.05]">
            How can we{' '}
            <span className="font-serif italic font-normal text-primary">help</span>?
          </h1>
          <p className="mt-5 text-[16px] md:text-[17px] leading-[1.6] text-foreground/70">
            Two paths through Elderdoc — one for families seeking care,
            one for caregivers offering it. Pick the one that brought you here.
          </p>
        </div>

        {/* Role cards with photos */}
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link
            href="/get-started/client/step-1"
            className="group/path relative flex flex-col rounded-[24px] border border-border bg-card overflow-hidden transition-all hover:border-foreground/15 hover:shadow-[0_16px_40px_-12px_rgba(15,20,16,0.18)] hover:-translate-y-1 animate-rise"
            style={{ animationDelay: '80ms' }}
          >
            {/* Photo */}
            <div className="aspect-[4/3] overflow-hidden bg-[var(--cream-deep)]">
              <img
                src="https://images.unsplash.com/photo-1581579186913-45ac3e6efe93?auto=format&fit=crop&w=800&q=80"
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 group-hover/path:scale-105"
              />
            </div>

            <div className="p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--forest-soft)]">
                  <Heart className="h-5 w-5 text-[var(--forest-deep)]" />
                </div>
                <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  4.9 from families
                </span>
              </div>
              <h2 className="mt-5 text-[22px] sm:text-[24px] font-semibold tracking-[-0.015em] leading-tight">
                I&apos;m looking for <span className="font-serif italic font-normal text-primary">care</span>
              </h2>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-foreground/70">
                Find a verified caregiver for your loved one. Most families finish in 12 minutes.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-primary">
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover/path:translate-x-0.5" />
              </span>
            </div>
          </Link>

          <Link
            href="/sign-in?tab=register&role=caregiver&callbackUrl=%2Fget-started%2Fcaregiver%2Fstep-1"
            className="group/path relative flex flex-col rounded-[24px] border border-border bg-card overflow-hidden transition-all hover:border-foreground/15 hover:shadow-[0_16px_40px_-12px_rgba(15,20,16,0.18)] hover:-translate-y-1 animate-rise"
            style={{ animationDelay: '160ms' }}
          >
            <div className="aspect-[4/3] overflow-hidden bg-[var(--cream-deep)]">
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80"
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 group-hover/path:scale-105"
              />
            </div>

            <div className="p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--forest-soft)]">
                  <Briefcase className="h-5 w-5 text-[var(--forest-deep)]" />
                </div>
                <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Shield className="h-3 w-3 text-primary" />
                  Verified network
                </span>
              </div>
              <h2 className="mt-5 text-[22px] sm:text-[24px] font-semibold tracking-[-0.015em] leading-tight">
                I&apos;m a <span className="font-serif italic font-normal text-primary">caregiver</span>
              </h2>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-foreground/70">
                Join our network. Connect with families who need your care and expertise.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-primary">
                Apply to join
                <ArrowRight className="h-4 w-4 transition-transform group-hover/path:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </div>

        <p className="mt-10 text-center text-[14px] text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary font-medium hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  )
}
