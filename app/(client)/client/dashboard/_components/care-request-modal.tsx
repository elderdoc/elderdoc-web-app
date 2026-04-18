'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCareRequest } from '@/domains/clients/requests'
import {
  CARE_TYPES, CARE_FREQUENCIES, DAYS_OF_WEEK, SHIFTS, CARE_DURATIONS,
  GENDER_PREFERENCES, LANGUAGES, BUDGET_TYPES, US_STATES,
} from '@/lib/constants'
import { CareRequestShell } from './care-request-shell'
import { CareRecipientModal } from './care-recipient-modal'
import type { RankedCandidate } from '@/domains/matching/match-caregivers'
import { SendOfferButton } from './send-offer-button'

interface RecipientOption {
  id: string
  name: string
  relationship: string | null
  photoUrl: string | null
}

interface Address {
  address1: string
  address2: string
  city: string
  state: string
}

interface RequestForm {
  careType: string
  recipientId: string
  recipientName: string
  address: Address
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
  careType: '', recipientId: '', recipientName: '',
  address: { address1: '', address2: '', city: '', state: '' },
  frequency: '', days: [], shifts: [], startDate: '', durationHours: 0,
  genderPref: '', languagePref: [], budgetType: '', budgetAmount: '',
  title: '', description: '',
}

interface Props {
  recipients: RecipientOption[]
}

