'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'
import { StepShell } from '../_components/step-shell'
import { StateSelect } from '@/components/state-select'

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
    zip: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const isValid = form.address1.trim() && form.city.trim() && form.state && form.zip.trim()

  function handleContinue() {
    if (!isValid) return
    const params = new URLSearchParams({
      relationship,
      careTypes,
      address1: form.address1,
      address2: form.address2,
      city: form.city,
      state: form.state,
      zip: form.zip,
    })
    router.push(`/get-started/client/step-4?${params.toString()}`)
  }

  const inputClass =
    'h-11 w-full rounded-[10px] border border-input bg-card px-3.5 text-[14.5px] text-foreground placeholder:text-muted-foreground/70 outline-none transition-all hover:border-foreground/30 focus:border-primary focus:ring-[3px] focus:ring-primary/15'
  const labelClass = 'block text-[13px] font-medium text-foreground mb-1.5'

  return (
    <StepShell
      currentStep={3}
      title="Where is care needed?"
      subtitle="We'll use this to find caregivers near you."
      backHref={`/get-started/client/step-2?relationship=${relationship}&careTypes=${careTypes}`}
    >
      <div className="mx-auto max-w-xl">
        <div className="rounded-[16px] border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-primary mb-1">
            <MapPin className="h-3.5 w-3.5" />
            Address
          </div>

          <div>
            <label className={labelClass}>Street address</label>
            <input
              type="text"
              placeholder="123 Main Street"
              value={form.address1}
              onChange={e => set('address1', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Apt, suite, unit <span className="text-muted-foreground/70 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Unit 4B"
              value={form.address2}
              onChange={e => set('address2', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <StateSelect value={form.state} onChange={v => set('state', v)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>ZIP code</label>
              <input
                type="text"
                placeholder="90210"
                maxLength={10}
                value={form.zip}
                onChange={e => set('zip', e.target.value.replace(/[^\d-]/g, ''))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input
                type="text"
                value="United States"
                disabled
                className={`${inputClass} cursor-not-allowed bg-muted/40 text-muted-foreground`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          disabled={!isValid}
          onClick={handleContinue}
          className="group/cta inline-flex h-12 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          Find caregivers
          <Search className="h-4 w-4" />
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
