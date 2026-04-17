'use client'

import { useState, useTransition } from 'react'
import { SelectableCard } from '@/components/selectable-card'
import { CaregiverStepShell } from '../../_components/caregiver-step-shell'
import { TRAVEL_DISTANCES, US_STATES } from '@/lib/constants'
import { saveCaregiverStep4 } from '@/domains/caregivers/onboarding'

const labelClass = 'block text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5'
const inputClass =
  'w-full rounded-[8px] border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20'

interface Props {
  initialAddress1: string
  initialAddress2: string
  initialCity: string
  initialState: string
  initialTravelDistances: number[]
  initialRelocatable: boolean
  initialHourlyMin: string
  initialHourlyMax: string
}

export function Step4Form({
  initialAddress1, initialAddress2, initialCity, initialState,
  initialTravelDistances, initialRelocatable, initialHourlyMin, initialHourlyMax,
}: Props) {
  const [form, setForm] = useState({
    address1: initialAddress1,
    address2: initialAddress2,
    city: initialCity,
    state: initialState,
  })
  const [travelDistances, setTravelDistances] = useState<number[]>(initialTravelDistances)
  const [relocatable, setRelocatable] = useState(initialRelocatable)
  const [hourlyMin, setHourlyMin] = useState(initialHourlyMin)
  const [hourlyMax, setHourlyMax] = useState(initialHourlyMax)
  const [isPending, startTransition] = useTransition()

  function setField(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleDistance(miles: number) {
    setTravelDistances(prev =>
      prev.includes(miles) ? prev.filter(m => m !== miles) : [...prev, miles]
    )
  }

  const isValid =
    form.address1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.state.length > 0 &&
    travelDistances.length > 0 &&
    hourlyMin.length > 0 &&
    hourlyMax.length > 0 &&
    Number(hourlyMin) <= Number(hourlyMax)

  function handleContinue() {
    if (!isValid) return
    startTransition(async () => {
      await saveCaregiverStep4({
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        state: form.state,
        travelDistances,
        relocatable,
        hourlyMin,
        hourlyMax,
      })
    })
  }

  return (
    <CaregiverStepShell
      currentStep={4}
      title="Where are you located?"
      subtitle="We'll use this to match you with nearby families."
      backHref="/get-started/caregiver/step-3"
    >
      <div className="space-y-10">
        {/* Location */}
        <section className="mx-auto max-w-lg space-y-4">
          <div>
            <label className={labelClass}>Address Line 1</label>
            <input
              type="text"
              placeholder="123 Main Street"
              value={form.address1}
              onChange={e => setField('address1', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Address Line 2{' '}
              <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Apt, suite, unit…"
              value={form.address2}
              onChange={e => setField('address2', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input
                type="text"
                placeholder="Austin"
                value={form.city}
                onChange={e => setField('city', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <select
                value={form.state}
                onChange={e => setField('state', e.target.value)}
                className={inputClass}
              >
                <option value="">Select state</option>
                {US_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input
              type="text"
              value="United States"
              disabled
              className={`${inputClass} cursor-not-allowed opacity-50`}
            />
          </div>
        </section>

        {/* Travel Distance */}
        <section>
          <p className="block text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-3">
            How Far Will You Travel?
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {TRAVEL_DISTANCES.map(({ key, label, miles }) => (
              <SelectableCard
                key={key}
                selected={travelDistances.includes(miles)}
                onSelect={() => toggleDistance(miles)}
              >
                <span className="text-[15px] font-medium text-foreground">{label}</span>
              </SelectableCard>
            ))}
          </div>
        </section>

        {/* Relocation */}
        <section>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={relocatable}
              onChange={e => setRelocatable(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-[15px] text-foreground">Open to relocating</span>
          </label>
        </section>

        {/* Hourly Rate */}
        <section>
          <p className="block text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-3">
            Hourly Rate
          </p>
          <div className="mx-auto max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Minimum</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={hourlyMin}
                    onChange={e => setHourlyMin(e.target.value)}
                    className={`${inputClass} pl-7`}
                    placeholder="20"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Maximum</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={hourlyMax}
                    onChange={e => setHourlyMax(e.target.value)}
                    className={`${inputClass} pl-7`}
                    placeholder="35"
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Pre-filled based on your experience. You can adjust anytime.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleContinue}
          className="rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </CaregiverStepShell>
  )
}
