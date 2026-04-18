# Phase 9: Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add payment tracking (cash + Stripe) for clients, caregiver payout visibility, shift completion, and Stripe Connect onboarding.

**Architecture:** Domain layer (`domains/payments/`) handles queries and server actions. Client sees a Billing page to record/view payments per job. Caregiver sees a Payouts page showing received payments and a button to set up Stripe Connect. Shift completion is added to the caregiver shifts page via a server action + client button component. Stripe is accessed through the existing mock-safe `services/stripe.ts` wrapper.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Stripe SDK (mock-safe wrapper), Vitest, TypeScript

---

### Task 1: Domain Query Functions (TDD)

**Files:**
- Create: `domains/payments/queries.ts`
- Create: `domains/payments/__tests__/queries.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// domains/payments/__tests__/queries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { offset, limit, where, orderBy, innerJoin, select, from } = vi.hoisted(() => {
  const offset = vi.fn()
  const limit = vi.fn().mockReturnValue({ offset })
  const orderBy = vi.fn().mockReturnValue({ limit })
  const where = vi.fn().mockReturnValue({ orderBy })
  const innerJoin = vi.fn()
  innerJoin.mockReturnValue({ innerJoin, where })
  const from = vi.fn().mockReturnValue({ innerJoin })
  const select = vi.fn().mockReturnValue({ from })
  return { offset, limit, where, orderBy, innerJoin, select, from }
})

vi.mock('@/services/db', () => ({
  db: { select },
}))

vi.mock('@/db/schema', () => ({
  payments: { id: 'payments.id', jobId: 'payments.jobId', amount: 'payments.amount', method: 'payments.method', status: 'payments.status', createdAt: 'payments.createdAt' },
  jobs: { id: 'jobs.id', clientId: 'jobs.clientId', caregiverId: 'jobs.caregiverId' },
  careRequests: { id: 'careRequests.id', careType: 'careRequests.careType' },
  users: { id: 'users.id', name: 'users.name' },
  caregiverProfiles: { id: 'caregiverProfiles.id', userId: 'caregiverProfiles.userId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
  desc: vi.fn((a) => ({ desc: a })),
}))

import { getClientPayments, getCaregiverPayments } from '../queries'

describe('getClientPayments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when no payments found', async () => {
    offset.mockResolvedValueOnce([])
    const result = await getClientPayments('client-1')
    expect(result).toEqual([])
  })

  it('returns mapped payment rows', async () => {
    offset.mockResolvedValueOnce([
      { paymentId: 'p1', jobId: 'j1', careType: 'Elder Care', caregiverName: 'Jane', amount: 15000, method: 'cash', status: 'completed', createdAt: new Date('2026-01-01') },
    ])
    const result = await getClientPayments('client-1')
    expect(result).toHaveLength(1)
    expect(result[0].paymentId).toBe('p1')
    expect(result[0].amount).toBe(15000)
  })

  it('filters by clientId', async () => {
    offset.mockResolvedValueOnce([])
    await getClientPayments('client-42')
    expect(where).toHaveBeenCalled()
  })

  it('orders by createdAt desc', async () => {
    offset.mockResolvedValueOnce([])
    await getClientPayments('client-1')
    expect(orderBy).toHaveBeenCalled()
  })
})

describe('getCaregiverPayments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when no payments found', async () => {
    offset.mockResolvedValueOnce([])
    const result = await getCaregiverPayments('cg-1')
    expect(result).toEqual([])
  })

  it('returns mapped payment rows', async () => {
    offset.mockResolvedValueOnce([
      { paymentId: 'p2', jobId: 'j2', careType: 'Companionship', clientName: 'Bob', amount: 8000, method: 'stripe', status: 'completed', createdAt: new Date('2026-02-01') },
    ])
    const result = await getCaregiverPayments('cg-1')
    expect(result).toHaveLength(1)
    expect(result[0].method).toBe('stripe')
  })

  it('filters by caregiverId (profile id)', async () => {
    offset.mockResolvedValueOnce([])
    await getCaregiverPayments('cg-42')
    expect(where).toHaveBeenCalled()
  })

  it('orders by createdAt desc', async () => {
    offset.mockResolvedValueOnce([])
    await getCaregiverPayments('cg-1')
    expect(orderBy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run domains/payments/__tests__/queries.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// domains/payments/queries.ts
import { db } from '@/services/db'
import { payments, jobs, careRequests, users, caregiverProfiles } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export interface PaymentRow {
  paymentId: string
  jobId: string
  careType: string
  caregiverName: string | null
  clientName: string | null
  amount: number
  method: string
  status: string
  createdAt: Date
}

export async function getClientPayments(clientId: string): Promise<PaymentRow[]> {
  const caregiverUsers = { id: users.id, name: users.name }

  const rows = await db
    .select({
      paymentId: payments.id,
      jobId: payments.jobId,
      careType: careRequests.careType,
      caregiverName: users.name,
      amount: payments.amount,
      method: payments.method,
      status: payments.status,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .where(eq(jobs.clientId, clientId))
    .orderBy(desc(payments.createdAt))
    .limit(100)
    .offset(0)

  return rows.map((r) => ({
    paymentId: r.paymentId,
    jobId: r.jobId,
    careType: r.careType,
    caregiverName: r.caregiverName ?? null,
    clientName: null,
    amount: r.amount,
    method: r.method,
    status: r.status,
    createdAt: r.createdAt,
  }))
}

export async function getCaregiverPayments(caregiverId: string): Promise<PaymentRow[]> {
  const rows = await db
    .select({
      paymentId: payments.id,
      jobId: payments.jobId,
      careType: careRequests.careType,
      clientName: users.name,
      amount: payments.amount,
      method: payments.method,
      status: payments.status,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(users, eq(jobs.clientId, users.id))
    .where(eq(jobs.caregiverId, caregiverId))
    .orderBy(desc(payments.createdAt))
    .limit(100)
    .offset(0)

  return rows.map((r) => ({
    paymentId: r.paymentId,
    jobId: r.jobId,
    careType: r.careType,
    caregiverName: null,
    clientName: r.clientName ?? null,
    amount: r.amount,
    method: r.method,
    status: r.status,
    createdAt: r.createdAt,
  }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run domains/payments/__tests__/queries.test.ts`
