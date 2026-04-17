'use client'

import { useState, useTransition } from 'react'
import { SelectableCard } from '@/components/selectable-card'
import { CaregiverStepShell } from '../../_components/caregiver-step-shell'
import { CARE_TYPES } from '@/lib/constants'
import { saveCaregiverStep1 } from '@/domains/caregivers/onboarding'

export function Step1Form({ initialCareTypes }: { initialCareTypes: string[] }) {
  const [selected, setSelected] = useState<string[]>(initialCareTypes)
  const [isPending, startTransition] = useTransition()

  function toggle(key: string) {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function handleContinue() {
    startTransition(async () => {
      await saveCaregiverStep1(selected)
    })
  }

  return (
    <CaregiverStepShell
      currentStep={1}
      title="What types of care do you provide?"
      subtitle="Select all that apply."
      backHref="/get-started"
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
          disabled={selected.length === 0 || isPending}
          onClick={handleContinue}
          className="rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </CaregiverStepShell>
  )
}
