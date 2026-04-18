# Phase 8: Care Plans and Calendar — Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all five stub pages (client care-plans list, client care-plan detail, caregiver care-plans, client calendar, caregiver calendar) with fully functional features backed by real database queries, Server Actions, a custom date-fns calendar grid, and inline editing.

**Architecture:** Domain query functions live in `domains/clients/care-plans.ts`, `domains/clients/calendar.ts`, and `domains/caregivers/calendar.ts` — each is a plain async function tested with the `vi.hoisted` mock pattern. Server Actions in `domains/clients/care-plan-actions.ts` handle upsert with auth + ownership checks. The Calendar is a single shared `'use client'` component in `components/calendar.tsx` that receives all data as props and navigates via `router.push`. Server Component pages own data fetching; client components own interaction.

**Tech Stack:** Next.js 16 App Router (Server Components, Server Actions), Drizzle ORM, date-fns 4, Vitest with `vi.hoisted()`, Tailwind CSS.

---

## File Map

| File | Action |
|---|---|
| `domains/clients/care-plans.ts` | Create — query functions |
| `domains/clients/__tests__/care-plans.test.ts` | Create — tests |
| `domains/clients/care-plan-actions.ts` | Create — Server Actions |
| `app/(client)/client/dashboard/care-plans/page.tsx` | Modify (replace stub) |
| `app/(client)/client/dashboard/care-plans/[jobId]/page.tsx` | Create |
| `app/(client)/client/dashboard/care-plans/[jobId]/_components/care-plan-editor.tsx` | Create |
| `app/(caregiver)/caregiver/dashboard/care-plans/page.tsx` | Modify (replace stub) |
| `components/calendar.tsx` | Create — shared client component |
| `domains/clients/calendar.ts` | Create — query + shift action |
| `domains/caregivers/calendar.ts` | Create — query + shift action |
| `app/(client)/client/dashboard/calendar/page.tsx` | Modify (replace stub) |
| `app/(caregiver)/caregiver/dashboard/calendar/page.tsx` | Modify (replace stub) |

---

## Task 1: Care plan domain query functions (TDD)

**Files:**
- Create: `domains/clients/care-plans.ts`
- Create: `domains/clients/__tests__/care-plans.test.ts`

- [ ] **Step 1.1: Write the failing tests**

