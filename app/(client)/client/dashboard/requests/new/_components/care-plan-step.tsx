'use client'

import { useState } from 'react'
import { CARE_PLAN_SECTIONS } from '@/lib/constants'
import type { CareTaskEntry } from '@/db/schema'

type SectionKey = 'activityMobilitySafety' | 'hygieneElimination' | 'homeManagement' | 'hydrationNutrition' | 'medicationReminders'

export type CarePlanState = Record<SectionKey, CareTaskEntry[]>

export const EMPTY_CARE_PLAN: CarePlanState = {
  activityMobilitySafety: [],
  hygieneElimination:     [],
  homeManagement:         [],
  hydrationNutrition:     [],
  medicationReminders:    [],
}

interface Props {
  value: CarePlanState
  onChange: (plan: CarePlanState) => void
}

export function CarePlanStep({ value, onChange }: Props) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  function addItem(sectionKey: SectionKey, itemKey: string) {
    const existing = value[sectionKey]
    if (existing.some(e => e.key === itemKey)) return
    onChange({
      ...value,
      [sectionKey]: [...existing, { key: itemKey, frequency: 'every-visit' as const, notes: '' }],
    })
    setOpenDropdown(null)
  }

  function removeItem(sectionKey: SectionKey, itemKey: string) {
    onChange({
      ...value,
      [sectionKey]: value[sectionKey].filter(e => e.key !== itemKey),
    })
  }

  function updateEntry(sectionKey: SectionKey, itemKey: string, patch: Partial<CareTaskEntry>) {
    onChange({
      ...value,
      [sectionKey]: value[sectionKey].map(e =>
        e.key === itemKey ? { ...e, ...patch } : e
      ),
    })
  }

  return (
    <div className="space-y-8">
      {CARE_PLAN_SECTIONS.map(section => {
        const sKey = section.key as SectionKey
        const entries = value[sKey]
        const availableItems = section.items.filter(item => !entries.some(e => e.key === item.key))

        return (
          <div key={sKey}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{section.label}</h3>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === sKey ? null : sKey)}
                  className="text-xs text-primary hover:underline"
                >
                  + Add item
                </button>
                {openDropdown === sKey && availableItems.length > 0 && (
                  <div className="absolute right-0 top-6 z-10 w-52 rounded-lg border border-border bg-card shadow-lg">
                    {availableItems.map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => addItem(sKey, item.key)}
                        className="block w-full px-4 py-2.5 text-left text-sm hover:bg-muted"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {entries.length === 0 && (
              <p className="text-xs text-muted-foreground">No items added yet.</p>
            )}

            <div className="space-y-3">
              {entries.map(entry => {
                const itemLabel = section.items.find(i => i.key === entry.key)?.label ?? entry.key
                return (
                  <div key={entry.key} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{itemLabel}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(sKey, entry.key)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex gap-3 mb-2">
                      {(['every-visit', 'as-needed'] as const).map(freq => (
                        <label key={freq} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name={`${sKey}-${entry.key}-freq`}
                            checked={entry.frequency === freq}
                            onChange={() => updateEntry(sKey, entry.key, { frequency: freq })}
                          />
                          {freq === 'every-visit' ? 'Every Visit' : 'As Needed'}
                        </label>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={entry.notes ?? ''}
                      onChange={e => updateEntry(sKey, entry.key, { notes: e.target.value })}
                      placeholder="Notes (optional)"
                      className="w-full rounded-md border border-border px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
