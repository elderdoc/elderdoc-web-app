'use client'

import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

const STEPS = [
  { label: 'Relationship' },
  { label: 'Basic info' },
  { label: 'Health' },
  { label: 'Notes' },
]

interface Props {
  currentStep: number
  skippedSteps?: number[]
  title: string
  subtitle?: string
  children: React.ReactNode
  onBack: () => void
  onNext?: () => void
  onSave?: () => void
  isSaving?: boolean
  nextDisabled?: boolean
}

export function CareRecipientShell({
  currentStep, skippedSteps = [], title, subtitle, children,
  onBack, onNext, onSave, isSaving, nextDisabled,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Step tracker */}
      <div className="flex items-center gap-0 mb-7">
        {STEPS.map((s, i) => {
          const n = i + 1
          const isActive  = n === currentStep
          const isSkipped = skippedSteps.includes(n)
          const isDone    = n < currentStep && !isSkipped
          const isFuture  = n > currentStep && !isSkipped

          return (
            <div key={i} className="flex items-center flex-1">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition-all',
                    isDone   ? 'bg-primary text-primary-foreground shadow-[0_0_0_3px_var(--forest-soft)]' :
                    isActive ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1' :
                    isSkipped ? 'bg-muted text-muted-foreground' :
                    'bg-muted text-muted-foreground/60',
                  ].join(' ')}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : n}
                </div>
                <span
                  className={[
                    'text-[10.5px] font-medium leading-none transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground/60',
                  ].join(' ')}
                >
                  {s.label}
                </span>
              </div>

              {/* Connector line (not after last) */}
              {i < STEPS.length - 1 && (
                <div
                  className={[
                    'flex-1 h-[2px] mx-1 rounded-full transition-all',
                    isDone ? 'bg-primary/40' : 'bg-muted',
                  ].join(' ')}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Title */}
      <div className="mb-5">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] leading-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-[13.5px] text-muted-foreground">{subtitle}</p>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 pb-1">{children}</div>

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
            className="group/cta inline-flex h-10 items-center gap-2 rounded-full bg-primary pl-5 pr-4 text-[13.5px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:pointer-events-none"
          >
            Continue
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="group/cta inline-flex h-10 items-center gap-2 rounded-full bg-primary pl-5 pr-4 text-[13.5px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:pointer-events-none"
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