export function CareRequestModal({ recipients: initialRecipients }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<RequestForm>(EMPTY)
  const [recipients, setRecipients] = useState<RecipientOption[]>(initialRecipients)
  const [generated, setGenerated] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [matchingState, setMatchingState] = useState<'matching' | 'results' | 'error'>('matching')
  const [candidates, setCandidates] = useState<RankedCandidate[]>([])
  const [matchRequestId, setMatchRequestId] = useState<string | null>(null)

  function reset() {
    setStep(1)
    setForm(EMPTY)
    setGenerated(false)
    setMatchingState('matching')
    setCandidates([])
    setMatchRequestId(null)
  }

  function handleClose() {
    reset()
    setOpen(false)
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1)
    else handleClose()
  }

  function handleNext() { setStep((s) => s + 1) }

  function toggleMulti(field: 'days' | 'shifts' | 'languagePref', key: string) {
    setForm((f) => ({
      ...f,
      [field]: (f[field] as string[]).includes(key)
        ? (f[field] as string[]).filter((v) => v !== key)
        : [...(f[field] as string[]), key],
    }))
  }

  function handleRecipientSelect(id: string) {
    const rec = recipients.find((r) => r.id === id)
    setForm((f) => ({ ...f, recipientId: id, recipientName: rec?.name ?? '' }))
  }

  function handleNewRecipientCreated(id: string, name: string) {
    const newRec: RecipientOption = { id, name, relationship: null, photoUrl: null }
    setRecipients((prev) => [...prev, newRec])
    setForm((f) => ({ ...f, recipientId: id, recipientName: name }))
    setStep(3)
  }

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/care-request/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careType: form.careType,
          recipientName: form.recipientName,
          conditions: [],
          mobility: undefined,
          frequency: form.frequency,
          days: form.days,
          shifts: form.shifts,
          duration: String(form.durationHours),
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
      const descMatch = fullText.match(/^DESCRIPTION:\s*([\s\S]+)$/m)
      if (titleMatch) setForm((f) => ({ ...f, title: titleMatch[1].trim() }))
      if (descMatch) setForm((f) => ({ ...f, description: descMatch[1].trim() }))
      setGenerated(true)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createCareRequest({
        recipientId:   form.recipientId,
        careType:      form.careType,
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
      const requestId = result?.id ?? null
      setMatchRequestId(requestId)
      setMatchingState('matching')
      setStep(7)
      router.refresh()

      if (!requestId) {
        setMatchingState('error')
        return
      }

      try {
        const res = await fetch('/api/care-request/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
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
    form.careType.length > 0,
    form.recipientId.length > 0,
    form.address.address1.trim().length > 0 && form.address.city.trim().length > 0 && form.address.state.length > 0,
    form.frequency.length > 0 && form.days.length > 0 && form.shifts.length > 0 && form.startDate.length > 0 && form.durationHours > 0,
    form.genderPref.length > 0,
    form.title.trim().length > 0 && form.description.trim().length > 0,
  ]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
      >
        + Care Request
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-2xl rounded-xl bg-background p-8 shadow-xl max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>

            <CareRequestShell
              currentStep={step}
              title={
                step === 1 ? 'What type of care is needed?' :
                step === 2 ? 'Who needs care?' :
                step === 3 ? 'Where will care take place?' :
                step === 4 ? 'Schedule' :
                step === 5 ? 'Preferences' :
                step === 6 ? 'Review & generate' :
                'Your Top Matches'
              }
              onBack={handleBack}
              onNext={handleNext}
              onSubmit={handleSubmit}
              isSubmitting={isPending}
              nextDisabled={!stepValid[step - 1]}
              submitDisabled={!stepValid[5]}
              hideActions={step === 7}
            >
              {/* Step 1 — Care Type */}
              {step === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  {CARE_TYPES.map((ct) => (
                    <button
                      key={ct.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, careType: ct.key }))}
                      className={[
                        'rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors text-left',
                        form.careType === ct.key
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50',
                      ].join(' ')}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2 — Select Recipient */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {recipients.map((r) => {
                      const initials = r.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleRecipientSelect(r.id)}
                          className={[
                            'flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-sm text-left transition-colors',
                            form.recipientId === r.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50',
                          ].join(' ')}
                        >
                          {r.photoUrl ? (
                            <img src={r.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
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
                  <div>
                    <label className="block text-sm font-medium mb-1">Address Line 1 *</label>
                    <input
                      type="text"
                      value={form.address.address1}
                      onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, address1: e.target.value } }))}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={form.address.address2}
                      onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, address2: e.target.value } }))}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">City *</label>
                      <input
                        type="text"
                        value={form.address.city}
                        onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">State *</label>
                      <select
                        value={form.address.state}
                        onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, state: e.target.value } }))}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <option value="">Select state</option>
                        {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Country</label>
                    <input type="text" value="United States" disabled className="w-full rounded-md border border-border px-3 py-2 text-sm bg-muted" />
                  </div>
                </div>
              )}

              {/* Step 4 — Schedule */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Frequency *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CARE_FREQUENCIES.map((f) => (
                        <button key={f.key} type="button"
                          onClick={() => setForm((fm) => ({ ...fm, frequency: f.key }))}
                          className={['rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors', form.frequency === f.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
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
                          className={['rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors', form.days.includes(d.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                          {d.label.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3">Time of Day *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SHIFTS.map((s) => (
                        <button key={s.key} type="button"
                          onClick={() => toggleMulti('shifts', s.key)}
                          className={['rounded-lg border-2 px-3 py-2 text-sm text-left transition-colors', form.shifts.includes(s.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                          <p className="font-medium">{s.label}</p>
                          <p className="text-xs text-muted-foreground">{s.time}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Start Date *</label>
                      <input type="date" value={form.startDate}
                        onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-3">Duration *</label>
                      <div className="flex flex-wrap gap-2">
                        {CARE_DURATIONS.map((d) => (
                          <button key={d.key} type="button"
                            onClick={() => setForm((f) => ({ ...f, durationHours: d.hours }))}
                            className={['rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors', form.durationHours === d.hours ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5 — Preferences */}
              {step === 5 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Caregiver Gender Preference *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {GENDER_PREFERENCES.map((g) => (
                        <button key={g.key} type="button"
                          onClick={() => setForm((f) => ({ ...f, genderPref: g.key }))}
                          className={['rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors', form.genderPref === g.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
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
                          className={['rounded-lg border-2 px-3 py-2 text-sm transition-colors', form.languagePref.includes(l.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
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
                          className={['rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors', form.budgetType === b.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                          {b.label}
                        </button>
                      ))}
                    </div>
                    {form.budgetType && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-1">Budget Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <input type="number" min="0" value={form.budgetAmount}
                            onChange={(e) => setForm((f) => ({ ...f, budgetAmount: e.target.value }))}
                            className="w-full rounded-md border border-border pl-7 pr-3 py-2 text-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 6 — AI Generation */}
              {step === 6 && (
                <div className="space-y-5">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
                    >
                      {isGenerating ? 'Generating…' : generated ? 'Regenerate' : 'Generate with AI'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      maxLength={100}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      placeholder="Generate or type a title…"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      maxLength={500}
                      rows={5}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none"
                      placeholder="Generate or write a description…"
                    />
                    <p className="text-right text-xs text-muted-foreground mt-1">{form.description.length}/500</p>
                  </div>
                </div>
              )}

              {/* Step 7 — AI Matching */}
              {step === 7 && (
                <div className="space-y-4">
                  {matchingState === 'matching' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <p className="text-sm text-muted-foreground">Finding your best matches…</p>
                    </div>
                  )}

                  {matchingState === 'error' && (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Could not load matches right now. Your request is live — caregivers can still apply directly.
                    </p>
                  )}

                  {matchingState === 'results' && candidates.length === 0 && (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No matches found right now. Your request is live — caregivers can still apply directly.
                    </p>
                  )}

                  {matchingState === 'results' && candidates.length > 0 && (
                    <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1">
                      {candidates.map((c) => {
                        const initials = (c.name ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
                        const scoreBadge =
                          c.score >= 80 ? { label: 'Strong match', cls: 'bg-green-100 text-green-700' } :
                          c.score >= 60 ? { label: 'Good match',   cls: 'bg-blue-100 text-blue-700' } :
                                          { label: 'Possible match', cls: 'bg-muted text-muted-foreground' }
                        return (
                          <div key={c.caregiverId} className="rounded-xl border border-border bg-card p-4">
                            <div className="flex items-start gap-3">
                              {c.image ? (
                                <img src={c.image} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />
                              ) : (
                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shrink-0">
                                  {initials}
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm">{c.name ?? 'Caregiver'}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreBadge.cls}`}>
                                    {scoreBadge.label}
                                  </span>
                                </div>
                                {(c.city || c.state) && (
                                  <p className="text-xs text-muted-foreground">{[c.city, c.state].filter(Boolean).join(', ')}</p>
                                )}
                                {c.headline && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{c.headline}</p>
                                )}
                                {c.careTypes.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {c.careTypes.map((ct) => (
                                      <span key={ct} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                        {ct.replace(/-/g, ' ')}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {(c.hourlyMin || c.hourlyMax) && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    ${c.hourlyMin}–${c.hourlyMax}/hr
                                  </p>
                                )}
                                {c.reason && (
                                  <p className="text-xs italic text-muted-foreground mt-1.5">{c.reason}</p>
                                )}
                              </div>
                            </div>
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
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </CareRequestShell>
          </div>
        </div>
      )}
    </>
  )
}
