import Link from 'next/link'

export default function RoleSelectionPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16">
      {/* Back nav */}
      <div className="absolute left-6 top-6 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </Link>
      </div>

      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-primary">Get Started</p>
          <h1 className="mt-3 text-[36px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground">
            How can we help?
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground">
            Choose your path to get started with ElderDoc.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/get-started/client/step-1"
            className="group flex flex-col gap-4 rounded-[12px] border border-border bg-card p-8 shadow-[var(--shadow-card)] transition-all hover:border-primary/30 hover:shadow-[var(--shadow-hover)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 11a4 4 0 100-8 4 4 0 000 8zM3 17a7 7 0 0114 0" stroke="#1A6B4A" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-foreground">
                Find Trusted Care for Your Loved One
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Browse and connect with verified caregivers matched to your specific needs.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary transition-gap group-hover:gap-2">
              Find a caregiver
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>

          <Link
            href="/sign-in?callbackUrl=%2Fget-started%2Fcaregiver%2Fstep-1"
            className="group flex flex-col gap-4 rounded-[12px] border border-border bg-card p-8 shadow-[var(--shadow-card)] transition-all hover:border-primary/30 hover:shadow-[var(--shadow-hover)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 2a3 3 0 100 6 3 3 0 000-6zM4 16c0-3.314 2.686-6 6-6s6 2.686 6 6M7 9l-3 3m9-3l3 3" stroke="#1A6B4A" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-foreground">
                Offer Your Caregiving Services
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Join our network of trusted caregivers and connect with families who need you.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary transition-gap group-hover:gap-2">
              Become a caregiver
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