Create `domains/clients/__tests__/care-plans.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSelectChain, mockDb } = vi.hoisted(() => {
  const mockSelectChain = {
    from:      vi.fn(),
    innerJoin: vi.fn(),
    leftJoin:  vi.fn(),
    where:     vi.fn(),
    orderBy:   vi.fn(),
    limit:     vi.fn(),
    offset:    vi.fn(),
  }

  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.leftJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.orderBy.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockReturnValue(mockSelectChain)
  mockSelectChain.offset.mockResolvedValue([])

  const mockDb = {
    select: vi.fn().mockReturnValue(mockSelectChain),
  }
  return { mockSelectChain, mockDb }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { getClientCarePlans, getCarePlanByJob } from '../care-plans'

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.leftJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.orderBy.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockReturnValue(mockSelectChain)
  mockSelectChain.offset.mockResolvedValue([])
  mockDb.select.mockReturnValue(mockSelectChain)
})

// ── getClientCarePlans ────────────────────────────────────────────────────────

describe('getClientCarePlans', () => {
  it('returns [] when client has no active jobs', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    const result = await getClientCarePlans('client-1')
    expect(result).toEqual([])
  })

  it('returns jobs with care plan data when plans exist', async () => {
    const updatedAt = new Date('2026-04-01T00:00:00Z')
    mockSelectChain.offset.mockResolvedValueOnce([
      {
        jobId: 'job-1',
        requestId: 'req-1',
        careType: 'personal-care',
        caregiverName: 'Alice',
        carePlanId: 'plan-1',
        updatedAt,
      },
    ])
    const result = await getClientCarePlans('client-1')
    expect(result).toHaveLength(1)
    expect(result[0].jobId).toBe('job-1')
    expect(result[0].carePlanId).toBe('plan-1')
    expect(result[0].updatedAt).toBe(updatedAt)
  })

  it('returns jobs without care plans (carePlanId null)', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([
      {
        jobId: 'job-2',
        requestId: 'req-2',
        careType: 'companion-care',
        caregiverName: 'Bob',
        carePlanId: null,
        updatedAt: null,
      },
    ])
    const result = await getClientCarePlans('client-2')
    expect(result).toHaveLength(1)
    expect(result[0].carePlanId).toBeNull()
    expect(result[0].updatedAt).toBeNull()
  })

  it('calls select with limit 50 and offset 0', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    await getClientCarePlans('client-1')
    expect(mockSelectChain.limit).toHaveBeenCalledWith(50)
    expect(mockSelectChain.offset).toHaveBeenCalledWith(0)
  })

  it('uses innerJoin for careRequests and caregiverProfiles and users, leftJoin for carePlans', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    await getClientCarePlans('client-1')
    expect(mockSelectChain.innerJoin).toHaveBeenCalledTimes(3)
    expect(mockSelectChain.leftJoin).toHaveBeenCalledTimes(1)
  })
})

// ── getCarePlanByJob ──────────────────────────────────────────────────────────

describe('getCarePlanByJob', () => {
  it('returns null when job does not exist or not owned by client', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    const result = await getCarePlanByJob('job-1', 'wrong-client')
    expect(result).toBeNull()
  })

  it('returns null when job exists but has no care plan', async () => {
    // First query: ownership check returns the job
    mockSelectChain.offset.mockResolvedValueOnce([{ jobId: 'job-1' }])
    // Second query: care plan query returns empty
    mockSelectChain.where.mockResolvedValueOnce([])
    const result = await getCarePlanByJob('job-1', 'client-1')
    expect(result).toBeNull()
  })

  it('returns care plan detail when job is owned and plan exists', async () => {
    const updatedAt = new Date('2026-04-01T00:00:00Z')
    // First query: ownership check
    mockSelectChain.offset.mockResolvedValueOnce([{ jobId: 'job-1' }])
    // Second query: care plan
    mockSelectChain.where.mockResolvedValueOnce([
      {
        id: 'plan-1',
        jobId: 'job-1',
        dailySchedule: [{ time: '08:00', activity: 'Breakfast' }],
        medications: [{ name: 'Aspirin', dosage: '81mg', frequency: 'daily' }],
        dietaryRestrictions: ['no peanuts'],
        emergencyContacts: [{ name: 'Son', relationship: 'son', phone: '555-1234' }],
        specialInstructions: 'Keep warm',
        updatedAt,
      },
    ])
    const result = await getCarePlanByJob('job-1', 'client-1')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('plan-1')
    expect(result!.dailySchedule).toEqual([{ time: '08:00', activity: 'Breakfast' }])
    expect(result!.medications).toEqual([{ name: 'Aspirin', dosage: '81mg', frequency: 'daily' }])
    expect(result!.dietaryRestrictions).toEqual(['no peanuts'])
    expect(result!.updatedAt).toBe(updatedAt)
  })
})
```

- [ ] **Step 1.2: Run tests and verify they fail**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc
npx vitest run domains/clients/__tests__/care-plans.test.ts
```

Expected output: FAIL — `Cannot find module '../care-plans'`

- [ ] **Step 1.3: Implement the query functions**

Create `domains/clients/care-plans.ts`:

```typescript
import { db } from '@/services/db'
import { jobs, careRequests, caregiverProfiles, users, carePlans } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export type ClientCarePlanRow = {
  jobId: string
  requestId: string
  careType: string
  caregiverName: string | null
  carePlanId: string | null
  updatedAt: Date | null
}

export type CarePlanDetail = {
  id: string
  jobId: string
  dailySchedule: Array<{ time: string; activity: string }> | null
  medications: Array<{ name: string; dosage: string; frequency: string; notes?: string }> | null
  dietaryRestrictions: string[] | null
  emergencyContacts: Array<{ name: string; relationship: string; phone: string }> | null
  specialInstructions: string | null
  updatedAt: Date
}

export async function getClientCarePlans(clientId: string): Promise<ClientCarePlanRow[]> {
  return db
    .select({
      jobId:         jobs.id,
      requestId:     jobs.requestId,
      careType:      careRequests.careType,
      caregiverName: users.name,
      carePlanId:    carePlans.id,
      updatedAt:     carePlans.updatedAt,
    })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .leftJoin(carePlans, eq(carePlans.jobId, jobs.id))
    .where(and(eq(jobs.clientId, clientId), eq(jobs.status, 'active')))
    .orderBy(desc(jobs.createdAt))
    .limit(50)
    .offset(0)
}

