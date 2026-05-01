'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCareRecipient } from '@/domains/clients/requests'
import { RELATIONSHIPS, CONDITIONS, MOBILITY_LEVELS, GENDER_OPTIONS } from '@/lib/constants'
import { formatUSPhone } from '@/lib/phone'
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

export function CareRecipientModal({ onRecipientCreated, triggerLabel }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [myselfSelected, setMyselfSelected] = useState(false)
  const [form, setForm] = useState<RecipientForm>(EMPTY)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setStep(1)
    setMyselfSelected(false)
    setForm(EMPTY)
    setPhotoPreview(null)
    setPhotoError(null)
  }

  function handleClose() {
    reset()
    setOpen(false)
  }

  function handleRelationshipSelect(key: string) {
    if (key === 'myself') {
      setForm((f) => ({ ...f, relationship: key, name: 'Myself' }))
      setMyselfSelected(true)
      setStep(4)
    } else {
      setForm((f) => ({ ...f, relationship: key, name: f.name === 'Myself' ? '' : f.name }))
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
    setPhotoError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        setPhotoError('Upload failed. Please try again.')
        return
      }
      const json = await res.json()
      if (json.url) {
        setForm((f) => ({ ...f, photoUrl: json.url }))
        setPhotoPreview(json.url)
      }
    } catch {
      setPhotoError('Upload failed. Please try again.')
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
        className="group/add relative flex items-center justify-center rounded-[16px] border-2 border-dashed border-border bg-card/50 p-4 text-[14px] font-medium text-foreground/70 transition-all hover:border-primary/40 hover:bg-[var(--forest-soft)]/40 hover:text-primary hover:-translate-y-0.5"
      >
        <span className="inline-flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--forest-soft)] text-[var(--forest-deep)] transition-transform group-hover/add:scale-110">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          {triggerLabel ?? 'Add new recipient'}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/15 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-[18px] bg-card p-6 sm:p-8 shadow-[0_24px_48px_-12px_rgba(15,20,16,0.18)] border border-border max-h-[90vh] flex flex-col overflow-y-auto">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted text-foreground/70 hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <CareRecipientShell
              currentStep={step}
              skippedSteps={myselfSelected ? [2, 3] : []}
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
                <div className="grid grid-cols-2 gap-2.5">
                  {RELATIONSHIPS.map((rel) => {
                    const selected = form.relationship === rel.key
                    return (
                      <button
                        key={rel.key}
                        type="button"
                        onClick={() => handleRelationshipSelect(rel.key)}
                        className={[
                          'group/rel relative w-full overflow-hidden rounded-[14px] border-2 p-4 text-left transition-all duration-200',
                          selected
                            ? 'border-primary bg-[var(--forest-soft)] shadow-[0_4px_16px_-8px_rgba(15,77,52,0.32)] -translate-y-0.5'
                            : 'border-border bg-card hover:border-primary/40 hover:bg-[var(--forest-soft)]/40 hover:-translate-y-0.5',
                        ].join(' ')}
                      >
                        {selected && (
                          <div className="pointer-events-none absolute right-[-30px] top-[-30px] h-[100px] w-[100px] rounded-full bg-primary/15" />
                        )}
                        <div className="relative flex items-center justify-between gap-2">
                          <span className="text-[14px] font-semibold tracking-[-0.005em]">{rel.label}</span>
                          {selected && (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <svg width="10" height="8" viewBox="0 0 12 9" fill="none">
                                <path d="M1 4.5L4.5 8L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
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
                    {photoError && (
                      <p className="mt-1 text-xs text-destructive">{photoError}</p>
                    )}
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
                      onChange={(e) => setForm((f) => ({ ...f, phone: formatUSPhone(e.target.value) }))}
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
