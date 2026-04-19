import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="fixed top-0 z-10 w-full border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-tight text-foreground">ElderDoc</span>
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-28 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-primary">
            ElderDoc
          </p>
          <h1 className="mt-4 text-[52px] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[64px]">
            Care for your loved ones.{' '}
            <span className="text-primary">Intelligently matched.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Find verified, compassionate caregivers for elderly care —
            matched to your exact needs in minutes.
          </p>
          <div className="mt-8">
            <Link
              href="/get-started"
              className="inline-flex items-center gap-2 rounded-[8px] bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get Started
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </main>

      {/* Trust pillars */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
            {[
              {
                title: 'Verified Caregivers',
                body: 'Every caregiver is background-checked and credentialed before joining the platform.',
              },
              {
                title: 'Intelligently Matched',
                body: 'We score compatibility across care type, availability, location, and preferences to surface your best options.',
              },
              {
                title: 'Real Families, Real Care',
                body: 'Thousands of families trust ElderDoc to find the right caregiver for their loved ones.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="bg-background px-8 py-10">
                <div className="mb-3 h-1.5 w-8 rounded-full bg-primary" />
                <h3 className="text-[15px] font-medium text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <div className="mx-auto max-w-6xl text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ElderDoc. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
