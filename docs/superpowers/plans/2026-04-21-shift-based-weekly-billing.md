# Shift-Based Weekly Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual "Record Payment" with automated weekly billing — completed shifts are charged Sunday night, held in escrow 7 days, then released to the caregiver if no dispute.

**Architecture:** Add `billedAt` to shifts, a `calculateShiftHours` utility, a new `/api/cron/weekly-billing` route that groups unbilled shifts by job and charges clients via Stripe, and an "Upcoming Charge" section on the billing page replacing the manual Record Payment button.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Stripe (`createAndPayInvoice`, `getDefaultPaymentMethod`), Vercel Cron, Vitest

---

## File Map

| File | Change |
|------|--------|
| `lib/shift-utils.ts` | Create — `calculateShiftHours(startTime, endTime): number` |
| `lib/__tests__/shift-utils.test.ts` | Create — tests for calculateShiftHours |
| `db/schema.ts` | Modify — add `billedAt` to shifts table |
| `domains/payments/queries.ts` | Modify — add `UnbilledShiftRow` + `getUnbilledShiftsForClient` |
| `domains/payments/__tests__/queries.test.ts` | Modify — add tests for `getUnbilledShiftsForClient` |
| `domains/payments/actions.ts` | Modify — `completeShift` inserts client notification |
| `domains/payments/__tests__/complete-shift.test.ts` | Create — tests for completeShift notification |
| `app/api/cron/payout-sweep/route.ts` | Modify — add 7-day hold filter |
| `app/api/cron/__tests__/payout-sweep.test.ts` | Modify — add 7-day hold test |
| `app/api/cron/weekly-billing/route.ts` | Create — weekly billing cron |
| `app/api/cron/__tests__/weekly-billing.test.ts` | Create — tests for weekly billing cron |
| `vercel.json` | Modify — add weekly-billing cron schedule |
| `app/(client)/client/dashboard/billing/page.tsx` | Modify — fetch unbilled shifts, pass to BillingClient |
| `app/(client)/client/dashboard/billing/_components/billing-client.tsx` | Modify — replace Record Payment with Upcoming Charge |
| `app/(client)/client/dashboard/billing/_components/record-payment-modal.tsx` | Delete |

---

### Task 1: Shared utility — calculateShiftHours

**Files:**
- Create: `lib/shift-utils.ts`
- Create: `lib/__tests__/shift-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/__tests__/shift-utils.test.ts
import { describe, it, expect } from 'vitest'
import { calculateShiftHours } from '../shift-utils'

describe('calculateShiftHours', () => {
  it('returns exact hours for round times (09:00–12:00 = 3h)', () => {
    expect(calculateShiftHours('09:00', '12:00')).toBe(3)
  })

  it('ceils 10 minutes to 0.25h', () => {
    expect(calculateShiftHours('09:00', '09:10')).toBe(0.25)
  })

  it('ceils 20 minutes to 0.25h', () => {
    expect(calculateShiftHours('09:00', '09:20')).toBe(0.25)
  })

  it('returns 0.25 for exactly 15 minutes', () => {
    expect(calculateShiftHours('09:00', '09:15')).toBe(0.25)
  })

  it('ceils 2h 10min to 2.25h', () => {
    expect(calculateShiftHours('09:00', '11:10')).toBe(2.25)
  })

  it('returns 8 hours for 08:00–16:00', () => {
    expect(calculateShiftHours('08:00', '16:00')).toBe(8)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test lib/__tests__/shift-utils.test.ts
```
Expected: FAIL — `Cannot find module '../shift-utils'`

- [ ] **Step 3: Implement calculateShiftHours**

