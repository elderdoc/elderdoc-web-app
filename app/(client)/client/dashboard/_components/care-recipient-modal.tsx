'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Heart, Users, Activity, Brain, AlertTriangle, Wind, Move,
  CloudRain, Zap, Eye, Volume2, Plus, Camera, Check,
} from 'lucide-react'
import { createCareRecipient } from '@/domains/clients/requests'
import { RELATIONSHIPS, CONDITIONS, MOBILITY_LEVELS, GENDER_OPTIONS } from '@/lib/constants'
import { formatUSPhone } from '@/lib/phone'
import { CareRecipientShell } from './care-recipient-shell'

const inputCls = 'w-full rounded-[10px] border border-border bg-card h-11 px-3.5 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow'
const labelCls = 'block text-[13px] font-medium text-foreground/80 mb-1.5'

const REL_ICONS: Record<string, React.ElementType> = {
  'myself': User, 'parent': Heart, 'spouse': Heart,
  'grandparent': Users, 'sibling': Users, 'other-family': Users,
}

const CONDITION_ICONS: Record<string, React.ElementType> = {
  'alzheimers': Brain, 'dementia': Brain, 'parkinsons': Activity,
  'diabetes': Activity, 'heart-disease': Heart, 'stroke': AlertTriangle,
  'copd': Wind, 'arthritis': Move, 'depression': CloudRain,
  'anxiety': Zap, 'vision-impairment': Eye, 'hearing-impairment': Volume2, 'other': Plus,
}

