'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCareRecipient, createCareRequest } from '@/domains/clients/requests'
import {
  CARE_FREQUENCIES,
  SHIFTS,
  CARE_DURATIONS,
  BUDGET_TYPES,
  GENDER_PREFERENCES,
  DAYS_OF_WEEK,
} from '@/lib/constants'
import { ChevronDown, Check } from 'lucide-react'
import { DatePicker } from '@/components/date-picker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function DurationSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = CARE_DURATIONS.find(d => d.key === value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-[8px] border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20 text-left">
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected?.label ?? 'Select duration'}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[--anchor-width]">
        {CARE_DURATIONS.map(d => (
          <DropdownMenuItem key={d.key} onClick={() => onChange(d.key)} className="flex items-center justify-between">
            {d.label}
            {value === d.key && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface PostRequestFormProps {
  relationship: string
  careTypes: string
  address1: string
  address2: string
  city: string
  state: string
  zip: string
}

export function PostRequestForm({
  relationship,
  careTypes,
  address1,
  address2,
  city,
  state,
}: PostRequestFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState('')
  const [selectedShifts, setSelectedShifts] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [durationHours, setDurationHours] = useState('')
  const [budgetType, setBudgetType] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [genderPref, setGenderPref] = useState('')

  function toggleShift(key: string) {
    setSelectedShifts(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key])
  }

  function toggleDay(key: string) {
    setSelectedDays(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) { setError('Please enter a title'); return }
    if (!frequency) { setError('Please select how often care is needed'); return }
    if (!startDate) { setError('Please select a start date'); return }
    if (!durationHours) { setError('Please select duration per visit'); return }

    startTransition(async () => {
      try {
        const primaryCareType = careTypes.split(',').filter(Boolean)[0] ?? 'personal-care'

        const { id: recipientId } = await createCareRecipient({
          relationship,
          name: 'Care Recipient',
          conditions: [],
          address: { address1, address2, city, state },
        })

        const schedule = selectedDays.map(day => ({ day, startTime: '09:00', endTime: '17:00' }))

        await createCareRequest({
          recipientId,
          careType: primaryCareType,
          address: { address1, address2, city, state },
          frequency,
          schedule,
          startDate,
          genderPref: genderPref || undefined,
          languagePref: [],
          budgetType: budgetType || undefined,
          budgetAmount: budgetAmount || undefined,
          title: title.trim(),
          description: description.trim(),
        })

        router.push('/client/dashboard/requests')
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const labelClass = 'block text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground mb-2'
  const inputClass =
    'w-full rounded-[8px] border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className={labelClass}>Request Title</label>
        <input
          type="text"
          placeholder="e.g. Daily morning care for my mother"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className={inputClass}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Additional Details <span className="normal-case text-muted-foreground/60">(optional)</span></label>
        <textarea
          placeholder="Any specific needs, preferences, or information for caregivers..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Frequency */}
      <div>
        <label className={labelClass}>How often is care needed?</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CARE_FREQUENCIES.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFrequency(f.key)}
              className={`rounded-[8px] border px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                frequency === f.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shifts */}
      <div>
        <label className={labelClass}>Preferred shifts <span className="normal-case text-muted-foreground/60">(select all that apply)</span></label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SHIFTS.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleShift(s.key)}
              className={`rounded-[8px] border px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                selectedShifts.includes(s.key)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              <span className="block">{s.label}</span>
              <span className="block text-xs font-normal opacity-70">{s.time}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Days */}
      <div>
        <label className={labelClass}>Preferred days <span className="normal-case text-muted-foreground/60">(select all that apply)</span></label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map(d => (
            <button
              key={d.key}
              type="button"
              onClick={() => toggleDay(d.key)}
              className={`rounded-[8px] border px-3 py-2 text-sm font-medium transition-colors ${
                selectedDays.includes(d.key)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {d.label.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Start date + Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Start date</label>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            placeholder="Select start date"
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </div>
        <div>
          <label className={labelClass}>Hours per visit</label>
          <DurationSelect value={durationHours} onChange={setDurationHours} />
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className={labelClass}>Budget <span className="normal-case text-muted-foreground/60">(optional)</span></label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
          {BUDGET_TYPES.map(b => (
            <button
              key={b.key}
              type="button"
              onClick={() => setBudgetType(b.key)}
              className={`rounded-[8px] border px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                budgetType === b.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        {budgetType && (
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input
              type="number"
              placeholder="Amount"
              value={budgetAmount}
              onChange={e => setBudgetAmount(e.target.value)}
              min="0"
              className={`${inputClass} pl-7`}
            />
          </div>
        )}
      </div>

      {/* Gender preference */}
      <div>
        <label className={labelClass}>Caregiver gender preference <span className="normal-case text-muted-foreground/60">(optional)</span></label>
        <div className="flex flex-wrap gap-2">
          {GENDER_PREFERENCES.map(g => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGenderPref(g.key)}
              className={`rounded-[8px] border px-4 py-2 text-sm font-medium transition-colors ${
                genderPref === g.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-[8px] bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Posting request…' : 'Post Care Request'}
      </button>
    </form>
  )
}
