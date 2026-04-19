'use client'

import { useState, useRef, useEffect } from 'react'
import { format, parse, isValid } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string           // ISO date string "YYYY-MM-DD"
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: (date: Date) => boolean
  upward?: boolean
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', className, disabled, upward }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = value
    ? parse(value, 'yyyy-MM-dd', new Date())
    : undefined
  const isValidDate = selected && isValid(selected)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2 rounded-[8px] border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors text-left',
          isValidDate ? 'text-foreground' : 'text-muted-foreground',
          open && 'border-primary ring-1 ring-primary/20',
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span>{isValidDate ? format(selected!, 'MMM d, yyyy') : placeholder}</span>
      </button>

      {open && (
        <div className={cn('absolute z-50 rounded-lg border border-border bg-background shadow-lg', upward ? 'bottom-full mb-1' : 'mt-1')}>
          <Calendar
            mode="single"
            selected={isValidDate ? selected : undefined}
            onSelect={(date) => {
              onChange(date ? format(date, 'yyyy-MM-dd') : '')
              setOpen(false)
            }}
            disabled={disabled}
            initialFocus
          />
        </div>
      )}
    </div>
  )
}