```typescript
// lib/shift-utils.ts
export function calculateShiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const minutes = (eh * 60 + em) - (sh * 60 + sm)
  return Math.ceil(minutes / 15) * 15 / 60
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test lib/__tests__/shift-utils.test.ts
```
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add lib/shift-utils.ts lib/__tests__/shift-utils.test.ts
git commit -m "feat: calculateShiftHours utility — ceil to nearest quarter-hour"
```

---

### Task 2: Schema — add billedAt to shifts

**Files:**
- Modify: `db/schema.ts:172-180`

- [ ] **Step 1: Add billedAt column to shifts table in schema.ts**

Replace the `shifts` table definition at line 172:

```typescript
export const shifts = pgTable('shifts', {
  id:        uuid('id').defaultRandom().primaryKey(),
  jobId:     uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  date:      text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime:   text('end_time').notNull(),
  status:    text('status', { enum: ['scheduled', 'completed', 'cancelled'] }).default('scheduled'),
  billedAt:  timestamp('billed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

- [ ] **Step 2: Generate the Drizzle migration**

```bash
DATABASE_URL=postgres://elderdoc:elderdoc@localhost:5432/elderdoc bunx drizzle-kit generate
```
Expected: creates `db/migrations/0007_*.sql` containing:
```sql
ALTER TABLE "shifts" ADD COLUMN "billed_at" timestamp;
```

- [ ] **Step 3: Run the migration**

```bash
DATABASE_URL=postgres://elderdoc:elderdoc@localhost:5432/elderdoc bunx drizzle-kit migrate
```
Expected: `Applying migration 0007_*.sql`

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts db/migrations/
git commit -m "feat: add billed_at column to shifts table"
```

---

### Task 3: Query — getUnbilledShiftsForClient

**Files:**
- Modify: `domains/payments/queries.ts`
- Modify: `domains/payments/__tests__/queries.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `domains/payments/__tests__/queries.test.ts`:

```typescript
// ── getUnbilledShiftsForClient ────────────────────────────────────────────────

import { getUnbilledShiftsForClient } from '../queries'

describe('getUnbilledShiftsForClient', () => {
  // getUnbilledShiftsForClient terminal call is .limit()
  beforeEach(() => {
    mockSelectChain.limit.mockResolvedValue([])
  })

  it('returns empty array when DB returns []', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([])
    const result = await getUnbilledShiftsForClient('client-1')
    expect(result).toEqual([])
  })

  it('maps rows correctly', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        shiftId: 'shift-1',
        jobId: 'job-1',
        careType: 'personal-care',
        caregiverName: 'Alice Smith',
        date: '2026-04-21',
        startTime: '09:00',
        endTime: '12:00',
        hourlyRate: '20.00',
      },
    ])
    const result = await getUnbilledShiftsForClient('client-1')
    expect(result).toHaveLength(1)
    expect(result[0].shiftId).toBe('shift-1')
    expect(result[0].jobId).toBe('job-1')
    expect(result[0].careType).toBe('personal-care')
    expect(result[0].caregiverName).toBe('Alice Smith')
    expect(result[0].date).toBe('2026-04-21')
    expect(result[0].startTime).toBe('09:00')
    expect(result[0].endTime).toBe('12:00')
    expect(result[0].hourlyRate).toBe(20)
  })

  it('coerces string hourlyRate to number', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        shiftId: 'shift-2',
        jobId: 'job-2',
        careType: 'dementia-care',
        caregiverName: 'Bob',
        date: '2026-04-22',
        startTime: '08:00',
        endTime: '16:00',
        hourlyRate: '25.50',
      },
    ])
    const result = await getUnbilledShiftsForClient('client-1')
    expect(result[0].hourlyRate).toBe(25.5)
  })

  it('maps null caregiverName to null', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        shiftId: 'shift-3',
        jobId: 'job-3',
        careType: 'personal-care',
        caregiverName: null,
        date: '2026-04-23',
        startTime: '10:00',
        endTime: '14:00',
        hourlyRate: '18.00',
      },
    ])
    const result = await getUnbilledShiftsForClient('client-1')
    expect(result[0].caregiverName).toBeNull()
  })

  it('calls where with clientId + completed status + null billedAt', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([])
    await getUnbilledShiftsForClient('client-abc')
    expect(mockSelectChain.where).toHaveBeenCalledOnce()
  })

  it('calls orderBy for date + startTime ordering', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([])
    await getUnbilledShiftsForClient('client-1')
    expect(mockSelectChain.orderBy).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test domains/payments/__tests__/queries.test.ts
```
Expected: FAIL — `getUnbilledShiftsForClient is not a function`

- [ ] **Step 3: Add UnbilledShiftRow interface and query to queries.ts**

At the top of `domains/payments/queries.ts`, update imports:

```typescript
import { db } from '@/services/db'
import { payments, jobs, careRequests, users, caregiverProfiles, disputes, shifts } from '@/db/schema'
import { eq, and, desc, isNull } from 'drizzle-orm'
```

Add after the existing interfaces (after line 28):

```typescript
export interface UnbilledShiftRow {
  shiftId: string
  jobId: string
  careType: string
  caregiverName: string | null
  date: string
  startTime: string
  endTime: string
  hourlyRate: number
}
```

Add after `getOpenDisputesForClient` (at the end of the file):

```typescript
export async function getUnbilledShiftsForClient(clientId: string): Promise<UnbilledShiftRow[]> {
  const rows = await db
    .select({
      shiftId: shifts.id,
      jobId: shifts.jobId,
      careType: careRequests.careType,
      caregiverName: users.name,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      hourlyRate: careRequests.budgetAmount,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .where(
      and(
        eq(jobs.clientId, clientId),
        eq(shifts.status, 'completed'),
        isNull(shifts.billedAt),
      )
    )
    .orderBy(shifts.date, shifts.startTime)
    .limit(500)

  return rows.map((r) => ({
    shiftId: r.shiftId,
    jobId: r.jobId,
    careType: r.careType,
    caregiverName: r.caregiverName ?? null,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    hourlyRate: Number(r.hourlyRate ?? 0),
  }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test domains/payments/__tests__/queries.test.ts
```
Expected: PASS — all tests including the new getUnbilledShiftsForClient tests

- [ ] **Step 5: Commit**

```bash
git add domains/payments/queries.ts domains/payments/__tests__/queries.test.ts
git commit -m "feat: getUnbilledShiftsForClient query"
```

---

### Task 4: completeShift — insert client notification

**Files:**
- Modify: `domains/payments/actions.ts`
- Create: `domains/payments/__tests__/complete-shift.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// domains/payments/__tests__/complete-shift.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockInsert,
  mockUpdate,
  mockSelect,
  mockFindFirst,
  mockCalculateShiftHours,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockSelect: vi.fn(),
  mockFindFirst: vi.fn(),
  mockCalculateShiftHours: vi.fn().mockReturnValue(3),
}))

vi.mock('@/services/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    query: {
      caregiverProfiles: { findFirst: mockFindFirst },
    },
  },
}))

vi.mock('@/db/schema', () => ({
  shifts:            { id: 'shifts.id', jobId: 'shifts.jobId', status: 'shifts.status', date: 'shifts.date', startTime: 'shifts.startTime', endTime: 'shifts.endTime' },
  jobs:              { id: 'jobs.id', caregiverId: 'jobs.caregiverId', clientId: 'jobs.clientId' },
  users:             { id: 'users.id', name: 'users.name' },
  caregiverProfiles: { id: 'cg.id', userId: 'cg.userId' },
  notifications:     { userId: 'notif.userId', type: 'notif.type', payload: 'notif.payload' },
  payments:          {},
  disputes:          {},
}))

vi.mock('drizzle-orm', () => ({
  eq:  vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/auth', () => ({ auth: vi.fn() }))

vi.mock('@/lib/shift-utils', () => ({
  calculateShiftHours: mockCalculateShiftHours,
}))

vi.mock('@/services/stripe', () => ({
  createPaymentIntent:         vi.fn(),
  createConnectAccount:        vi.fn(),
  createConnectAccountLink:    vi.fn(),
  getPaymentIntentCharge:      vi.fn(),
  createStripeCustomer:        vi.fn(),
  createSetupIntent:           vi.fn(),
  savePaymentMethodToCustomer: vi.fn(),
  getDefaultPaymentMethod:     vi.fn(),
  createAndPayInvoice:         vi.fn(),
  transferPayout:              vi.fn(),
}))

import { auth } from '@/auth'
import { completeShift } from '../actions'

const mockAuth = vi.mocked(auth)

describe('completeShift', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const mockOffset = vi.fn()
    const mockLimit  = vi.fn().mockReturnValue({ offset: mockOffset })
    const mockWhere  = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
    const mockFrom   = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin, where: mockWhere })
    mockSelect.mockReturnValue({ from: mockFrom })

    // Default: shift found
    mockOffset.mockResolvedValue([
      { id: 'shift-1', date: '2026-04-21', startTime: '09:00', endTime: '12:00', clientId: 'client-1' },
    ])

    // caregiver user name query
    mockOffset.mockImplementation(async () => {
      return [{ name: 'Margaret Collins' }]
    })

    const mockWhereUpdate = vi.fn().mockResolvedValue(undefined)
    const mockSet = vi.fn().mockReturnValue({ where: mockWhereUpdate })
    mockUpdate.mockReturnValue({ set: mockSet })

    const mockValues = vi.fn().mockResolvedValue(undefined)
    mockInsert.mockReturnValue({ values: mockValues })
  })

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null as any)
    const result = await completeShift('shift-1')
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when caregiver profile not found', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } } as any)
    mockFindFirst.mockResolvedValueOnce(null)
    const result = await completeShift('shift-1')
    expect(result).toEqual({ error: 'Caregiver profile not found' })
  })

  it('returns error when shift not found or not owned', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } } as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'profile-1', userId: 'user-1' })
    // First select (shift lookup) returns empty
    const mockOffset = vi.fn().mockResolvedValueOnce([])
    const mockLimit  = vi.fn().mockReturnValue({ offset: mockOffset })
    const mockWhere  = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
    const mockFrom   = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
    mockSelect.mockReturnValueOnce({ from: mockFrom })

    const result = await completeShift('shift-1')
    expect(result).toEqual({ error: 'Not found' })
  })

  it('updates shift status to completed and inserts notification', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } } as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'profile-1', userId: 'user-1' })
    mockCalculateShiftHours.mockReturnValue(3)

    // First select: shift found with clientId
    const mockOffset1 = vi.fn().mockResolvedValueOnce([
      { id: 'shift-1', date: '2026-04-21', startTime: '09:00', endTime: '12:00', clientId: 'client-1' },
    ])
    const mockLimit1 = vi.fn().mockReturnValue({ offset: mockOffset1 })
    const mockWhere1 = vi.fn().mockReturnValue({ limit: mockLimit1 })
    const mockInnerJoin1 = vi.fn().mockReturnValue({ where: mockWhere1 })
    const mockFrom1 = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin1 })

    // Second select: caregiver name
    const mockOffset2 = vi.fn().mockResolvedValueOnce([{ name: 'Margaret Collins' }])
    const mockLimit2 = vi.fn().mockReturnValue({ offset: mockOffset2 })
    const mockWhere2 = vi.fn().mockReturnValue({ limit: mockLimit2 })
    const mockFrom2 = vi.fn().mockReturnValue({ where: mockWhere2 })

    mockSelect
      .mockReturnValueOnce({ from: mockFrom1 })
      .mockReturnValueOnce({ from: mockFrom2 })

    const mockValues = vi.fn().mockResolvedValue(undefined)
    mockInsert.mockReturnValue({ values: mockValues })
    const mockWhereUpdate = vi.fn().mockResolvedValue(undefined)
    const mockSet = vi.fn().mockReturnValue({ where: mockWhereUpdate })
    mockUpdate.mockReturnValue({ set: mockSet })

    const result = await completeShift('shift-1')

    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockInsert).toHaveBeenCalledOnce()
    const notifArg = mockValues.mock.calls[0][0]
    expect(notifArg.userId).toBe('client-1')
    expect(notifArg.type).toBe('shift_completed')
    expect(notifArg.payload.caregiverName).toBe('Margaret Collins')
    expect(notifArg.payload.hours).toBe(3)
    expect(notifArg.payload.date).toBe('2026-04-21')
    expect(result).toEqual({})
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test domains/payments/__tests__/complete-shift.test.ts
```
Expected: FAIL (function doesn't insert notification yet)

- [ ] **Step 3: Update completeShift in actions.ts**

Update imports at the top of `domains/payments/actions.ts`:

```typescript
import { payments, jobs, shifts, caregiverProfiles, users, disputes, notifications } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { calculateShiftHours } from '@/lib/shift-utils'
```

Replace the `completeShift` function (lines 130–155):

```typescript
export async function completeShift(shiftId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })
  if (!profile) return { error: 'Caregiver profile not found' }

  const existing = await db
    .select({
      id: shifts.id,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      clientId: jobs.clientId,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .where(and(eq(shifts.id, shiftId), eq(jobs.caregiverId, profile.id)))
    .limit(1)
    .offset(0)
  if (existing.length === 0) return { error: 'Not found' }

  const { date, startTime, endTime, clientId } = existing[0]

  await db.update(shifts).set({ status: 'completed' }).where(eq(shifts.id, shiftId))

  const caregiverUser = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .offset(0)
  const caregiverName = caregiverUser[0]?.name ?? 'Your caregiver'
  const hours = calculateShiftHours(startTime, endTime)

  await db.insert(notifications).values({
    userId: clientId,
    type: 'shift_completed',
    payload: {
      shiftId,
      caregiverName,
      hours,
      date,
      message: `${caregiverName} completed a ${hours}h shift on ${date}. You'll be charged Sunday for this week's total.`,
    },
  })

  revalidatePath('/caregiver/dashboard/shifts')
  return {}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test domains/payments/__tests__/complete-shift.test.ts
```
Expected: PASS — all tests

- [ ] **Step 5: Commit**

```bash
git add domains/payments/actions.ts domains/payments/__tests__/complete-shift.test.ts
git commit -m "feat: completeShift inserts client notification with shift details"
```

---

### Task 5: Payout-sweep — 7-day hold

**Files:**
- Modify: `app/api/cron/payout-sweep/route.ts`
- Modify: `app/api/cron/__tests__/payout-sweep.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `app/api/cron/__tests__/payout-sweep.test.ts` inside the `describe` block:

```typescript
  it('does not release payments unless eligible query returns them (7-day hold enforced in WHERE clause)', async () => {
    mockTransferPayout.mockResolvedValue(undefined)

    // disputes: empty
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    // payments query returns empty — simulates all payments being too new
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    })

    const req = makeRequest('Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockTransferPayout).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body).toEqual({ released: 0, totalCents: 0 })
  })
```

- [ ] **Step 2: Run tests to verify they pass (existing tests should still pass)**

```bash
bun run test app/api/cron/__tests__/payout-sweep.test.ts
```
Expected: PASS — all existing tests pass (new test also passes since it just verifies empty response)

- [ ] **Step 3: Update payout-sweep route to add 7-day hold**

In `app/api/cron/payout-sweep/route.ts`, update the import line:

```typescript
import { eq, and, isNull, isNotNull, lt } from 'drizzle-orm'
```

Add the cutoff calculation before the eligible payments query (after the open disputes query, around line 25):

```typescript
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
```

Update the `.where()` clause in the eligible payments query to include the cutoff:

```typescript
    .where(
      and(
        eq(payments.status, 'completed'),
        isNull(payments.releasedAt),
        isNotNull(caregiverProfiles.stripeConnectAccountId),
        lt(payments.createdAt, cutoff),
      )
    )
```

- [ ] **Step 4: Run all payout-sweep tests**

```bash
bun run test app/api/cron/__tests__/payout-sweep.test.ts
```
Expected: PASS — all 6 tests

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/payout-sweep/route.ts app/api/cron/__tests__/payout-sweep.test.ts
git commit -m "feat: payout-sweep enforces 7-day escrow hold before releasing funds"
```

---

### Task 6: Weekly billing cron

**Files:**
- Create: `app/api/cron/weekly-billing/route.ts`
- Create: `app/api/cron/__tests__/weekly-billing.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// app/api/cron/__tests__/weekly-billing.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockGetDefaultPaymentMethod,
  mockCreateAndPayInvoice,
  mockCalculateShiftHours,
} = vi.hoisted(() => ({
  mockDbSelect:               vi.fn(),
  mockDbInsert:               vi.fn(),
  mockDbUpdate:               vi.fn(),
  mockGetDefaultPaymentMethod: vi.fn(),
  mockCreateAndPayInvoice:    vi.fn(),
  mockCalculateShiftHours:    vi.fn(),
}))

vi.mock('@/services/db', () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
  },
}))

vi.mock('@/services/stripe', () => ({
  getDefaultPaymentMethod: mockGetDefaultPaymentMethod,
  createAndPayInvoice:     mockCreateAndPayInvoice,
}))

vi.mock('@/lib/shift-utils', () => ({
  calculateShiftHours: mockCalculateShiftHours,
}))

import { POST } from '../weekly-billing/route'

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) headers['authorization'] = authHeader
  return new NextRequest('http://localhost/api/cron/weekly-billing', { method: 'POST', headers })
}

function mockUnbilledQuery(rows: object[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(rows),
          }),
        }),
      }),
    }),
  })
}

describe('POST /api/cron/weekly-billing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'

    const mockValues = vi.fn().mockResolvedValue(undefined)
    mockDbInsert.mockReturnValue({ values: mockValues })

    const mockWhere = vi.fn().mockResolvedValue(undefined)
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere })
    mockDbUpdate.mockReturnValue({ set: mockSet })
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 401 when Authorization header has wrong secret', async () => {
    const res = await POST(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns { billed: 0, skipped: 0, totalCharged: 0 } when no unbilled shifts', async () => {
    mockUnbilledQuery([])

    const res = await POST(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ billed: 0, skipped: 0, totalCharged: 0 })
  })

  it('skips job and inserts billing_no_card notification when client has no stripeCustomerId', async () => {
    mockUnbilledQuery([
      {
        shiftId: 'shift-1', jobId: 'job-1', startTime: '09:00', endTime: '12:00',
        date: '2026-04-21', clientId: 'client-1', stripeCustomerId: null,
        budgetAmount: '20.00', careType: 'personal-care',
      },
    ])

    const mockValues = vi.fn().mockResolvedValue(undefined)
    mockDbInsert.mockReturnValue({ values: mockValues })

    const res = await POST(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ billed: 0, skipped: 1, totalCharged: 0 })
    expect(mockDbInsert).toHaveBeenCalledOnce()
    const notifArg = mockValues.mock.calls[0][0]
    expect(notifArg.type).toBe('billing_no_card')
    expect(notifArg.userId).toBe('client-1')
  })

  it('skips job and inserts billing_no_card notification when getDefaultPaymentMethod returns null', async () => {
    mockUnbilledQuery([
      {
        shiftId: 'shift-1', jobId: 'job-1', startTime: '09:00', endTime: '12:00',
        date: '2026-04-21', clientId: 'client-1', stripeCustomerId: 'cus_123',
        budgetAmount: '20.00', careType: 'personal-care',
      },
    ])
    mockGetDefaultPaymentMethod.mockResolvedValueOnce(null)

    const res = await POST(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.skipped).toBe(1)
    expect(body.billed).toBe(0)
  })

  it('bills job: calculates correct subtotal, calls createAndPayInvoice, marks billedAt, inserts notification', async () => {
    mockCalculateShiftHours.mockReturnValue(3)
    mockGetDefaultPaymentMethod.mockResolvedValue({ brand: 'visa', last4: '4242' })
    mockCreateAndPayInvoice.mockResolvedValue({ invoiceId: 'inv_123', paymentIntentId: 'pi_123' })

    mockUnbilledQuery([
      {
        shiftId: 'shift-1', jobId: 'job-1', startTime: '09:00', endTime: '12:00',
        date: '2026-04-21', clientId: 'client-1', stripeCustomerId: 'cus_123',
        budgetAmount: '20.00', careType: 'personal-care',
      },
    ])

    const mockValues = vi.fn().mockResolvedValue(undefined)
    mockDbInsert.mockReturnValue({ values: mockValues })
    const mockWhere = vi.fn().mockResolvedValue(undefined)
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere })
    mockDbUpdate.mockReturnValue({ set: mockSet })

    const res = await POST(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)

    // 3h × $20/hr = $60 = 6000 cents; fee = 60 cents
    expect(mockCreateAndPayInvoice).toHaveBeenCalledWith('cus_123', 'job-1', 6000, 60)
    // insert payment + notification = 2 inserts
    expect(mockDbInsert).toHaveBeenCalledTimes(2)
    // mark billedAt = 1 update
    expect(mockDbUpdate).toHaveBeenCalledOnce()

    const body = await res.json()
    expect(body.billed).toBe(1)
    expect(body.skipped).toBe(0)
    expect(body.totalCharged).toBeCloseTo(60.60)
  })

  it('bills two shifts for same job as a single invoice', async () => {
    mockCalculateShiftHours.mockReturnValue(3)
    mockGetDefaultPaymentMethod.mockResolvedValue({ brand: 'visa', last4: '4242' })
    mockCreateAndPayInvoice.mockResolvedValue({ invoiceId: 'inv_456', paymentIntentId: 'pi_456' })

    mockUnbilledQuery([
      {
        shiftId: 'shift-1', jobId: 'job-1', startTime: '09:00', endTime: '12:00',
        date: '2026-04-21', clientId: 'client-1', stripeCustomerId: 'cus_123',
        budgetAmount: '20.00', careType: 'personal-care',
      },
      {
        shiftId: 'shift-2', jobId: 'job-1', startTime: '14:00', endTime: '17:00',
        date: '2026-04-22', clientId: 'client-1', stripeCustomerId: 'cus_123',
        budgetAmount: '20.00', careType: 'personal-care',
      },
    ])

    const res = await POST(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)

    // 2 shifts × 3h × $20 = $120 = 12000 cents; fee = 120
    expect(mockCreateAndPayInvoice).toHaveBeenCalledOnce()
    expect(mockCreateAndPayInvoice).toHaveBeenCalledWith('cus_123', 'job-1', 12000, 120)

    const body = await res.json()
    expect(body.billed).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test app/api/cron/__tests__/weekly-billing.test.ts
```
Expected: FAIL — `Cannot find module '../weekly-billing/route'`

- [ ] **Step 3: Create the weekly billing cron route**

```typescript
// app/api/cron/weekly-billing/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/services/db'
import { shifts, jobs, careRequests, users, payments, notifications } from '@/db/schema'
import { eq, and, isNull, isNotNull, inArray } from 'drizzle-orm'
import { getDefaultPaymentMethod, createAndPayInvoice } from '@/services/stripe'
import { calculateShiftHours } from '@/lib/shift-utils'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const unbilledRows = await db
    .select({
      shiftId:          shifts.id,
      jobId:            shifts.jobId,
      startTime:        shifts.startTime,
      endTime:          shifts.endTime,
      date:             shifts.date,
      clientId:         jobs.clientId,
      stripeCustomerId: users.stripeCustomerId,
      budgetAmount:     careRequests.budgetAmount,
      careType:         careRequests.careType,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(users, eq(jobs.clientId, users.id))
    .where(
      and(
        eq(shifts.status, 'completed'),
        isNull(shifts.billedAt),
        isNotNull(careRequests.budgetAmount),
      )
    )

  const byJob = new Map<string, typeof unbilledRows>()
  for (const row of unbilledRows) {
    if (!byJob.has(row.jobId)) byJob.set(row.jobId, [])
    byJob.get(row.jobId)!.push(row)
  }

  let billed = 0
  let skipped = 0
  let totalCharged = 0

  for (const [jobId, jobShifts] of byJob) {
    const { clientId, stripeCustomerId, budgetAmount, careType } = jobShifts[0]

    if (!stripeCustomerId) {
      await db.insert(notifications).values({ userId: clientId, type: 'billing_no_card', payload: { jobId, careType } })
      skipped++
      continue
    }

    const savedCard = await getDefaultPaymentMethod(stripeCustomerId)
    if (!savedCard) {
      await db.insert(notifications).values({ userId: clientId, type: 'billing_no_card', payload: { jobId, careType } })
      skipped++
      continue
    }

    const rate = Number(budgetAmount)
    let subtotalCents = 0
    for (const shift of jobShifts) {
      subtotalCents += Math.round(calculateShiftHours(shift.startTime, shift.endTime) * rate * 100)
    }
    const feeCents = Math.round(subtotalCents * 0.01)

    try {
      const result = await createAndPayInvoice(stripeCustomerId, jobId, subtotalCents, feeCents)

      await db.insert(payments).values({
        jobId,
        amount: String(subtotalCents / 100),
        fee: String(feeCents / 100),
        method: 'stripe',
        status: 'pending',
        stripeInvoiceId: result.invoiceId,
        stripePaymentIntentId: result.paymentIntentId ?? undefined,
      })

      const shiftIds = jobShifts.map((s) => s.shiftId)
      await db.update(shifts).set({ billedAt: new Date() }).where(inArray(shifts.id, shiftIds))

      await db.insert(notifications).values({
        userId: clientId,
        type: 'billing_charged',
        payload: {
          jobId,
          careType,
          totalDollars: ((subtotalCents + feeCents) / 100).toFixed(2),
        },
      })

      billed++
      totalCharged += subtotalCents + feeCents
    } catch (err) {
      console.error(`Failed to bill job ${jobId}:`, err)
    }
  }

  return NextResponse.json({ billed, skipped, totalCharged: totalCharged / 100 })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test app/api/cron/__tests__/weekly-billing.test.ts
```
Expected: PASS — all 7 tests

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/weekly-billing/route.ts app/api/cron/__tests__/weekly-billing.test.ts
git commit -m "feat: weekly billing cron — charge clients for completed unbilled shifts"
```

---

### Task 7: vercel.json — add weekly-billing cron

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add weekly-billing schedule**

Replace the contents of `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/payout-sweep",   "schedule": "0 9 * * 1" },
    { "path": "/api/cron/resolve-disputes", "schedule": "0 8 * * *" },
    { "path": "/api/cron/weekly-billing",  "schedule": "0 23 * * 0" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add weekly-billing cron schedule (Sunday 23:00 UTC)"
```

---

### Task 8: Billing page — upcoming charge UI

**Files:**
- Modify: `app/(client)/client/dashboard/billing/page.tsx`
- Modify: `app/(client)/client/dashboard/billing/_components/billing-client.tsx`
- Delete: `app/(client)/client/dashboard/billing/_components/record-payment-modal.tsx`

- [ ] **Step 1: Update billing page to fetch unbilled shifts**

Replace the full contents of `app/(client)/client/dashboard/billing/page.tsx`:

```typescript
import { requireRole } from '@/domains/auth/session'
import { getClientPayments, getOpenDisputesForClient, getUnbilledShiftsForClient } from '@/domains/payments/queries'
import { db } from '@/services/db'
import { jobs, careRequests, caregiverProfiles, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getDefaultPaymentMethod } from '@/services/stripe'
import { BillingClient } from './_components/billing-client'

export default async function ClientBillingPage() {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [paymentRows, activeJobs, userRow, openDisputes, unbilledShifts] = await Promise.all([
    getClientPayments(clientId),
    db
      .select({
        jobId: jobs.id,
        careType: careRequests.careType,
        caregiverName: users.name,
      })
      .from(jobs)
      .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
      .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
      .innerJoin(users, eq(caregiverProfiles.userId, users.id))
      .where(and(eq(jobs.clientId, clientId), eq(jobs.status, 'active')))
      .limit(50)
      .offset(0),
    db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, clientId))
      .limit(1)
      .offset(0),
    getOpenDisputesForClient(clientId),
    getUnbilledShiftsForClient(clientId),
  ])

  const savedCard = userRow[0]?.stripeCustomerId
    ? await getDefaultPaymentMethod(userRow[0].stripeCustomerId)
    : null

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-1">Billing</h1>
      <p className="text-sm text-muted-foreground mb-8">View payments and upcoming charges for your care services.</p>
      <BillingClient
        paymentRows={paymentRows}
        activeJobs={activeJobs}
        savedCard={savedCard}
        stripePublishableKey={process.env.STRIPE_PUBLISHABLE_KEY ?? ''}
        openDisputes={openDisputes}
        unbilledShifts={unbilledShifts}
      />
    </div>
  )
}
```

- [ ] **Step 2: Delete record-payment-modal.tsx**

```bash
rm app/(client)/client/dashboard/billing/_components/record-payment-modal.tsx
```

- [ ] **Step 3: Replace BillingClient**

Replace the full contents of `app/(client)/client/dashboard/billing/_components/billing-client.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { DisputeModal } from './dispute-modal'
import { SavedCardBanner } from './saved-card-banner'
import { PaymentHistoryCard } from './payment-history-card'
import type { PaymentRow, DisputeRow, UnbilledShiftRow } from '@/domains/payments/queries'
import { calculateShiftHours } from '@/lib/shift-utils'

interface ActiveJob {
  jobId: string
  careType: string
  caregiverName: string | null
}

interface Props {
  paymentRows: PaymentRow[]
  activeJobs: ActiveJob[]
  savedCard: { brand: string; last4: string } | null
  stripePublishableKey: string
  openDisputes: DisputeRow[]
  unbilledShifts: UnbilledShiftRow[]
}

export function BillingClient({ paymentRows, activeJobs, savedCard, stripePublishableKey, openDisputes, unbilledShifts }: Props) {
  const [disputeJobId, setDisputeJobId] = useState<string | null>(null)

  const shiftsByJob = unbilledShifts.reduce<Record<string, UnbilledShiftRow[]>>((acc, shift) => {
    if (!acc[shift.jobId]) acc[shift.jobId] = []
    acc[shift.jobId].push(shift)
    return acc
  }, {})

  return (
    <>
      {disputeJobId && (
        <DisputeModal
          jobId={disputeJobId}
          onClose={() => setDisputeJobId(null)}
        />
      )}

      <SavedCardBanner savedCard={savedCard} stripePublishableKey={stripePublishableKey} />

      {Object.keys(shiftsByJob).length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Upcoming Charge — charges Sunday
          </p>
          <div className="space-y-3">
            {Object.entries(shiftsByJob).map(([jobId, jobShifts]) => {
              const subtotal = jobShifts.reduce(
                (sum, s) => sum + calculateShiftHours(s.startTime, s.endTime) * s.hourlyRate,
                0
              )
              const fee = subtotal * 0.01
              const total = subtotal + fee
              return (
                <div key={jobId} className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <p className="text-sm font-medium">
                    {jobShifts[0].careType} · {jobShifts[0].caregiverName ?? 'Caregiver'}
                  </p>
                  <div className="space-y-1">
                    {jobShifts.map((s) => {
                      const hours = calculateShiftHours(s.startTime, s.endTime)
                      return (
                        <div key={s.shiftId} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {s.date} &nbsp; {s.startTime}–{s.endTime} &nbsp; {hours}h
                          </span>
                          <span>${(hours * s.hourlyRate).toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t border-border pt-2 space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Trust &amp; Support fee (1%)</span>
                      <span>${fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total due Sunday</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                  {!savedCard && (
                    <p className="text-xs text-destructive">
                      Add a payment method before Sunday to avoid a missed payment.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mb-8">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Active Jobs</p>
        {activeJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">No active jobs yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              const jobDisputeSet = new Set(openDisputes.filter((d) => d.paymentId === null).map((d) => d.jobId))
              return activeJobs.map((job) => (
                <div key={job.jobId} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{job.careType}</p>
                    <p className="text-xs text-muted-foreground">{job.caregiverName ?? 'Caregiver'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {jobDisputeSet.has(job.jobId) ? (
                      <span className="text-xs px-2 py-1 rounded-md bg-orange-100 text-orange-700 font-medium">
                        Issue reported
                      </span>
                    ) : (
                      <button
                        onClick={() => setDisputeJobId(job.jobId)}
                        className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted text-muted-foreground"
                      >
                        Report issue
                      </button>
                    )}
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Payment History</p>
        {paymentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="space-y-2">
            {paymentRows.map((row) => {
              const activeDispute = openDisputes.find(
                (d) => d.paymentId !== null && d.paymentId === row.paymentId
              ) ?? null
              return (
                <PaymentHistoryCard
                  key={row.paymentId}
                  careType={row.careType}
                  caregiverName={row.caregiverName}
                  method={row.method}
                  amount={row.amount}
                  fee={row.fee}
                  status={row.status}
                  stripePaymentIntentId={row.stripePaymentIntentId}
                  stripeInvoiceId={row.stripeInvoiceId}
                  createdAt={row.createdAt}
                  jobId={row.jobId}
                  paymentId={row.paymentId}
                  releasedAt={row.releasedAt}
                  activeDispute={activeDispute ? { disputeId: activeDispute.disputeId } : null}
                />
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(client)/client/dashboard/billing/page.tsx \
        app/(client)/client/dashboard/billing/_components/billing-client.tsx
git rm app/(client)/client/dashboard/billing/_components/record-payment-modal.tsx
git commit -m "feat: billing page shows upcoming weekly charge instead of manual Record Payment"
```

---

### Task 9: Build verification

**Files:** none

- [ ] **Step 1: Run full test suite**

```bash
bun run test
```
Expected: all pre-existing passing tests still pass; new tests (shift-utils, queries, complete-shift, payout-sweep, weekly-billing) pass

- [ ] **Step 2: Run build**

```bash
bun run build
```
Expected: no TypeScript errors, build completes successfully

- [ ] **Step 3: Commit if any build fixes needed**

```bash
git add -A
git commit -m "fix: build verification for weekly billing feature"
```
