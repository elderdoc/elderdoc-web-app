'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCareRequest } from '@/domains/clients/requests'
import {
  CARE_TYPES, CARE_FREQUENCIES, DAYS_OF_WEEK,
  GENDER_PREFERENCES, LANGUAGES, BUDGET_TYPES,
} from '@/lib/constants'
import { StateSelect } from '@/components/state-select'
import { DatePicker } from '@/components/date-picker'
import { CareRecipientModal } from '../../../_components/care-recipient-modal'
import { SendOfferButton } from '../../../_components/send-offer-button'
import type { RankedCandidate } from '@/domains/matching/match-caregivers'

interface RecipientOption {
  id: string
  name: string
  relationship: string | null
  photoUrl: string | null
  address: { address1?: string; address2?: string; city?: string; state?: string } | null
}

interface RequestForm {
  careTypes: string[]
  recipientId: string
  recipientName: string
  address: { address1: string; address2: string; city: string; state: string }
  frequency: string
  days: string[]
  shifts: string[]
  startDate: string
  durationHours: number
  genderPref: string
  languagePref: string[]
  budgetType: string
  budgetAmount: string
  title: string
  description: string
}

const EMPTY: RequestForm = {
  careTypes: [], recipientId: '', recipientName: '',
  address: { address1: '', address2: '', city: '', state: '' },
  frequency: '', days: [], shifts: [], startDate: '', durationHours: 0,
  genderPref: '', languagePref: [], budgetType: '', budgetAmount: '',
  title: '', description: '',
}

const STEP_TITLES = [
  'What type of care is needed?',
  'Who needs care?',
  'Where will care take place?',
  'Schedule',
  'Preferences',
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

  function toggleMulti(field: 'careTypes' | 'days' | 'shifts' | 'languagePref', key: string) {
    setForm((f) => ({
      ...f,
      [field]: (f[field] as string[]).includes(key)
        ? (f[field] as string[]).filter((v) => v !== key)
        : [...(f[field] as string[]), key],
    }))
  }

  function handleNewRecipientCreated(id: string, name: string) {
    const newRec: RecipientOption = { id, name, relationship: null, photoUrl: null, address: null }
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
    try {
      const res = await fetch('/api/care-request/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careType: form.careTypes[0] ?? '',
          conditions: [], frequency: form.frequency, days: form.days,
          shifts: form.shifts, duration: String(form.durationHours),
          languages: form.languagePref,
          budgetType: form.budgetType || undefined,
          budgetAmount: form.budgetAmount || undefined,
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
          days:          form.days,
          shifts:        form.shifts,
          startDate:     form.startDate,
          durationHours: form.durationHours,
          genderPref:    form.genderPref || undefined,
          languagePref:  form.languagePref,
          budgetType:    form.budgetType || undefined,
          budgetAmount:  form.budgetAmount || undefined,
          title:         form.title,
          description:   form.description,
        })
      } catch {
        setMatchingState('error')
        setStep(7)
        return
      }

      setMatchRequestId(result.id)
      setMatchingState('matching')
      setStep(7)
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
    form.frequency.length > 0 && form.days.length > 0 && form.shifts.length > 0 && form.startDate.length > 0,
    form.genderPref.length > 0,
    form.title.trim().length > 0 && form.description.trim().length > 0,
  ]

  const isLastStep = step === 6
  const isFinalStep = step === 7

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
          {Array.from({ length: 6 }).map((_, i) => (
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
        <p className="text-xs text-muted-foreground mb-1">Step {step} of 6</p>
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
                  onClick={() => setForm((fm) => ({ ...fm, frequency: f.key }))}
                  className={['rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-colors', form.frequency === f.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">Days *</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((d) => (
                <button key={d.key} type="button"
                  onClick={() => toggleMulti('days', d.key)}
                  className={['rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors', form.days.includes(d.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                  {d.label.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">Shift Time *</label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">From</label>
                <input
                  type="time"
                  value={form.shifts[0]?.split('–')[0]?.trim() ?? ''}
                  onChange={(e) => {
                    const to = form.shifts[0]?.split('–')[1]?.trim() ?? ''
                    const val = e.target.value ? `${e.target.value}–${to}` : ''
                    setForm((f) => ({ ...f, shifts: val ? [val] : [] }))
                  }}
                  className="w-full rounded-lg border border-border px-3 py-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <span className="text-muted-foreground mt-5">–</span>
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">To</label>
                <input
                  type="time"
                  value={form.shifts[0]?.split('–')[1]?.trim() ?? ''}
                  onChange={(e) => {
                    const from = form.shifts[0]?.split('–')[0]?.trim() ?? ''
                    const val = e.target.value ? `${from}–${e.target.value}` : ''
                    setForm((f) => ({ ...f, shifts: val ? [val] : [] }))
                  }}
                  className="w-full rounded-lg border border-border px-3 py-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
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

      {/* Step 5 — Preferences */}
      {step === 5 && (
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
            <label className="block text-sm font-medium mb-3">Budget Type</label>
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
                  {form.budgetType === 'hourly' ? 'Hourly Rate' : 'Weekly Amount'}
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

      {/* Step 6 — Review & Generate */}
      {step === 6 && (
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

      {/* Step 7 — Matches */}
      {step === 7 && (
        <div className="space-y-4">
          {matchingState === 'matching' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Finding your best matches…</p>
            </div>
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
                  const scoreBadge =
                    c.score >= 80 ? { label: 'Strong match', cls: 'bg-green-100 text-green-700' } :
                    c.score >= 60 ? { label: 'Good match',   cls: 'bg-blue-100 text-blue-700' } :
                                    { label: 'Possible match', cls: 'bg-muted text-muted-foreground' }
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
                              {c.rating && (
                                <span className="flex items-center gap-0.5 text-xs text-amber-500 font-medium">
                                  ★ {Number(c.rating).toFixed(1)}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreBadge.cls}`}>
                                {scoreBadge.label}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-primary shrink-0">{c.score}% match</span>
                          </div>
                          {(c.distanceLabel || c.city || c.state) && (
                            <p className="text-sm text-muted-foreground">
                              {c.distanceLabel ?? [c.city, c.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                          {c.headline && <p className="text-sm text-muted-foreground mt-0.5">{c.headline}</p>}
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
              <div className="pt-4 text-center">
                <Link href="/client/dashboard/requests" className="text-sm text-primary hover:underline">
                  View all requests →
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      {!isFinalStep && (
        <div className="flex justify-between pt-8 mt-8 border-t border-border">
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
              disabled={isPending || !stepValid[5]}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
            >
              {isPending ? 'Submitting…' : 'Submit Request'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!stepValid[step - 1]}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  )
}
