import Link from 'next/link'
import { ArrowLeft, ArrowRight, Heart, Briefcase } from 'lucide-react'

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
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

      <main className="mx-auto w-full max-w-3xl px-6 py-12 md:py-20">
        <div className="text-center max-w-xl mx-auto animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--forest-soft)] px-3 py-1.5 text-[13px] font-medium text-[var(--forest-deep)]">
            <Heart className="h-3.5 w-3.5" />
            Welcome
          </span>
          <h1 className="mt-5 text-[34px] sm:text-[42px] md:text-[48px] font-semibold tracking-[-0.025em] leading-[1.1]">
            How can we help?
          </h1>
          <p className="mt-4 text-[16px] leading-[1.6] text-muted-foreground">
            Choose the path that brought you here. You can always change later.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/get-started/client/step-1"
            className="group/path relative flex flex-col rounded-[18px] border-2 border-border bg-card p-7 transition-all hover:border-primary/40 hover:bg-[var(--forest-soft)]/40 hover:shadow-[0_8px_24px_-12px_rgba(15,77,52,0.18)]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--forest-soft)]">
              <Heart className="h-6 w-6 text-[var(--forest-deep)]" />
            </div>
            <h2 className="mt-6 text-[22px] font-semibold tracking-[-0.015em] leading-tight">
              I&apos;m looking for care
            </h2>
            <p className="mt-2 text-[14.5px] leading-[1.55] text-foreground/70">
              Find a verified caregiver for your loved one. Matched to your needs in minutes.
            </p>
            <span className="mt-7 inline-flex items-center gap-2 text-[14px] font-medium text-primary">
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover/path:translate-x-0.5" />
            </span>
          </Link>

          <Link
            href="/sign-in?tab=register&role=caregiver&callbackUrl=%2Fget-started%2Fcaregiver%2Fstep-1"
            className="group/path relative flex flex-col rounded-[18px] border-2 border-border bg-card p-7 transition-all hover:border-primary/40 hover:bg-[var(--forest-soft)]/40 hover:shadow-[0_8px_24px_-12px_rgba(15,77,52,0.18)]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--forest-soft)]">
              <Briefcase className="h-6 w-6 text-[var(--forest-deep)]" />
            </div>
            <h2 className="mt-6 text-[22px] font-semibold tracking-[-0.015em] leading-tight">
              I&apos;m a caregiver
            </h2>
            <p className="mt-2 text-[14.5px] leading-[1.55] text-foreground/70">
              Join our network. Connect with families who need your care and expertise.
            </p>
            <span className="mt-7 inline-flex items-center gap-2 text-[14px] font-medium text-primary">
              Apply to join
              <ArrowRight className="h-4 w-4 transition-transform group-hover/path:translate-x-0.5" />
            </span>
          </Link>
        </div>

        <p className="mt-12 text-center text-[14px] text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary font-medium hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  )
}
