import Link from 'next/link'

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[920px] items-center justify-between px-6">
          <Link
            href="/"
            className="group/back inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="transition-transform group-hover/back:-translate-x-0.5">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>
          <Link href="/" className="font-display text-[18px] tracking-[-0.04em] leading-none">
            Elderdoc
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[920px] px-6 py-14 md:py-20">
        <div className="max-w-2xl">
          <p className="ed-eyebrow">Welcome</p>
          <h1 className="ed-display mt-3 text-[40px] sm:text-[52px] md:text-[64px] leading-[1.02] tracking-[-0.04em]">
            How can we{' '}
            <span className="italic font-light text-[var(--forest-deep)]">help</span>?
          </h1>
          <p className="mt-5 text-[16px] leading-[1.6] text-foreground/70">
            Two paths through Elderdoc — one for families seeking care, one for caregivers offering it.
            Pick the one that brought you here.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-px bg-border md:grid-cols-2">
          <Link
            href="/get-started/client/step-1"
            className="group/path relative flex flex-col bg-background p-8 md:p-10 transition-all hover:bg-card"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-[44px] leading-none tracking-[-0.04em] text-[var(--forest-deep)]">01</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">For families</span>
            </div>
            <div className="mt-8 h-px w-full bg-border" />
            <h2 className="mt-6 font-display text-[26px] md:text-[30px] leading-[1.1] tracking-[-0.025em]">
              Find trusted care for your loved one.
            </h2>
            <p className="mt-3 text-[14px] leading-[1.6] text-foreground/70">
              Browse and connect with verified caregivers, matched to your specific needs.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground transition-all group-hover/path:gap-3">
              Find a caregiver
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>

          <Link
            href="/sign-in?tab=register&role=caregiver&callbackUrl=%2Fget-started%2Fcaregiver%2Fstep-1"
            className="group/path relative flex flex-col bg-background p-8 md:p-10 transition-all hover:bg-card"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-[44px] leading-none tracking-[-0.04em] text-[var(--forest-deep)]">02</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">For caregivers</span>
            </div>
            <div className="mt-8 h-px w-full bg-border" />
            <h2 className="mt-6 font-display text-[26px] md:text-[30px] leading-[1.1] tracking-[-0.025em]">
              Offer your caregiving services.
            </h2>
            <p className="mt-3 text-[14px] leading-[1.6] text-foreground/70">
              Join our network of trusted caregivers and connect with families who need you.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground transition-all group-hover/path:gap-3">
              Become a caregiver
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>
        </div>
      </main>
    </div>
  )
}
