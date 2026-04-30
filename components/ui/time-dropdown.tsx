'use client'

import { useState, useEffect } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  increment: 15 | 30 | 60
  placeholder?: string
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

export function TimeDropdown({ value, onChange, increment, placeholder = 'Select time' }: Props) {
  const times = generateTimes(increment)
  const isCustom = value !== '' && !times.includes(value)
  const [showCustom, setShowCustom] = useState(isCustom)

  useEffect(() => {
    if (!times.includes(value) && value !== '') {
      setShowCustom(true)
    }
  }, [increment])

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
    <select
      value={value}
      onChange={e => {
        if (e.target.value === '__custom__') {
          setShowCustom(true)
          onChange('')
        } else {
          onChange(e.target.value)
        }
      }}
      className="w-32 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none bg-background"
    >
      <option value="">{placeholder}</option>
      {times.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
      <option value="__custom__">Custom…</option>
    </select>
  )
}
