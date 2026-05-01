'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Soft mesh bg */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-[-15%] top-[-30%] h-[500px] w-[500px] rounded-full bg-[var(--forest-soft)] blur-[120px] opacity-50" />
        <div className="absolute left-[-15%] bottom-[-30%] h-[400px] w-[400px] rounded-full bg-[var(--cream-deep)] blur-[120px] opacity-70" />
      </div>

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link
            href={backHref}
            className="group/back inline-flex items-center gap-1.5 text-[14px] text-foreground/70 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover/back:-translate-x-0.5" />
            Back
          </Link>
          <Link href="/" className="text-[18px] font-semibold tracking-tight text-foreground">
            Elderdoc
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10 md:py-14">
        <div className="mb-12 flex justify-center">
          <StepProgress steps={CAREGIVER_STEPS} currentStep={currentStep} />
        </div>

        <div className="mb-10 text-center max-w-xl mx-auto animate-rise">
          <h1 className="text-[28px] sm:text-[36px] md:text-[44px] font-semibold tracking-[-0.025em] leading-[1.1] text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-[15px] md:text-[16px] leading-[1.55] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </main>
    </div>
  )
}
