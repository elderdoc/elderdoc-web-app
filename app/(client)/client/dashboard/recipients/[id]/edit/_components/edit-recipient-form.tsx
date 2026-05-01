'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Edit3, User, Heart, Users, Activity, Brain, AlertTriangle,
  Wind, Move, CloudRain, Zap, Eye, Volume2, Plus, ShieldOff, Sun,
  MessageCircle, HelpCircle, Smile, Utensils, Check,
} from 'lucide-react'
import { updateCareRecipient } from '@/domains/clients/requests'
import { CONDITIONS, MOBILITY_LEVELS, GENDER_OPTIONS, RELATIONSHIPS, CLIENT_STATUS_GROUPS } from '@/lib/constants'
import { formatUSPhone } from '@/lib/phone'
import { StateSelect } from '@/components/state-select'

const inputCls = 'w-full rounded-[10px] border border-border bg-card h-11 px-3.5 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow'
const labelCls = 'block text-[13px] font-medium text-foreground/80 mb-1.5'

const CONDITION_ICONS: Record<string, React.ElementType> = {
  'alzheimers': Brain, 'dementia': Brain, 'parkinsons': Activity,
  'diabetes': Activity, 'heart-disease': Heart, 'stroke': AlertTriangle,
  'copd': Wind, 'arthritis': Move, 'depression': CloudRain,
  'anxiety': Zap, 'vision-impairment': Eye, 'hearing-impairment': Volume2, 'other': Plus,
}

const REL_ICONS: Record<string, React.ElementType> = {
  'myself': User, 'parent': Heart, 'spouse': Heart,
  'grandparent': Users, 'sibling': Users, 'other-family': Users,
}

const MOBILITY_ICONS: Record<string, React.ElementType> = {
  'independent': User, 'minimal-assistance': Activity,
  'moderate-assistance': Users, 'full-assistance': Users,
}

const GENDER_ICONS: Record<string, React.ElementType> = {
  'male': User, 'female': User, 'non-binary': User, 'prefer-not-to-say': ShieldOff,
}

interface Recipient {
  id: string
  name: string
  relationship: string | null
  dob: string | null
  phone: string | null
  gender: string | null
  conditions: string[] | null
  mobilityLevel: string | null
  height: string | null
  weight: string | null
  clientStatus: Record<string, boolean | string> | null
  notes: string | null
  address: { address1?: string; address2?: string; city?: string; state?: string; zip?: string } | null
}

