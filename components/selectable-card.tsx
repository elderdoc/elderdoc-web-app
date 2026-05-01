'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface SelectableCardProps {
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
  icon?: React.ReactNode
  description?: string
}

export function SelectableCard({ selected, onSelect, children, className, disabled, icon, description }: SelectableCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onSelect}
      className={cn(
        'group/sel relative w-full overflow-hidden rounded-[16px] border-2 p-5 text-left transition-all duration-200',
        !selected && !disabled && 'border-border bg-card hover:border-primary/40 hover:bg-[var(--forest-soft)]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(15,77,52,0.18)]',
        selected && 'border-primary bg-[var(--forest-soft)] shadow-[0_8px_24px_-10px_rgba(15,77,52,0.4)] -translate-y-0.5',
        disabled && 'cursor-not-allowed opacity-50 border-border bg-card',
        className,
      )}
    >
      {/* Decorative orb */}
      {selected && (
        <div className="pointer-events-none absolute right-[-30px] top-[-30px] h-[120px] w-[120px] rounded-full bg-primary/15 transition-all" />
      )}

      <div className="relative flex items-start gap-3">
        {icon && (
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
            selected ? 'bg-primary text-primary-foreground' : 'bg-[var(--forest-soft)] text-[var(--forest-deep)] group-hover/sel:bg-primary/15',
          )}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={cn('text-[15px] font-semibold tracking-[-0.005em]', selected && 'text-[var(--forest-deep)]')}>
            {children}
          </div>
          {description && (
            <div className="mt-1 text-[12.5px] text-muted-foreground leading-snug">
              {description}
            </div>
          )}
        </div>
        {selected && (
          <span
            data-testid="check-icon"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        )}
      </div>
    </button>
  )
}
