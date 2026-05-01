'use client'

import { useState, useTransition, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCareRequest, saveCareRequestCarePlan } from '@/domains/clients/requests'
import { CarePlanStep, CarePlanState, EMPTY_CARE_PLAN } from './care-plan-step'
import {
  CARE_TYPES, CARE_FREQUENCIES, DAYS_OF_WEEK,
  GENDER_PREFERENCES, LANGUAGES, BUDGET_TYPES,
  INFECTION_CONTROL_ITEMS, SAFETY_MEASURE_ITEMS, CLIENT_STATUS_GROUPS,
} from '@/lib/constants'
import { MapPin, Heart, Users, CalendarDays, ClipboardList, Settings2, BookOpen, Sparkles, DollarSign, Brain, Activity, Stethoscope } from 'lucide-react'
import { LoadingQuotes } from '@/components/loading-quotes'
import { StateSelect } from '@/components/state-select'
import { DatePicker } from '@/components/date-picker'
import { TimeDropdown } from '@/components/ui/time-dropdown'
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
  endDate: string
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
  languagesPreferred: string[]
  languagesRequired: string[]
  requireLanguages: boolean
  budgetType: string
  budgetMin: string
  budgetMax: string
  title: string
  description: string
  carePlan: CarePlanState
}

const EMPTY: RequestForm = {
  careTypes: [], recipientId: '', recipientName: '',
  address: { address1: '', address2: '', city: '', state: '' },
  frequency: '', schedule: [], startDate: '', endDate: '',
  suppliesNeeded: '',
  infectionControlEnabled: false,
  infectionControl: {},
  safetyMeasuresEnabled: false,
  safetyMeasures: {},
  careRequestClientStatus: {},
  sameTimeEveryDay: true, sharedStartTime: '', sharedEndTime: '', dayTimes: {},
  genderPref: '', transportationPref: '', languagesPreferred: [], languagesRequired: [], requireLanguages: false, budgetType: '', budgetMin: '', budgetMax: '',
  title: '', description: '',
  carePlan: EMPTY_CARE_PLAN,
}

const STEP_META = [
  { icon: Heart,         short: 'Care type',     title: 'What type of care is needed?',         sub: 'Select all that apply — you can choose more than one.' },
  { icon: Users,         short: 'Recipient',     title: 'Who are we finding care for?',          sub: 'Select the person receiving care, or add someone new.' },
  { icon: MapPin,        short: 'Location',      title: 'Where will care take place?',           sub: 'This is the address where the caregiver will work.' },
  { icon: CalendarDays,  short: 'Schedule',      title: 'When and how often is care needed?',    sub: 'Set the frequency, days, shift times, and start date.' },
  { icon: ClipboardList, short: 'Care details',  title: 'Any special care requirements?',        sub: 'Supplies, safety measures, and health status of the recipient.' },
  { icon: Settings2,     short: 'Preferences',   title: 'Caregiver preferences & budget',        sub: 'Gender, transportation, languages, and your pay range.' },
  { icon: BookOpen,      short: 'Care plan',     title: 'Build the care plan',                   sub: 'Optional shift-by-shift instructions the caregiver will see.' },
  { icon: Sparkles,      short: 'Review',        title: 'Review & finalize your listing',        sub: 'Generate a polished description, then submit for matching.' },
] as const

const CARE_TYPE_META: Record<string, { icon: React.ElementType; desc: string }> = {
  'personal-care':          { icon: Heart,        desc: 'Bathing, dressing, grooming, and daily hygiene' },
  'companionship':          { icon: Users,         desc: 'Social visits, errands, and emotional support' },
  'dementia-care':          { icon: Brain,         desc: 'Specialized memory care and cognitive support' },
  'mobility-assistance':    { icon: Activity,      desc: 'Safe movement, transfers, and fall prevention' },
  'post-hospital-recovery': { icon: Stethoscope,   desc: 'Recovery support after surgery or hospitalisation' },
}

const inputCls = 'w-full rounded-[10px] border border-border bg-card h-11 px-3.5 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow'
const labelCls = 'block text-[13px] font-medium text-foreground/80 mb-1.5'

interface Props {
  initialRecipients: RecipientOption[]
  initialRecipientId?: string
  avgRatesByCareType: Record<string, { min: number; max: number }>
}

