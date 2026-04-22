'use client'

import { useState, useTransition } from 'react'
import { SelectableCard } from '@/components/selectable-card'
import { CaregiverStepShell } from '../../_components/caregiver-step-shell'
import { TRAVEL_DISTANCES } from '@/lib/constants'
import { saveCaregiverStep4 } from '@/domains/caregivers/onboarding'
import { StateSelect } from '@/components/state-select'

const labelClass = 'block text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5'
const inputClass =
  'w-full rounded-[8px] border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20'

interface Props {
  initialAddress1: string
  initialAddress2: string
  initialCity: string
  initialState: string
  initialZip: string
  initialTravelDistances: number[]
  initialRelocatable: boolean
  initialHourlyMin: string
  initialHourlyMax: string
}

export function Step4Form({
  initialAddress1, initialAddress2, initialCity, initialState, initialZip,
  initialTravelDistances, initialRelocatable, initialHourlyMin, initialHourlyMax,
}: Props) {
  const [form, setForm] = useState({
    address1: initialAddress1,
    address2: initialAddress2,
    city: initialCity,
    state: initialState,
    zip: initialZip,
  })
  const [travelDistance, setTravelDistance] = useState<number | null>(initialTravelDistances[0] ?? null)
  const [relocatable, setRelocatable] = useState(initialRelocatable)
  const [hourlyMin, setHourlyMin] = useState(initialHourlyMin)
  const [hourlyMax, setHourlyMax] = useState(initialHourlyMax)
  const [isPending, startTransition] = useTransition()

  function setField(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }


  const isValid =
    form.address1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.state.length > 0 &&
    travelDistance !== null &&
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
        zip: form.zip,
        travelDistances: travelDistance !== null ? [travelDistance] : [],
        relocatable,
        hourlyMin,
        hourlyMax,
      })
    })
  }

  return (
    <CaregiverStepShell
      currentStep={5}
      title="Where are you located?"
      subtitle="We'll use this to match you with nearby families."
      backHref="/get-started/caregiver/step-4"
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
              <StateSelect value={form.state} onChange={v => setField('state', v)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>ZIP Code</label>
              <input
                type="text"
                placeholder="78701"
                value={form.zip}
                onChange={e => setField('zip', e.target.value)}
                className={inputClass}
              />
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
                selected={travelDistance === miles}
                onSelect={() => setTravelDistance(miles)}
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
            {/* Dual-range slider */}
            {(() => {
              const SMIN = 15, SMAX = 100
              const lo = Math.min(Math.max(Number(hourlyMin) || SMIN, SMIN), SMAX)
              const hi = Math.min(Math.max(Number(hourlyMax) || SMAX, SMIN), SMAX)
              const loPct = ((lo - SMIN) / (SMAX - SMIN)) * 100
              const hiPct = ((hi - SMIN) / (SMAX - SMIN)) * 100
              const thumbCls = 'appearance-none bg-transparent absolute inset-0 w-full h-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:bg-transparent'
              return (
                <div className="mb-5 px-1">
                  <div className="relative h-5 flex items-center">
                    <div className="absolute inset-x-0 h-[5px] rounded-full bg-muted" />
                    <div
                      className="absolute h-[5px] rounded-full bg-primary"
                      style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
                    />
                    <input
                      type="range"
                      min={SMIN}
                      max={SMAX}
                      value={lo}
                      onChange={e => {
                        const v = Number(e.target.value)
                        setHourlyMin(String(v))
                        if (v > Math.min(Math.max(Number(hourlyMax) || SMAX, SMIN), SMAX)) setHourlyMax(String(v))
                      }}
                      style={{ zIndex: lo >= hi - 2 ? 5 : 3 }}
                      className={thumbCls}
                    />
                    <input
                      type="range"
                      min={SMIN}
                      max={SMAX}
                      value={hi}
                      onChange={e => {
                        const v = Number(e.target.value)
                        setHourlyMax(String(v))
                        if (v < Math.min(Math.max(Number(hourlyMin) || SMIN, SMIN), SMAX)) setHourlyMin(String(v))
                      }}
                      style={{ zIndex: lo >= hi - 2 ? 3 : 5 }}
                      className={thumbCls}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">$15</span>
                    <span className="text-xs text-muted-foreground">$50+</span>
                  </div>
                </div>
              )
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Minimum</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    min="0"
                    value={hourlyMin}
                    onChange={e => {
                      const v = e.target.value
                      setHourlyMin(v)
                    }}
                    className={`${inputClass} pl-7`}
                    placeholder="20"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Maximum</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    min="0"
                    value={hourlyMax}
                    onChange={e => {
                      const v = e.target.value
                      setHourlyMax(v)
                    }}
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
