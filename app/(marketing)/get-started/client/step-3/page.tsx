'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StepShell } from '../_components/step-shell'
import { US_STATES } from '@/lib/constants'

function Step3Inner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const relationship = searchParams.get('relationship') ?? ''
  const careTypes = searchParams.get('careTypes') ?? ''

  const [form, setForm] = useState({
    address1: '',
    address2: '',
    city: '',
    state: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const isValid = form.address1.trim() && form.city.trim() && form.state

  function handleContinue() {
    if (!isValid) return
    const params = new URLSearchParams({
      relationship,
      careTypes,
      address1: form.address1,
      address2: form.address2,
      city: form.city,
      state: form.state,
    })
    router.push(`/get-started/client/step-4?${params.toString()}`)
  }

  const inputClass =
    'w-full rounded-[8px] border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20'
  const labelClass = 'block text-xs font-medium text-muted-foreground uppercase tracking-[0.06em] mb-1.5'

  return (
    <StepShell
      currentStep={3}
      title="Where is care needed?"
      subtitle="We'll use this to find caregivers near you."
      backHref={`/get-started/client/step-2?relationship=${relationship}&careTypes=${careTypes}`}
    >
      <div className="mx-auto max-w-lg space-y-5">
        <div>
          <label className={labelClass}>Address Line 1</label>
          <input
            type="text"
            placeholder="123 Main Street"
            value={form.address1}
            onChange={e => set('address1', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Address Line 2 <span className="normal-case text-muted-foreground/60">(optional)</span></label>
          <input
            type="text"
            placeholder="Apt, suite, unit..."
            value={form.address2}
            onChange={e => set('address2', e.target.value)}
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
              onChange={e => set('city', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <select
              value={form.state}
              onChange={e => set('state', e.target.value)}
              className={inputClass}
            >
              <option value="">Select state</option>
              {US_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
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
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          disabled={!isValid}
          onClick={handleContinue}
          className="rounded-[8px] bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Find Caregivers
        </button>
      </div>
    </StepShell>
  )
}

export default function ClientStep3() {
  return (
    <Suspense fallback={null}>
      <Step3Inner />
    </Suspense>
  )
}
