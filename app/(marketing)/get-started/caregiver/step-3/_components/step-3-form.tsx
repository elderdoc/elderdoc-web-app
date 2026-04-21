'use client'

import { useState, useTransition } from 'react'
import { SelectableCard } from '@/components/selectable-card'
import { CaregiverStepShell } from '../../_components/caregiver-step-shell'
import { WORK_TYPES, DAYS_OF_WEEK, START_AVAILABILITY } from '@/lib/constants'
import { saveCaregiverStep3 } from '@/domains/caregivers/onboarding'

const labelClass = 'block text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-3'

interface Props {
  initialWorkTypes: string[]
  initialAvailability: Array<{ day: string; startTime: string; endTime: string }>
  initialStart: string
}

export function Step3Form({ initialWorkTypes, initialAvailability, initialStart }: Props) {
  const [workTypes, setWorkTypes] = useState<string[]>(initialWorkTypes)
  const [days, setDays] = useState<string[]>(
    initialAvailability.map(a => a.day)
  )
  const [sameHoursEveryDay, setSameHoursEveryDay] = useState(true)
  const [sharedStartTime, setSharedStartTime] = useState(
    initialAvailability[0]?.startTime ?? ''
  )
  const [sharedEndTime, setSharedEndTime] = useState(
    initialAvailability[0]?.endTime ?? ''
  )
  const [dayTimes, setDayTimes] = useState<Record<string, { startTime: string; endTime: string }>>(
    Object.fromEntries(initialAvailability.map(a => [a.day, { startTime: a.startTime, endTime: a.endTime }]))
  )
  const [startAvailability, setStart] = useState(initialStart)
  const [isPending, startTransition] = useTransition()

  function toggleList(list: string[], setList: (v: string[]) => void, key: string) {
    setList(list.includes(key) ? list.filter(k => k !== key) : [...list, key])
  }

  const timesComplete = days.length === 0 ? false : sameHoursEveryDay
    ? sharedStartTime.length > 0 && sharedEndTime.length > 0
    : days.every(d => dayTimes[d]?.startTime && dayTimes[d]?.endTime)
  const isValid = workTypes.length > 0 && days.length > 0 && timesComplete && startAvailability.length > 0

  function handleContinue() {
    if (!isValid) return
    startTransition(async () => {
      const availability = days.map(day => ({
        day,
        startTime: sameHoursEveryDay ? sharedStartTime : (dayTimes[day]?.startTime ?? ''),
        endTime:   sameHoursEveryDay ? sharedEndTime   : (dayTimes[day]?.endTime ?? ''),
      }))
      await saveCaregiverStep3({ workTypes, availability, startAvailability })
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

        {/* Availability Hours */}
        <section>
          <p className={labelClass}>Availability Hours</p>
          {days.length > 0 && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameHoursEveryDay}
                  onChange={e => setSameHoursEveryDay(e.target.checked)}
                  className="rounded border-border"
                />
                Same hours every day
              </label>
              {sameHoursEveryDay ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">From</label>
                    <input type="time" value={sharedStartTime}
                      onChange={e => setSharedStartTime(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <span className="text-muted-foreground mt-5">–</span>
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">Until</label>
                    <input type="time" value={sharedEndTime}
                      onChange={e => setSharedEndTime(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {days.map(day => (
                    <div key={day} className="flex items-center gap-3">
                      <span className="w-24 text-sm capitalize">{day}</span>
                      <div className="flex-1">
                        <input type="time"
                          value={dayTimes[day]?.startTime ?? ''}
                          onChange={e => setDayTimes(prev => ({ ...prev, [day]: { ...prev[day], startTime: e.target.value } }))}
                          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <span className="text-muted-foreground">–</span>
                      <div className="flex-1">
                        <input type="time"
                          value={dayTimes[day]?.endTime ?? ''}
                          onChange={e => setDayTimes(prev => ({ ...prev, [day]: { ...prev[day], endTime: e.target.value } }))}
                          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {days.length === 0 && (
            <p className="text-sm text-muted-foreground">Select days above to set availability hours.</p>
          )}
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
