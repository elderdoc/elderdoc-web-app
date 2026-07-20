'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { SelectableCard } from '@/components/selectable-card'
import { StepShell } from '../_components/step-shell'
import { useCareTypes } from './step-2-provider'
import { CareTypeIcon } from '@/lib/care-type-icons'

function Step2Inner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const relationship = searchParams.get('relationship') ?? ''
  const careTypes = useCareTypes()
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
          disabled={selected.length === 0}
          onClick={handleContinue}
          className="group/cta inline-flex h-12 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          Continue
          <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
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
