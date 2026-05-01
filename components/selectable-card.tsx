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
        'group/sel relative w-full rounded-md border p-4 text-left transition-all duration-200',
        !selected && !disabled && 'border-border bg-card hover:border-primary/40 hover:translate-y-[-1px] hover:shadow-[0_8px_20px_-12px_rgba(15,77,52,0.18)]',
        selected && 'border-primary bg-primary text-primary-foreground shadow-[0_8px_20px_-12px_rgba(15,77,52,0.32)]',
        disabled && 'cursor-not-allowed opacity-50 border-border bg-card',
        className,
      )}
    >
      {selected && (
        <span
          data-testid="check-icon"
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary"
          aria-hidden="true"
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {children}
    </button>
  )
}
