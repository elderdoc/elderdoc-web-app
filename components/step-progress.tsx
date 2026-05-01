import { cn } from '@/lib/utils'

interface StepProgressProps {
  steps: { label: string }[]
  currentStep: number
  className?: string
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  const total = steps.length
  return (
    <div className={cn('w-full', className)}>
      {/* Compact progress: numeric position + thin bar */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Step <span className="text-foreground font-medium tabular-nums">{String(currentStep).padStart(2, '0')}</span>
          {' '}/{' '}
          <span className="tabular-nums">{String(total).padStart(2, '0')}</span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {steps[currentStep - 1]?.label}
        </div>
      </div>
      <div className="h-px bg-border relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-foreground transition-[width] duration-500 ease-out"
          style={{ width: `${(currentStep / total) * 100}%`, height: '2px', top: '-0.5px' }}
        />
      </div>
      {/* Step ticks */}
      <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
        {steps.map((step, i) => {
          const n = i + 1
          const isCompleted = n < currentStep
          const isActive = n === currentStep
          return (
            <div key={step.label} className="flex flex-col items-start">
              <span className={cn(
                'font-mono text-[10px] tabular-nums transition-colors',
                isActive ? 'text-foreground font-medium' : isCompleted ? 'text-foreground/55' : 'text-muted-foreground/40',
              )}>
                {String(n).padStart(2, '0')}
              </span>
              <span className={cn(
                'mt-1 text-[11px] truncate w-full transition-colors hidden sm:block',
                isActive ? 'text-foreground font-medium' : isCompleted ? 'text-foreground/55' : 'text-muted-foreground/50',
              )}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
