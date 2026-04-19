'use client'

import Link from 'next/link'
import { StepProgress } from '@/components/step-progress'

const CLIENT_STEPS_4 = [
  { label: 'Who needs care' },
  { label: 'Type of care' },
  { label: 'Location' },
  { label: 'Preview' },
]

const CLIENT_STEPS_5 = [
  { label: 'Who needs care' },
  { label: 'Type of care' },
  { label: 'Location' },
  { label: 'Preview' },
  { label: 'Post Request' },
]

interface StepShellProps {
  currentStep: number
  totalSteps?: 4 | 5
  title: string
  subtitle?: string
  children: React.ReactNode
  backHref: string
}

export function StepShell({ currentStep, totalSteps = 4, title, subtitle, children, backHref }: StepShellProps) {
  const CLIENT_STEPS = totalSteps === 5 ? CLIENT_STEPS_5 : CLIENT_STEPS_4
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>
          <span className="text-sm font-semibold tracking-tight text-foreground">ElderDoc</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="mb-10 flex justify-center">
          <StepProgress steps={CLIENT_STEPS} currentStep={currentStep} />
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {children}
      </main>
    </div>
  )
}
