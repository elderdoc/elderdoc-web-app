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
        'relative w-full rounded-[12px] border p-4 text-left transition-all duration-150',
        'bg-card shadow-[var(--shadow-card)]',
        !selected && !disabled && 'border-border hover:border-primary/30 hover:shadow-[var(--shadow-hover)]',
        selected && 'border-2 border-primary bg-primary/5',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {selected && (
        <span
          data-testid="check-icon"
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
      {children}
    </button>
  )
}
