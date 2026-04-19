'use client'

import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { US_STATES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface StateSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function StateSelect({ value, onChange, className }: StateSelectProps) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center justify-between rounded-[8px] border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors',
          value ? 'text-foreground' : 'text-muted-foreground',
          'focus:border-primary focus:ring-1 focus:ring-primary/20',
          className,
        )}
      >
        <span>{value || 'Select state'}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[--anchor-width] max-h-64 overflow-y-auto"
      >
        {US_STATES.map(state => (
          <DropdownMenuItem
            key={state}
            onClick={() => { onChange(state); setOpen(false) }}
            className="flex items-center justify-between"
          >
            {state}
            {value === state && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
