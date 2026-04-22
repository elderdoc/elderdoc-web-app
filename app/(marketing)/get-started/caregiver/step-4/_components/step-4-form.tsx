'use client'

import { useState, useTransition } from 'react'
import { SelectableCard } from '@/components/selectable-card'
import { CaregiverStepShell } from '../../_components/caregiver-step-shell'
import { CARE_PLAN_SECTIONS, SPECIAL_NEEDS_HANDLING } from '@/lib/constants'
import { saveCaregiverCapabilities } from '@/domains/caregivers/onboarding'

const labelClass = 'block text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-3'

type SectionKey = 'activityMobilitySafety' | 'hygieneElimination' | 'homeManagement' | 'hydrationNutrition' | 'medicationReminders'

const VISIBLE_SECTIONS = CARE_PLAN_SECTIONS.filter(s => s.key !== 'medicationReminders')

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
        {VISIBLE_SECTIONS.map(section => {
          const sKey = section.key as SectionKey
          return (
            <section key={sKey}>
              <p className={labelClass}>{section.label}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {section.items.map(item => (
                  <SelectableCard
                    key={item.key}
                    selected={capabilities[sKey].includes(item.key)}
                    onSelect={() => toggleCapability(sKey, item.key)}
                  >
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </SelectableCard>
                ))}
              </div>
            </section>
          )
        })}

        <section>
          <p className={labelClass}>Special needs clients you can work with</p>
          <div className="grid grid-cols-2 gap-2">
            {SPECIAL_NEEDS_HANDLING.map(item => (
              <SelectableCard
                key={item.key}
                selected={!!specialNeeds[item.key]}
                onSelect={() => toggleSpecialNeed(item.key)}
              >
                <span className="text-sm font-medium">{item.label}</span>
              </SelectableCard>
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
