'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCareRequest, saveCareRequestCarePlan } from '@/domains/clients/requests'
import { CarePlanStep, CarePlanState, EMPTY_CARE_PLAN } from './care-plan-step'
import {
  CARE_TYPES, CARE_FREQUENCIES, DAYS_OF_WEEK,
  GENDER_PREFERENCES, LANGUAGES, BUDGET_TYPES,
  INFECTION_CONTROL_ITEMS, SAFETY_MEASURE_ITEMS, CLIENT_STATUS_GROUPS,
} from '@/lib/constants'
import { MapPin } from 'lucide-react'
import { LoadingQuotes } from '@/components/loading-quotes'
import { StateSelect } from '@/components/state-select'
import { DatePicker } from '@/components/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { CareRecipientModal } from '../../../_components/care-recipient-modal'
import { SendOfferButton } from '../../../_components/send-offer-button'
import type { RankedCandidate } from '@/domains/matching/match-caregivers'

interface RecipientOption {
  id: string
  name: string
  relationship: string | null
  photoUrl: string | null
  address: { address1?: string; address2?: string; city?: string; state?: string } | null
  conditions: string[] | null
  mobilityLevel: string | null
  height: string | null
  weight: string | null
  clientStatus: Record<string, boolean | string> | null
}

interface RequestForm {
  careTypes: string[]
  recipientId: string
  recipientName: string
  address: { address1: string; address2: string; city: string; state: string }
  frequency: string
  schedule: Array<{ day: string; startTime: string; endTime: string }>
  startDate: string
  suppliesNeeded: string
  infectionControlEnabled: boolean
  infectionControl: Record<string, boolean>
  safetyMeasuresEnabled: boolean
  safetyMeasures: Record<string, boolean>
  careRequestClientStatus: Record<string, boolean | string>
  sameTimeEveryDay: boolean
  sharedStartTime: string
  sharedEndTime: string
  dayTimes: Record<string, { startTime: string; endTime: string }>
  genderPref: string
  transportationPref: string
  languagePref: string[]
  budgetType: string
  budgetAmount: string
  title: string
  description: string
  carePlan: CarePlanState
}

const EMPTY: RequestForm = {
  careTypes: [], recipientId: '', recipientName: '',
  address: { address1: '', address2: '', city: '', state: '' },
  frequency: '', schedule: [], startDate: '',
  suppliesNeeded: '',
  infectionControlEnabled: false,
  infectionControl: {},
  safetyMeasuresEnabled: false,
  safetyMeasures: {},
  careRequestClientStatus: {},
  sameTimeEveryDay: true, sharedStartTime: '', sharedEndTime: '', dayTimes: {},
  genderPref: '', transportationPref: '', languagePref: [], budgetType: '', budgetAmount: '',
  title: '', description: '',
  carePlan: EMPTY_CARE_PLAN,
}

const STEP_TITLES = [
  'What type of care is needed?',
  'Who needs care?',
  'Where will care take place?',
  'Schedule',
  'Care Details',
  'Preferences',
  'Care Plan',
  'Review & generate',
  'Your Top Matches',
]

interface Props {
  initialRecipients: RecipientOption[]
  initialRecipientId?: string
  avgHourlyMin: number | null
  avgHourlyMax: number | null
}

function recipientAddressToForm(addr: RecipientOption['address']): RequestForm['address'] {
  return {
    address1: addr?.address1 ?? '',
    address2: addr?.address2 ?? '',
    city:     addr?.city ?? '',
    state:    addr?.state ?? '',
  }
}