export function EditRecipientForm({ recipient: r }: { recipient: Recipient }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name:          r.name,
    relationship:  r.relationship ?? '',
    dob:           r.dob ?? '',
    phone:         r.phone ?? '',
    gender:        r.gender ?? '',
    conditions:    r.conditions ?? [],
    mobilityLevel: r.mobilityLevel ?? '',
    height:        r.height ?? '',
    weight:        r.weight ?? '',
    clientStatus:  (r.clientStatus ?? {}) as Record<string, boolean | string>,
    notes:         r.notes ?? '',
    address1:      r.address?.address1 ?? '',
    address2:      r.address?.address2 ?? '',
    city:          r.address?.city ?? '',
    state:         r.address?.state ?? '',
    zip:           r.address?.zip ?? '',
  })

  function toggleCondition(key: string) {
    setForm(f => ({
      ...f,
      conditions: f.conditions.includes(key)
        ? f.conditions.filter(c => c !== key)
        : [...f.conditions, key],
    }))
  }

  function toggleStatus(key: string) {
    setForm(f => {
      const updated = { ...f.clientStatus }
      if (updated[key]) { delete updated[key] } else { updated[key] = true }
      return { ...f, clientStatus: updated }
    })
  }

  function setStatusDetail(key: string, value: string) {
    setForm(f => ({ ...f, clientStatus: { ...f.clientStatus, [key]: value } }))
  }

  function handleSave() {
    startTransition(async () => {
      await updateCareRecipient(r.id, {
        name:          form.name,
        relationship:  form.relationship || undefined,
        dob:           form.dob || undefined,
        phone:         form.phone || undefined,
        gender:        form.gender || undefined,
        conditions:    form.conditions,
        mobilityLevel: form.mobilityLevel || undefined,
        height:        form.height || undefined,
        weight:        form.weight || undefined,
        clientStatus:  Object.keys(form.clientStatus).length > 0 ? form.clientStatus : undefined,
        notes:         form.notes || undefined,
        address: (form.address1 || form.city) ? {
          address1: form.address1 || undefined,
          address2: form.address2 || undefined,
          city:     form.city || undefined,
          state:    form.state || undefined,
          zip:      form.zip || undefined,
        } : undefined,
      })
      router.push(`/client/dashboard/recipients/${r.id}`)
      router.refresh()
    })
  }

  return (
    <div className="px-6 md:px-8 py-10 md:py-14 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-10">
        <Link href="/client/dashboard/recipients" className="hover:text-foreground transition-colors">
          Recipients
        </Link>
        <span>/</span>
        <Link href={`/client/dashboard/recipients/${r.id}`} className="hover:text-foreground transition-colors truncate max-w-[160px]">
          {r.name}
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
          Edit {r.name}
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">
          Update this recipient's personal details and health information.
        </p>
      </div>

      <div className="space-y-8">
        {/* Name */}
        <div>
          <label className={labelCls}>Full name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className={inputCls}
            placeholder="Full name"
          />
        </div>

        {/* Relationship */}
        <div>
          <label className={labelCls}>Relationship</label>
          <div className="grid grid-cols-3 gap-2">
            {RELATIONSHIPS.map(rel => {
              const RIcon = REL_ICONS[rel.key] ?? User
              const selected = form.relationship === rel.key
              return (
                <button
                  key={rel.key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, relationship: rel.key }))}
                  className={[
                    'rounded-[10px] border-2 px-3 py-2.5 text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5',
                    selected ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  <RIcon className="h-3.5 w-3.5 shrink-0" />
                  {rel.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* DOB + Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date of birth</label>
            <input
              type="text"
              value={form.dob}
              onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
              className={inputCls}
              placeholder="MM/DD/YYYY"
            />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: formatUSPhone(e.target.value) }))}
              className={inputCls}
              placeholder="(555) 000-0000"
            />
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className={labelCls}>Gender</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GENDER_OPTIONS.map(g => {
              const GIcon = GENDER_ICONS[g.key] ?? User
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, gender: g.key }))}
                  className={[
                    'rounded-[10px] border-2 px-3 py-2.5 text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5',
                    form.gender === g.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  <GIcon className="h-3.5 w-3.5 shrink-0" />
                  {g.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Conditions */}
        <div>
          <label className={labelCls}>Medical conditions</label>
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map(c => {
              const CIcon = CONDITION_ICONS[c.key] ?? Activity
              const selected = form.conditions.includes(c.key)
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCondition(c.key)}
                  className={[
                    'rounded-[10px] border-2 px-3 py-2.5 text-[13px] font-medium text-left transition-colors flex items-center gap-2',
                    selected ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  <CIcon className="h-3.5 w-3.5 shrink-0" />
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Mobility */}
        <div>
          <label className={labelCls}>Mobility level</label>
          <div className="grid grid-cols-2 gap-2">
            {MOBILITY_LEVELS.map(m => {
              const MIcon = MOBILITY_ICONS[m.key] ?? User
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, mobilityLevel: m.key }))}
                  className={[
                    'rounded-[10px] border-2 px-3 py-2.5 text-[13px] font-medium transition-colors flex items-center gap-2',
                    form.mobilityLevel === m.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  <MIcon className="h-3.5 w-3.5 shrink-0" />
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Height & Weight */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Height</label>
            <input
              type="text"
              value={form.height}
              onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
              className={inputCls}
              placeholder={`5'6"`}
            />
          </div>
          <div>
            <label className={labelCls}>Weight</label>
            <input
              type="text"
              value={form.weight}
              onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
              className={inputCls}
              placeholder="142 lbs"
            />
          </div>
        </div>

        {/* Functional status */}
        <div>
          <label className={labelCls}>Functional status</label>
          <div className="space-y-6">
            {CLIENT_STATUS_GROUPS.map(group => (
              <div key={group.label}>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{group.label}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map(item => {
                    const checked = !!form.clientStatus[item.key]
                    return (
                      <div key={item.key} className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => toggleStatus(item.key)}
                          className={[
                            'rounded-[10px] border-2 px-3 py-2.5 text-[13px] font-medium text-left transition-colors',
                            checked ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                          ].join(' ')}
                        >
                          {item.label}
                        </button>
                        {checked && item.key === 'amputee' && (
                          <input
                            type="text"
                            value={typeof form.clientStatus.amputeeDetails === 'string' ? form.clientStatus.amputeeDetails : ''}
                            onChange={e => setStatusDetail('amputeeDetails', e.target.value)}
                            className="w-full rounded-[10px] border border-border bg-card h-9 px-3 text-[13px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow"
                            placeholder="e.g. left leg below knee"
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
                onChange={e => setStatusDetail('other', e.target.value)}
                className={inputCls}
                placeholder="Specify any other relevant status…"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Diet</label>
              <input
                type="text"
                value={typeof form.clientStatus.diet === 'string' ? form.clientStatus.diet : ''}
                onChange={e => setStatusDetail('diet', e.target.value)}
                className={inputCls}
                placeholder="e.g. Diabetic, low sodium, pureed…"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className={labelCls}>Address</label>
          <div className="space-y-3">
            <input
              type="text"
              value={form.address1}
              onChange={e => setForm(f => ({ ...f, address1: e.target.value }))}
              className={inputCls}
              placeholder="Street address"
            />
            <input
              type="text"
              value={form.address2}
              onChange={e => setForm(f => ({ ...f, address2: e.target.value }))}
              className={inputCls}
              placeholder="Apt, suite, unit (optional)"
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className={inputCls}
                placeholder="City"
              />
              <StateSelect
                value={form.state}
                onChange={val => setForm(f => ({ ...f, state: val }))}
              />
              <input
                type="text"
                value={form.zip}
                onChange={e => setForm(f => ({ ...f, zip: e.target.value }))}
                className={inputCls}
                placeholder="ZIP"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>Notes <span className="font-normal text-muted-foreground">(optional)</span></label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={4}
            className="w-full rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow resize-none"
            placeholder="Any additional notes about this recipient…"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-8 mt-10 border-t border-border flex items-center justify-between gap-3">
        <Link
          href={`/client/dashboard/recipients/${r.id}`}
          className="group/back inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-card px-5 text-[14px] font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover/back:-translate-x-0.5" />
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !form.name.trim()}
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
