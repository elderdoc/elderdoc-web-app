'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit3, CalendarDays, Users, DollarSign, Globe, Repeat, Sun, Clock, CalendarCheck, Check } from 'lucide-react'
import { updateCareRequest } from '@/domains/clients/requests'
import { LANGUAGES, GENDER_PREFERENCES, CARE_FREQUENCIES, BUDGET_TYPES } from '@/lib/constants'

const inputCls = 'w-full rounded-[10px] border border-border bg-card h-11 px-3.5 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow'
const labelCls = 'block text-[13px] font-medium text-foreground/80 mb-1.5'

const FREQ_ICONS: Record<string, React.ElementType> = {
  'one-time':  CalendarDays,
  'weekly':    Repeat,
  'bi-weekly': CalendarCheck,
  'daily':     Sun,
  'as-needed': Clock,
}

interface Request {
  id: string
  title: string | null
  description: string | null
  frequency: string | null
  schedule: Array<{ day: string; startTime: string; endTime: string }> | null
  startDate: string | null
  genderPref: string | null
  languagesPreferred: string[] | null
  languagesRequired: string[] | null
  budgetType: string | null
  budgetMin: string | null
  budgetMax: string | null
  recipientName?: string | null
}

interface Location {
  address1: string | null
  city: string | null
  state: string | null
}

export function EditRequestForm({ request: req, location }: { request: Request; location: Location | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    title:              req.title ?? '',
    description:        req.description ?? '',
    frequency:          req.frequency ?? '',
    schedule:           req.schedule ?? [] as Array<{ day: string; startTime: string; endTime: string }>,
    startDate:          req.startDate ?? '',
    genderPref:         req.genderPref ?? '',
    languagesPreferred: req.languagesPreferred ?? [],
    languagesRequired:  req.languagesRequired ?? [],
    budgetType:         req.budgetType ?? '',
    budgetMin:          req.budgetMin ?? '',
    budgetMax:          req.budgetMax ?? '',
  })

  function toggleLang(field: 'languagesPreferred' | 'languagesRequired', key: string) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(key) ? f[field].filter(v => v !== key) : [...f[field], key],
    }))
  }

  function handleSave() {
    startTransition(async () => {
      await updateCareRequest(req.id, {
        title:              form.title || undefined,
        description:        form.description || undefined,
        frequency:          form.frequency || undefined,
        schedule:           form.schedule,
        startDate:          form.startDate || undefined,
        genderPref:         form.genderPref || undefined,
        languagesPreferred: form.languagesPreferred,
        languagesRequired:  form.languagesRequired,
        budgetType:         form.budgetType || undefined,
        budgetMin:          form.budgetMin || undefined,
        budgetMax:          form.budgetMax || undefined,
      })
      router.push(`/client/dashboard/requests/${req.id}`)
      router.refresh()
    })
  }

  return (
    <div className="px-6 md:px-8 py-10 md:py-14 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-10">
        <Link href="/client/dashboard/requests" className="hover:text-foreground transition-colors">
          Care requests
        </Link>
        <span>/</span>
        <Link href={`/client/dashboard/requests/${req.id}`} className="hover:text-foreground transition-colors truncate max-w-[160px]">
          {req.title ?? 'Request'}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Edit</span>
      </div>

      {/* Page header */}
      <div className="mb-10">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--forest-soft)]">
          <Edit3 className="h-5 w-5 text-[var(--forest-deep)]" />
        </div>
        <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1]">
          Edit care request
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">
          Update the details of this request.{req.recipientName ? ` For ${req.recipientName}.` : ''}
        </p>
      </div>

      <div className="space-y-8">
        {/* Title */}
        <div>
          <label className={labelCls}>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className={inputCls}
            placeholder="e.g. In-home personal care for elderly parent"
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={5}
            className="w-full rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow resize-none"
            placeholder="Describe the care needed, any special requirements, and what you're looking for in a caregiver…"
          />
          <p className="text-right text-[12px] text-muted-foreground mt-1">{form.description.length}/500</p>
        </div>

        {/* Frequency */}
        <div>
          <label className={labelCls}>Frequency</label>
          <div className="grid grid-cols-3 gap-2">
            {CARE_FREQUENCIES.map(f => {
              const FIcon = FREQ_ICONS[f.key]
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setForm(fm => ({ ...fm, frequency: f.key }))}
                  className={[
                    'rounded-[10px] border-2 px-3 py-2.5 text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5',
                    form.frequency === f.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  {FIcon && <FIcon className="h-3.5 w-3.5 shrink-0" />}
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Start date */}
        <div>
          <label className={labelCls}>Start date</label>
          <input
            type="text"
            value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
            className={inputCls}
            placeholder="YYYY-MM-DD"
          />
        </div>

        {/* Budget */}
        <div>
          <label className={labelCls}>Budget type</label>
          <div className="flex gap-2 mb-4">
            {BUDGET_TYPES.map(b => (
              <button
                key={b.key}
                type="button"
                onClick={() => setForm(f => ({ ...f, budgetType: b.key }))}
                className={[
                  'rounded-[10px] border-2 px-4 py-2.5 text-[13px] font-medium transition-colors flex items-center gap-1.5',
                  form.budgetType === b.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                {b.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Min rate</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  value={form.budgetMin}
                  onChange={e => setForm(f => ({ ...f, budgetMin: e.target.value }))}
                  className="w-full rounded-[10px] border border-border bg-card h-11 pl-8 pr-3 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow"
                  placeholder="10"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Max rate</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  value={form.budgetMax}
                  onChange={e => setForm(f => ({ ...f, budgetMax: e.target.value }))}
                  className="w-full rounded-[10px] border border-border bg-card h-11 pl-8 pr-3 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow"
                  placeholder="100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Gender preference */}
        <div>
          <label className={labelCls}>Caregiver gender preference</label>
          <div className="grid grid-cols-3 gap-2">
            {GENDER_PREFERENCES.map(g => (
              <button
                key={g.key}
                type="button"
                onClick={() => setForm(f => ({ ...f, genderPref: g.key }))}
                className={[
                  'rounded-[10px] border-2 px-3 py-2.5 text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5',
                  form.genderPref === g.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Languages preferred */}
        <div>
          <label className={labelCls}>Languages preferred</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <button
                key={l.key}
                type="button"
                onClick={() => toggleLang('languagesPreferred', l.key)}
                className={[
                  'rounded-[10px] border-2 px-3 py-2 text-[13px] transition-colors flex items-center gap-1.5',
                  form.languagesPreferred.includes(l.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Languages required */}
        <div>
          <label className={labelCls}>Languages required</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <button
                key={l.key}
                type="button"
                onClick={() => toggleLang('languagesRequired', l.key)}
                className={[
                  'rounded-[10px] border-2 px-3 py-2 text-[13px] transition-colors flex items-center gap-1.5',
                  form.languagesRequired.includes(l.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                <Check className="h-3.5 w-3.5 shrink-0" />
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-8 mt-10 border-t border-border flex items-center justify-between gap-3">
        <Link
          href={`/client/dashboard/requests/${req.id}`}
          className="group/back inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-card px-5 text-[14px] font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover/back:-translate-x-0.5" />
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)] disabled:opacity-40"
        >
          {isPending ? 'Saving…' : 'Save changes'}
          {!isPending && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
