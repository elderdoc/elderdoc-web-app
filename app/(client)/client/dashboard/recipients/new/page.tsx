'use client'

import { useState, useTransition, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCareRecipient } from '@/domains/clients/requests'
import { RELATIONSHIPS, CONDITIONS, MOBILITY_LEVELS, GENDER_OPTIONS, CLIENT_STATUS_GROUPS } from '@/lib/constants'
import { formatUSPhone } from '@/lib/phone'
import { StateSelect } from '@/components/state-select'
import { Users, User, Activity, ClipboardList, FileText } from 'lucide-react'

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

const STEP_META = [
  { icon: Users,         short: 'Relationship', title: 'Who are you caring for?',           sub: 'Select your relationship to the person receiving care.' },
  { icon: User,          short: 'Basic info',   title: 'Tell us about them',                 sub: 'Name, date of birth, contact details, and home address.' },
  { icon: Activity,      short: 'Health',       title: 'Health & mobility',                  sub: 'Conditions and mobility level help us find the right caregiver.' },
  { icon: ClipboardList, short: 'Status',       title: 'Functional status',                  sub: 'Select any that apply — caregivers will see this to prepare.' },
  { icon: FileText,      short: 'Notes',        title: 'Anything else to share?',            sub: 'Optional context, preferences, or notes for the caregiver.' },
] as const

