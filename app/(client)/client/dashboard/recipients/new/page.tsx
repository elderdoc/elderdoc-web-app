'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCareRecipient } from '@/domains/clients/requests'
import { RELATIONSHIPS, CONDITIONS, MOBILITY_LEVELS, GENDER_OPTIONS, CLIENT_STATUS_GROUPS } from '@/lib/constants'
import { formatUSPhone } from '@/lib/phone'

interface RecipientForm {
  relationship: string
  name: string
  dob: string
  phone: string
  gender: string
  photoUrl: string
  address1: string
  address2: string
  city: string
  state: string
  zip: string
  conditions: string[]
  mobilityLevel: string
  height: string
  weight: string
  clientStatus: Record<string, boolean | string>
  notes: string
}

const EMPTY: RecipientForm = {
  relationship: '', name: '', dob: '', phone: '', gender: '',
  photoUrl: '', address1: '', address2: '', city: '', state: '', zip: '',
  conditions: [], mobilityLevel: '',
  height: '', weight: '', clientStatus: {},
  notes: '',
}

const STEPS = [
  'Who are you caring for?',
  'Basic information',
  'Health & mobility',
  'Functional status',
  'Additional notes',
]

export default function NewRecipientPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [myselfSelected, setMyselfSelected] = useState(false)
  const [form, setForm] = useState<RecipientForm>(EMPTY)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRelationshipSelect(key: string) {
    if (key === 'myself') {
      setForm((f) => ({ ...f, relationship: key, name: 'Myself' }))
      setMyselfSelected(true)
      setStep(5)
    } else {
      setForm((f) => ({ ...f, relationship: key, name: f.name === 'Myself' ? '' : f.name }))
      setMyselfSelected(false)
    }
  }

  function handleBack() {
    if (step === 5 && myselfSelected) { setStep(1); return }
    if (step > 1) setStep((s) => s - 1)
    else router.push('/client/dashboard/recipients')
  }

  function toggleCondition(key: string) {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.includes(key)
        ? f.conditions.filter((c) => c !== key)
        : [...f.conditions, key],
    }))
  }

  function toggleStatus(key: string) {
    setForm((f) => {
      const current = f.clientStatus[key]
      const updated = { ...f.clientStatus }
      if (current) {
        delete updated[key]
      } else {
        updated[key] = true
      }
      return { ...f, clientStatus: updated }
    })
  }

  function setStatusDetail(key: string, value: string) {
    setForm((f) => ({ ...f, clientStatus: { ...f.clientStatus, [key]: value } }))
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) { setPhotoError('Upload failed. Please try again.'); return }
      const json = await res.json()
      if (json.url) { setForm((f) => ({ ...f, photoUrl: json.url })); setPhotoPreview(json.url) }
    } catch { setPhotoError('Upload failed. Please try again.') }
  }

  function handleSave() {
    startTransition(async () => {
      await createCareRecipient({
        relationship:  form.relationship,
        name:          form.name,
        dob:           form.dob || undefined,
        phone:         form.phone || undefined,
        gender:        form.gender || undefined,
        photoUrl:      form.photoUrl || undefined,
        address: (form.address1 || form.city) ? {
          address1: form.address1 || undefined,
          address2: form.address2 || undefined,
          city:     form.city || undefined,
          state:    form.state || undefined,
          zip:      form.zip || undefined,
        } : undefined,
        conditions:    form.conditions,
        mobilityLevel: form.mobilityLevel || undefined,
        height:        form.height || undefined,
        weight:        form.weight || undefined,
        clientStatus:  Object.keys(form.clientStatus).length > 0 ? form.clientStatus : undefined,
        notes:         form.notes || undefined,
      })
      router.push('/client/dashboard/recipients')
    })
  }

  const nextDisabled =
    step === 1 ? !form.relationship :
    step === 2 ? !form.name.trim() :
    step === 3 ? !form.mobilityLevel :
    false

  const totalSteps = myselfSelected ? 2 : 5
  const displayStep = myselfSelected && step === 5 ? 2 : step

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-xs text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← Back to Recipients
      </button>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={[
              'flex-1 h-1.5 rounded-full transition-colors',
              i < displayStep ? 'bg-primary' : 'bg-muted',
            ].join(' ')}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-1">Step {displayStep} of {totalSteps}</p>
      <h1 className="text-2xl font-semibold mb-8">{STEPS[step - 1]}</h1>

      {/* Step 1 — Relationship */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-3">
          {RELATIONSHIPS.map((rel) => (
            <button
              key={rel.key}
              type="button"
              onClick={() => handleRelationshipSelect(rel.key)}
              className={[
                'rounded-xl border-2 px-5 py-4 text-sm font-medium transition-colors text-left',
                form.relationship === rel.key
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50',
              ].join(' ')}
            >
              {rel.label}
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — Basic Info */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Photo (optional)</label>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground text-2xl">?</span>
              )}
              <label className="cursor-pointer rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
                Browse
                <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
              </label>
            </div>
            {photoError && <p className="mt-1 text-xs text-destructive">{photoError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Full name"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date of Birth</label>
            <input
              type="text"
              value={form.dob}
              onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
              placeholder="MM/DD/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: formatUSPhone(e.target.value) }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
              placeholder="(555) 000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">Gender</label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, gender: g.key }))}
                  className={[
                    'rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-colors',
                    form.gender === g.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <div className="space-y-3">
              <input
                type="text"
                value={form.address1}
                onChange={(e) => setForm((f) => ({ ...f, address1: e.target.value }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                placeholder="Street address line 1"
              />
              <input
                type="text"
                value={form.address2}
                onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                placeholder="Apt, suite, unit (optional)"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="City"
                />
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="State"
                />
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
                  className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="ZIP"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Health & Mobility */}
      {step === 3 && (
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium mb-3">Conditions (select all that apply)</label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCondition(c.key)}
                  className={[
                    'rounded-xl border-2 px-4 py-3 text-sm text-left transition-colors',
                    form.conditions.includes(c.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">Mobility Level *</label>
            <div className="grid grid-cols-2 gap-2">
              {MOBILITY_LEVELS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, mobilityLevel: m.key }))}
                  className={[
                    'rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors',
                    form.mobilityLevel === m.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">Height &amp; Weight</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Height</label>
                <input
                  type="text"
                  value={form.height}
                  onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                  className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder={`5'6"`}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Weight</label>
                <input
                  type="text"
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                  className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="142 lbs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Functional Status */}
      {step === 4 && (
        <div className="space-y-8">
          {CLIENT_STATUS_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{group.label}</h3>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const checked = !!form.clientStatus[item.key]
                  return (
                    <div key={item.key} className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => toggleStatus(item.key)}
                        className={[
                          'rounded-xl border-2 px-4 py-3 text-sm text-left transition-colors',
                          checked ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                        ].join(' ')}
                      >
                        {item.label}
                      </button>
                      {checked && item.key === 'amputee' && (
                        <input
                          type="text"
                          value={typeof form.clientStatus.amputeeDetails === 'string' ? form.clientStatus.amputeeDetails : ''}
                          onChange={(e) => setStatusDetail('amputeeDetails', e.target.value)}
                          className="rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-none"
                          placeholder="e.g. left leg below knee"
                        />
                      )}
                      {checked && item.key === 'diabetic' && (
                        <input
                          type="text"
                          value={typeof form.clientStatus.diet === 'string' ? form.clientStatus.diet : ''}
                          onChange={(e) => setStatusDetail('diet', e.target.value)}
                          className="rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-none"
                          placeholder="Diet details"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Other</label>
            <input
              type="text"
              value={typeof form.clientStatus.other === 'string' ? form.clientStatus.other : ''}
              onChange={(e) => setStatusDetail('other', e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Specify any other relevant status…"
            />
          </div>
        </div>
      )}

      {/* Step 5 — Notes */}
      {step === 5 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Additional notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            maxLength={500}
            rows={6}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm resize-none focus:border-primary focus:outline-none"
            placeholder="Any helpful context for caregivers…"
            autoFocus
          />
          <p className="text-right text-xs text-muted-foreground">{form.notes.length}/500</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-8 mt-8 border-t border-border">
        <button
          type="button"
          onClick={handleBack}
          className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={nextDisabled}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            {isPending ? 'Saving…' : 'Save Recipient'}
          </button>
        )}
      </div>
    </div>
  )
}