export async function getCarePlanByJob(
  jobId: string,
  clientId: string,
): Promise<CarePlanDetail | null> {
  const ownership = await db
    .select({ jobId: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, clientId)))
    .limit(1)
    .offset(0)

  if (ownership.length === 0) return null

  const rows = await db
    .select({
      id:                  carePlans.id,
      jobId:               carePlans.jobId,
      dailySchedule:       carePlans.dailySchedule,
      medications:         carePlans.medications,
      dietaryRestrictions: carePlans.dietaryRestrictions,
      emergencyContacts:   carePlans.emergencyContacts,
      specialInstructions: carePlans.specialInstructions,
      updatedAt:           carePlans.updatedAt,
    })
    .from(carePlans)
    .where(eq(carePlans.jobId, jobId))

  if (rows.length === 0) return null
  return rows[0] as CarePlanDetail
}
```

- [ ] **Step 1.4: Run tests and verify they pass**

```bash
npx vitest run domains/clients/__tests__/care-plans.test.ts
```

Expected output:
```
 ✓ domains/clients/__tests__/care-plans.test.ts (8)
   ✓ getClientCarePlans (5)
     ✓ returns [] when client has no active jobs
     ✓ returns jobs with care plan data when plans exist
     ✓ returns jobs without care plans (carePlanId null)
     ✓ calls select with limit 50 and offset 0
     ✓ uses innerJoin for careRequests and caregiverProfiles and users, leftJoin for carePlans
   ✓ getCarePlanByJob (3)
     ✓ returns null when job does not exist or not owned by client
     ✓ returns null when job exists but has no care plan
     ✓ returns care plan detail when job is owned and plan exists

Test Files  1 passed (1)
Tests       8 passed (8)
```

- [ ] **Step 1.5: Commit**

```bash
git add domains/clients/care-plans.ts domains/clients/__tests__/care-plans.test.ts
git commit -m "feat: add care plan domain query functions with tests"
```

---

## Task 2: Care Plan Server Actions

**Files:**
- Create: `domains/clients/care-plan-actions.ts`

- [ ] **Step 2.1: Create the Server Actions file**

Create `domains/clients/care-plan-actions.ts`:

```typescript
'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { carePlans, jobs } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function upsertCarePlan(
  jobId: string,
  data: {
    dailySchedule?: Array<{ time: string; activity: string }>
    medications?: Array<{ name: string; dosage: string; frequency: string; notes?: string }>
    dietaryRestrictions?: string[]
    emergencyContacts?: Array<{ name: string; relationship: string; phone: string }>
    specialInstructions?: string
  },
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const job = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, session.user.id)))
    .limit(1)

  if (job.length === 0) return { error: 'Not found' }

  await db
    .insert(carePlans)
    .values({ jobId, ...data })
    .onConflictDoUpdate({
      target: carePlans.jobId,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })

  revalidatePath('/client/dashboard/care-plans')
  revalidatePath(`/client/dashboard/care-plans/${jobId}`)
  return {}
}
```

- [ ] **Step 2.2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors).

- [ ] **Step 2.3: Commit**

```bash
git add domains/clients/care-plan-actions.ts
git commit -m "feat: add upsertCarePlan server action"
```

---

## Task 3: Client Care Plans List Page

**Files:**
- Modify: `app/(client)/client/dashboard/care-plans/page.tsx`

- [ ] **Step 3.1: Replace the stub**

Replace the entire contents of `app/(client)/client/dashboard/care-plans/page.tsx` with:

```typescript
import Link from 'next/link'
import { requireRole } from '@/domains/auth/session'
import { getClientCarePlans } from '@/domains/clients/care-plans'

