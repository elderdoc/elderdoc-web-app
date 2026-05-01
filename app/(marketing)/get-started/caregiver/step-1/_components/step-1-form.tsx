'use client'

import { useState, useTransition } from 'react'
import { Heart, Users, Brain, Activity, Stethoscope, HandHeart, ArrowRight } from 'lucide-react'
import { SelectableCard } from '@/components/selectable-card'
import { CaregiverStepShell } from '../../_components/caregiver-step-shell'
import { CARE_TYPES } from '@/lib/constants'
import { saveCaregiverStep1 } from '@/domains/caregivers/onboarding'

const CARE_TYPE_META: Record<string, { icon: React.ReactNode; description: string }> = {
  'personal-care':          { icon: <Heart className="h-5 w-5" />,       description: 'Bathing, dressing, daily routines' },
  'companionship':          { icon: <Users className="h-5 w-5" />,       description: 'Conversation, errands, walks' },
  'dementia-care':          { icon: <Brain className="h-5 w-5" />,       description: 'Specialized memory care' },
  'mobility-assistance':    { icon: <Activity className="h-5 w-5" />,    description: 'Help moving safely' },
  'post-hospital-recovery': { icon: <Stethoscope className="h-5 w-5" />, description: 'Recovery from a procedure' },
  'respite-care':           { icon: <HandHeart className="h-5 w-5" />,   description: 'Temporary relief care' },
}

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
