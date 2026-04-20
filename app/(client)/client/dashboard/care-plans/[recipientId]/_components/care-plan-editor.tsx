'use client'

import { useState, useTransition } from 'react'
import { upsertCarePlan } from '@/domains/clients/care-plan-actions'
import { formatUSPhone } from '@/lib/phone'
import type { CarePlanDetail } from '@/domains/clients/care-plans'

function to24h(time: string): string {
  if (!time) return ''
  if (/^\d{2}:\d{2}$/.test(time)) return time
  const m = time.match(/^(\d+):(\d+)\s*(AM|PM)$/i)
  if (!m) return ''
  let h = parseInt(m[1], 10)
  const min = m[2]
  const period = m[3].toUpperCase()
  if (period === 'AM' && h === 12) h = 0
  if (period === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${min}`
}

function to12h(time: string): string {
  if (!time) return ''
  if (/^\d+:\d+\s*(AM|PM)$/i.test(time)) return time
  const [hStr, min] = time.split(':')
  const h = parseInt(hStr, 10)
  if (isNaN(h)) return time
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return `${h12}:${min} ${period}`
}

type Props = {
  recipientId: string
  carePlan: CarePlanDetail | null
}

type Section = 'dailySchedule' | 'medications' | 'dietaryRestrictions' | 'emergencyContacts' | 'specialInstructions'

export function CarePlanEditor({ recipientId, carePlan }: Props) {
  const [editing, setEditing] = useState<Section | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [dailySchedule, setDailySchedule] = useState(
    (carePlan?.dailySchedule ?? []).map(item => ({ ...item, time: to24h(item.time) }))
  )
  const [medications, setMedications] = useState(
    carePlan?.medications ?? []
  )
  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    carePlan?.dietaryRestrictions ?? []
  )
  const [emergencyContacts, setEmergencyContacts] = useState(
    carePlan?.emergencyContacts ?? []
  )
  const [specialInstructions, setSpecialInstructions] = useState(
    carePlan?.specialInstructions ?? ''
  )

  function save(section: Section) {
    setError(null)
    startTransition(async () => {
      const data: Parameters<typeof upsertCarePlan>[1] = {}
      if (section === 'dailySchedule')       data.dailySchedule = dailySchedule
      if (section === 'medications')          data.medications = medications
      if (section === 'dietaryRestrictions')  data.dietaryRestrictions = dietaryRestrictions
      if (section === 'emergencyContacts')    data.emergencyContacts = emergencyContacts
      if (section === 'specialInstructions')  data.specialInstructions = specialInstructions

      const result = await upsertCarePlan(recipientId, data)
      if (result.error) {
        setError(result.error)
      } else {
        setEditing(null)
      }
    })
  }

  function cancel() {
    setDailySchedule((carePlan?.dailySchedule ?? []).map(item => ({ ...item, time: to24h(item.time) })))
    setMedications(carePlan?.medications ?? [])
    setDietaryRestrictions(carePlan?.dietaryRestrictions ?? [])
    setEmergencyContacts(carePlan?.emergencyContacts ?? [])
    setSpecialInstructions(carePlan?.specialInstructions ?? '')
    setEditing(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* ── Daily Schedule ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Daily Schedule</h2>
          {editing !== 'dailySchedule' && (
            <button
              onClick={() => setEditing('dailySchedule')}
              className="text-xs text-primary hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {editing === 'dailySchedule' ? (
          <div className="space-y-3">
            {dailySchedule.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="time"
                  value={item.time}
                  onChange={(e) => {
                    const next = [...dailySchedule]
                    next[i] = { ...next[i], time: e.target.value }
                    setDailySchedule(next)
                  }}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <input
                  type="text"
                  placeholder="Activity"
                  value={item.activity}
                  onChange={(e) => {
                    const next = [...dailySchedule]
                    next[i] = { ...next[i], activity: e.target.value }
                    setDailySchedule(next)
                  }}
                  className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <button
                  onClick={() => setDailySchedule(dailySchedule.filter((_, j) => j !== i))}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => setDailySchedule([...dailySchedule, { time: '08:00', activity: '' }])}
              className="text-xs text-primary hover:underline"
            >
              + Add entry
            </button>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => save('dailySchedule')}
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
        ) : dailySchedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">No schedule entries yet.</p>
        ) : (
          <ul className="space-y-1">
            {dailySchedule.map((item, i) => (
              <li key={i} className="text-sm flex gap-4">
                <span className="font-mono text-muted-foreground whitespace-nowrap shrink-0 w-20">{to12h(item.time)}</span>
                <span>{item.activity}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Medications ────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Medications</h2>
          {editing !== 'medications' && (
            <button
              onClick={() => setEditing('medications')}
              className="text-xs text-primary hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {editing === 'medications' ? (
          <div className="space-y-4">
            {medications.map((med, i) => (
              <div key={i} className="space-y-2 p-3 rounded-lg border border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={med.name}
                    onChange={(e) => {
                      const next = [...medications]
                      next[i] = { ...next[i], name: e.target.value }
                      setMedications(next)
                    }}
                    className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <button
                    onClick={() => setMedications(medications.filter((_, j) => j !== i))}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Dosage"
                    value={med.dosage}
                    onChange={(e) => {
                      const next = [...medications]
                      next[i] = { ...next[i], dosage: e.target.value }
                      setMedications(next)
                    }}
                    className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <input
                    type="text"
                    placeholder="Frequency"
                    value={med.frequency}
                    onChange={(e) => {
                      const next = [...medications]
                      next[i] = { ...next[i], frequency: e.target.value }
                      setMedications(next)
                    }}
                    className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={med.notes ?? ''}
                  onChange={(e) => {
                    const next = [...medications]
                    next[i] = { ...next[i], notes: e.target.value || undefined }
                    setMedications(next)
                  }}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            ))}
            <button
              onClick={() => setMedications([...medications, { name: '', dosage: '', frequency: '' }])}
              className="text-xs text-primary hover:underline"
            >
              + Add medication
            </button>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => save('medications')}
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
        ) : medications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medications listed.</p>
        ) : (
          <ul className="space-y-2">
            {medications.map((med, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{med.name}</span>
                <span className="text-muted-foreground"> — {med.dosage}, {med.frequency}</span>
                {med.notes && <span className="text-muted-foreground"> ({med.notes})</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Dietary Restrictions ───────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Dietary Restrictions</h2>
          {editing !== 'dietaryRestrictions' && (
            <button
              onClick={() => setEditing('dietaryRestrictions')}
              className="text-xs text-primary hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {editing === 'dietaryRestrictions' ? (
          <div className="space-y-3">
            {dietaryRestrictions.map((restriction, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={restriction}
                  onChange={(e) => {
                    const next = [...dietaryRestrictions]
                    next[i] = e.target.value
                    setDietaryRestrictions(next)
                  }}
                  className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <button
                  onClick={() => setDietaryRestrictions(dietaryRestrictions.filter((_, j) => j !== i))}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => setDietaryRestrictions([...dietaryRestrictions, ''])}
              className="text-xs text-primary hover:underline"
            >
              + Add restriction
            </button>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => save('dietaryRestrictions')}
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
        ) : dietaryRestrictions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dietary restrictions listed.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {dietaryRestrictions.map((r, i) => (
              <li key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {r}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Emergency Contacts ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Emergency Contacts</h2>
          {editing !== 'emergencyContacts' && (
            <button
              onClick={() => setEditing('emergencyContacts')}
              className="text-xs text-primary hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {editing === 'emergencyContacts' ? (
          <div className="space-y-4">
            {emergencyContacts.map((contact, i) => (
              <div key={i} className="space-y-2 p-3 rounded-lg border border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={contact.name}
                    onChange={(e) => {
                      const next = [...emergencyContacts]
                      next[i] = { ...next[i], name: e.target.value }
                      setEmergencyContacts(next)
                    }}
                    className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <button
                    onClick={() => setEmergencyContacts(emergencyContacts.filter((_, j) => j !== i))}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Relationship"
                    value={contact.relationship}
                    onChange={(e) => {
                      const next = [...emergencyContacts]
                      next[i] = { ...next[i], relationship: e.target.value }
                      setEmergencyContacts(next)
                    }}
                    className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={contact.phone}
                    onChange={(e) => {
                      const next = [...emergencyContacts]
                      next[i] = { ...next[i], phone: formatUSPhone(e.target.value) }
                      setEmergencyContacts(next)
                    }}
                    className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => setEmergencyContacts([...emergencyContacts, { name: '', relationship: '', phone: '' }])}
              className="text-xs text-primary hover:underline"
            >
              + Add contact
            </button>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => save('emergencyContacts')}
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
        ) : emergencyContacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No emergency contacts listed.</p>
        ) : (
          <ul className="space-y-2">
            {emergencyContacts.map((contact, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{contact.name}</span>
                <span className="text-muted-foreground"> ({contact.relationship}) — {contact.phone}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Special Instructions ───────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Special Instructions</h2>
          {editing !== 'specialInstructions' && (
            <button
              onClick={() => setEditing('specialInstructions')}
              className="text-xs text-primary hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {editing === 'specialInstructions' ? (
          <div className="space-y-3">
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={4}
              placeholder="Any special instructions for the caregiver…"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => save('specialInstructions')}
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
        ) : specialInstructions ? (
          <p className="text-sm whitespace-pre-wrap">{specialInstructions}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No special instructions yet.</p>
        )}
      </section>
    </div>
  )
}
