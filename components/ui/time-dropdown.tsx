'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  increment: 15 | 30 | 60
  placeholder?: string
  minTime?: string
}

function generateTimes(increment: 15 | 30 | 60): string[] {
  const times: string[] = []
  for (let m = 0; m < 24 * 60; m += increment) {
    const h = Math.floor(m / 60).toString().padStart(2, '0')
    const min = (m % 60).toString().padStart(2, '0')
    times.push(`${h}:${min}`)
  }
  return times
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function toAmPm(t: string): string {
  const [hStr, min] = t.split(':')
  const h = parseInt(hStr, 10)
  const suffix = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${min} ${suffix}`
}

export function TimeDropdown({ value, onChange, increment, placeholder = 'Select time', minTime }: Props) {
  const allTimes = generateTimes(increment)
  const times = minTime ? allTimes.filter(t => toMinutes(t) > toMinutes(minTime)) : allTimes
  const isCustom = value !== '' && !allTimes.includes(value)
  const [showCustom, setShowCustom] = useState(isCustom)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Clear value if it becomes invalid relative to minTime
  useEffect(() => {
    if (minTime && value && toMinutes(value) <= toMinutes(minTime)) {
      onChange('')
    }
  }, [minTime])

  useEffect(() => {
    if (allTimes.includes(value) || value === '') {
      setShowCustom(false)
    } else {
      setShowCustom(true)
    }
  }, [value, increment])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (showCustom) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="HH:MM"
          className="w-24 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => { setShowCustom(false); onChange('') }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'flex items-center justify-between gap-2 w-36 rounded-lg border px-3 py-2 text-sm transition-colors bg-background',
          open ? 'border-primary' : 'border-border hover:border-primary/50',
          value ? 'text-foreground' : 'text-muted-foreground',
        ].join(' ')}
      >
        <span>{value ? toAmPm(value) : placeholder}</span>
        <svg
          className={['w-3.5 h-3.5 text-muted-foreground transition-transform', open ? 'rotate-180' : ''].join(' ')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-40 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-y-auto max-h-52 py-1">
            {times.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { onChange(t); setOpen(false) }}
                className={[
                  'flex items-center justify-between w-full px-3 py-1.5 text-sm text-left transition-colors',
                  value === t
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-muted text-foreground',
                ].join(' ')}
              >
                {toAmPm(t)}
                {value === t && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
            <div className="border-t border-border mt-1 pt-1">
              <button
                type="button"
                onClick={() => { setShowCustom(true); setOpen(false); onChange('') }}
                className="w-full px-3 py-1.5 text-sm text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Custom…
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