Expected: 8 tests passing

- [ ] **Step 5: Commit**

```bash
git add domains/payments/queries.ts domains/payments/__tests__/queries.test.ts
git commit -m "feat: add payment domain query functions with tests"
```

---

### Task 2: Payment Server Actions

**Files:**
- Create: `domains/payments/actions.ts`

- [ ] **Step 1: Create the server actions file**

```typescript
// domains/payments/actions.ts
'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { payments, jobs, shifts, caregiverProfiles } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createPaymentIntent, createConnectAccount, createAccountLink } from '@/services/stripe'

export async function recordCashPayment(
  jobId: string,
  amount: number,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const job = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, session.user.id)))
    .limit(1)
    .offset(0)

  if (job.length === 0) return { error: 'Not found' }

  await db.insert(payments).values({
    jobId,
    amount,
    method: 'cash',
    status: 'completed',
  })

  revalidatePath('/client/dashboard/billing')
  return {}
}

export async function initiateStripePayment(
  jobId: string,
  amount: number,
): Promise<{ clientSecret?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const job = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, session.user.id)))
    .limit(1)
    .offset(0)

  if (job.length === 0) return { error: 'Not found' }

  const intent = await createPaymentIntent(amount)

  await db.insert(payments).values({
    jobId,
    amount,
    method: 'stripe',
    status: 'pending',
    stripePaymentIntentId: intent.id,
  })

  revalidatePath('/client/dashboard/billing')
  return { clientSecret: intent.client_secret ?? undefined }
}

export async function completeShift(shiftId: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })
  if (!profile) return { error: 'Profile not found' }

  const shift = await db
    .select({ id: shifts.id })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .where(and(eq(shifts.id, shiftId), eq(jobs.caregiverId, profile.id)))
    .limit(1)
    .offset(0)

  if (shift.length === 0) return { error: 'Not found' }

  await db
    .update(shifts)
    .set({ status: 'completed' })
    .where(eq(shifts.id, shiftId))

  revalidatePath('/caregiver/dashboard/shifts')
  return {}
}

export async function setupStripeConnect(): Promise<{ url?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })
  if (!profile) return { error: 'Profile not found' }

  const account = await createConnectAccount(session.user.email ?? '')
  const link = await createAccountLink(account.id)

  return { url: link.url }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep domains/payments`
