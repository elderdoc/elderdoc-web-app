'use client'

import { cn } from '@/lib/utils'

interface SelectableCardProps {
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function SelectableCard({ selected, onSelect, children, className, disabled }: SelectableCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onSelect}
      className={cn(
        'group/sel relative w-full rounded-[14px] border-2 p-5 text-left transition-all duration-200',
        !selected && !disabled && 'border-border bg-card hover:border-primary/40 hover:bg-[var(--forest-soft)]/40',
        selected && 'border-primary bg-[var(--forest-soft)] shadow-[0_4px_16px_-8px_rgba(15,77,52,0.32)]',
        disabled && 'cursor-not-allowed opacity-50 border-border bg-card',
        className,
      )}
    >
      {selected && (
        <span
          data-testid="check-icon"
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {children}
    </button>
  )
}
