'use client'

import { useState, useTransition } from 'react'
import { upsertCarePlan, type CarePlanSectionKey } from '@/domains/clients/care-plan-actions'
import type { CarePlanDetail } from '@/domains/clients/care-plans'
import type { CareTaskEntry } from '@/db/schema'
import { CARE_PLAN_SECTIONS } from '@/lib/constants'

type Props = {
  recipientId: string
  carePlan: CarePlanDetail | null
}

function SectionEditor({
  sectionKey,
  sectionLabel,
  items,
  entries,
  onSave,
  isPending,
}: {
  sectionKey: CarePlanSectionKey
  sectionLabel: string
  items: readonly { key: string; label: string }[]
  entries: CareTaskEntry[]
  onSave: (sectionKey: CarePlanSectionKey, entries: CareTaskEntry[]) => void
  isPending: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState<CareTaskEntry[]>(entries)
  const [error, setError] = useState<string | null>(null)

  const activeKeys = new Set(local.map((e) => e.key))

  function toggle(key: string) {
    if (activeKeys.has(key)) {
      setLocal(local.filter((e) => e.key !== key))
    } else {
      setLocal([...local, { key, frequency: 'every-visit' }])
    }
  }

  function setFrequency(key: string, frequency: CareTaskEntry['frequency']) {
    setLocal(local.map((e) => e.key === key ? { ...e, frequency } : e))
  }

  function setNotes(key: string, notes: string) {
    setLocal(local.map((e) => e.key === key ? { ...e, notes: notes || undefined } : e))
  }

  async function save() {
    setError(null)
    onSave(sectionKey, local)
    setEditing(false)
  }

  function cancel() {
    setLocal(entries)
    setEditing(false)
    setError(null)
  }

  const itemLabelMap = Object.fromEntries(items.map((i) => [i.key, i.label]))

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm">{sectionLabel}</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-primary hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive mb-3">{error}</p>}

      {editing ? (
        <div className="space-y-3">
          {items.map((item) => {
            const entry = local.find((e) => e.key === item.key)
            const isActive = Boolean(entry)
            return (
              <div key={item.key} className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => toggle(item.key)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
                {isActive && entry && (
                  <div className="ml-6 flex flex-wrap gap-2 items-center">
                    <select
                      value={entry.frequency}
                      onChange={(e) => setFrequency(item.key, e.target.value as CareTaskEntry['frequency'])}
                      className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
                    >
                      <option value="every-visit">Every visit</option>
                      <option value="as-needed">As needed</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={entry.notes ?? ''}
                      onChange={(e) => setNotes(item.key, e.target.value)}
                      className="h-7 flex-1 min-w-[120px] rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
                    />
                  </div>
                )}
              </div>
            )
          })}
          <div className="flex gap-2 pt-2">
            <button
              onClick={save}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancel} className="text-xs px-3 py-1.5 rounded-lg border border-border">
              Cancel
            </button>
          </div>
        </div>
      ) : local.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks selected.</p>
      ) : (
        <ul className="space-y-1">
          {local.map((entry) => (
            <li key={entry.key} className="text-sm flex flex-wrap gap-x-2 items-baseline">
              <span className="font-medium">{itemLabelMap[entry.key] ?? entry.key}</span>
              <span className="text-xs text-muted-foreground">({entry.frequency})</span>
              {entry.notes && (
                <span className="text-xs text-muted-foreground">— {entry.notes}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function CarePlanEditor({ recipientId, carePlan }: Props) {
  const [isPending, startTransition] = useTransition()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSave(sectionKey: CarePlanSectionKey, entries: CareTaskEntry[]) {
    setGlobalError(null)
    startTransition(async () => {
      const result = await upsertCarePlan(recipientId, { [sectionKey]: entries })
      if (result.error) setGlobalError(result.error)
    })
  }

  return (
    <div className="space-y-6">
      {globalError && <p className="text-sm text-destructive">{globalError}</p>}
      {CARE_PLAN_SECTIONS.map((section) => {
        const sectionKey = section.key as CarePlanSectionKey
        const entries: CareTaskEntry[] = carePlan?.[sectionKey] ?? []
        return (
          <SectionEditor
            key={sectionKey}
            sectionKey={sectionKey}
            sectionLabel={section.label}
            items={section.items}
            entries={entries}
            onSave={handleSave}
            isPending={isPending}
          />
        )
      })}
    </div>
  )
}
