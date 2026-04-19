'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateCareRequest } from '@/domains/clients/requests'
import { DAYS_OF_WEEK, SHIFTS, LANGUAGES, GENDER_PREFERENCES, CARE_FREQUENCIES, CARE_DURATIONS } from '@/lib/constants'

const BUDGET_TYPES = [
  { key: 'hourly',     label: 'Per hour' },
  { key: 'per-visit',  label: 'Per visit' },
  { key: 'monthly',    label: 'Monthly' },
]

interface Request {
  id: string
  title: string | null
  description: string | null
  frequency: string | null
  days: string[] | null
  shifts: string[] | null
  startDate: string | null
  durationHours: number | null
  genderPref: string | null
  languagePref: string[] | null
  budgetType: string | null
  budgetAmount: string | null
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
    title:         req.title ?? '',
    description:   req.description ?? '',
    frequency:     req.frequency ?? '',
    days:          req.days ?? [],
    shifts:        req.shifts ?? [],
    startDate:     req.startDate ?? '',
    durationHours: String(req.durationHours ?? ''),
    genderPref:    req.genderPref ?? '',
    languagePref:  req.languagePref ?? [],
    budgetType:    req.budgetType ?? '',
    budgetAmount:  req.budgetAmount ?? '',
  })

  function toggle<K extends 'days' | 'shifts' | 'languagePref'>(field: K, key: string) {
    setForm(f => ({
      ...f,
      [field]: (f[field] as string[]).includes(key)
        ? (f[field] as string[]).filter(v => v !== key)
        : [...(f[field] as string[]), key],
    }))
  }

  function handleSave() {
    startTransition(async () => {
      await updateCareRequest(req.id, {
        title:         form.title || undefined,
        description:   form.description || undefined,
        frequency:     form.frequency || undefined,
        days:          form.days,
        shifts:        form.shifts,
        startDate:     form.startDate || undefined,
        durationHours: form.durationHours ? Number(form.durationHours) : undefined,
        genderPref:    form.genderPref || undefined,
        languagePref:  form.languagePref,
        budgetType:    form.budgetType || undefined,
        budgetAmount:  form.budgetAmount || undefined,
      })
      router.push(`/client/dashboard/requests/${req.id}`)
      router.refresh()
    })
  }

  return (
    <div className="p-8">
      <Link
        href={`/client/dashboard/requests/${req.id}`}
        className="text-xs text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1"
      >
        ← Back
      </Link>
      <h1 className="text-2xl font-semibold mt-4 mb-8">Edit Care Request</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={4}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Frequency</label>
          <div className="flex flex-wrap gap-2">
            {CARE_FREQUENCIES.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setForm(fm => ({ ...fm, frequency: f.key }))}
                className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                  form.frequency === f.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map(d => (
              <button
                key={d.key}
                type="button"
                onClick={() => toggle('days', d.key)}
                className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                  form.days.includes(d.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Shifts</label>
          <div className="flex flex-wrap gap-2">
            {SHIFTS.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle('shifts', s.key)}
                className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                  form.shifts.includes(s.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {s.label} <span className="text-xs opacity-70">{s.time}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="text"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
              placeholder="MM/DD/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Duration per visit</label>
            <div className="flex flex-wrap gap-2">
              {CARE_DURATIONS.map(d => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, durationHours: d.key }))}
                  className={['rounded-xl border-2 px-3 py-1.5 text-sm font-medium transition-colors',
                    form.durationHours === d.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Budget</label>
          <div className="flex gap-3 items-center">
            <span className="text-sm text-muted-foreground">$</span>
            <input
              type="number"
              value={form.budgetAmount}
              onChange={e => setForm(f => ({ ...f, budgetAmount: e.target.value }))}
              className="w-32 rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
              placeholder="0"
            />
            <div className="flex gap-2">
              {BUDGET_TYPES.map(b => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, budgetType: b.key }))}
                  className={['rounded-xl border-2 px-3 py-1.5 text-sm font-medium transition-colors',
                    form.budgetType === b.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Caregiver Gender Preference</label>
          <div className="flex flex-wrap gap-2">
            {GENDER_PREFERENCES.map(g => (
              <button
                key={g.key}
                type="button"
                onClick={() => setForm(f => ({ ...f, genderPref: g.key }))}
                className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                  form.genderPref === g.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Language Preferences</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <button
                key={l.key}
                type="button"
                onClick={() => toggle('languagePref', l.key)}
                className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                  form.languagePref.includes(l.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <Link
          href={`/client/dashboard/requests/${req.id}`}
          className="px-6 py-2.5 rounded-md border border-border text-sm font-medium hover:bg-muted"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 whitespace-nowrap"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
