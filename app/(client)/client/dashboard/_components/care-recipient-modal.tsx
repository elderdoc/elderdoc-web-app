'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCareRecipient } from '@/domains/clients/requests'
import { RELATIONSHIPS, CONDITIONS, MOBILITY_LEVELS, GENDER_OPTIONS } from '@/lib/constants'
import { CareRecipientShell } from './care-recipient-shell'

interface RecipientForm {
  relationship: string
  name: string
  dob: string
  phone: string
  gender: string
  photoUrl: string
  conditions: string[]
  mobilityLevel: string
  notes: string
}

const EMPTY: RecipientForm = {
  relationship: '', name: '', dob: '', phone: '', gender: '',
  photoUrl: '', conditions: [], mobilityLevel: '', notes: '',
}

interface Props {
  onRecipientCreated?: (id: string, name: string) => void
  triggerLabel?: string
}

export function CareRecipientModal({ onRecipientCreated, triggerLabel }: Props = {}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [myselfSelected, setMyselfSelected] = useState(false)
  const [form, setForm] = useState<RecipientForm>(EMPTY)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setStep(1)
    setMyselfSelected(false)
    setForm(EMPTY)
    setPhotoPreview(null)
  }

  function handleClose() {
    reset()
    setOpen(false)
  }

  function handleRelationshipSelect(key: string) {
    setForm((f) => ({ ...f, relationship: key }))
    if (key === 'myself') {
      setMyselfSelected(true)
      setStep(4)
    } else {
      setMyselfSelected(false)
    }
  }

  function handleBack() {
    if (step === 4 && myselfSelected) { setStep(1); return }
    if (step > 1) setStep((s) => s - 1)
    else handleClose()
  }

  function handleNext() {
    setStep((s) => s + 1)
  }

  function toggleCondition(key: string) {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.includes(key)
        ? f.conditions.filter((c) => c !== key)
        : [...f.conditions, key],
    }))
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const json = await res.json()
    if (json.url) {
      setForm((f) => ({ ...f, photoUrl: json.url }))
      setPhotoPreview(json.url)
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await createCareRecipient({
        relationship: form.relationship,
        name:         form.name,
        dob:          form.dob || undefined,
        phone:        form.phone || undefined,
        gender:       form.gender || undefined,
        photoUrl:     form.photoUrl || undefined,
        conditions:   form.conditions,
        mobilityLevel:form.mobilityLevel || undefined,
        notes:        form.notes || undefined,
      })
      if (onRecipientCreated) {
        onRecipientCreated(result.id, form.name)
      } else {
        router.refresh()
      }
      handleClose()
    })
  }

  const step1Valid = form.relationship.length > 0
  const step2Valid = form.name.trim().length > 0
  const step3Valid = form.mobilityLevel.length > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
      >
        {triggerLabel ?? '+ Add Recipient'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-lg rounded-xl bg-background p-8 shadow-xl max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground text-lg leading-none"
              aria-label="Close"
            >
              ✕
            </button>

            <CareRecipientShell
              currentStep={step}
              title={
                step === 1 ? 'Who are you caring for?' :
                step === 2 ? 'Basic information' :
                step === 3 ? 'Health & mobility' :
                'Additional notes'
              }
              onBack={handleBack}
              onNext={handleNext}
              onSave={handleSave}
              isSaving={isPending}
              nextDisabled={
                step === 1 ? !step1Valid :
                step === 2 ? !step2Valid :
                step === 3 ? !step3Valid :
                false
              }
            >
              {/* Step 1 — Relationship */}
              {step === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  {RELATIONSHIPS.map((rel) => (
                    <button
                      key={rel.key}
                      type="button"
                      onClick={() => handleRelationshipSelect(rel.key)}
                      className={[
                        'rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors text-left',
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Photo (optional)</label>
                    <div className="flex items-center gap-4">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground text-xl">?</span>
                      )}
                      <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
                        Browse
                        <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date of Birth</label>
                    <input
                      type="text"
                      value={form.dob}
                      onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      placeholder="MM/DD/YYYY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      placeholder="(555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Gender</label>
                    <div className="grid grid-cols-2 gap-2">
                      {GENDER_OPTIONS.map((g) => (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, gender: g.key }))}
                          className={[
                            'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                            form.gender === g.key
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border hover:border-primary/50',
                          ].join(' ')}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 — Health & Mobility */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Conditions</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CONDITIONS.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => toggleCondition(c.key)}
                          className={[
                            'rounded-lg border-2 px-3 py-2 text-sm text-left transition-colors',
                            form.conditions.includes(c.key)
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border hover:border-primary/50',
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
                            'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                            form.mobilityLevel === m.key
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border hover:border-primary/50',
                          ].join(' ')}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4 — Notes */}
              {step === 4 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Additional notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    maxLength={500}
                    rows={5}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none"
                    placeholder="Any helpful context for caregivers…"
                  />
                  <p className="text-right text-xs text-muted-foreground">{form.notes.length}/500</p>
                </div>
              )}
            </CareRecipientShell>
          </div>
        </div>
      )}
    </>
  )
}