const inputCls = 'w-full rounded-[10px] border border-border bg-card h-11 px-3.5 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow'
const labelCls = 'block text-[13px] font-medium text-foreground/80 mb-1.5'

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
      if (current) { delete updated[key] } else { updated[key] = true }
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

  const StepIcon = STEP_META[step - 1].icon

  return (
    <div className="px-6 md:px-8 py-10 md:py-14 max-w-2xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-10">
        <Link href="/client/dashboard/recipients" className="hover:text-foreground transition-colors">
          Recipients
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">New recipient</span>
      </div>

      {/* Step dot indicator */}
      <div className="mb-10">
        <div className="flex items-center">
          {Array.from({ length: totalSteps }, (_, i) => {
            const n = i + 1
            const actualStep = myselfSelected && n === 2 ? 5 : n
            const done = n < displayStep
            const current = n === displayStep
            return (
              <Fragment key={n}>
                <button
                  type="button"
                  onClick={() => { if (done) setStep(actualStep) }}
                  title={STEP_META[actualStep - 1]?.short}
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
                {n < totalSteps && (
                  <div className={['flex-1 h-[2px] rounded-full mx-1 transition-all duration-500', n < displayStep ? 'bg-primary' : 'bg-border'].join(' ')} />
                )}
              </Fragment>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-[12px] text-muted-foreground tabular-nums">Step {displayStep} of {totalSteps}</span>
          <span className="text-[12px] text-muted-foreground">·</span>
          <span className="text-[12px] font-semibold text-foreground">{STEP_META[step - 1].short}</span>
        </div>
      </div>

      {/* Step header */}
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

      {/* Step 1 — Relationship */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-3">
          {RELATIONSHIPS.map((rel) => {
            const selected = form.relationship === rel.key
            return (
              <button
                key={rel.key}
                type="button"
                onClick={() => handleRelationshipSelect(rel.key)}
                className={[
                  'group/rel relative w-full overflow-hidden rounded-[16px] border-2 px-5 py-4 text-left transition-all duration-200',
                  selected
                    ? 'border-primary bg-[var(--forest-soft)] shadow-[0_8px_24px_-10px_rgba(15,77,52,0.4)] -translate-y-0.5'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-[var(--forest-soft)]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(15,77,52,0.18)]',
                ].join(' ')}
              >
                {selected && (
                  <div className="pointer-events-none absolute right-[-30px] top-[-30px] h-[120px] w-[120px] rounded-full bg-primary/15" />
                )}
                <div className="relative flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold tracking-[-0.005em]">{rel.label}</span>
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
        </div>
      )}

      {/* Step 2 — Basic Info */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Photo */}
          <div>
            <label className={labelCls}>Photo <span className="font-normal text-muted-foreground">(optional)</span></label>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-border" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-muted-foreground text-2xl font-light">
                  {form.name ? form.name[0].toUpperCase() : '?'}
                </div>
              )}
              <label className="cursor-pointer rounded-[10px] border border-border bg-card px-4 py-2.5 text-[13px] font-medium hover:bg-muted transition-colors">
                {photoPreview ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
              </label>
            </div>
            {photoError && <p className="mt-1.5 text-[12px] text-destructive">{photoError}</p>}
          </div>

          <div>
            <label className={labelCls}>Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputCls}
              placeholder="Full name"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date of Birth</label>
              <input
                type="text"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                className={inputCls}
                placeholder="MM/DD/YYYY"
              />
            </div>
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

          <div>
            <label className={labelCls}>Gender</label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, gender: g.key }))}
                  className={[
                    'rounded-[10px] border-2 px-3 py-2.5 text-[13px] font-medium transition-colors',
                    form.gender === g.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Home Address <span className="font-normal text-muted-foreground">(optional)</span></label>
            <div className="space-y-2.5">
              <input
                type="text"
                value={form.address1}
                onChange={(e) => setForm((f) => ({ ...f, address1: e.target.value }))}
                className={inputCls}
                placeholder="Street address"
              />
              <input
                type="text"
                value={form.address2}
                onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))}
                className={inputCls}
                placeholder="Apt, suite, unit (optional)"
              />
              <div className="grid grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className={inputCls}
                  placeholder="City"
                />
                <StateSelect
                  value={form.state}
                  onChange={(val) => setForm((f) => ({ ...f, state: val }))}
                />
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
                  className={inputCls}
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
            <label className={labelCls}>Conditions <span className="font-normal text-muted-foreground">(select all that apply)</span></label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {CONDITIONS.map((c) => {
                const selected = form.conditions.includes(c.key)
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleCondition(c.key)}
                    className={[
                      'relative overflow-hidden rounded-[12px] border-2 px-4 py-3 text-[13.5px] text-left transition-all duration-200',
                      selected
                        ? 'border-primary bg-[var(--forest-soft)] text-foreground -translate-y-0.5 shadow-[0_4px_12px_-4px_rgba(15,77,52,0.25)]'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-[var(--forest-soft)]/30',
                    ].join(' ')}
                  >
                    {selected && (
                      <div className="pointer-events-none absolute right-[-16px] top-[-16px] h-[60px] w-[60px] rounded-full bg-primary/10" />
                    )}
                    <span className="relative">{c.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className={labelCls}>Mobility Level *</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {MOBILITY_LEVELS.map((m) => {
                const selected = form.mobilityLevel === m.key
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, mobilityLevel: m.key }))}
                    className={[
                      'relative overflow-hidden rounded-[12px] border-2 px-4 py-3 text-[13.5px] font-medium text-left transition-all duration-200',
                      selected
                        ? 'border-primary bg-[var(--forest-soft)] text-foreground -translate-y-0.5 shadow-[0_4px_12px_-4px_rgba(15,77,52,0.25)]'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-[var(--forest-soft)]/30',
                    ].join(' ')}
                  >
                    {selected && (
                      <div className="pointer-events-none absolute right-[-16px] top-[-16px] h-[60px] w-[60px] rounded-full bg-primary/10" />
                    )}
                    <span className="relative">{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className={labelCls}>Height &amp; Weight <span className="font-normal text-muted-foreground">(optional)</span></label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <p className="text-[12px] text-muted-foreground mb-1.5">Height</p>
                <input
                  type="text"
                  value={form.height}
                  onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                  className={inputCls}
                  placeholder={`5'6"`}
                />
              </div>
              <div>
                <p className="text-[12px] text-muted-foreground mb-1.5">Weight</p>
                <input
                  type="text"
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                  className={inputCls}
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
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">{group.label}</h3>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const checked = !!form.clientStatus[item.key]
                  return (
                    <div key={item.key} className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleStatus(item.key)}
                        className={[
                          'relative overflow-hidden rounded-[12px] border-2 px-4 py-3 text-[13.5px] text-left transition-all duration-200',
                          checked
                            ? 'border-primary bg-[var(--forest-soft)] text-foreground -translate-y-0.5 shadow-[0_4px_12px_-4px_rgba(15,77,52,0.25)]'
                            : 'border-border bg-card hover:border-primary/40 hover:bg-[var(--forest-soft)]/30',
                        ].join(' ')}
                      >
                        {checked && (
                          <div className="pointer-events-none absolute right-[-16px] top-[-16px] h-[60px] w-[60px] rounded-full bg-primary/10" />
                        )}
                        <span className="relative">{item.label}</span>
                      </button>
                      {checked && item.key === 'amputee' && (
                        <input
                          type="text"
                          value={typeof form.clientStatus.amputeeDetails === 'string' ? form.clientStatus.amputeeDetails : ''}
                          onChange={(e) => setStatusDetail('amputeeDetails', e.target.value)}
                          className="w-full rounded-[10px] border border-border bg-card h-9 px-3 text-[13px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow"
                          placeholder="e.g. left leg below knee"
                        />
                      )}
                      {checked && item.key === 'diabetic' && (
                        <input
                          type="text"
                          value={typeof form.clientStatus.diet === 'string' ? form.clientStatus.diet : ''}
                          onChange={(e) => setStatusDetail('diet', e.target.value)}
                          className="w-full rounded-[10px] border border-border bg-card h-9 px-3 text-[13px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow"
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
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Other considerations</label>
            <input
              type="text"
              value={typeof form.clientStatus.other === 'string' ? form.clientStatus.other : ''}
              onChange={(e) => setStatusDetail('other', e.target.value)}
              className={inputCls}
              placeholder="Specify any other relevant status…"
            />
          </div>
        </div>
      )}

      {/* Step 5 — Notes */}
      {step === 5 && (
        <div className="space-y-3">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            maxLength={500}
            rows={7}
            className="w-full rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow resize-none"
            placeholder="Any helpful context — routines, preferences, things caregivers should know…"
            autoFocus
          />
          <p className="text-right text-[12px] text-muted-foreground">{form.notes.length}/500</p>
        </div>
      )}

      {/* Navigation */}
      <div className="pt-8 mt-10 border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="group/back inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-card px-5 text-[14px] font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-muted"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover/back:-translate-x-0.5">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={nextDisabled}
              className="group/cta inline-flex h-11 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:hover:shadow-none"
            >
              Continue
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover/cta:translate-x-0.5">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="group/cta inline-flex h-11 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:hover:shadow-none"
            >
              {isPending ? 'Saving…' : 'Save recipient'}
              {!isPending && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover/cta:translate-x-0.5">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
