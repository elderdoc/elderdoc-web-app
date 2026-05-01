'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Heart, Users, Brain, Activity, Stethoscope, ArrowRight, HandHeart } from 'lucide-react'
import { SelectableCard } from '@/components/selectable-card'
import { StepShell } from '../_components/step-shell'
import { CARE_TYPES } from '@/lib/constants'

const CARE_TYPE_META: Record<string, { icon: React.ReactNode; description: string }> = {
  'personal-care':          { icon: <Heart className="h-5 w-5" />,       description: 'Bathing, dressing, daily routines' },
  'companionship':          { icon: <Users className="h-5 w-5" />,       description: 'Conversation, errands, walks' },
  'dementia-care':          { icon: <Brain className="h-5 w-5" />,       description: 'Specialized memory care' },
  'mobility-assistance':    { icon: <Activity className="h-5 w-5" />,    description: 'Help moving safely' },
  'post-hospital-recovery': { icon: <Stethoscope className="h-5 w-5" />, description: 'Recovery from a procedure' },
  'respite-care':           { icon: <HandHeart className="h-5 w-5" />,   description: 'Break for the family caregiver' },
}

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CARE_TYPES.map(({ key, label }) => {
          const meta = CARE_TYPE_META[key]
          return (
            <SelectableCard
              key={key}
              selected={selected.includes(key)}
              onSelect={() => toggle(key)}
              icon={meta?.icon}
              description={meta?.description}
            >
              {label}
            </SelectableCard>
          )
        })}
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