function recipientAddressToForm(addr: RecipientOption['address']): RequestForm['address'] {
  return {
    address1: addr?.address1 ?? '',
    address2: addr?.address2 ?? '',
    city:     addr?.city ?? '',
    state:    addr?.state ?? '',
  }
}

export function NewRequestForm({ initialRecipients, initialRecipientId, avgRatesByCareType }: Props) {
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
  const [increment, setIncrement] = useState<15 | 30 | 60>(30)
  const [copyMenuDay, setCopyMenuDay] = useState<string | null>(null)

  function toggleMulti(field: 'careTypes', key: string) {
    setForm((f) => ({
      ...f,
      [field]: (f[field] as string[]).includes(key)
        ? (f[field] as string[]).filter((v) => v !== key)
        : [...(f[field] as string[]), key],
    }))
  }

  function togglePreferredLanguage(key: string) {
    setForm(f => ({
      ...f,
      languagesPreferred: f.languagesPreferred.includes(key)
        ? f.languagesPreferred.filter(v => v !== key)
        : [...f.languagesPreferred, key],
    }))
  }

  function toggleRequiredLanguage(key: string) {
    setForm(f => ({
      ...f,
      languagesRequired: f.languagesRequired.includes(key)
        ? f.languagesRequired.filter(v => v !== key)
        : [...f.languagesRequired, key],
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
          languages: form.languagesPreferred,
          budgetType: form.budgetType || undefined,
          budgetMin: form.budgetMin || undefined,
          budgetMax: form.budgetMax || undefined,
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
          endDate:       form.endDate || undefined,
          suppliesNeeded: form.suppliesNeeded || undefined,
          infectionControl: { enabled: form.infectionControlEnabled, ...form.infectionControl },
          safetyMeasures:   { enabled: form.safetyMeasuresEnabled, ...form.safetyMeasures },
          clientStatus:     Object.keys(form.careRequestClientStatus).length > 0
            ? form.careRequestClientStatus : undefined,
          genderPref:         form.genderPref || undefined,
          transportationPref: form.transportationPref || undefined,
          languagesPreferred: form.languagesPreferred,
          languagesRequired:  form.languagesRequired,
          budgetType:  form.budgetType || undefined,
          budgetMin:   form.budgetMin || undefined,
          budgetMax:   form.budgetMax || undefined,
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
    form.genderPref.length > 0 && form.transportationPref.length > 0 && form.budgetType.length > 0 && form.budgetMin.trim().length > 0 && form.budgetMax.trim().length > 0,
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
      if (!form.budgetMin.trim()) return 'Enter a minimum rate.'
      if (!form.budgetMax.trim()) return 'Enter a maximum rate.'
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
    <div className="px-6 md:px-8 py-10 md:py-14 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      {!isFinalStep && (
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-10">
          <Link href="/client/dashboard/requests" className="hover:text-foreground transition-colors">
            Care requests
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">New request</span>
        </div>
      )}

      {/* Step dot indicator */}
      {!isFinalStep && (
        <div className="mb-10">
          <div className="flex items-center">
            {Array.from({ length: 8 }, (_, i) => {
              const n = i + 1
              const done = n < step
              const current = n === step
              return (
                <Fragment key={n}>
                  <button
                    type="button"
                    onClick={() => { if (done) setStep(n) }}
                    title={STEP_META[i].short}
                    className={[
                      'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200',
                      done
                        ? 'bg-primary text-primary-foreground shadow-[0_2px_6px_-2px_rgba(15,77,52,0.5)] hover:bg-[var(--forest-deep)] cursor-pointer'
                        : current
                        ? 'bg-primary text-primary-foreground ring-[3px] ring-primary/25 shadow-[0_2px_6px_-2px_rgba(15,77,52,0.4)]'
                        : 'bg-muted text-muted-foreground/60 cursor-default',
                    ].join(' ')}
                  >
                    {done ? (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : n}
                  </button>
                  {n < 8 && (
                    <div className={['flex-1 h-[2px] rounded-full mx-1 transition-all duration-500', n < step ? 'bg-primary' : 'bg-border'].join(' ')} />
                  )}
                </Fragment>
              )
            })}
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-[12px] text-muted-foreground tabular-nums">Step {step} of 8</span>
            <span className="text-[12px] text-muted-foreground">·</span>
            <span className="text-[12px] font-semibold text-foreground">{STEP_META[step - 1].short}</span>
          </div>
        </div>
      )}

      {/* Step header */}
      {!isFinalStep && (() => {
        const StepIcon = STEP_META[step - 1].icon
        return (
          <div className="mb-10">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--forest-soft)]">
              <StepIcon className="h-5 w-5 text-[var(--forest-deep)]" />
            </div>
            <h1 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.025em] leading-[1.1]">
              {STEP_META[step - 1].title}
            </h1>
            <p className="mt-2.5 text-[15px] text-muted-foreground leading-relaxed">
              {STEP_META[step - 1].sub}
            </p>
          </div>
        )
      })()}

      {/* Step 1 — Care Type (multi-select) */}
      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CARE_TYPES.map((ct) => {
            const selected = form.careTypes.includes(ct.key)
            const meta = CARE_TYPE_META[ct.key]
            const CtIcon = meta?.icon
            return (
              <button
                key={ct.key}
                type="button"
                onClick={() => toggleMulti('careTypes', ct.key)}
                className={[
                  'group/ct relative w-full overflow-hidden rounded-[16px] border-2 p-5 text-left transition-all duration-200',
                  selected
                    ? 'border-primary bg-[var(--forest-soft)] shadow-[0_8px_24px_-10px_rgba(15,77,52,0.4)] -translate-y-0.5'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-[var(--forest-soft)]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(15,77,52,0.18)]',
                ].join(' ')}
              >
                {selected && (
                  <div className="pointer-events-none absolute right-[-30px] top-[-30px] h-[120px] w-[120px] rounded-full bg-primary/15" />
                )}
                <div className="relative">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {CtIcon && (
                      <div className={[
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                        selected ? 'bg-primary/15 text-[var(--forest-deep)]' : 'bg-muted text-muted-foreground group-hover/ct:bg-[var(--forest-soft)] group-hover/ct:text-[var(--forest-deep)]',
                      ].join(' ')}>
                        <CtIcon className="h-4 w-4" />
                      </div>
                    )}
                    {selected && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                          <path d="M1 4.5L4.5 8L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] font-semibold tracking-[-0.005em] leading-tight">{ct.label}</p>
                  {meta?.desc && <p className="mt-1 text-[12.5px] text-muted-foreground leading-snug">{meta.desc}</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Step 2 — Recipient */}
      {step === 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recipients.map((r) => {
            const initials = r.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
            const selected = form.recipientId === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRecipientSelect(r)}
                className={[
                  'group/rec relative w-full overflow-hidden rounded-[16px] border-2 p-4 text-left transition-all duration-200',
                  selected
                    ? 'border-primary bg-[var(--forest-soft)] shadow-[0_8px_24px_-10px_rgba(15,77,52,0.4)] -translate-y-0.5'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-[var(--forest-soft)]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(15,77,52,0.18)]',
                ].join(' ')}
              >
                {selected && (
                  <div className="pointer-events-none absolute right-[-30px] top-[-30px] h-[120px] w-[120px] rounded-full bg-primary/15" />
                )}
                <div className="relative flex items-center gap-3">
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover shrink-0 ring-2 ring-card" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-semibold text-primary-foreground ring-2 ring-card">
                      {initials}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold tracking-[-0.005em] truncate">{r.name}</p>
                    {r.relationship && <p className="text-[12.5px] text-muted-foreground capitalize">{r.relationship.replace(/-/g, ' ')}</p>}
                  </div>
                  {selected && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                        <path d="M1 4.5L4.5 8L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </div>
              </button>
            )
          })}
          <CareRecipientModal
            onRecipientCreated={handleNewRecipientCreated}
            triggerLabel="+ Add New Recipient"
          />
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
            <label className={labelCls}>Address Line 1 *</label>
            <input type="text" value={form.address.address1}
              onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, address1: e.target.value } }))}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Address Line 2</label>
            <input type="text" value={form.address.address2}
              onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, address2: e.target.value } }))}
              className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>City *</label>
              <input type="text" value={form.address.city}
                onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>State *</label>
              <StateSelect
                value={form.address.state}
                onChange={(val) => setForm((f) => ({ ...f, address: { ...f.address, state: val } }))}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Country</label>
            <input type="text" value="United States" disabled
              className="w-full rounded-[10px] border border-border bg-muted h-11 px-3.5 text-[14px] opacity-60" />
          </div>
        </div>
      )}

      {/* Step 4 — Schedule */}
      {step === 4 && (
        <div className="space-y-8">
          <div>
            <label className={labelCls}>Frequency *</label>
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

          {/* Time increment selector */}
          {form.frequency && form.frequency !== 'as-needed' && (
            <div>
              <label className={labelCls}>Time increment</label>
              <div className="flex gap-2">
                {([15, 30, 60] as const).map(inc => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setIncrement(inc)}
                    className={[
                      'rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                      increment === inc ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                    ].join(' ')}
                  >
                    {inc === 60 ? '1 hr' : `${inc} min`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Shift time — all frequencies except as-needed */}
          {form.frequency && form.frequency !== 'as-needed' && (
            <div>
              <label className={labelCls}>Shift Time *</label>
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
                    <TimeDropdown
                      value={form.sharedStartTime}
                      onChange={v => setForm(f => ({ ...f, sharedStartTime: v }))}
                      increment={increment}
                      placeholder="Start time"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">–</span>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">To</label>
                    <TimeDropdown
                      value={form.sharedEndTime}
                      onChange={v => setForm(f => ({ ...f, sharedEndTime: v }))}
                      increment={increment}
                      placeholder="End time"
                      minTime={form.sharedStartTime || undefined}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.schedule.map(s => {
                    const otherDays = form.schedule.map(sd => sd.day).filter(d => d !== s.day)
                    return (
                      <div key={s.day} className="flex items-center gap-2 flex-wrap">
                        <span className="w-28 text-sm capitalize">{s.day}</span>
                        <TimeDropdown
                          value={form.dayTimes[s.day]?.startTime ?? ''}
                          onChange={v => setForm(f => ({ ...f, dayTimes: { ...f.dayTimes, [s.day]: { ...f.dayTimes[s.day], startTime: v } } }))}
                          increment={increment}
                          placeholder="Start"
                        />
                        <span className="text-muted-foreground">–</span>
                        <TimeDropdown
                          value={form.dayTimes[s.day]?.endTime ?? ''}
                          onChange={v => setForm(f => ({ ...f, dayTimes: { ...f.dayTimes, [s.day]: { ...f.dayTimes[s.day], endTime: v } } }))}
                          increment={increment}
                          placeholder="End"
                          minTime={form.dayTimes[s.day]?.startTime || undefined}
                        />
                        {otherDays.length > 0 && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setCopyMenuDay(copyMenuDay === s.day ? null : s.day)}
                              className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted text-muted-foreground"
                            >
                              Copy to…
                            </button>
                            {copyMenuDay === s.day && (
                              <div className="absolute top-full mt-1 left-0 z-10 bg-card border border-border rounded-lg shadow-md py-1 min-w-[120px]">
                                {otherDays.map(target => (
                                  <button
                                    key={target}
                                    type="button"
                                    onClick={() => {
                                      const src = form.dayTimes[s.day]
                                      setForm(f => ({
                                        ...f,
                                        dayTimes: {
                                          ...f.dayTimes,
                                          [target]: { startTime: src?.startTime ?? '', endTime: src?.endTime ?? '' },
                                        },
                                      }))
                                      setCopyMenuDay(null)
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-sm capitalize hover:bg-muted"
                                  >
                                    {target}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          <div>
            <label className={labelCls}>Start Date *</label>
            <DatePicker
              value={form.startDate}
              onChange={(val) => setForm((f) => ({ ...f, startDate: val }))}
              placeholder="Select start date"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              upward
            />
          </div>
          <div>
            <label className={labelCls}>
              End date <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <DatePicker
              value={form.endDate}
              onChange={(val) => setForm((f) => ({ ...f, endDate: val }))}
              placeholder="Select end date"
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
            <label className={labelCls}>Supplies needed <span className="font-normal text-muted-foreground">(optional)</span></label>
            <textarea
              value={form.suppliesNeeded}
              onChange={e => setForm(f => ({ ...f, suppliesNeeded: e.target.value }))}
              rows={3}
              className="w-full rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow resize-none"
              placeholder="e.g. Gloves, masks, gown, hand sanitizer"
            />
          </div>

          {/* Infection control */}
          <div>
            <label className={labelCls}>Infection control precautions</label>
            <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5 gap-0.5 mb-3">
              {['Yes', 'No'].map(opt => (
                <button key={opt} type="button"
                  onClick={() => setForm(f => ({ ...f, infectionControlEnabled: opt === 'Yes' }))}
                  className={['h-8 rounded-full px-5 text-[12.5px] font-medium transition-all',
                    (opt === 'Yes' ? form.infectionControlEnabled : !form.infectionControlEnabled)
                      ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/70 hover:text-foreground',
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
            <label className={labelCls}>Safety measures</label>
            <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5 gap-0.5 mb-3">
              {['Yes', 'No'].map(opt => (
                <button key={opt} type="button"
                  onClick={() => setForm(f => ({ ...f, safetyMeasuresEnabled: opt === 'Yes' }))}
                  className={['h-8 rounded-full px-5 text-[12.5px] font-medium transition-all',
                    (opt === 'Yes' ? form.safetyMeasuresEnabled : !form.safetyMeasuresEnabled)
                      ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/70 hover:text-foreground',
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
            <label className={labelCls}>Recipient status <span className="font-normal text-muted-foreground">(optional)</span></label>
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
                              className="w-full rounded-[10px] border border-border bg-card h-9 px-3 text-[13px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow"
                              placeholder="e.g. left leg below knee" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Other considerations</label>
                <input type="text"
                  value={typeof form.careRequestClientStatus.other === 'string' ? form.careRequestClientStatus.other : ''}
                  onChange={e => setForm(f => ({ ...f, careRequestClientStatus: { ...f.careRequestClientStatus, other: e.target.value } }))}
                  className={inputCls}
                  placeholder="Specify any other relevant status…" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Diet</label>
                <input
                  type="text"
                  value={typeof form.careRequestClientStatus.diet === 'string' ? form.careRequestClientStatus.diet : ''}
                  onChange={e => setForm(f => ({ ...f, careRequestClientStatus: { ...f.careRequestClientStatus, diet: e.target.value } }))}
                  className={inputCls}
                  placeholder="e.g. Diabetic, low sodium, pureed…"
                />
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
            <label className="block text-sm font-medium mb-2">Languages Preferred</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {LANGUAGES.map((l) => (
                <button key={l.key} type="button"
                  onClick={() => togglePreferredLanguage(l.key)}
                  className={['rounded-xl border-2 px-4 py-2 text-sm transition-colors', form.languagesPreferred.includes(l.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                  {l.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
              <input
                type="checkbox"
                checked={form.requireLanguages}
                onChange={e => setForm(f => ({ ...f, requireLanguages: e.target.checked, languagesRequired: e.target.checked ? f.languagesRequired : [] }))}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm">Require specific languages</span>
            </label>
            {form.requireLanguages && (
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Languages Required</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => (
                    <button key={l.key} type="button"
                      onClick={() => toggleRequiredLanguage(l.key)}
                      className={['rounded-xl border-2 px-4 py-2 text-sm transition-colors', form.languagesRequired.includes(l.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">
              {form.budgetType === 'daily'
                ? 'Please enter your daily rate for this job *'
                : 'Please enter your hourly rate for this job *'}
            </label>
            <div className="flex gap-2 mb-4">
              {BUDGET_TYPES.map((b) => (
                <button key={b.key} type="button"
                  onClick={() => setForm((f) => ({ ...f, budgetType: b.key, budgetMin: '', budgetMax: '' }))}
                  className={['rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors', form.budgetType === b.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                  {b.label}
                </button>
              ))}
            </div>
            {form.budgetType && (() => {
              const SMIN = 10, SMAX = 100
              const isDaily = form.budgetType === 'daily'
              const unit = isDaily ? '/day' : '/hr'
              const thumbCls = 'appearance-none bg-transparent absolute inset-0 w-full h-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:bg-transparent'

              const avgLines = form.careTypes.map(ct => {
                const avg = avgRatesByCareType[ct]
                if (!avg) return null
                const typeLabel = ct.replace(/-/g, ' ')
                return (
                  <p key={ct} className="text-xs text-muted-foreground capitalize">
                    {typeLabel} jobs typically price <span className="font-medium text-foreground">${avg.min}–${avg.max}{unit}</span>
                  </p>
                )
              }).filter(Boolean)

              if (isDaily) {
                const val = Math.min(Math.max(Number(form.budgetMin) || SMIN, SMIN), SMAX)
                const valPct = ((val - SMIN) / (SMAX - SMIN)) * 100
                return (
                  <div className="space-y-4">
                    <div className="px-1">
                      <div className="relative h-5 flex items-center">
                        <div className="absolute inset-x-0 h-[5px] rounded-full bg-muted" />
                        <div className="absolute h-[5px] rounded-full bg-primary" style={{ left: 0, right: `${100 - valPct}%` }} />
                        <input
                          type="range" min={SMIN} max={SMAX} value={val}
                          onChange={e => {
                            const v = String(e.target.value)
                            setForm(f => ({ ...f, budgetMin: v, budgetMax: v }))
                          }}
                          className={thumbCls}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">$10</span>
                        <span className="text-xs text-muted-foreground">$100+</span>
                      </div>
                    </div>
                    <div className="max-w-[200px]">
                      <label className="block text-[13px] font-medium text-foreground/80 mb-1.5">Daily rate</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <input
                          type="number" min={SMIN} value={form.budgetMin}
                          onChange={e => setForm(f => ({ ...f, budgetMin: e.target.value, budgetMax: e.target.value }))}
                          className="w-full rounded-[10px] border border-border bg-card h-11 pl-8 pr-3 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow"
                          placeholder="—"
                        />
                      </div>
                    </div>
                    {avgLines.length > 0 && <div className="space-y-1">{avgLines}</div>}
                  </div>
                )
              }

              const lo = Math.min(Math.max(Number(form.budgetMin) || SMIN, SMIN), SMAX)
              const hi = Math.min(Math.max(Number(form.budgetMax) || SMAX, SMIN), SMAX)
              const loPct = ((lo - SMIN) / (SMAX - SMIN)) * 100
              const hiPct = ((hi - SMIN) / (SMAX - SMIN)) * 100

              return (
                <div className="space-y-4">
                  <div className="px-1">
                    <div className="relative h-5 flex items-center">
                      <div className="absolute inset-x-0 h-[5px] rounded-full bg-muted" />
                      <div
                        className="absolute h-[5px] rounded-full bg-primary"
                        style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
                      />
                      <input
                        type="range" min={SMIN} max={SMAX} value={lo}
                        onChange={e => {
                          const v = Number(e.target.value)
                          setForm(f => ({ ...f, budgetMin: String(v) }))
                          if (v > hi) setForm(f => ({ ...f, budgetMax: String(v) }))
                        }}
                        style={{ zIndex: lo >= hi - 2 ? 5 : 3 }}
                        className={thumbCls}
                      />
                      <input
                        type="range" min={SMIN} max={SMAX} value={hi}
                        onChange={e => {
                          const v = Number(e.target.value)
                          setForm(f => ({ ...f, budgetMax: String(v) }))
                          if (v < lo) setForm(f => ({ ...f, budgetMin: String(v) }))
                        }}
                        style={{ zIndex: lo >= hi - 2 ? 3 : 5 }}
                        className={thumbCls}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">$10</span>
                      <span className="text-xs text-muted-foreground">$100+</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-foreground/80 mb-1.5">Min rate</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <input
                          type="number" min={SMIN} value={form.budgetMin}
                          onChange={e => setForm(f => ({ ...f, budgetMin: e.target.value }))}
                          className="w-full rounded-[10px] border border-border bg-card h-11 pl-8 pr-3 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow"
                          placeholder="10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-foreground/80 mb-1.5">Max rate</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <input
                          type="number" min={SMIN} value={form.budgetMax}
                          onChange={e => setForm(f => ({ ...f, budgetMax: e.target.value }))}
                          className="w-full rounded-[10px] border border-border bg-card h-11 pl-8 pr-3 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow"
                          placeholder="100+"
                        />
                      </div>
                    </div>
                  </div>
                  {avgLines.length > 0 && <div className="space-y-1">{avgLines}</div>}
                </div>
              )
            })()}
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
          {/* Summary card */}
          <div className="rounded-[16px] border border-border bg-muted/30 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Request overview</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {form.careTypes.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Care type</p>
                  <div className="flex flex-wrap gap-1">
                    {form.careTypes.map(ct => (
                      <span key={ct} className="text-[12px] px-2.5 py-0.5 rounded-full bg-[var(--forest-soft)] text-[var(--forest-deep)] font-medium capitalize">{ct.replace(/-/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              )}
              {form.recipientName && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Recipient</p>
                  <p className="text-[14px] font-medium">{form.recipientName}</p>
                </div>
              )}
              {(form.address.city || form.address.state) && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Location</p>
                  <p className="text-[14px] font-medium">{[form.address.city, form.address.state].filter(Boolean).join(', ')}</p>
                </div>
              )}
              {form.frequency && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Schedule</p>
                  <p className="text-[14px] font-medium capitalize">
                    {form.frequency.replace(/-/g, ' ')}
                    {form.schedule.length > 0 ? ` · ${form.schedule.length} day${form.schedule.length !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
              )}
              {form.budgetMin && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Budget</p>
                  <p className="text-[14px] font-medium">
                    ${form.budgetMin}
                    {form.budgetMax && form.budgetMax !== form.budgetMin ? `–$${form.budgetMax}` : ''}
                    {form.budgetType === 'daily' ? '/day' : '/hr'}
                  </p>
                </div>
              )}
              {form.genderPref && form.genderPref !== 'no-preference' && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Caregiver</p>
                  <p className="text-[14px] font-medium capitalize">{form.genderPref.replace(/-/g, ' ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* AI generate */}
          <div className="rounded-[16px] border border-dashed border-primary/30 bg-[var(--forest-soft)]/50 p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--forest-soft)]">
                <Sparkles className="h-4 w-4 text-[var(--forest-deep)]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold">AI-powered description</p>
                <p className="text-[12.5px] text-muted-foreground mt-0.5">Generate a polished listing based on your care details.</p>
              </div>
            </div>
            <button type="button" onClick={handleGenerate} disabled={isGenerating}
              className="w-full h-10 rounded-[10px] bg-primary text-primary-foreground text-[13.5px] font-semibold disabled:opacity-40 transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_6px_16px_-4px_rgba(15,77,52,0.4)] flex items-center justify-center gap-2">
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating…
                </>
              ) : generated ? (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Regenerate
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate description
                </>
              )}
            </button>
          </div>

          <div>
            <label className={labelCls}>Title *</label>
            <input type="text" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={100}
              className={inputCls}
              placeholder="e.g. In-home personal care for elderly parent in Boston" />
          </div>
          <div>
            <label className={labelCls}>Description *</label>
            <textarea value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={500} rows={6}
              className="w-full rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow resize-none"
              placeholder="Describe what a typical day looks like, any special needs, and what you're looking for in a caregiver…" />
            <p className="text-right text-[12px] text-muted-foreground mt-1">{form.description.length}/500</p>
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
        <div className="pt-8 mt-10 border-t border-border">
          {!isLastStep && stepHint[step - 1] && !stepValid[step - 1] && (
            <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {stepHint[step - 1]}
            </div>
          )}
          {isLastStep && stepHint[7] && !stepValid[7] && (
            <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {stepHint[7]}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => step > 1 ? setStep((s) => s - 1) : router.push('/client/dashboard/requests')}
              className="group/back inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-card px-5 text-[14px] font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-muted"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover/back:-translate-x-0.5">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {step > 1 ? 'Back' : 'Cancel'}
            </button>
            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !stepValid[7]}
                className="group/cta inline-flex h-11 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:hover:shadow-none"
              >
                {isPending ? 'Submitting…' : 'Submit request'}
                {!isPending && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover/cta:translate-x-0.5">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 7 ? false : !stepValid[step - 1]}
                className="group/cta inline-flex h-11 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:hover:shadow-none"
              >
                Continue
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover/cta:translate-x-0.5">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
