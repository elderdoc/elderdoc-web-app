import { cn } from '@/lib/utils'

interface StepProgressProps {
  steps: { label: string }[]
  currentStep: number
  className?: string
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  return (
    <nav aria-label="Progress" className={cn('flex items-center gap-0', className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isActive    = stepNumber === currentStep

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                data-testid={isCompleted ? 'step-completed' : isActive ? 'step-active' : 'step-pending'}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isActive && 'border-2 border-primary text-primary bg-primary/10',
                  !isCompleted && !isActive && 'border border-border text-muted-foreground bg-card',
                )}
              >
                {isCompleted ? (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                    <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : stepNumber}
              </div>
              <span className={cn(
                'text-xs font-medium whitespace-nowrap',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'mx-2 mb-5 h-px w-12 transition-colors',
                isCompleted ? 'bg-primary' : 'bg-border',
              )} />
            )}
          </div>
        )
      })}
    </nav>
  )
}