const MOBILITY_DESC: Record<string, string> = {
  'independent': 'Moves freely without help',
  'minimal-assistance': 'Needs occasional support',
  'moderate-assistance': 'Requires regular help',
  'full-assistance': 'Fully dependent on caregiver',
}

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

  function handleNext() { setStep((s) => s + 1) }

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
      if (!res.ok) { setPhotoError('Upload failed. Please try again.'); return }
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
        relationship:  form.relationship,
        name:          form.name,
        dob:           form.dob || undefined,
        phone:         form.phone || undefined,
        gender:        form.gender || undefined,
        photoUrl:      form.photoUrl || undefined,
        conditions:    form.conditions,
        mobilityLevel: form.mobilityLevel || undefined,
        notes:         form.notes || undefined,
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

  const STEP_SUBTITLES: Record<number, string> = {
    1: 'Select your relationship to the person receiving care.',
    2: 'Tell us a bit about the person.',
    3: 'Help caregivers understand their needs.',
    4: 'Anything else a caregiver should know? (optional)',
  }

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-[20px] bg-card shadow-[0_24px_60px_-12px_rgba(15,20,16,0.22)] border border-border max-h-[92vh] flex flex-col overflow-hidden">
            {/* Subtle header glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[180px] bg-gradient-to-b from-[var(--forest-soft)]/30 to-transparent rounded-t-[20px]" />

            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border hover:bg-muted text-foreground/60 hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <div className="relative flex-1 overflow-y-auto p-7 sm:p-8">
              <CareRecipientShell
                currentStep={step}
                skippedSteps={myselfSelected ? [2, 3] : []}
                title={
                  step === 1 ? 'Who are you caring for?' :
                  step === 2 ? 'Basic information' :
                  step === 3 ? 'Health & mobility' :
                  'Additional notes'
                }
                subtitle={STEP_SUBTITLES[step]}
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

                {/* ── Step 1: Relationship ─────────────────────────── */}
                {step === 1 && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {RELATIONSHIPS.map((rel) => {
                      const selected = form.relationship === rel.key
                      const Icon = REL_ICONS[rel.key] ?? User
                      return (
                        <button
                          key={rel.key}
                          type="button"
                          onClick={() => handleRelationshipSelect(rel.key)}
                          className={[
                            'group/rel relative w-full overflow-hidden rounded-[14px] border-2 p-4 text-left transition-all duration-200',
                            selected
                              ? 'border-primary bg-[var(--forest-soft)] shadow-[0_4px_16px_-6px_rgba(15,77,52,0.28)] -translate-y-0.5'
                              : 'border-border bg-card hover:border-primary/40 hover:bg-[var(--forest-soft)]/30 hover:-translate-y-0.5',
                          ].join(' ')}
                        >
                          {selected && (
                            <div className="pointer-events-none absolute right-[-30px] top-[-30px] h-[100px] w-[100px] rounded-full bg-primary/10" />
                          )}
                          <div className="mb-2.5">
                            <div className={[
                              'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                              selected ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground/50',
                            ].join(' ')}>
                              <Icon className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13.5px] font-semibold tracking-[-0.005em]">{rel.label}</span>
                            {selected && (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* ── Step 2: Basic Info ───────────────────────────── */}
                {step === 2 && (
                  <div className="space-y-5">
                    {/* Photo upload */}
                    <div>
                      <label className={labelCls}>Photo <span className="text-muted-foreground font-normal">(optional)</span></label>
                      <div className="flex items-center gap-4">
                        <label className="group/photo relative cursor-pointer shrink-0">
                          <div className={[
                            'h-[72px] w-[72px] rounded-2xl overflow-hidden ring-2 transition-all',
                            photoPreview ? 'ring-primary/30' : 'ring-border bg-muted',
                          ].join(' ')}>
                            {photoPreview ? (
                              <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                                <User className="h-7 w-7" />
                              </div>
                            )}
                          </div>
                          {/* Camera overlay */}
                          <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm group-hover/photo:scale-110 transition-transform">
                            <Camera className="h-3.5 w-3.5" />
                          </span>
                          <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
                        </label>
                        <div className="min-w-0">
                          <p className="text-[13px] text-foreground/70">Upload a photo to help caregivers recognize them.</p>
                          {photoError && <p className="mt-1 text-[12px] text-destructive">{photoError}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label className={labelCls}>Full name <span className="text-destructive">*</span></label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className={inputCls}
                        placeholder="e.g. Margaret Johnson"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* DOB */}
                      <div>
                        <label className={labelCls}>Date of birth</label>
                        <input
                          type="text"
                          value={form.dob}
                          onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                          className={inputCls}
                          placeholder="MM/DD/YYYY"
                        />
                      </div>
                      {/* Phone */}
                      <div>
                        <label className={labelCls}>Phone</label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: formatUSPhone(e.target.value) }))}
                          className={inputCls}
                          placeholder="(555) 000-0000"
                        />
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <label className={labelCls}>Gender</label>
                      <div className="grid grid-cols-3 gap-2">
                        {GENDER_OPTIONS.map((g) => {
                          const sel = form.gender === g.key
                          return (
                            <button
                              key={g.key}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, gender: sel ? '' : g.key }))}
                              className={[
                                'relative flex items-center justify-center rounded-[10px] border-2 h-10 px-3 text-[13px] font-medium transition-all',
                                sel
                                  ? 'border-primary bg-[var(--forest-soft)] text-[var(--forest-deep)] shadow-[0_2px_8px_-4px_rgba(15,77,52,0.3)]'
                                  : 'border-border bg-card text-foreground/70 hover:border-primary/40 hover:text-foreground',
                              ].join(' ')}
                            >
                              {g.label}
                              {sel && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                  <Check className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Health & Mobility ────────────────────── */}
                {step === 3 && (
                  <div className="space-y-6">
                    {/* Conditions */}
                    <div>
                      <label className={labelCls}>
                        Medical conditions
                        {form.conditions.length > 0 && (
                          <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] tabular-nums text-primary">
                            {form.conditions.length}
                          </span>
                        )}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {CONDITIONS.map((c) => {
                          const selected = form.conditions.includes(c.key)
                          const Icon = CONDITION_ICONS[c.key] ?? Plus
                          return (
                            <button
                              key={c.key}
                              type="button"
                              onClick={() => toggleCondition(c.key)}
                              className={[
                                'flex items-center gap-2.5 rounded-[10px] border-2 px-3 py-2.5 text-left text-[13px] transition-all',
                                selected
                                  ? 'border-primary bg-[var(--forest-soft)] text-[var(--forest-deep)]'
                                  : 'border-border bg-card text-foreground/80 hover:border-primary/40 hover:bg-[var(--forest-soft)]/20',
                              ].join(' ')}
                            >
                              <span className={[
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
                                selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                              ].join(' ')}>
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="font-medium leading-snug">{c.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Mobility */}
                    <div>
                      <label className={labelCls}>
                        Mobility level <span className="text-destructive">*</span>
                      </label>
                      <div className="space-y-2">
                        {MOBILITY_LEVELS.map((m) => {
                          const selected = form.mobilityLevel === m.key
                          return (
                            <button
                              key={m.key}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, mobilityLevel: m.key }))}
                              className={[
                                'w-full flex items-center justify-between rounded-[12px] border-2 px-4 py-3 text-left transition-all',
                                selected
                                  ? 'border-primary bg-[var(--forest-soft)] shadow-[0_4px_12px_-6px_rgba(15,77,52,0.25)]'
                                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50',
                              ].join(' ')}
                            >
                              <div>
                                <p className={[
                                  'text-[13.5px] font-semibold capitalize leading-snug',
                                  selected ? 'text-[var(--forest-deep)]' : 'text-foreground',
                                ].join(' ')}>
                                  {m.label}
                                </p>
                                {MOBILITY_DESC[m.key] && (
                                  <p className={[
                                    'text-[12px] mt-0.5',
                                    selected ? 'text-[var(--forest-deep)]/70' : 'text-muted-foreground',
                                  ].join(' ')}>
                                    {MOBILITY_DESC[m.key]}
                                  </p>
                                )}
                              </div>
                              {selected && (
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground ml-3">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Notes ────────────────────────────────── */}
                {step === 4 && (
                  <div className="space-y-2">
                    <label className={labelCls}>Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      maxLength={500}
                      rows={6}
                      className="w-full rounded-[12px] border border-border bg-card px-3.5 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow leading-relaxed"
                      placeholder="Special routines, preferences, dietary needs, emergency contacts, or anything a caregiver should know…"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] text-muted-foreground">This will be visible to matched caregivers.</p>
                      <p className={[
                        'text-[12px] tabular-nums transition-colors',
                        form.notes.length > 450 ? 'text-amber-600' : 'text-muted-foreground',
                      ].join(' ')}>
                        {form.notes.length}/500
                      </p>
                    </div>
                  </div>
                )}

              </CareRecipientShell>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