export default async function CarePlansPage() {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const rows = await getClientCarePlans(clientId)

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Care Plans</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Manage care instructions for each active job.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active jobs found.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Link
              key={row.jobId}
              href={`/client/dashboard/care-plans/${row.jobId}`}
              className="block rounded-xl border border-border bg-card p-5 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm mb-1">{row.careType}</p>
                  <p className="text-xs text-muted-foreground">
                    Caregiver: {row.caregiverName ?? 'Unknown'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {row.carePlanId ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                      Plan saved
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                      No plan yet
                    </span>
                  )}
                  {row.updatedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {row.updatedAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3.2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3.3: Commit**

```bash
git add "app/(client)/client/dashboard/care-plans/page.tsx"
git commit -m "feat: implement client care plans list page"
```

---

## Task 4: Client Care Plans Detail Page and Inline Editor

**Files:**
- Create: `app/(client)/client/dashboard/care-plans/[jobId]/page.tsx`
- Create: `app/(client)/client/dashboard/care-plans/[jobId]/_components/care-plan-editor.tsx`

- [ ] **Step 4.1: Create the inline editor component**

Create `app/(client)/client/dashboard/care-plans/[jobId]/_components/care-plan-editor.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { upsertCarePlan } from '@/domains/clients/care-plan-actions'
import type { CarePlanDetail } from '@/domains/clients/care-plans'

type Props = {
  jobId: string
  carePlan: CarePlanDetail | null
}

type Section = 'dailySchedule' | 'medications' | 'dietaryRestrictions' | 'emergencyContacts' | 'specialInstructions'

export function CarePlanEditor({ jobId, carePlan }: Props) {
  const [editing, setEditing] = useState<Section | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [dailySchedule, setDailySchedule] = useState(
    carePlan?.dailySchedule ?? []
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

      const result = await upsertCarePlan(jobId, data)
      if (result.error) {
        setError(result.error)
      } else {
        setEditing(null)
      }
    })
  }

  function cancel() {
    setDailySchedule(carePlan?.dailySchedule ?? [])
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
                <span className="font-mono text-muted-foreground w-14 shrink-0">{item.time}</span>
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
                      next[i] = { ...next[i], phone: e.target.value }
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
```

- [ ] **Step 4.2: Create the detail page**

Create `app/(client)/client/dashboard/care-plans/[jobId]/page.tsx`:

```typescript
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/domains/auth/session'
import { getCarePlanByJob, getClientCarePlans } from '@/domains/clients/care-plans'
import { CarePlanEditor } from './_components/care-plan-editor'

interface PageProps {
  params: Promise<{ jobId: string }>
}

export default async function CarePlanDetailPage({ params }: PageProps) {
  const { jobId } = await params
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [rows, carePlan] = await Promise.all([
    getClientCarePlans(clientId),
    getCarePlanByJob(jobId, clientId),
  ])

  const job = rows.find((r) => r.jobId === jobId)
  if (!job) notFound()

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/client/dashboard/care-plans"
        className="text-xs text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← Back to Care Plans
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Care Plan</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {job.careType} · Caregiver: {job.caregiverName ?? 'Unknown'}
      </p>

      <CarePlanEditor
        key={carePlan?.updatedAt?.toISOString() ?? 'empty'}
        jobId={jobId}
        carePlan={carePlan}
      />
    </div>
  )
}
```

- [ ] **Step 4.3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 4.4: Commit**

```bash
git add "app/(client)/client/dashboard/care-plans/[jobId]/page.tsx" \
        "app/(client)/client/dashboard/care-plans/[jobId]/_components/care-plan-editor.tsx"
git commit -m "feat: implement client care plan detail page with inline editor"
```

---

## Task 5: Caregiver Care Plans Page

**Files:**
- Modify: `app/(caregiver)/caregiver/dashboard/care-plans/page.tsx`

- [ ] **Step 5.1: Replace the stub**

Replace the entire contents of `app/(caregiver)/caregiver/dashboard/care-plans/page.tsx` with:

```typescript
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { jobs, careRequests, caregiverProfiles, carePlans, users } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export default async function CaregiverCarePlansPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return (
      <div className="p-8 text-muted-foreground text-sm">
        Complete your profile to view care plans.
      </div>
    )
  }

  const rows = await db
    .select({
      jobId:               jobs.id,
      careType:            careRequests.careType,
      clientName:          users.name,
      carePlanId:          carePlans.id,
      dailySchedule:       carePlans.dailySchedule,
      medications:         carePlans.medications,
      dietaryRestrictions: carePlans.dietaryRestrictions,
      emergencyContacts:   carePlans.emergencyContacts,
      specialInstructions: carePlans.specialInstructions,
      updatedAt:           carePlans.updatedAt,
    })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(users, eq(jobs.clientId, users.id))
    .leftJoin(carePlans, eq(carePlans.jobId, jobs.id))
    .where(and(eq(jobs.caregiverId, profile.id), eq(jobs.status, 'active')))
    .orderBy(desc(jobs.createdAt))
    .limit(50)
    .offset(0)

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Care Plans</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Care instructions from your active clients.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active jobs found.</p>
      ) : (
        <div className="space-y-6">
          {rows.map((row) => (
            <div key={row.jobId} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-sm">{row.careType}</p>
                  <p className="text-xs text-muted-foreground">Client: {row.clientName ?? 'Unknown'}</p>
                </div>
                {row.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Updated {row.updatedAt.toLocaleDateString()}
                  </p>
                )}
              </div>

              {!row.carePlanId ? (
                <p className="text-sm text-muted-foreground">No care plan added yet.</p>
              ) : (
                <div className="space-y-4">
                  {row.dailySchedule && row.dailySchedule.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Daily Schedule
                      </p>
                      <ul className="space-y-1">
                        {row.dailySchedule.map((item, i) => (
                          <li key={i} className="text-sm flex gap-4">
                            <span className="font-mono text-muted-foreground w-14 shrink-0">{item.time}</span>
                            <span>{item.activity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {row.medications && row.medications.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Medications
                      </p>
                      <ul className="space-y-1">
                        {row.medications.map((med, i) => (
                          <li key={i} className="text-sm">
                            <span className="font-medium">{med.name}</span>
                            <span className="text-muted-foreground"> — {med.dosage}, {med.frequency}</span>
                            {med.notes && <span className="text-muted-foreground"> ({med.notes})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {row.dietaryRestrictions && row.dietaryRestrictions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Dietary Restrictions
                      </p>
                      <ul className="flex flex-wrap gap-2">
                        {row.dietaryRestrictions.map((r, i) => (
                          <li key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {row.emergencyContacts && row.emergencyContacts.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Emergency Contacts
                      </p>
                      <ul className="space-y-1">
                        {row.emergencyContacts.map((contact, i) => (
                          <li key={i} className="text-sm">
                            <span className="font-medium">{contact.name}</span>
                            <span className="text-muted-foreground"> ({contact.relationship}) — {contact.phone}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {row.specialInstructions && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Special Instructions
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{row.specialInstructions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5.2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 5.3: Commit**

```bash
git add "app/(caregiver)/caregiver/dashboard/care-plans/page.tsx"
git commit -m "feat: implement caregiver care plans read-only page"
```

---

## Task 6: Shared Calendar Component

**Files:**
- Create: `components/calendar.tsx`

- [ ] **Step 6.1: Create the calendar component**

Create `components/calendar.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  isSameDay,
  isToday,
} from 'date-fns'

export type CalendarEvent = {
  date: string  // 'yyyy-MM-dd'
  label: string
  status: string
  jobId: string
}

export type ActiveJob = {
  jobId: string
  label: string
}

type Props = {
  year: number
  month: number   // 1-based
  events: CalendarEvent[]
  activeJobs: ActiveJob[]
  basePath: string
  addShiftAction: (
    jobId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) => Promise<{ error?: string }>
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SHIFT_STATUS_CLASSES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled:  'bg-destructive/10 text-destructive',
}

export function Calendar({ year, month, events, activeJobs, basePath, addShiftAction }: Props) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [formJobId, setFormJobId] = useState(activeJobs[0]?.jobId ?? '')
  const [formStart, setFormStart] = useState('09:00')
  const [formEnd, setFormEnd] = useState('17:00')

  const monthDate = new Date(year, month - 1, 1)
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOfWeek = getDay(monthStart)

  function goTo(y: number, m: number) {
    router.push(`${basePath}?year=${y}&month=${m}`)
  }

  function prevMonth() {
    if (month === 1) goTo(year - 1, 12)
    else goTo(year, month - 1)
  }

  function nextMonth() {
    if (month === 12) goTo(year + 1, 1)
    else goTo(year, month + 1)
  }

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedEvents = events.filter((e) => e.date === selectedDateStr)

  function submitShift() {
    if (!selectedDate || !formJobId || !formStart || !formEnd) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    setFormError(null)
    startTransition(async () => {
      const result = await addShiftAction(formJobId, dateStr, formStart, formEnd)
      if (result.error) {
        setFormError(result.error)
      } else {
        setFormStart('09:00')
        setFormEnd('17:00')
      }
    })
  }

  return (
    <div className="flex gap-6">
      {/* ── Calendar grid ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="text-sm px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            ←
          </button>
          <h2 className="font-semibold text-sm">
            {format(monthDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={nextMonth}
            className="text-sm px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-card min-h-[60px]" />
          ))}

          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayEvents = events.filter((e) => e.date === dateStr)
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
            const today = isToday(day)

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSameDay(day, selectedDate ?? new Date(0)) ? null : day)}
                className={[
                  'bg-card min-h-[60px] p-1.5 text-left hover:bg-muted/50 transition-colors relative',
                  isSelected ? 'ring-2 ring-inset ring-primary' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'text-xs font-medium inline-flex w-5 h-5 items-center justify-center rounded-full',
                    today ? 'bg-primary text-primary-foreground' : 'text-foreground',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((_, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary block" />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Side panel ────────────────────────────────────────────────── */}
      {selectedDate && (
        <div className="w-72 shrink-0 rounded-xl border border-border bg-card p-5 self-start">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">No shifts.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {selectedEvents.map((event, i) => (
                <li key={i} className="rounded-lg border border-border p-2">
                  <p className="text-sm font-medium">{event.label}</p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${SHIFT_STATUS_CLASSES[event.status] ?? 'bg-muted text-muted-foreground'}`}
                  >
                    {event.status}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {activeJobs.length > 0 && (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-medium">Add Shift</p>

              {activeJobs.length > 1 && (
                <select
                  value={formJobId}
                  onChange={(e) => setFormJobId(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
                >
                  {activeJobs.map((job) => (
                    <option key={job.jobId} value={job.jobId}>
                      {job.label}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Start</label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">End</label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
              </div>

              {formError && <p className="text-xs text-destructive">{formError}</p>}

              <button
                onClick={submitShift}
                disabled={isPending}
                className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {isPending ? 'Adding…' : 'Add Shift'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6.2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 6.3: Commit**

```bash
git add components/calendar.tsx
git commit -m "feat: add shared Calendar client component with month grid and side panel"
```

---

## Task 7: Calendar Domain Queries and Shift Actions

**Files:**
- Create: `domains/clients/calendar.ts`
- Create: `domains/caregivers/calendar.ts`

- [ ] **Step 7.1: Create client calendar domain**

Create `domains/clients/calendar.ts`:

```typescript
import { db } from '@/services/db'
import { shifts, jobs, careRequests, caregiverProfiles, users } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export type ClientCalendarShift = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  label: string
  jobId: string
}

export type ClientActiveJob = {
  jobId: string
  label: string
}

export async function getClientCalendarShifts(
  clientId: string,
  year: number,
  month: number,
): Promise<ClientCalendarShift[]> {
  const monthStr = String(month).padStart(2, '0')
  const dateFrom = `${year}-${monthStr}-01`
  const dateTo   = `${year}-${monthStr}-31`

  return db
    .select({
      id:        shifts.id,
      date:      shifts.date,
      startTime: shifts.startTime,
      endTime:   shifts.endTime,
      status:    shifts.status,
      careType:  careRequests.careType,
      caregiverName: users.name,
      jobId:     jobs.id,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .where(
      and(
        eq(jobs.clientId, clientId),
        eq(jobs.status, 'active'),
        gte(shifts.date, dateFrom),
        lte(shifts.date, dateTo),
      ),
    )
    .orderBy(desc(shifts.date))
    .then((rows) =>
      rows.map((r) => ({
        id:        r.id,
        date:      r.date,
        startTime: r.startTime,
        endTime:   r.endTime,
        status:    r.status ?? 'scheduled',
        label:     `${r.careType} — ${r.caregiverName ?? 'Caregiver'} (${r.startTime}–${r.endTime})`,
        jobId:     r.jobId,
      })),
    )
}

export async function getClientActiveJobs(clientId: string): Promise<ClientActiveJob[]> {
  const rows = await db
    .select({
      jobId:    jobs.id,
      careType: careRequests.careType,
      caregiverName: users.name,
    })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .where(and(eq(jobs.clientId, clientId), eq(jobs.status, 'active')))
    .orderBy(desc(jobs.createdAt))
    .limit(50)
    .offset(0)

  return rows.map((r) => ({
    jobId: r.jobId,
    label: `${r.careType} — ${r.caregiverName ?? 'Caregiver'}`,
  }))
}

export async function addClientShift(
  jobId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<{ error?: string }> {
  'use server'
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const job = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, session.user.id)))
    .limit(1)

  if (job.length === 0) return { error: 'Job not found' }

  await db.insert(shifts).values({
    jobId,
    date,
    startTime,
    endTime,
    status: 'scheduled',
  })

  revalidatePath('/client/dashboard/calendar')
  return {}
}
```

- [ ] **Step 7.2: Create caregiver calendar domain**

Create `domains/caregivers/calendar.ts`:

```typescript
import { db } from '@/services/db'
import { shifts, jobs, careRequests, caregiverProfiles, users } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export type CaregiverCalendarShift = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  label: string
  jobId: string
}

export type CaregiverActiveJob = {
  jobId: string
  label: string
}

export async function getCaregiverCalendarShifts(
  caregiverId: string,
  year: number,
  month: number,
): Promise<CaregiverCalendarShift[]> {
  const monthStr = String(month).padStart(2, '0')\
  const dateFrom = `${year}-${monthStr}-01`
  const dateTo   = `${year}-${monthStr}-31`

  return db
    .select({
      id:         shifts.id,
      date:       shifts.date,
      startTime:  shifts.startTime,
      endTime:    shifts.endTime,
      status:     shifts.status,
      careType:   careRequests.careType,
      clientName: users.name,
      jobId:      jobs.id,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(users, eq(jobs.clientId, users.id))
    .where(
      and(
        eq(jobs.caregiverId, caregiverId),
        eq(jobs.status, 'active'),
        gte(shifts.date, dateFrom),
        lte(shifts.date, dateTo),
      ),
    )
    .orderBy(desc(shifts.date))
    .then((rows) =>
      rows.map((r) => ({
        id:        r.id,
        date:      r.date,
        startTime: r.startTime,
        endTime:   r.endTime,
        status:    r.status ?? 'scheduled',
        label:     `${r.careType} — ${r.clientName ?? 'Client'} (${r.startTime}–${r.endTime})`,
        jobId:     r.jobId,
      })),
    )
}

export async function getCaregiverActiveJobs(caregiverId: string): Promise<CaregiverActiveJob[]> {
  const rows = await db
    .select({
      jobId:      jobs.id,
      careType:   careRequests.careType,
      clientName: users.name,
    })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(users, eq(jobs.clientId, users.id))
    .where(and(eq(jobs.caregiverId, caregiverId), eq(jobs.status, 'active')))
    .orderBy(desc(jobs.createdAt))
    .limit(50)
    .offset(0)

  return rows.map((r) => ({
    jobId: r.jobId,
    label: `${r.careType} — ${r.clientName ?? 'Client'}`,
  }))
}

export async function addCaregiverShift(
  jobId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<{ error?: string }> {
  'use server'
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })
  if (!profile) return { error: 'Profile not found' }

  const job = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.caregiverId, profile.id)))
    .limit(1)

  if (job.length === 0) return { error: 'Job not found' }

  await db.insert(shifts).values({
    jobId,
    date,
    startTime,
    endTime,
    status: 'scheduled',
  })

  revalidatePath('/caregiver/dashboard/calendar')
  return {}
}
```

- [ ] **Step 7.3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 7.4: Commit**

```bash
git add domains/clients/calendar.ts domains/caregivers/calendar.ts
git commit -m "feat: add calendar domain queries and shift server actions"
```

---

## Task 8: Calendar Pages

**Files:**
- Modify: `app/(client)/client/dashboard/calendar/page.tsx`
- Modify: `app/(caregiver)/caregiver/dashboard/calendar/page.tsx`

- [ ] **Step 8.1: Create the client calendar page**

Replace the entire contents of `app/(client)/client/dashboard/calendar/page.tsx` with:

```typescript
import { requireRole } from '@/domains/auth/session'
import { getClientCalendarShifts, getClientActiveJobs, addClientShift } from '@/domains/clients/calendar'
import { Calendar } from '@/components/calendar'
import type { CalendarEvent, ActiveJob } from '@/components/calendar'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function sp(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val
}

export default async function ClientCalendarPage({ searchParams }: PageProps) {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const resolved = await searchParams
  const now = new Date()
  const year  = Number(sp(resolved.year))  || now.getFullYear()
  const month = Number(sp(resolved.month)) || now.getMonth() + 1

  const [rawShifts, rawJobs] = await Promise.all([
    getClientCalendarShifts(clientId, year, month),
    getClientActiveJobs(clientId),
  ])

  const events: CalendarEvent[] = rawShifts.map((s) => ({
    date:   s.date,
    label:  s.label,
    status: s.status,
    jobId:  s.jobId,
  }))

  const activeJobs: ActiveJob[] = rawJobs.map((j) => ({
    jobId: j.jobId,
    label: j.label,
  }))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1">Calendar</h1>
      <p className="text-sm text-muted-foreground mb-8">View and schedule shifts.</p>

      <Calendar
        year={year}
        month={month}
        events={events}
        activeJobs={activeJobs}
        basePath="/client/dashboard/calendar"
        addShiftAction={addClientShift}
      />
    </div>
  )
}
```

- [ ] **Step 8.2: Create the caregiver calendar page**

Replace the entire contents of `app/(caregiver)/caregiver/dashboard/calendar/page.tsx` with:

```typescript
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getCaregiverCalendarShifts, getCaregiverActiveJobs, addCaregiverShift } from '@/domains/caregivers/calendar'
import { Calendar } from '@/components/calendar'
import type { CalendarEvent, ActiveJob } from '@/components/calendar'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function sp(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val
}

