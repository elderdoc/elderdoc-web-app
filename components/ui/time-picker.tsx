'use client'

import { useState, useEffect } from 'react'
import { Select } from '@base-ui/react/select'
import { ChevronDownIcon, CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const HOURS   = ['1','2','3','4','5','6','7','8','9','10','11','12']
const MINUTES = ['00','15','30','45']

function parse(value: string): { hour: string; minute: string; period: string } {
  if (!value) return { hour: '', minute: '', period: 'AM' }
  const [h, m] = value.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return { hour: String(hour12), minute: String(m).padStart(2, '0'), period }
}

function toHHMM(hour: string, minute: string, period: string): string {
  if (!hour || !minute) return ''
  let h = parseInt(hour, 10)
  if (period === 'AM') { if (h === 12) h = 0 }
  else { if (h !== 12) h += 12 }
  return `${String(h).padStart(2, '0')}:${minute}`
}

function TimeSelect({
  value,
  onValueChange,
  options,
  placeholder,
}: {
  value: string
  onValueChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <Select.Root value={value || null} onValueChange={(v) => onValueChange(v ?? '')}>
      <Select.Trigger
        className={cn(
          'flex h-9 min-w-[3.5rem] items-center justify-between gap-1 rounded-md border border-input bg-background px-2.5 py-2 text-sm ring-offset-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'data-[popup-open]:ring-2 data-[popup-open]:ring-ring data-[popup-open]:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !value && 'text-muted-foreground',
        )}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDownIcon className="h-3.5 w-3.5 opacity-50" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={4} className="z-50">
          <Select.Popup
            className={cn(
              'max-h-60 min-w-[var(--anchor-width)] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
              'origin-[var(--transform-origin)]',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            )}
          >
            {options.map((opt) => (
              <Select.Item
                key={opt}
                value={opt}
                className={cn(
                  'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
                  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <Select.ItemIndicator>
                    <CheckIcon className="h-4 w-4" />
                  </Select.ItemIndicator>
                </span>
                <Select.ItemText>{opt}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}

export function TimePicker({ value, onChange, className = '' }: TimePickerProps) {
  const parsed = parse(value)
  const [hour, setHour]     = useState(parsed.hour)
  const [minute, setMinute] = useState(parsed.minute)
  const [period, setPeriod] = useState(parsed.period)

  // Sync inward when value is reset externally (e.g. form reset)
  useEffect(() => {
    const p = parse(value)
    setHour(p.hour)
    setMinute(p.minute)
    setPeriod(p.period)
  }, [value])

  function emit(h: string, m: string, p: string) {
    const result = toHHMM(h, m, p)
    if (result) onChange(result)
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <TimeSelect
        value={hour}
        onValueChange={(h) => { setHour(h); emit(h, minute, period) }}
        options={HOURS}
        placeholder="hh"
      />
      <span className="text-muted-foreground text-sm font-medium">:</span>
      <TimeSelect
        value={minute}
        onValueChange={(m) => { setMinute(m); emit(hour, m, period) }}
        options={MINUTES}
        placeholder="mm"
      />
      <TimeSelect
        value={period}
        onValueChange={(p) => { setPeriod(p); emit(hour, minute, p) }}
        options={['AM', 'PM']}
        placeholder="AM"
      />
    </div>
  )
}
