'use client'

import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

const STEPS = ['Relationship', 'Basic Info', 'Health & Mobility', 'Notes']

interface Props {
  currentStep: number
  skippedSteps?: number[]
  title: string
  children: React.ReactNode
  onBack: () => void
  onNext?: () => void
  onSave?: () => void
  isSaving?: boolean
  nextDisabled?: boolean
}

export function CareRecipientShell({
  currentStep, skippedSteps = [], title, children, onBack, onNext, onSave, isSaving, nextDisabled,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Step pills */}
      <div className="flex items-center gap-1.5 mb-5">
        {STEPS.map((label, i) => {
          const n = i + 1
          const isActive = n === currentStep
          const isSkipped = skippedSteps.includes(n)
          const isDone = n < currentStep && !isSkipped
          return (
            <div
              key={i}
              className={[
                'flex-1 h-2 rounded-full transition-all',
                isDone ? 'bg-primary' : isActive ? 'bg-primary' : 'bg-muted',
              ].join(' ')}
            />
          )
        })}
      </div>

      <div className="mb-6">
        <p className="text-[12.5px] font-medium text-muted-foreground">
          Step <span className="text-foreground tabular-nums">{currentStep}</span> of <span className="tabular-nums">{STEPS.length}</span>
        </p>
        <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] leading-tight">{title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">{children}</div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-5 border-t border-border mt-5">
        <button
          type="button"
          onClick={onBack}
          className="group/back inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-[13.5px] font-medium text-foreground hover:border-foreground/30 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover/back:-translate-x-0.5" />
          Back
        </button>
        {currentStep < STEPS.length ? (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="group/cta inline-flex h-10 items-center gap-2 rounded-full bg-primary pl-5 pr-4 text-[13.5px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:hover:shadow-none"
          >
            Continue
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="group/cta inline-flex h-10 items-center gap-2 rounded-full bg-primary pl-5 pr-4 text-[13.5px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:hover:shadow-none"
          >
            {isSaving ? 'Saving…' : (
              <>
                Save recipient
                <Check className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
