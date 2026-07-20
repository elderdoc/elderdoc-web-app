'use client'

import { useState, useTransition } from 'react'
import { ArrowRight } from 'lucide-react'
import { SelectableCard } from '@/components/selectable-card'
import { CaregiverStepShell } from '../../_components/caregiver-step-shell'
import { saveCaregiverStep1 } from '@/domains/caregivers/onboarding'
import { CareTypeIcon } from '@/lib/care-type-icons'

export function Step1Form({
  initialCareTypes,
  careTypes,
}: {
  initialCareTypes: string[]
  careTypes: { key: string; label: string; description: string | null; icon: string | null }[]
}) {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {careTypes.map((ct) => (
          <SelectableCard
            key={ct.key}
            selected={selected.includes(ct.key)}
            onSelect={() => toggle(ct.key)}
            icon={<CareTypeIcon iconName={ct.icon} className="h-5 w-5" />}
            description={ct.description ?? undefined}
          >
            {ct.label}
          </SelectableCard>
        ))}
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          disabled={selected.length === 0 || isPending}
          onClick={handleContinue}
          className="group/cta inline-flex h-12 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {isPending ? 'Saving…' : 'Continue'}
          {!isPending && <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />}
        </button>
      </div>
    </CaregiverStepShell>
  )
}
