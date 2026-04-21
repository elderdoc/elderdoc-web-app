'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateCareRecipient } from '@/domains/clients/requests'
import { CONDITIONS, MOBILITY_LEVELS, GENDER_OPTIONS, RELATIONSHIPS, CLIENT_STATUS_GROUPS } from '@/lib/constants'
import { formatUSPhone } from '@/lib/phone'

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
    <div className="p-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-xs text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1"
      >
        ← Back
      </button>
      <h1 className="text-2xl font-semibold mt-4 mb-8">Edit Care Recipient</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Relationship</label>
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIPS.map(rel => (
              <button
                key={rel.key}
                type="button"
                onClick={() => setForm(f => ({ ...f, relationship: rel.key }))}
                className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                  form.relationship === rel.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {rel.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date of Birth</label>
            <input
              type="text"
              value={form.dob}
              onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
              placeholder="MM/DD/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: formatUSPhone(e.target.value) }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
              placeholder="(555) 000-0000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Gender</label>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map(g => (
              <button
                key={g.key}
                type="button"
                onClick={() => setForm(f => ({ ...f, gender: g.key }))}
                className={['rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
                  form.gender === g.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Conditions</label>
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => toggleCondition(c.key)}
                className={['rounded-xl border-2 px-4 py-3 text-sm text-left transition-colors',
                  form.conditions.includes(c.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Mobility Level</label>
          <div className="grid grid-cols-2 gap-2">
            {MOBILITY_LEVELS.map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => setForm(f => ({ ...f, mobilityLevel: m.key }))}
                className={['rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors',
                  form.mobilityLevel === m.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Height &amp; Weight</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Height</label>
              <input
                type="text"
                value={form.height}
                onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                placeholder={`5'6"`}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Weight</label>
              <input
                type="text"
                value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                placeholder="142 lbs"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-4">Functional Status</label>
          <div className="space-y-6">
            {CLIENT_STATUS_GROUPS.map((group) => (
              <div key={group.label}>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{group.label}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((item) => {
                    const checked = !!form.clientStatus[item.key]
                    return (
                      <div key={item.key} className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => toggleStatus(item.key)}
                          className={['rounded-xl border-2 px-4 py-3 text-sm text-left transition-colors',
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
                            className="rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-none"
                            placeholder="e.g. left leg below knee"
                          />
                        )}
                        {checked && item.key === 'diabetic' && (
                          <input
                            type="text"
                            value={typeof form.clientStatus.diet === 'string' ? form.clientStatus.diet : ''}
                            onChange={e => setStatusDetail('diet', e.target.value)}
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
                onChange={e => setStatusDetail('other', e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                placeholder="Specify any other relevant status…"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Address</label>
          <div className="space-y-3">
            <input
              type="text"
              value={form.address1}
              onChange={e => setForm(f => ({ ...f, address1: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Street address line 1"
            />
            <input
              type="text"
              value={form.address2}
              onChange={e => setForm(f => ({ ...f, address2: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Apt, suite, unit (optional)"
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                placeholder="City"
              />
              <input
                type="text"
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                placeholder="State"
              />
              <input
                type="text"
                value={form.zip}
                onChange={e => setForm(f => ({ ...f, zip: e.target.value }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                placeholder="ZIP"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={4}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none resize-none"
            placeholder="Any additional notes…"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <Link
          href={`/client/dashboard/recipients/${r.id}`}
          className="px-6 py-2.5 rounded-md border border-border text-sm font-medium hover:bg-muted"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !form.name.trim()}
          className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 whitespace-nowrap"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