Expected: no errors for payments files

- [ ] **Step 3: Commit**

```bash
git add domains/payments/actions.ts
git commit -m "feat: add payment server actions (cash, stripe, complete shift, connect)"
```

---

### Task 3: Complete Shift Button (Caregiver)

**Files:**
- Create: `app/(caregiver)/caregiver/dashboard/shifts/_components/complete-shift-button.tsx`
- Modify: `app/(caregiver)/caregiver/dashboard/shifts/page.tsx`

- [ ] **Step 1: Create the CompleteShiftButton component**

```typescript
// app/(caregiver)/caregiver/dashboard/shifts/_components/complete-shift-button.tsx
'use client'

import { useTransition } from 'react'
import { completeShift } from '@/domains/payments/actions'

interface Props {
  shiftId: string
}

export function CompleteShiftButton({ shiftId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await completeShift(shiftId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      {isPending ? 'Completing…' : 'Complete'}
    </button>
  )
}
```

- [ ] **Step 2: Read the current shifts page**

Read: `app/(caregiver)/caregiver/dashboard/shifts/page.tsx`

- [ ] **Step 3: Add CompleteShiftButton to shifts page**

Import `CompleteShiftButton` at the top of `shifts/page.tsx` and add it next to each shift row that has `status !== 'completed'`:

```typescript
import { CompleteShiftButton } from './_components/complete-shift-button'
```

In the shift row render, add alongside existing content:
```tsx
{shift.status !== 'completed' && (
  <CompleteShiftButton shiftId={shift.id} />
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -E "shifts|complete-shift"`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/\(caregiver\)/caregiver/dashboard/shifts/_components/complete-shift-button.tsx \
        app/\(caregiver\)/caregiver/dashboard/shifts/page.tsx
git commit -m "feat: add complete shift button to caregiver shifts page"
```

---

### Task 4: Client Billing Page

**Files:**
- Create: `app/(client)/client/dashboard/billing/page.tsx`
- Create: `app/(client)/client/dashboard/billing/_components/record-payment-modal.tsx`
- Modify: `app/(client)/client/dashboard/_components/sidebar.tsx`

- [ ] **Step 1: Create the RecordPaymentModal component**

```typescript
// app/(client)/client/dashboard/billing/_components/record-payment-modal.tsx
'use client'

import { useState, useTransition } from 'react'
import { recordCashPayment } from '@/domains/payments/actions'

interface Props {
  jobId: string
  jobLabel: string
  onClose: () => void
}