export default async function CaregiverCalendarPage({ searchParams }: PageProps) {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return (
      <div className="p-8 text-muted-foreground text-sm">
        Complete your profile to use the calendar.
      </div>
    )
  }

  const resolved = await searchParams
  const now = new Date()
  const year  = Number(sp(resolved.year))  || now.getFullYear()
  const month = Number(sp(resolved.month)) || now.getMonth() + 1

  const [rawShifts, rawJobs] = await Promise.all([
    getCaregiverCalendarShifts(profile.id, year, month),
    getCaregiverActiveJobs(profile.id),
  ])

  const events: CalendarEvent[] = rawShifts.map((s) => ({
    date:   s.date,
    label:  s.label,
    status: s.status,
    jobId:  s.jobId,
  }))

  const activeJobs: ActiveJob[] = rawJobs.map((j) => ({
    jobId: j.jobId,
    label: j.label,
  }))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1">Calendar</h1>
      <p className="text-sm text-muted-foreground mb-8">View and log your shifts.</p>

      <Calendar
        year={year}
        month={month}
        events={events}
        activeJobs={activeJobs}
        basePath="/caregiver/dashboard/calendar"
        addShiftAction={addCaregiverShift}
      />
    </div>
  )
}
```

- [ ] **Step 8.3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 8.4: Commit**

```bash
git add "app/(client)/client/dashboard/calendar/page.tsx" \
        "app/(caregiver)/caregiver/dashboard/calendar/page.tsx"
