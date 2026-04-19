'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCaregiverProfile } from '@/domains/caregivers/profile'
import { formatUSPhone } from '@/lib/phone'
import {
  CARE_TYPES, CERTIFICATIONS, LANGUAGES, WORK_TYPES,
  DAYS_OF_WEEK, SHIFTS, START_AVAILABILITY, TRAVEL_DISTANCES,
  EDUCATION_OPTIONS,
} from '@/lib/constants'

interface Profile {
  id: string
  name: string | null
  email: string
  phone: string | null
  image: string | null
  photoUrl: string | null
  headline: string | null
  about: string | null
  hourlyMin: string | null
  hourlyMax: string | null
  experience: string | null
  education: string | null
  relocatable: boolean | null
  careTypes: string[]
  certifications: string[]
  languages: string[]
  workTypes: string[]
  days: string[]
  shifts: string[]
  startAvailability: string
  travelDistances: number[]
  address1: string
  address2: string
  city: string
  state: string
}

export function CaregiverProfileForm({ profile: p }: { profile: Profile }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name:              p.name ?? '',
    phone:             p.phone ?? '',
    headline:          p.headline ?? '',
    about:             p.about ?? '',
    hourlyMin:         p.hourlyMin ?? '',
    hourlyMax:         p.hourlyMax ?? '',
    experience:        p.experience ?? '',
    education:         p.education ?? '',
    relocatable:       p.relocatable ?? false,
    careTypes:         p.careTypes,
    certifications:    p.certifications,
    languages:         p.languages,
    workTypes:         p.workTypes,
    days:              p.days,
    shifts:            p.shifts,
    startAvailability: p.startAvailability,
    travelDistances:   p.travelDistances,
    address1:          p.address1,
    address2:          p.address2,
    city:              p.city,
    state:             p.state,
  })

  function toggleArr<K extends 'careTypes' | 'certifications' | 'languages' | 'workTypes' | 'days' | 'shifts'>(field: K, key: string) {
    setForm(f => ({
      ...f,
      [field]: (f[field] as string[]).includes(key)
        ? (f[field] as string[]).filter(v => v !== key)
        : [...(f[field] as string[]), key],
    }))
  }

  function toggleTravel(miles: number) {
    setForm(f => ({
      ...f,
      travelDistances: f.travelDistances.includes(miles)
        ? f.travelDistances.filter(v => v !== miles)
        : [...f.travelDistances, miles],
    }))
  }

  function handleSave() {
    startTransition(async () => {
      await updateCaregiverProfile({
        name:              form.name,
        phone:             form.phone || undefined,
        headline:          form.headline || undefined,
        about:             form.about || undefined,
        hourlyMin:         form.hourlyMin || undefined,
        hourlyMax:         form.hourlyMax || undefined,
        experience:        form.experience || undefined,
        education:         form.education || undefined,
        relocatable:       form.relocatable,
        careTypes:         form.careTypes,
        certifications:    form.certifications,
        languages:         form.languages,
        workTypes:         form.workTypes,
        days:              form.days,
        shifts:            form.shifts,
        startAvailability: form.startAvailability || undefined,
        travelDistances:   form.travelDistances,
        address1:          form.address1 || undefined,
        address2:          form.address2 || undefined,
        city:              form.city || undefined,
        state:             form.state || undefined,
      })
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const initials = (p.name ?? p.email).split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        {(p.photoUrl ?? p.image) ? (
          <img src={(p.photoUrl ?? p.image)!} alt={p.name ?? ''} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
            {initials}
          </div>
        )}
        <div>
          <p className="font-semibold">{p.name ?? 'No name set'}</p>
          <p className="text-sm text-muted-foreground">{p.email}</p>
        </div>
      </div>

      <hr className="border-border" />

      {/* Basic info */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Basic Info</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: formatUSPhone(e.target.value) }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none" placeholder="(555) 000-0000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Headline</label>
            <input type="text" value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none" placeholder="e.g. Experienced senior caregiver" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">About</label>
            <textarea value={form.about} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} rows={4}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Min Hourly Rate ($)</label>
              <input type="number" value={form.hourlyMin} onChange={e => setForm(f => ({ ...f, hourlyMin: e.target.value }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Hourly Rate ($)</label>
              <input type="number" value={form.hourlyMax} onChange={e => setForm(f => ({ ...f, hourlyMax: e.target.value }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Experience</label>
            <input type="text" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none" placeholder="e.g. 5 years" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Education</label>
            <div className="flex flex-wrap gap-2">
              {EDUCATION_OPTIONS.map(e => (
                <button key={e.key} type="button" onClick={() => setForm(f => ({ ...f, education: e.key }))}
                  className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                    form.education === e.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}>{e.label}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* Care types */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Care Types</h2>
        <div className="flex flex-wrap gap-2">
          {CARE_TYPES.map(c => (
            <button key={c.key} type="button" onClick={() => toggleArr('careTypes', c.key)}
              className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                form.careTypes.includes(c.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
              ].join(' ')}>{c.label}</button>
          ))}
        </div>
      </section>

      <hr className="border-border" />

      {/* Certifications & Languages */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Certifications</h2>
        <div className="flex flex-wrap gap-2">
          {CERTIFICATIONS.map(c => (
            <button key={c.key} type="button" onClick={() => toggleArr('certifications', c.key)}
              className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                form.certifications.includes(c.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
              ].join(' ')}>{c.label}</button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Languages</h2>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(l => (
            <button key={l.key} type="button" onClick={() => toggleArr('languages', l.key)}
              className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                form.languages.includes(l.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
              ].join(' ')}>{l.label}</button>
          ))}
        </div>
      </section>

      <hr className="border-border" />

      {/* Availability */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Availability</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Work Type</label>
            <div className="flex flex-wrap gap-2">
              {WORK_TYPES.map(w => (
                <button key={w.key} type="button" onClick={() => toggleArr('workTypes', w.key)}
                  className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                    form.workTypes.includes(w.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}>{w.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(d => (
                <button key={d.key} type="button" onClick={() => toggleArr('days', d.key)}
                  className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                    form.days.includes(d.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}>{d.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Shifts</label>
            <div className="flex flex-wrap gap-2">
              {SHIFTS.map(s => (
                <button key={s.key} type="button" onClick={() => toggleArr('shifts', s.key)}
                  className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                    form.shifts.includes(s.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Start Availability</label>
            <div className="flex flex-wrap gap-2">
              {START_AVAILABILITY.map(s => (
                <button key={s.key} type="button" onClick={() => setForm(f => ({ ...f, startAvailability: s.key }))}
                  className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                    form.startAvailability === s.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Travel Distance</label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_DISTANCES.map(t => (
                <button key={t.key} type="button" onClick={() => toggleTravel(t.miles)}
                  className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                    form.travelDistances.includes(t.miles) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="relocatable" checked={form.relocatable}
              onChange={e => setForm(f => ({ ...f, relocatable: e.target.checked }))}
              className="h-4 w-4 accent-primary" />
            <label htmlFor="relocatable" className="text-sm font-medium">Open to relocation</label>
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* Location */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Location</h2>
        <div className="space-y-3">
          <input type="text" value={form.address1} onChange={e => setForm(f => ({ ...f, address1: e.target.value }))}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none" placeholder="Street address" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none" placeholder="City" />
            <input type="text" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none" placeholder="State" />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3 pb-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !form.name.trim()}
          className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 whitespace-nowrap"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && <p className="text-sm text-green-600">Saved!</p>}
      </div>
    </div>
  )
}
