import { cn } from '@/lib/utils'

interface StepProgressProps {
  steps: { label: string }[]
  currentStep: number
  className?: string
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  return (
    <nav aria-label="Progress" className={cn('flex items-start justify-between gap-2 max-w-2xl', className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isActive    = stepNumber === currentStep

        return (
          <div key={step.label} className="flex flex-1 items-start gap-0">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                data-testid={isCompleted ? 'step-completed' : isActive ? 'step-active' : 'step-pending'}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-semibold transition-all',
                  isCompleted && 'bg-primary text-primary-foreground shadow-[0_2px_8px_-2px_rgba(15,77,52,0.4)]',
                  isActive && 'bg-primary text-primary-foreground ring-4 ring-[var(--forest-soft)] shadow-[0_4px_12px_-2px_rgba(15,77,52,0.4)]',
                  !isCompleted && !isActive && 'bg-card border-2 border-border text-muted-foreground',
                )}
              >
                {isCompleted ? (
                  <svg width="14" height="11" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : stepNumber}
              </div>
              <span className={cn(
                'text-[12px] font-medium text-center leading-tight max-w-[80px]',
                isActive ? 'text-foreground' : isCompleted ? 'text-foreground/70' : 'text-muted-foreground/70',
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="h-9 flex-1 flex items-center px-1 min-w-[20px]">
                <div className={cn(
                  'h-[2px] w-full rounded-full transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-border',
                )} />
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