git commit -m "feat: implement client and caregiver calendar pages"
```

---

## Task 9: Build Verification

**Files:** None (verification only)

- [ ] **Step 9.1: Run all tests**

```bash
npx vitest run
```

Expected output (all tests must pass):
```
 ✓ domains/clients/__tests__/care-plans.test.ts (8)
 ✓ domains/clients/__tests__/find-caregivers.test.ts (9)
 ✓ domains/clients/__tests__/requests.test.ts (7)
 ...

Test Files  N passed (N)
Tests       N passed (N)
```

If any test fails, fix the failure before proceeding.

- [ ] **Step 9.2: TypeScript full check**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 9.3: Next.js production build**

```bash
npx next build
```

Expected: build completes without errors. The output should include all new routes:
```
Route (app)                                           Size     First Load JS
...
├ ○ /client/dashboard/care-plans
├ ƒ /client/dashboard/care-plans/[jobId]
├ ○ /client/dashboard/calendar
├ ○ /caregiver/dashboard/care-plans
├ ○ /caregiver/dashboard/calendar
```

If the build fails:
1. Read the error message carefully.
2. Check for missing imports, type errors, or invalid Server Action usage.
3. Fix and re-run `npx tsc --noEmit` then `npx next build`.

- [ ] **Step 9.4: Final commit**

```bash
git add -A
git commit -m "chore: verify Phase 8 build passes (vitest + tsc + next build)"
```

---

## Self-Review

### 1. Spec Coverage

| Requirement | Task |
|---|---|
| Client care plans list page | Task 3 |
| Client care plan detail page | Task 4 |
| 5 editable sections (inline) | Task 4, care-plan-editor.tsx |
| Save/Cancel per section | Task 4, care-plan-editor.tsx |
| Caregiver care plans read-only | Task 5 |
| Custom monthly calendar grid (date-fns) | Task 6 |
| Month navigation via URL params | Task 6 |
| Dots on days with shifts | Task 6 |
| Click day → side panel with shifts + Add Shift | Task 6 |
| Add Shift: pick job if multiple | Task 6 |
| `getClientCarePlans` query | Task 1 |
| `getCarePlanByJob` with ownership check | Task 1 |
| Tests: empty state, with plans, without plans, ownership | Task 1 |
| `upsertCarePlan` server action | Task 2 |
| Calendar shifts query (date-range filter) | Task 7 |
| `addClientShift` / `addCaregiverShift` server actions | Task 7 |
| Client calendar page | Task 8 |
| Caregiver calendar page | Task 8 |
| `await searchParams` (Next.js 16) | Task 8 |
| `vi.hoisted` mock pattern | Task 1 |
| vitest run + tsc --noEmit + next build | Task 9 |

### 2. Type Consistency

- `CarePlanDetail` defined in `domains/clients/care-plans.ts` (Task 1), imported by `care-plan-editor.tsx` (Task 4) and `[jobId]/page.tsx` (Task 4).
- `ClientCarePlanRow` defined in `domains/clients/care-plans.ts` (Task 1), used by `page.tsx` (Task 3) and `[jobId]/page.tsx` (Task 4).
- `CalendarEvent` and `ActiveJob` exported from `components/calendar.tsx` (Task 6), imported by both calendar pages (Task 8).
- `addClientShift` / `addCaregiverShift` signatures: `(jobId, date, startTime, endTime) => Promise<{ error?: string }>` — matches the `addShiftAction` prop type in `Calendar` component.
- `upsertCarePlan` param type matches `Parameters<typeof upsertCarePlan>[1]` usage in `CarePlanEditor`.
