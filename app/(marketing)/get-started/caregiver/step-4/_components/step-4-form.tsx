'use client'

import { useState, useTransition } from 'react'
import { CaregiverStepShell } from '../../_components/caregiver-step-shell'
import { CARE_PLAN_SECTIONS, SPECIAL_NEEDS_HANDLING } from '@/lib/constants'
import { saveCaregiverCapabilities } from '@/domains/caregivers/onboarding'

const labelClass = 'block text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-3'

type SectionKey = 'activityMobilitySafety' | 'hygieneElimination' | 'homeManagement' | 'hydrationNutrition' | 'medicationReminders'

interface Props {
  initialCapabilities: Record<SectionKey, string[]>
  initialSpecialNeeds: Record<string, boolean>
  initialMaxCarryLbs: number | null
}

export function Step4Form({ initialCapabilities, initialSpecialNeeds, initialMaxCarryLbs }: Props) {
  const [capabilities, setCapabilities] = useState<Record<SectionKey, string[]>>(initialCapabilities)
  const [specialNeeds, setSpecialNeeds] = useState<Record<string, boolean>>(initialSpecialNeeds)
  const [maxCarryLbs, setMaxCarryLbs] = useState<string>(initialMaxCarryLbs?.toString() ?? '')
  const [isPending, startTransition] = useTransition()

  function toggleCapability(sectionKey: SectionKey, itemKey: string) {
    setCapabilities(prev => ({
      ...prev,
      [sectionKey]: prev[sectionKey].includes(itemKey)
        ? prev[sectionKey].filter(k => k !== itemKey)
        : [...prev[sectionKey], itemKey],
    }))
  }

  function toggleSpecialNeed(key: string) {
    setSpecialNeeds(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleContinue() {
    startTransition(async () => {
      await saveCaregiverCapabilities({
        careCapabilities:     capabilities,
        specialNeedsHandling: specialNeeds as {
          hardOfHearing?:      boolean
          visionProblem?:      boolean
          amputee?:            boolean
          overweightMobility?: boolean
        },
        maxCarryLbs: maxCarryLbs ? parseInt(maxCarryLbs, 10) : undefined,
      })
    })
  }

  return (
    <CaregiverStepShell
      currentStep={4}
      title="What are your capabilities?"
      subtitle="Select all that apply. You can skip any section."
      backHref="/get-started/caregiver/step-3"
    >
      <div className="space-y-10">
        {CARE_PLAN_SECTIONS.map(section => {
          const sKey = section.key as SectionKey
          return (
            <section key={sKey}>
              <p className={labelClass}>{section.label}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {section.items.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleCapability(sKey, item.key)}
                    className={[
                      'rounded-xl border-2 px-3 py-2.5 text-sm font-medium text-left transition-colors',
                      capabilities[sKey].includes(item.key)
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          )
        })}

        <section>
          <p className={labelClass}>Special needs clients you can work with</p>
          <div className="grid grid-cols-2 gap-2">
            {SPECIAL_NEEDS_HANDLING.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleSpecialNeed(item.key)}
                className={[
                  'rounded-xl border-2 px-4 py-3 text-sm font-medium text-left transition-colors',
                  specialNeeds[item.key]
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className={labelClass}>Maximum weight you can assist with (lbs)</p>
          <p className="text-xs text-muted-foreground mb-2">For mobility assistance and transfers</p>
          <input
            type="number"
            min={0}
            max={500}
            value={maxCarryLbs}
            onChange={e => setMaxCarryLbs(e.target.value)}
            placeholder="e.g. 150"
            className="w-48 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </section>
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          disabled={isPending}
          onClick={handleContinue}
          className="rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </CaregiverStepShell>
  )
}
