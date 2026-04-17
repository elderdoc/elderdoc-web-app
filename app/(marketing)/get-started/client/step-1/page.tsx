'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SelectableCard } from '@/components/selectable-card'
import { StepShell } from '../_components/step-shell'
import { RELATIONSHIPS } from '@/lib/constants'

export default function ClientStep1() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | undefined>()

  function handleContinue() {
    if (!selected) return
    router.push(`/get-started/client/step-2?relationship=${encodeURIComponent(selected)}`)
  }

  return (
    <StepShell
      currentStep={1}
      title="Who needs care?"
      subtitle="Select who you're finding care for."
      backHref="/get-started"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {RELATIONSHIPS.map(({ key, label }) => (
          <SelectableCard
            key={key}
            selected={selected === key}
            onSelect={() => setSelected(key)}
          >
            <span className="text-[15px] font-medium text-foreground">{label}</span>
          </SelectableCard>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!selected}
          onClick={handleContinue}
          className="rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </StepShell>
  )
}
