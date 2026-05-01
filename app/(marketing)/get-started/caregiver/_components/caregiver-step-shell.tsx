'use client'

import Link from 'next/link'
import { StepProgress } from '@/components/step-progress'

const CAREGIVER_STEPS = [
  { label: 'Care types' },
  { label: 'Background' },
  { label: 'Availability' },
  { label: 'Location & rate' },
  { label: 'Profile' },
]

interface CaregiverStepShellProps {
  currentStep: number
  title: string
  subtitle?: string
  children: React.ReactNode
  backHref: string
}

export function CaregiverStepShell({
  currentStep,
  title,
  subtitle,
  children,
  backHref,
}: CaregiverStepShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[920px] items-center justify-between px-6">
          <Link
            href={backHref}
            className="group/back inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="transition-transform group-hover/back:-translate-x-0.5">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </Link>
          <Link href="/" className="font-display text-[18px] tracking-[-0.04em] leading-none">
            Elderdoc
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[920px] px-6 py-10 md:py-14">
        <div className="mb-12">
          <StepProgress steps={CAREGIVER_STEPS} currentStep={currentStep} />
        </div>

        <div className="mb-10 max-w-2xl">
          <p className="ed-eyebrow">Caregiver onboarding</p>
          <h1 className="ed-display mt-3 text-[36px] sm:text-[44px] md:text-[52px] leading-[1.02] tracking-[-0.035em]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 text-[15px] md:text-[16px] leading-[1.6] text-foreground/70">
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </main>
    </div>
  )
}
