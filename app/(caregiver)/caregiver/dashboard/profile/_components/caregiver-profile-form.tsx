'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Check, User as UserIcon, Phone, FileText, DollarSign, GraduationCap, Heart, Award, Languages, Briefcase, MapPin, Plane } from 'lucide-react'
import { updateCaregiverProfile } from '@/domains/caregivers/profile'
import { formatUSPhone } from '@/lib/phone'
import { useAppToast } from '@/components/toast'
import {
  CARE_TYPES, CERTIFICATIONS, LANGUAGES, WORK_TYPES,
  START_AVAILABILITY, TRAVEL_DISTANCES,
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
  rating?: string | null
  careTypes: string[]
  certifications: string[]
  languages: string[]
  workTypes: string[]
  startAvailability: string
  travelDistances: number[]
  address1: string
  address2: string
  city: string
  state: string
}

const inputClass =
  'w-full rounded-[10px] border border-border bg-card h-11 px-3.5 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow'
const labelClass = 'block text-[13px] font-medium text-foreground/80 mb-1.5'

function chipClass(active: boolean) {
  return [
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium border transition-all',
    active
      ? 'border-[var(--forest)] bg-[var(--forest-soft)] text-[var(--forest-deep)]'
      : 'border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted',
  ].join(' ')
}

export function CaregiverProfileForm({ profile: p }: { profile: Profile }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const t = useAppToast()
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
    startAvailability: p.startAvailability,
    travelDistances:   p.travelDistances,
    address1:          p.address1,
    address2:          p.address2,
    city:              p.city,
    state:             p.state,
  })

  function toggleArr<K extends 'careTypes' | 'certifications' | 'languages' | 'workTypes'>(field: K, key: string) {
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
        startAvailability: form.startAvailability || undefined,
        travelDistances:   form.travelDistances,
        address1:          form.address1 || undefined,
        address2:          form.address2 || undefined,
        city:              form.city || undefined,
        state:             form.state || undefined,
      })
      setSaved(true)
      t.profileSaved()
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Basic info */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            Basic info
          </h2>
          <div className="space-y-3.5">
            <div>
              <label className={labelClass}>Full name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone
                </span>
              </label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: formatUSPhone(e.target.value) }))} className={inputClass} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className={labelClass}>Headline</label>
              <input type="text" value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} className={inputClass} placeholder="e.g. Experienced senior caregiver" />
            </div>
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  About you
                </span>
              </label>
              <textarea
                value={form.about}
                onChange={e => setForm(f => ({ ...f, about: e.target.value }))}
                rows={4}
                className="w-full rounded-[10px] border border-border bg-card p-3.5 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow resize-none"
              />
            </div>
          </div>
        </div>

        {/* Rate & experience */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Rate & experience
          </h2>
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Min rate ($/hr)</label>
                <input type="number" value={form.hourlyMin} onChange={e => setForm(f => ({ ...f, hourlyMin: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Max rate ($/hr)</label>
                <input type="number" value={form.hourlyMax} onChange={e => setForm(f => ({ ...f, hourlyMax: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  Experience
                </span>
              </label>
              <input type="text" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} className={inputClass} placeholder="e.g. 5 years" />
            </div>
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                  Education
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {EDUCATION_OPTIONS.map(e => (
                  <button
                    key={e.key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, education: e.key }))}
                    className={chipClass(form.education === e.key)}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Care Types */}
      <div className="rounded-[18px] border border-border bg-card p-5">
        <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
          <Heart className="h-4 w-4 text-muted-foreground" />
          Care types
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {form.careTypes.length}
          </span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {CARE_TYPES.map(c => (
            <button key={c.key} type="button" onClick={() => toggleArr('careTypes', c.key)} className={chipClass(form.careTypes.includes(c.key))}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Certifications */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            Certifications
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
              {form.certifications.length}
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {CERTIFICATIONS.map(c => (
              <button key={c.key} type="button" onClick={() => toggleArr('certifications', c.key)} className={chipClass(form.certifications.includes(c.key))}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            Languages
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
              {form.languages.length}
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <button key={l.key} type="button" onClick={() => toggleArr('languages', l.key)} className={chipClass(form.languages.includes(l.key))}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="rounded-[18px] border border-border bg-card p-5">
        <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          Availability
        </h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Work type</label>
            <div className="flex flex-wrap gap-2">
              {WORK_TYPES.map(w => (
                <button key={w.key} type="button" onClick={() => toggleArr('workTypes', w.key)} className={chipClass(form.workTypes.includes(w.key))}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Start availability</label>
            <div className="flex flex-wrap gap-2">
              {START_AVAILABILITY.map(s => (
                <button key={s.key} type="button" onClick={() => setForm(f => ({ ...f, startAvailability: s.key }))} className={chipClass(form.startAvailability === s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Travel distance</label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_DISTANCES.map(t => (
                <button key={t.key} type="button" onClick={() => toggleTravel(t.miles)} className={chipClass(form.travelDistances.includes(t.miles))}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-3 py-2 cursor-pointer hover:bg-muted transition-colors">
            <input
              type="checkbox"
              checked={form.relocatable}
              onChange={e => setForm(f => ({ ...f, relocatable: e.target.checked }))}
              className="h-4 w-4 accent-[var(--forest)]"
            />
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
              <Plane className="h-3.5 w-3.5 text-muted-foreground" />
              Open to relocation
            </span>
          </label>
        </div>
      </div>

      {/* Location */}
      <div className="rounded-[18px] border border-border bg-card p-5">
        <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          Location
        </h2>
        <div className="space-y-3.5">
          <div>
            <label className={labelClass}>Street address</label>
            <input type="text" value={form.address1} onChange={e => setForm(f => ({ ...f, address1: e.target.value }))} className={inputClass} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>City</label>
              <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input type="text" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="rounded-[18px] border border-border bg-card p-4 flex items-center justify-between gap-3">
        <div className="text-[13px] text-muted-foreground">
          Changes are saved to your caregiver profile.
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--forest-deep)]">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !form.name.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13.5px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none whitespace-nowrap"
          >
            <Save className="h-4 w-4" />
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