export function RecordPaymentModal({ jobId, jobLabel, onClose }: Props) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(parseFloat(amount) * 100)
    if (isNaN(cents) || cents <= 0) {
      setError('Enter a valid amount')
      return
    }
    startTransition(async () => {
      const result = await recordCashPayment(jobId, cents)
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm shadow-lg">
        <h2 className="text-lg font-semibold mb-1">Record Cash Payment</h2>
        <p className="text-sm text-muted-foreground mb-4">{jobLabel}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
              Amount (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the billing page**

```typescript
// app/(client)/client/dashboard/billing/page.tsx
import { requireRole } from '@/domains/auth/session'
import { getClientPayments } from '@/domains/payments/queries'
import { db } from '@/services/db'
import { jobs, careRequests, caregiverProfiles, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { BillingClient } from './_components/billing-client'

export default async function ClientBillingPage() {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [paymentRows, activeJobs] = await Promise.all([
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
  ])

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Billing</h1>
      <p className="text-sm text-muted-foreground mb-8">Record and view payments for your care services.</p>
      <BillingClient paymentRows={paymentRows} activeJobs={activeJobs} />
    </div>
  )
}
```

- [ ] **Step 3: Create BillingClient component**

```typescript
// app/(client)/client/dashboard/billing/_components/billing-client.tsx
'use client'

import { useState } from 'react'
import { RecordPaymentModal } from './record-payment-modal'
import type { PaymentRow } from '@/domains/payments/queries'

interface ActiveJob {
  jobId: string
  careType: string
  caregiverName: string | null
}

interface Props {
  paymentRows: PaymentRow[]
  activeJobs: ActiveJob[]
}

export function BillingClient({ paymentRows, activeJobs }: Props) {
  const [modalJobId, setModalJobId] = useState<string | null>(null)

  const modalJob = activeJobs.find((j) => j.jobId === modalJobId)

  return (
    <>
      {modalJob && (
        <RecordPaymentModal
          jobId={modalJob.jobId}
          jobLabel={`${modalJob.careType} — ${modalJob.caregiverName ?? 'Caregiver'}`}
          onClose={() => setModalJobId(null)}
        />
      )}

      {activeJobs.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Active Jobs</p>
          <div className="space-y-2">
            {activeJobs.map((job) => (
              <div key={job.jobId} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{job.careType}</p>
                  <p className="text-xs text-muted-foreground">{job.caregiverName ?? 'Caregiver'}</p>
                </div>
                <button
                  onClick={() => setModalJobId(job.jobId)}
                  className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Record Payment
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Payment History</p>
        {paymentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {paymentRows.map((row) => (
              <div key={row.paymentId} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{row.careType}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.caregiverName} · {row.method} · {row.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${(row.amount / 100).toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    row.status === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : row.status === 'failed'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Add Billing to client sidebar**

Read `app/(client)/client/dashboard/_components/sidebar.tsx` and add a Billing nav item:

```tsx
{ href: '/client/dashboard/billing', label: 'Billing' }
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep billing`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/\(client\)/client/dashboard/billing/
git add app/\(client\)/client/dashboard/_components/sidebar.tsx
git commit -m "feat: add client billing page with payment history and cash recording"
```

---

### Task 5: Caregiver Payouts Page

**Files:**
- Modify: `app/(caregiver)/caregiver/dashboard/payouts/page.tsx`
- Create: `app/(caregiver)/caregiver/dashboard/payouts/_components/setup-stripe-connect-button.tsx`

- [ ] **Step 1: Create the SetupStripeConnectButton component**

```typescript
// app/(caregiver)/caregiver/dashboard/payouts/_components/setup-stripe-connect-button.tsx
'use client'

import { useTransition } from 'react'
import { setupStripeConnect } from '@/domains/payments/actions'

export function SetupStripeConnectButton() {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await setupStripeConnect()
      if (result.url) {
        window.location.href = result.url
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm"
    >
      {isPending ? 'Setting up…' : 'Set Up Stripe Payouts'}
    </button>
  )
}
```

- [ ] **Step 2: Replace the payouts page stub**

```typescript
// app/(caregiver)/caregiver/dashboard/payouts/page.tsx
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getCaregiverPayments } from '@/domains/payments/queries'
import { SetupStripeConnectButton } from './_components/setup-stripe-connect-button'

export default async function CaregiverPayoutsPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return (
      <div className="p-8 text-muted-foreground text-sm">
        Complete your profile to view payouts.
      </div>
    )
  }

  const paymentRows = await getCaregiverPayments(profile.id)

  const total = paymentRows
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Payouts</h1>
          <p className="text-sm text-muted-foreground">Your received payments from clients.</p>
        </div>
        <SetupStripeConnectButton />
      </div>

      <div className="rounded-xl border border-border bg-card px-5 py-4 mb-8">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Received</p>
        <p className="text-3xl font-bold">${(total / 100).toFixed(2)}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Payment History</p>
        {paymentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments received yet.</p>
        ) : (
          <div className="space-y-2">
            {paymentRows.map((row) => (
              <div key={row.paymentId} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{row.careType}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.clientName} · {row.method} · {row.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${(row.amount / 100).toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    row.status === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep payouts`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/\(caregiver\)/caregiver/dashboard/payouts/
git commit -m "feat: add caregiver payouts page with Stripe Connect setup"
```

---

### Task 6: Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests passing (pre-existing failures in lib/__tests__/rate-defaults.test.ts are acceptable)

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep -v "lib/__tests__/rate-defaults"`
Expected: no new errors

- [ ] **Step 3: Run Next.js build**

Run: `npx next build`
Expected: successful build with no errors

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues from Phase 9 payments implementation"
```
