'use client'

import { useState, useTransition } from 'react'
import { SelectableCard } from '@/components/selectable-card'
import { CaregiverStepShell } from '../../_components/caregiver-step-shell'
import { WORK_TYPES, DAYS_OF_WEEK, SHIFTS, START_AVAILABILITY } from '@/lib/constants'
import { saveCaregiverStep3 } from '@/domains/caregivers/onboarding'

const labelClass = 'block text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-3'

interface Props {
  initialWorkTypes: string[]
  initialDays: string[]
  initialShifts: string[]
  initialStart: string
}

export function Step3Form({ initialWorkTypes, initialDays, initialShifts, initialStart }: Props) {
  const [workTypes, setWorkTypes] = useState<string[]>(initialWorkTypes)
  const [days, setDays] = useState<string[]>(initialDays)
  const [shifts, setShifts] = useState<string[]>(initialShifts)
  const [startAvailability, setStart] = useState(initialStart)
  const [isPending, startTransition] = useTransition()

  function toggleList(
    list: string[],
    setList: (v: string[]) => void,
    key: string
  ) {
    setList(list.includes(key) ? list.filter(k => k !== key) : [...list, key])
  }

  const isValid =
    workTypes.length > 0 && days.length > 0 && shifts.length > 0 && startAvailability.length > 0

  function handleContinue() {
    if (!isValid) return
    startTransition(async () => {
      await saveCaregiverStep3({ workTypes, days, shifts, startAvailability })
    })
  }

  return (
    <CaregiverStepShell
      currentStep={3}
      title="What's your availability?"
      subtitle="Select all that apply."
      backHref="/get-started/caregiver/step-2"
    >
      <div className="space-y-10">
        {/* Work Type */}
        <section>
          <p className={labelClass}>Work Type</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WORK_TYPES.map(({ key, label }) => (
              <SelectableCard
                key={key}
                selected={workTypes.includes(key)}
                onSelect={() => toggleList(workTypes, setWorkTypes, key)}
              >
                <span className="text-[15px] font-medium text-foreground">{label}</span>
              </SelectableCard>
            ))}
          </div>
        </section>

        {/* Days */}
        <section>
          <p className={labelClass}>Days Available</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DAYS_OF_WEEK.map(({ key, label }) => (
              <SelectableCard
                key={key}
                selected={days.includes(key)}
                onSelect={() => toggleList(days, setDays, key)}
              >
                <span className="text-[15px] font-medium text-foreground">{label}</span>
              </SelectableCard>
            ))}
          </div>
        </section>

        {/* Shifts */}
        <section>
          <p className={labelClass}>Shifts</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SHIFTS.map(({ key, label, time }) => (
              <SelectableCard
                key={key}
                selected={shifts.includes(key)}
                onSelect={() => toggleList(shifts, setShifts, key)}
              >
                <div>
                  <p className="text-[15px] font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{time}</p>
                </div>
              </SelectableCard>
            ))}
          </div>
        </section>

        {/* Start Availability */}
        <section>
          <p className={labelClass}>When Can You Start?</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {START_AVAILABILITY.map(({ key, label }) => (
              <SelectableCard
                key={key}
                selected={startAvailability === key}
                onSelect={() => setStart(key)}
              >
                <span className="text-[15px] font-medium text-foreground">{label}</span>
              </SelectableCard>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleContinue}
          className="rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </CaregiverStepShell>
  )
}
