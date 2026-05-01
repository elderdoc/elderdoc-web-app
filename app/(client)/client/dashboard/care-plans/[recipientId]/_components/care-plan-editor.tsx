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
    <section className="rounded-[16px] border border-border bg-card overflow-hidden transition-colors hover:border-foreground/15">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--forest-soft)] text-[var(--forest-deep)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h2 className="font-semibold text-[15px] tracking-[-0.005em]">{sectionLabel}</h2>
            {!editing && local.length > 0 && (
              <p className="text-[11.5px] text-muted-foreground tabular-nums">{local.length} task{local.length !== 1 ? 's' : ''} selected</p>
            )}
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-[12.5px] font-medium hover:border-foreground/30 hover:bg-muted transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M9 2l3 3-7 7H2v-3l7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit
          </button>
        )}
      </div>

      <div className="p-5">
        {error && <div className="mb-3 rounded-[10px] border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[12.5px] text-destructive">{error}</div>}

        {editing ? (
          <div className="space-y-3">
            {items.map((item) => {
              const entry = local.find((e) => e.key === item.key)
              const isActive = Boolean(entry)
              return (
                <div key={item.key} className={[
                  'rounded-[12px] border-2 transition-colors p-3',
                  isActive ? 'border-primary/40 bg-[var(--forest-soft)]/40' : 'border-border bg-card',
                ].join(' ')}>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <span className={[
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all mt-0.5',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card',
                    ].join(' ')}>
                      {isActive && (
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4.5L4 7.5L10 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => toggle(item.key)}
                      className="sr-only"
                    />
                    <span className="text-[14px] font-medium leading-tight pt-0.5">{item.label}</span>
                  </label>
                  {isActive && entry && (
                    <div className="mt-3 ml-7 flex flex-wrap gap-2 items-center">
                      <select
                        value={entry.frequency}
                        onChange={(e) => setFrequency(item.key, e.target.value as CareTaskEntry['frequency'])}
                        className="h-9 rounded-[8px] border border-input bg-card px-3 text-[12.5px] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
                      >
                        <option value="every-visit">Every visit</option>
                        <option value="as-needed">As needed</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={entry.notes ?? ''}
                        onChange={(e) => setNotes(item.key, e.target.value)}
                        className="h-9 flex-1 min-w-[140px] rounded-[8px] border border-input bg-card px-3 text-[12.5px] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
                      />
                    </div>
                  )}
                </div>
              )
            })}
            <div className="flex gap-2 pt-3 mt-1 border-t border-border/60">
              <button
                onClick={cancel}
                className="inline-flex h-9 items-center rounded-full border border-border bg-card px-4 text-[13px] font-medium hover:border-foreground/30 hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={isPending}
                className="inline-flex h-9 items-center rounded-full bg-primary px-5 text-[13px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] disabled:opacity-50 transition-all"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : local.length === 0 ? (
          <p className="text-[13.5px] text-muted-foreground italic">No tasks selected yet. Click Edit to add tasks for this section.</p>
        ) : (
          <ul className="space-y-2">
            {local.map((entry) => (
              <li key={entry.key} className="flex items-start gap-2.5 rounded-[10px] bg-muted/40 px-3 py-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[13.5px] font-medium">{itemLabelMap[entry.key] ?? entry.key}</span>
                    <span className="inline-flex items-center rounded-full bg-card px-2 py-0.5 text-[10.5px] font-medium text-foreground/70 capitalize">
                      {entry.frequency.replace('-', ' ')}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="mt-1 text-[12.5px] text-muted-foreground">{entry.notes}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
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