export function NewRequestForm({ initialRecipients, initialRecipientId, avgHourlyMin, avgHourlyMax }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const preselected = initialRecipientId
    ? initialRecipients.find((r) => r.id === initialRecipientId)
    : undefined
  const [form, setForm] = useState<RequestForm>({
    ...EMPTY,
    recipientId:   preselected?.id ?? '',
    recipientName: preselected?.name ?? '',
    address:       preselected?.address ? recipientAddressToForm(preselected.address) : EMPTY.address,
  })
  const [useRecipientAddress, setUseRecipientAddress] = useState(true)
  const [recipients, setRecipients] = useState<RecipientOption[]>(initialRecipients)
  const [generated, setGenerated] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [matchingState, setMatchingState] = useState<'matching' | 'results' | 'error'>('matching')
  const [candidates, setCandidates] = useState<RankedCandidate[]>([])
  const [matchRequestId, setMatchRequestId] = useState<string | null>(null)

  function toggleMulti(field: 'careTypes' | 'languagePref', key: string) {
    setForm((f) => ({
      ...f,
      [field]: (f[field] as string[]).includes(key)
        ? (f[field] as string[]).filter((v) => v !== key)
        : [...(f[field] as string[]), key],
    }))
  }

  function toggleDay(day: string) {
    setForm(f => {
      const selected = f.schedule.map(s => s.day)
      if (selected.includes(day)) {
        const updated = { ...f.dayTimes }
        delete updated[day]
        return { ...f, schedule: f.schedule.filter(s => s.day !== day), dayTimes: updated }
      }
      return { ...f, schedule: [...f.schedule, { day, startTime: '', endTime: '' }] }
    })
  }

  function handleNewRecipientCreated(id: string, name: string) {
    const newRec: RecipientOption = { id, name, relationship: null, photoUrl: null, address: null, conditions: null, mobilityLevel: null, height: null, weight: null, clientStatus: null }
    setRecipients((prev) => [...prev, newRec])
    setForm((f) => ({ ...f, recipientId: id, recipientName: name }))
  }

  function handleRecipientSelect(r: RecipientOption) {
    setForm((f) => ({
      ...f,
      recipientId:   r.id,
      recipientName: r.name,
      address:       useRecipientAddress && r.address ? recipientAddressToForm(r.address) : f.address,
    }))
  }

  function handleUseRecipientAddressToggle(checked: boolean) {
    setUseRecipientAddress(checked)
    if (checked) {
      const selected = recipients.find((r) => r.id === form.recipientId)
      if (selected?.address) {
        setForm((f) => ({ ...f, address: recipientAddressToForm(selected.address) }))
      }
    }
  }

  async function handleGenerate() {
    setIsGenerating(true)
    const selectedRecipient = recipients.find(r => r.id === form.recipientId)
    try {
      const res = await fetch('/api/care-request/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careType: form.careTypes[0] ?? '',
          conditions: selectedRecipient?.conditions ?? [],
          mobilityLevel: selectedRecipient?.mobilityLevel ?? undefined,
          height: selectedRecipient?.height ?? undefined,
          weight: selectedRecipient?.weight ?? undefined,
          clientStatus: selectedRecipient?.clientStatus ?? undefined,
          frequency: form.frequency,
          days: form.schedule.map(s => s.day),
          shifts: form.schedule.map(s => `${form.sameTimeEveryDay ? form.sharedStartTime : (form.dayTimes[s.day]?.startTime ?? '')}–${form.sameTimeEveryDay ? form.sharedEndTime : (form.dayTimes[s.day]?.endTime ?? '')}`),
          languages: form.languagePref,
          budgetType: form.budgetType || undefined,
          budgetAmount: form.budgetAmount || undefined,
          suppliesNeeded: form.suppliesNeeded || undefined,
          infectionControl: form.infectionControlEnabled ? form.infectionControl : undefined,
          safetyMeasures: form.safetyMeasuresEnabled ? form.safetyMeasures : undefined,
          careRequestClientStatus: Object.keys(form.careRequestClientStatus).length > 0 ? form.careRequestClientStatus : undefined,
        }),
      })
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
      }
      const titleMatch = fullText.match(/^TITLE:\s*(.+)$/m)
      const descMatch  = fullText.match(/^DESCRIPTION:\s*([\s\S]+)$/m)
      if (titleMatch) setForm((f) => ({ ...f, title: titleMatch[1].trim() }))
      if (descMatch)  setForm((f) => ({ ...f, description: descMatch[1].trim() }))
      setGenerated(true)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      let result: { id: string }
      try {
        result = await createCareRequest({
          recipientId:   form.recipientId,
          careType:      form.careTypes[0] ?? '',
          address:       form.address,
          frequency:     form.frequency,
          schedule:      form.schedule.map(s => ({
            day:       s.day,
            startTime: form.sameTimeEveryDay ? form.sharedStartTime : (form.dayTimes[s.day]?.startTime ?? ''),
            endTime:   form.sameTimeEveryDay ? form.sharedEndTime   : (form.dayTimes[s.day]?.endTime ?? ''),
          })),
          startDate:     form.startDate,
          suppliesNeeded: form.suppliesNeeded || undefined,
          infectionControl: { enabled: form.infectionControlEnabled, ...form.infectionControl },
          safetyMeasures:   { enabled: form.safetyMeasuresEnabled, ...form.safetyMeasures },
          clientStatus:     Object.keys(form.careRequestClientStatus).length > 0
            ? form.careRequestClientStatus : undefined,
          genderPref:         form.genderPref || undefined,
          transportationPref: form.transportationPref || undefined,
          languagePref:       form.languagePref,
          budgetType:    form.budgetType || undefined,
          budgetAmount:  form.budgetAmount || undefined,
          title:         form.title,
          description:   form.description,
        })
      } catch {
        setMatchingState('error')
        setStep(9)
        return
      }

      const hasAnyPlan = Object.values(form.carePlan).some(arr => arr.length > 0)
      if (hasAnyPlan) {
        await saveCareRequestCarePlan(result.id, form.carePlan)
      }

      setMatchRequestId(result.id)
      setMatchingState('matching')
      setStep(9)
      router.refresh()

      try {
        const res = await fetch('/api/care-request/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: result.id }),
        })
        if (!res.ok) { setMatchingState('error'); return }
        const data: RankedCandidate[] = await res.json()
        setCandidates(data)
        setMatchingState('results')
      } catch {
        setMatchingState('error')
      }
    })
  }

  const stepValid = [
    form.careTypes.length > 0,
    form.recipientId.length > 0,
    form.address.address1.trim().length > 0 && form.address.city.trim().length > 0 && form.address.state.length > 0,
    (() => {
      if (!form.frequency || !form.startDate) return false
      if (form.frequency === 'as-needed') return true
      const timesOk = form.sharedStartTime.length > 0 && form.sharedEndTime.length > 0
      if (form.frequency === 'one-time' || form.frequency === 'daily') return timesOk
      if (form.schedule.length === 0) return false
      return form.sameTimeEveryDay
        ? timesOk
        : form.schedule.every(s => form.dayTimes[s.day]?.startTime && form.dayTimes[s.day]?.endTime)
    })(),
    true, // step 5 — Care Details is optional
    form.genderPref.length > 0 && form.transportationPref.length > 0 && form.budgetType.length > 0 && form.budgetAmount.trim().length > 0,
    true, // step 7 — Care Plan is optional
    form.title.trim().length > 0 && form.description.trim().length > 0,
  ]

  const stepHint = [
    'Select at least one care type to continue.',
    'Select a care recipient to continue.',
    'Fill in address, city, and state to continue.',
    (() => {
      if (!form.frequency) return 'Select how often care is needed.'
      if (!form.startDate) return 'Select a start date.'
      if (form.frequency === 'as-needed') return null
      const timesOk = form.sharedStartTime.length > 0 && form.sharedEndTime.length > 0
      if ((form.frequency === 'weekly' || form.frequency === 'bi-weekly') && form.schedule.length === 0) return 'Select at least one day.'
      if (!form.sameTimeEveryDay) {
        const missing = form.schedule.some(s => !form.dayTimes[s.day]?.startTime || !form.dayTimes[s.day]?.endTime)
        if (missing) return 'Set shift times for all selected days.'
      } else if (!timesOk) return 'Set shift start and end times.'
      return null
    })(),
    null,
    (() => {
      if (!form.genderPref) return 'Select a caregiver gender preference.'
      if (!form.transportationPref) return 'Select a transportation preference.'
      if (!form.budgetType) return 'Select a budget type.'
      if (!form.budgetAmount.trim()) return `Enter a ${form.budgetType === 'hourly' ? 'hourly rate' : 'weekly amount'}.`
      return null
    })(),
    null,
    (() => {
      if (!form.title.trim()) return 'Add a title for your request.'
      if (!form.description.trim()) return 'Add a description for your request.'
      return null
    })(),
  ]

  const isLastStep = step === 8
  const isFinalStep = step === 9

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {!isFinalStep && (
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs text-muted-foreground hover:text-foreground mb-6 inline-block"
        >
          ← Back to Requests
        </button>
      )}

      {/* Progress */}
      {!isFinalStep && (
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={[
                'flex-1 h-1.5 rounded-full transition-colors',
                i < step ? 'bg-primary' : 'bg-muted',
              ].join(' ')}
            />
          ))}
        </div>
      )}

      {!isFinalStep && (
        <p className="text-xs text-muted-foreground mb-1">Step {step} of 8</p>
      )}
      <h1 className="text-2xl font-semibold mb-8">{STEP_TITLES[step - 1]}</h1>

      {/* Step 1 — Care Type (multi-select) */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Select all that apply.</p>
          <div className="grid grid-cols-2 gap-3">
            {CARE_TYPES.map((ct) => (
              <button
                key={ct.key}
                type="button"
                onClick={() => toggleMulti('careTypes', ct.key)}
                className={[
                  'rounded-xl border-2 px-5 py-4 text-sm font-medium transition-colors text-left',
                  form.careTypes.includes(ct.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Recipient */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {recipients.map((r) => {
              const initials = r.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRecipientSelect(r)}
                  className={[
                    'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm text-left transition-colors',
                    form.recipientId === r.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shrink-0">
                      {initials}
                    </span>
                  )}
                  <div>
                    <p className="font-medium">{r.name}</p>
                    {r.relationship && <p className="text-xs text-muted-foreground capitalize">{r.relationship.replace(/-/g, ' ')}</p>}
                  </div>
                </button>
              )
            })}
            <CareRecipientModal
              onRecipientCreated={handleNewRecipientCreated}
              triggerLabel="+ Add New Recipient"
            />
          </div>
        </div>
      )}

      {/* Step 3 — Address */}
      {step === 3 && (
        <div className="space-y-4">
          {form.recipientId && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useRecipientAddress}
                onChange={(e) => handleUseRecipientAddressToggle(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm">Use {form.recipientName || 'care recipient'}'s location</span>
            </label>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Address Line 1 *</label>
            <input type="text" value={form.address.address1}
              onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, address1: e.target.value } }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address Line 2</label>
            <input type="text" value={form.address.address2}
              onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, address2: e.target.value } }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City *</label>
              <input type="text" value={form.address.city}
                onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State *</label>
              <StateSelect
                value={form.address.state}
                onChange={(val) => setForm((f) => ({ ...f, address: { ...f.address, state: val } }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <input type="text" value="United States" disabled
              className="w-full rounded-lg border border-border px-4 py-3 text-sm bg-muted" />
          </div>
        </div>
      )}

      {/* Step 4 — Schedule */}
      {step === 4 && (
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium mb-3">Frequency *</label>
            <div className="grid grid-cols-3 gap-2">
              {CARE_FREQUENCIES.map((f) => (
                <button key={f.key} type="button"
                  onClick={() => setForm(fm => {
                    const ALL_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
                    if (f.key === 'daily') {
                      return { ...fm, frequency: f.key, sameTimeEveryDay: true,
                        schedule: ALL_DAYS.map(d => ({ day: d, startTime: fm.sharedStartTime, endTime: fm.sharedEndTime })) }
                    }
                    if (f.key === 'one-time' || f.key === 'as-needed') {
                      return { ...fm, frequency: f.key, sameTimeEveryDay: true, schedule: [] }
                    }
                    return { ...fm, frequency: f.key, schedule: [] }
                  })}
                  className={['rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-colors', form.frequency === f.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Days — only for weekly/bi-weekly */}
          {(form.frequency === 'weekly' || form.frequency === 'bi-weekly') && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium">Days *</label>
                <div className="flex gap-2">
                  {[
                    { label: 'All',      days: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] },
                    { label: 'Weekdays', days: ['monday','tuesday','wednesday','thursday','friday'] },
                    { label: 'Weekends', days: ['saturday','sunday'] },
                    { label: 'Reset',    days: [] },
                  ].map(({ label, days }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setForm(f => {
                        const newDayTimes = { ...f.dayTimes }
                        Object.keys(newDayTimes).forEach(k => { if (!days.includes(k)) delete newDayTimes[k] })
                        return {
                          ...f,
                          schedule: days.map(d => f.schedule.find(s => s.day === d) ?? { day: d, startTime: '', endTime: '' }),
                          dayTimes: newDayTimes,
                        }
                      })}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((d) => (
                  <button key={d.key} type="button"
                    onClick={() => toggleDay(d.key)}
                    className={['rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors', form.schedule.some(s => s.day === d.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                    {d.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Daily — informational banner */}
          {form.frequency === 'daily' && (
            <p className="text-sm text-muted-foreground bg-muted rounded-lg px-4 py-3">
              Care will be provided every day of the week.
            </p>
          )}

          {/* Shift time — all frequencies except as-needed */}
          {form.frequency && form.frequency !== 'as-needed' && (
            <div>
              <label className="block text-sm font-medium mb-3">Shift Time *</label>
              {(form.frequency === 'weekly' || form.frequency === 'bi-weekly') && form.schedule.length > 0 && (
                <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sameTimeEveryDay}
                    onChange={e => setForm(f => ({ ...f, sameTimeEveryDay: e.target.checked }))}
                    className="rounded border-border"
                  />
                  Same time every day
                </label>
              )}
              {(form.frequency === 'one-time' || form.frequency === 'daily' ||
                ((form.frequency === 'weekly' || form.frequency === 'bi-weekly') && (form.sameTimeEveryDay || form.schedule.length === 0))) ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">From</label>
                    <TimePicker value={form.sharedStartTime} onChange={v => setForm(f => ({ ...f, sharedStartTime: v }))} />
                  </div>
                  <span className="text-muted-foreground mt-5">–</span>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">To</label>
                    <TimePicker value={form.sharedEndTime} onChange={v => setForm(f => ({ ...f, sharedEndTime: v }))} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.schedule.map(s => (
                    <div key={s.day} className="flex items-center gap-3 flex-wrap">
                      <span className="w-28 text-sm capitalize">{s.day}</span>
                      <TimePicker
                        value={form.dayTimes[s.day]?.startTime ?? ''}
                        onChange={v => setForm(f => ({ ...f, dayTimes: { ...f.dayTimes, [s.day]: { ...f.dayTimes[s.day], startTime: v } } }))}
                      />
                      <span className="text-muted-foreground">–</span>
                      <TimePicker
                        value={form.dayTimes[s.day]?.endTime ?? ''}
                        onChange={v => setForm(f => ({ ...f, dayTimes: { ...f.dayTimes, [s.day]: { ...f.dayTimes[s.day], endTime: v } } }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Start Date *</label>
            <DatePicker
              value={form.startDate}
              onChange={(val) => setForm((f) => ({ ...f, startDate: val }))}
              placeholder="Select start date"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              upward
            />
          </div>
        </div>
      )}

      {/* Step 5 — Care Details */}
      {step === 5 && (
        <div className="space-y-8">
          {/* Supplies needed */}
          <div>
            <label className="block text-sm font-medium mb-2">Supplies needed (optional)</label>
            <textarea
              value={form.suppliesNeeded}
              onChange={e => setForm(f => ({ ...f, suppliesNeeded: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none resize-none"
              placeholder="e.g. Gloves, masks, gown, hand sanitizer"
            />
          </div>

          {/* Infection control */}
          <div>
            <label className="block text-sm font-medium mb-3">Infection control precautions</label>
            <div className="flex gap-3 mb-3">
              {['Yes', 'No'].map(opt => (
                <button key={opt} type="button"
                  onClick={() => setForm(f => ({ ...f, infectionControlEnabled: opt === 'Yes' }))}
                  className={['rounded-xl border-2 px-5 py-2 text-sm font-medium transition-colors',
                    (opt === 'Yes' ? form.infectionControlEnabled : !form.infectionControlEnabled)
                      ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}>
                  {opt}
                </button>
              ))}
            </div>
            {form.infectionControlEnabled && (
              <div className="flex flex-wrap gap-2">
                {INFECTION_CONTROL_ITEMS.map(item => (
                  <button key={item.key} type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      infectionControl: {
                        ...f.infectionControl,
                        [item.key]: !f.infectionControl[item.key],
                      },
                    }))}
                    className={['rounded-xl border-2 px-4 py-2.5 text-sm transition-colors',
                      form.infectionControl[item.key] ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                    ].join(' ')}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Safety measures */}
          <div>
            <label className="block text-sm font-medium mb-3">Safety measures</label>
            <div className="flex gap-3 mb-3">
              {['Yes', 'No'].map(opt => (
                <button key={opt} type="button"
                  onClick={() => setForm(f => ({ ...f, safetyMeasuresEnabled: opt === 'Yes' }))}
                  className={['rounded-xl border-2 px-5 py-2 text-sm font-medium transition-colors',
                    (opt === 'Yes' ? form.safetyMeasuresEnabled : !form.safetyMeasuresEnabled)
                      ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}>
                  {opt}
                </button>
              ))}
            </div>
            {form.safetyMeasuresEnabled && (
              <div className="flex flex-wrap gap-2">
                {SAFETY_MEASURE_ITEMS.map(item => (
                  <button key={item.key} type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      safetyMeasures: {
                        ...f.safetyMeasures,
                        [item.key]: !f.safetyMeasures[item.key],
                      },
                    }))}
                    className={['rounded-xl border-2 px-4 py-2.5 text-sm transition-colors',
                      form.safetyMeasures[item.key] ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                    ].join(' ')}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recipient status */}
          <div>
            <label className="block text-sm font-medium mb-4">Recipient status (optional)</label>
            <div className="space-y-6">
              {CLIENT_STATUS_GROUPS.map(group => (
                <div key={group.label}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{group.label}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map(item => {
                      const checked = !!form.careRequestClientStatus[item.key]
                      return (
                        <div key={item.key} className="flex flex-col gap-1">
                          <button type="button"
                            onClick={() => setForm(f => {
                              const s = { ...f.careRequestClientStatus }
                              if (s[item.key]) { delete s[item.key] } else { s[item.key] = true }
                              return { ...f, careRequestClientStatus: s }
                            })}
                            className={['rounded-xl border-2 px-4 py-3 text-sm text-left transition-colors',
                              checked ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                            ].join(' ')}>
                            {item.label}
                          </button>
                          {checked && item.key === 'amputee' && (
                            <input type="text"
                              value={typeof form.careRequestClientStatus.amputeeDetails === 'string' ? form.careRequestClientStatus.amputeeDetails : ''}
                              onChange={e => setForm(f => ({ ...f, careRequestClientStatus: { ...f.careRequestClientStatus, amputeeDetails: e.target.value } }))}
                              className="rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-none"
                              placeholder="e.g. left leg below knee" />
                          )}
                          {checked && item.key === 'diabetic' && (
                            <input type="text"
                              value={typeof form.careRequestClientStatus.diet === 'string' ? form.careRequestClientStatus.diet : ''}
                              onChange={e => setForm(f => ({ ...f, careRequestClientStatus: { ...f.careRequestClientStatus, diet: e.target.value } }))}
                              className="rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-none"
                              placeholder="Diet details" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Other</label>
                <input type="text"
                  value={typeof form.careRequestClientStatus.other === 'string' ? form.careRequestClientStatus.other : ''}
                  onChange={e => setForm(f => ({ ...f, careRequestClientStatus: { ...f.careRequestClientStatus, other: e.target.value } }))}
                  className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="Specify any other relevant status…" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 6 — Preferences */}
      {step === 6 && (
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium mb-3">Caregiver Gender Preference *</label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_PREFERENCES.map((g) => (
                <button key={g.key} type="button"
                  onClick={() => setForm((f) => ({ ...f, genderPref: g.key }))}
                  className={['rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-colors', form.genderPref === g.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">Transportation *</label>
            <div className="space-y-2">
              {[
                { key: 'requires-vehicle',  label: 'Caregiver must have a vehicle',      desc: 'The caregiver needs their own transportation to reach the location.' },
                { key: 'client-provides',   label: 'Client will provide transportation', desc: 'We will arrange or cover transportation for the caregiver.' },
                { key: 'commute-ok',        label: 'Commuting is fine',                  desc: 'The caregiver can use public transit, rideshare, or walk.' },
                { key: 'no-preference',     label: 'No preference',                       desc: 'Transportation is not a factor for this request.' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, transportationPref: opt.key }))}
                  className={[
                    'w-full rounded-xl border-2 px-4 py-3 text-left transition-colors',
                    form.transportationPref === opt.key
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  <p className={`text-sm font-medium ${form.transportationPref === opt.key ? 'text-primary' : ''}`}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">Languages</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button key={l.key} type="button"
                  onClick={() => toggleMulti('languagePref', l.key)}
                  className={['rounded-xl border-2 px-4 py-2 text-sm transition-colors', form.languagePref.includes(l.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">Budget Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {BUDGET_TYPES.map((b) => (
                <button key={b.key} type="button"
                  onClick={() => setForm((f) => ({ ...f, budgetType: b.key }))}
                  className={['rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors', form.budgetType === b.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                  {b.label}
                </button>
              ))}
            </div>
            {form.budgetType && (
              <div className="mt-3 space-y-2">
                <label className="block text-sm font-medium mb-1">
                  {form.budgetType === 'hourly' ? 'Hourly Rate *' : 'Weekly Amount *'}
                </label>
                {form.budgetType === 'hourly' && avgHourlyMin !== null && avgHourlyMax !== null && (
                  <p className="text-xs text-muted-foreground">
                    Average caregiver rate: <span className="font-medium text-foreground">${avgHourlyMin}–${avgHourlyMax}/hr</span>
                  </p>
                )}
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input type="number" min="0" value={form.budgetAmount}
                    onChange={(e) => setForm((f) => ({ ...f, budgetAmount: e.target.value }))}
                    className="w-full rounded-lg border border-border pl-8 pr-4 py-3 text-sm focus:border-primary focus:outline-none" />
                </div>
                {form.budgetType === 'hourly' && avgHourlyMin !== null && avgHourlyMax !== null && form.budgetAmount && (
                  (() => {
                    const amt = Number(form.budgetAmount)
                    if (amt > 0 && (amt < avgHourlyMin || amt > avgHourlyMax)) {
                      return (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          This rate is outside the average range and may result in fewer matches.
                        </p>
                      )
                    }
                    return null
                  })()
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 7 — Care Plan */}
      {step === 7 && (
        <CarePlanStep
          value={form.carePlan}
          onChange={plan => setForm(f => ({ ...f, carePlan: plan }))}
        />
      )}

      {/* Step 8 — Review & Generate */}
      {step === 8 && (
        <div className="space-y-6">
          <div className="flex justify-center">
            <button type="button" onClick={handleGenerate} disabled={isGenerating}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
              {isGenerating ? 'Generating…' : generated ? 'Regenerate suggestion' : 'Suggest a description'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={100}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Generate or type a title…" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={500} rows={6}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm resize-none focus:border-primary focus:outline-none"
              placeholder="Generate or write a description…" />
            <p className="text-right text-xs text-muted-foreground mt-1">{form.description.length}/500</p>
          </div>
        </div>
      )}

      {/* Step 9 — Matches */}
      {step === 9 && (
        <div className="space-y-4">
          {matchingState === 'matching' && (
            <LoadingQuotes label="Finding your best matches…" />
          )}

          {matchingState === 'error' && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-4">
                Could not load matches right now. Your request is live — caregivers can still apply directly.
              </p>
              <Link href="/client/dashboard/requests" className="text-sm text-primary hover:underline">
                View your requests →
              </Link>
            </div>
          )}

          {matchingState === 'results' && candidates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-4">
                No matches found right now. Your request is live — caregivers can still apply directly.
              </p>
              <Link href="/client/dashboard/requests" className="text-sm text-primary hover:underline">
                View your requests →
              </Link>
            </div>
          )}

          {matchingState === 'results' && candidates.length > 0 && (
            <>
              <div className="space-y-4">
                {candidates.map((c, idx) => {
                  const initials = (c.name ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
                  const ratingNum = c.rating ? Number(c.rating) : null
                  const greenBadges: string[] = []
                  const redBadges:   string[] = []
                  if (c.proximityMiles !== null && c.proximityMiles <= 25)        greenBadges.push('Close to you')
                  if (ratingNum && ratingNum >= 4.5)                              greenBadges.push('Highly rated')
                  else if (ratingNum && ratingNum >= 4.0)                         greenBadges.push('Well rated')
                  if (c.completedJobs >= 10)                                      greenBadges.push(`${c.completedJobs} jobs completed`)
                  else if (c.completedJobs >= 3)                                  greenBadges.push(`${c.completedJobs} jobs done`)
                  if (c.hasVehicle && c.hasDriversLicense)                       greenBadges.push('Has a vehicle')
                  if (c.proximityMiles !== null && c.proximityMiles > 100)        redBadges.push('Far from you')
                  if (!ratingNum)                                                  redBadges.push('No reviews yet')
                  if (c.completedJobs === 0)                                      redBadges.push('No jobs on platform yet')
                  return (
                    <div key={c.caregiverId} className="rounded-xl border border-border bg-card p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {idx + 1}
                          </div>
                          {c.image ? (
                            <img src={c.image} alt="" className="h-14 w-14 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                              {initials}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{c.name ?? 'Caregiver'}</p>
                              {ratingNum && (
                                <span className="flex items-center gap-0.5 text-xs text-amber-500 font-medium">
                                  ★ {ratingNum.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-primary shrink-0">{c.score}% match</span>
                          </div>
                          {c.distanceLabel && (
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {c.distanceLabel} away
                            </p>
                          )}
                          {c.headline && <p className="text-sm text-muted-foreground mt-0.5">{c.headline}</p>}
                          {(greenBadges.length > 0 || redBadges.length > 0) && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {greenBadges.map(b => (
                                <span key={b} className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                                  {b}
                                </span>
                              ))}
                              {redBadges.map(b => (
                                <span key={b} className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}
                          {c.careTypes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {c.careTypes.map((ct) => (
                                <span key={ct} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {ct.replace(/-/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                          {(c.hourlyMin || c.hourlyMax) && (
                            <p className="text-sm text-muted-foreground mt-1">${c.hourlyMin}–${c.hourlyMax}/hr</p>
                          )}
                          {c.reason && (
                            <p className="text-sm italic text-muted-foreground mt-2">{c.reason}</p>
                          )}
                          <div className="mt-3 flex justify-end">
                            {matchRequestId && (
                              <SendOfferButton
                                requestId={matchRequestId}
                                caregiverId={c.caregiverId}
                                caregiverName={c.name}
                                score={c.score}
                                reason={c.reason}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="pt-6 text-center space-y-1">
                <p className="text-sm text-muted-foreground">Not seeing the right fit?</p>
                <Link
                  href={matchRequestId ? `/client/dashboard/find-caregivers?requestId=${matchRequestId}` : '/client/dashboard/find-caregivers'}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Browse all caregivers →
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      {!isFinalStep && (
        <div className="pt-8 mt-8 border-t border-border">
          {!isLastStep && stepHint[step - 1] && !stepValid[step - 1] && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center mb-3">
              {stepHint[step - 1]}
            </p>
          )}
          {isLastStep && stepHint[7] && !stepValid[7] && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center mb-3">
              {stepHint[7]}
            </p>
          )}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => step > 1 ? setStep((s) => s - 1) : router.push('/client/dashboard/requests')}
              className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Back
            </button>
            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !stepValid[7]}
                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
              >
                {isPending ? 'Submitting…' : 'Submit Request'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 7 ? false : !stepValid[step - 1]}
                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
