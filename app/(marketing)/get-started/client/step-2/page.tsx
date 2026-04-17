'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SelectableCard } from '@/components/selectable-card'
import { StepShell } from '../_components/step-shell'
import { CARE_TYPES } from '@/lib/constants'

function Step2Inner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const relationship = searchParams.get('relationship') ?? ''
  const [selected, setSelected] = useState<string[]>([])

  function toggle(key: string) {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function handleContinue() {
    if (selected.length === 0) return
    const params = new URLSearchParams({
      relationship,
      careTypes: selected.join(','),
    })
    router.push(`/get-started/client/step-3?${params.toString()}`)
  }

  return (
    <StepShell
      currentStep={2}
      title="What type of care is needed?"
      subtitle="Select all that apply."
      backHref={`/get-started/client/step-1?relationship=${relationship}`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CARE_TYPES.map(({ key, label }) => (
          <SelectableCard
            key={key}
            selected={selected.includes(key)}
            onSelect={() => toggle(key)}
          >
            <span className="text-[15px] font-medium text-foreground">{label}</span>
          </SelectableCard>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={handleContinue}
          className="rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </StepShell>
  )
}

export default function ClientStep2() {
  return (
    <Suspense fallback={null}>
      <Step2Inner />
    </Suspense>
  )
}
