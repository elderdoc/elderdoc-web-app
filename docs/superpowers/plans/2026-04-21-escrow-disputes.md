# Escrow + Disputes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hold collected payments in escrow, release them to caregivers via weekly cron sweep, and let clients block a release by opening a dispute (payment-level or job-level); disputes auto-resolve after 14 days or can be withdrawn by the client.

**Architecture:** Three schema additions (disputes table, `payments.releasedAt`, `caregiverProfiles.stripeConnectAccountId`) unlock two cron routes (payout sweep every Monday, auto-resolve daily) and two server actions (`openDispute`, `withdrawDispute`). The billing page surfaces dispute state per payment card and a job-level "Report an issue" button. `setupStripeConnect` is patched to persist the Connect account ID so the sweep knows where to send funds.

**Tech Stack:** Next.js 16 App Router server actions + API routes, Drizzle ORM, Stripe Node SDK (`transferPayout` already in `services/stripe.ts`), Vercel Cron (`vercel.json`), Vitest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `db/schema.ts` | Modify | Add `releasedAt` to payments, `stripeConnectAccountId` to caregiverProfiles, new `disputes` table + relation |
| `domains/payments/actions.ts` | Modify | Fix `setupStripeConnect` to store account ID; add `openDispute`, `withdrawDispute` |
| `domains/payments/queries.ts` | Modify | Add `releasedAt` to `PaymentRow`; add `getOpenDisputesForClient` |
| `app/(client)/client/dashboard/billing/_components/dispute-modal.tsx` | Create | Reason textarea + submit modal, calls `openDispute` server action |
| `app/(client)/client/dashboard/billing/_components/payment-history-card.tsx` | Modify | Add `releasedAt`, `openDisputeId` props; dispute button, "Disputed" badge, withdraw link, "Released" badge |
| `app/(client)/client/dashboard/billing/_components/billing-client.tsx` | Modify | Pass dispute state per payment card; add job-level "Report an issue" button |
| `app/(client)/client/dashboard/billing/page.tsx` | Modify | Fetch open disputes server-side; pass to BillingClient |
| `app/api/cron/payout-sweep/route.ts` | Create | POST — weekly sweep; transfers net per eligible payment, sets `releasedAt` |
| `app/api/cron/resolve-disputes/route.ts` | Create | POST — daily sweep; resolves disputes older than 14 days |
| `vercel.json` | Create | Cron schedule config for both routes |

---

### Task 1: Schema — disputes table, releasedAt, stripeConnectAccountId

**Files:**
- Modify: `db/schema.ts`

- [ ] **Step 1: Add columns and disputes table to schema.ts**

Open `db/schema.ts`. Make these three additions:

**1a. Add `releasedAt` to the `payments` table** (after `stripeInvoiceId`):
```typescript
releasedAt: timestamp('released_at'),
```

**1b. Add `stripeConnectAccountId` to the `caregiverProfiles` table** (after `completedStep`):
```typescript
stripeConnectAccountId: text('stripe_connect_account_id'),
```

**1c. Add the `disputes` table** (after the `payments` table definition, before the relations block):
```typescript
export const disputes = pgTable('disputes', {
  id:         uuid('id').defaultRandom().primaryKey(),
  jobId:      uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  clientId:   uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  paymentId:  uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
  reason:     text('reason').notNull(),
  status:     text('status', { enum: ['open', 'resolved', 'withdrawn'] }).notNull().default('open'),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
})
```

**1d. Add the disputes relation** inside `jobsRelations`:
```typescript
disputes: many(disputes),
```

And add a new `disputesRelations` export (after `paymentsRelations`):
```typescript
export const disputesRelations = relations(disputes, ({ one }) => ({
  job:     one(jobs,     { fields: [disputes.jobId],     references: [jobs.id] }),
  client:  one(users,    { fields: [disputes.clientId],  references: [users.id] }),
  payment: one(payments, { fields: [disputes.paymentId], references: [payments.id] }),
}))
```

Also add `many` to the `jobsRelations` import if not already present (it is — check the existing `jobsRelations` uses `many`).

- [ ] **Step 2: Run the SQL migration**

Run against your local DB (adjust connection string as needed):
```bash
psql $DATABASE_URL -c "
  ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS released_at timestamp;
  CREATE TABLE IF NOT EXISTS disputes (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id       uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    client_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id   uuid REFERENCES payments(id) ON DELETE SET NULL,
    reason       text NOT NULL,
    status       text NOT NULL DEFAULT 'open',
    created_at   timestamp NOT NULL DEFAULT now(),
    resolved_at  timestamp
  );
"
```

Expected: `ALTER TABLE`, `ALTER TABLE`, `CREATE TABLE`

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "schema|disputes"
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts
git commit -m "feat: add disputes table, payments.releasedAt, caregiverProfiles.stripeConnectAccountId"
```

---

### Task 2: Fix setupStripeConnect — persist account ID

**Files:**
- Modify: `domains/payments/actions.ts`

**Context:** `setupStripeConnect` in `actions.ts` currently calls `createConnectAccount` but discards the returned account ID. The payout sweep needs `stripeConnectAccountId` on the caregiver profile to know where to transfer funds.

- [ ] **Step 1: Update the setupStripeConnect action**

Find `setupStripeConnect` in `domains/payments/actions.ts` (currently around line 157). Replace the entire function with:

```typescript
export async function setupStripeConnect() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })
  if (!profile) return { error: 'Profile not found' }

  const account = await createConnectAccount(session.user.id)
  await db
    .update(caregiverProfiles)
    .set({ stripeConnectAccountId: account.id })
    .where(eq(caregiverProfiles.id, profile.id))

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/caregiver/dashboard/payouts`
  const link = await createConnectAccountLink(account.id, returnUrl)
  return { url: link.url }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "actions"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add domains/payments/actions.ts
git commit -m "fix: persist stripeConnectAccountId after Connect account creation"
```

---

### Task 3: Dispute server actions — openDispute + withdrawDispute (TDD)

**Files:**
- Modify: `domains/payments/actions.ts`
- Create: `domains/payments/__tests__/dispute-actions.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// domains/payments/__tests__/dispute-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockValues = vi.fn()
const mockSet = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  },
}))

vi.mock('@/db/schema', () => ({
  jobs:     { id: 'jobs.id', clientId: 'jobs.clientId' },
  payments: { id: 'payments.id', jobId: 'payments.jobId' },
  disputes: { id: 'disputes.id', clientId: 'disputes.clientId', jobId: 'disputes.jobId', paymentId: 'disputes.paymentId', status: 'disputes.status' },
}))

vi.mock('drizzle-orm', () => ({
  eq:  vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/auth'
import { openDispute, withdrawDispute } from '../actions'

const mockAuth = vi.mocked(auth)

describe('openDispute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLimit.mockResolvedValue([{ id: 'job-1' }])
    mockWhere.mockReturnValue({ limit: mockLimit })
    mockFrom.mockReturnValue({ where: mockWhere, innerJoin: vi.fn().mockReturnValue({ where: mockWhere }) })
    mockSelect.mockReturnValue({ from: mockFrom })
    mockValues.mockResolvedValue(undefined)
    mockInsert.mockReturnValue({ values: mockValues })
  })

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const result = await openDispute('job-1', 'bad shift')
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when job not found', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'client-1' } } as any)
    mockLimit.mockResolvedValueOnce([])
    const result = await openDispute('job-1', 'bad shift')
    expect(result).toEqual({ error: 'Job not found' })
  })

  it('inserts dispute and returns empty object on success', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'client-1' } } as any)
    mockLimit.mockResolvedValueOnce([{ id: 'job-1' }])
    mockLimit.mockResolvedValueOnce([])
    const result = await openDispute('job-1', 'bad shift')
    expect(mockInsert).toHaveBeenCalled()
    expect(result).toEqual({})
  })
})

describe('withdrawDispute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLimit.mockResolvedValue([{ id: 'dispute-1', clientId: 'client-1' }])
    mockWhere.mockReturnValue({ limit: mockLimit })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockSelect.mockReturnValue({ from: mockFrom })
    const mockWhereUpdate = vi.fn().mockResolvedValue(undefined)
    mockSet.mockReturnValue({ where: mockWhereUpdate })
    mockUpdate.mockReturnValue({ set: mockSet })
  })

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const result = await withdrawDispute('dispute-1')
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when dispute not found or not owned', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'client-1' } } as any)
    mockLimit.mockResolvedValueOnce([])
    const result = await withdrawDispute('dispute-1')
    expect(result).toEqual({ error: 'Dispute not found' })
  })

  it('updates status to withdrawn and returns empty object', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'client-1' } } as any)
    mockLimit.mockResolvedValueOnce([{ id: 'dispute-1', clientId: 'client-1' }])
    const result = await withdrawDispute('dispute-1')
    expect(mockUpdate).toHaveBeenCalled()
    expect(result).toEqual({})
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run domains/payments/__tests__/dispute-actions.test.ts 2>&1 | tail -10
```

Expected: FAIL — `openDispute` and `withdrawDispute` are not exported from `actions`

- [ ] **Step 3: Add openDispute and withdrawDispute to actions.ts**

Add these two exports at the bottom of `domains/payments/actions.ts`. First add `disputes` to the schema import at the top of the file:

```typescript
import { payments, jobs, shifts, caregiverProfiles, users, disputes } from '@/db/schema'
```

Then add at the bottom:

```typescript
export async function openDispute(
  jobId: string,
  reason: string,
  paymentId?: string,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const jobRow = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, session.user.id)))
    .limit(1)
  if (jobRow.length === 0) return { error: 'Job not found' }

  const existing = await db
    .select({ id: disputes.id })
    .from(disputes)
    .where(
      and(
        eq(disputes.jobId, jobId),
        eq(disputes.clientId, session.user.id),
        eq(disputes.status, 'open'),
        paymentId ? eq(disputes.paymentId, paymentId) : eq(disputes.jobId, jobId),
      ),
    )
    .limit(1)
  if (existing.length > 0) return { error: 'A dispute is already open for this payment' }

  await db.insert(disputes).values({
    jobId,
    clientId: session.user.id,
    paymentId: paymentId ?? null,
    reason,
  })

  revalidatePath('/client/dashboard/billing')
  return {}
}

export async function withdrawDispute(disputeId: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const row = await db
    .select({ id: disputes.id, clientId: disputes.clientId })
    .from(disputes)
    .where(and(eq(disputes.id, disputeId), eq(disputes.clientId, session.user.id), eq(disputes.status, 'open')))
    .limit(1)
  if (row.length === 0) return { error: 'Dispute not found' }

  await db
    .update(disputes)
    .set({ status: 'withdrawn', resolvedAt: new Date() })
    .where(eq(disputes.id, disputeId))

  revalidatePath('/client/dashboard/billing')
  return {}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run domains/payments/__tests__/dispute-actions.test.ts 2>&1 | tail -10
```

Expected: 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add domains/payments/actions.ts domains/payments/__tests__/dispute-actions.test.ts
git commit -m "feat: add openDispute and withdrawDispute server actions"
```

---

### Task 4: Queries — releasedAt + getOpenDisputesForClient

**Files:**
- Modify: `domains/payments/queries.ts`

- [ ] **Step 1: Add releasedAt to PaymentRow and both query selects**

In `domains/payments/queries.ts`:

**4a. Add `releasedAt` to the `PaymentRow` interface** (after `stripeInvoiceId`):
```typescript
releasedAt: Date | null
```

**4b. Add `releasedAt` to the `getClientPayments` select** (after `stripeInvoiceId: payments.stripeInvoiceId`):
```typescript
releasedAt: payments.releasedAt,
```

And in the `rows.map` return for `getClientPayments` (after `stripeInvoiceId`):
```typescript
releasedAt: r.releasedAt ?? null,
```

**4c. Add `releasedAt` to the `getCaregiverPayments` select and map** the same way.

- [ ] **Step 2: Add getOpenDisputesForClient**

Add `disputes` to the imports at the top of `queries.ts`:
```typescript
import { payments, jobs, careRequests, users, caregiverProfiles, disputes } from '@/db/schema'
```

Add the new export at the bottom of `queries.ts`:

```typescript
export interface DisputeRow {
  disputeId: string
  jobId: string
  paymentId: string | null
  reason: string
  status: string
  createdAt: Date
}

export async function getOpenDisputesForClient(clientId: string): Promise<DisputeRow[]> {
  const rows = await db
    .select({
      disputeId: disputes.id,
      jobId:     disputes.jobId,
      paymentId: disputes.paymentId,
      reason:    disputes.reason,
      status:    disputes.status,
      createdAt: disputes.createdAt,
    })
    .from(disputes)
    .where(and(eq(disputes.clientId, clientId), eq(disputes.status, 'open')))
    .orderBy(desc(disputes.createdAt))

  return rows.map((r) => ({
    disputeId: r.disputeId,
    jobId:     r.jobId,
    paymentId: r.paymentId ?? null,
    reason:    r.reason,
    status:    r.status,
    createdAt: r.createdAt,
  }))
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "queries"
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add domains/payments/queries.ts
git commit -m "feat: add releasedAt to PaymentRow and getOpenDisputesForClient query"
```

---

### Task 5: Payout sweep cron

**Files:**
- Create: `app/api/cron/payout-sweep/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Create the payout sweep route**

```typescript
// app/api/cron/payout-sweep/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/services/db'
import { payments, jobs, caregiverProfiles, disputes } from '@/db/schema'
import { eq, and, isNull, isNotNull } from 'drizzle-orm'
import { transferPayout } from '@/services/stripe'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Collect all open dispute job/payment IDs to skip
  const openDisputes = await db
    .select({ jobId: disputes.jobId, paymentId: disputes.paymentId })
    .from(disputes)
    .where(eq(disputes.status, 'open'))

  const disputedJobIds     = new Set(openDisputes.filter((d) => !d.paymentId).map((d) => d.jobId))
  const disputedPaymentIds = new Set(openDisputes.filter((d) => d.paymentId).map((d) => d.paymentId!))

  // 2. Find all completed, unreleased payments with a caregiver Connect account
  const eligible = await db
    .select({
      id:               payments.id,
      jobId:            payments.jobId,
      amount:           payments.amount,
      fee:              payments.fee,
      connectAccountId: caregiverProfiles.stripeConnectAccountId,
    })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .where(
      and(
        eq(payments.status, 'completed'),
        isNull(payments.releasedAt),
        isNotNull(caregiverProfiles.stripeConnectAccountId),
      ),
    )

  // 3. Filter out disputed payments and jobs
  const toRelease = eligible.filter(
    (p) => !disputedJobIds.has(p.jobId) && !disputedPaymentIds.has(p.id),
  )

  // 4. Transfer one-by-one (sequential to avoid partial failures corrupting state)
  let released = 0
  let totalCents = 0

  for (const p of toRelease) {
    const net = Number(p.amount) - Number(p.fee) // dollars
    if (net <= 0) continue
    try {
      await transferPayout(net, p.connectAccountId!, p.jobId)
      await db.update(payments).set({ releasedAt: new Date() }).where(eq(payments.id, p.id))
      released++
      totalCents += Math.round(net * 100)
    } catch (err) {
      console.error('[payout-sweep] transfer failed for payment', p.id, err)
    }
  }

  return NextResponse.json({ released, totalCents })
}
```

- [ ] **Step 2: Create vercel.json**

```json
{
  "crons": [
    { "path": "/api/cron/payout-sweep",    "schedule": "0 9 * * 1" },
    { "path": "/api/cron/resolve-disputes", "schedule": "0 8 * * *" }
  ]
}
```

- [ ] **Step 3: Add CRON_SECRET to your .env.local**

```bash
echo "CRON_SECRET=replace_with_a_random_secret" >> .env.local
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "payout-sweep"
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "app/api/cron/payout-sweep/route.ts" vercel.json
git commit -m "feat: add weekly payout sweep cron route and vercel.json schedule"
```

---

### Task 6: Dispute auto-resolve cron

**Files:**
- Create: `app/api/cron/resolve-disputes/route.ts`

- [ ] **Step 1: Create the resolve-disputes route**

```typescript
// app/api/cron/resolve-disputes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/services/db'
import { disputes } from '@/db/schema'
import { eq, and, lt } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const result = await db
    .update(disputes)
    .set({ status: 'resolved', resolvedAt: new Date() })
    .where(and(eq(disputes.status, 'open'), lt(disputes.createdAt, cutoff)))

  const resolved = (result as unknown as { rowCount?: number }).rowCount ?? 0
  return NextResponse.json({ resolved })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "resolve-disputes"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/api/cron/resolve-disputes/route.ts"
git commit -m "feat: add daily dispute auto-resolve cron route (14-day TTL)"
```

---

### Task 7: DisputeModal component

**Files:**
- Create: `app/(client)/client/dashboard/billing/_components/dispute-modal.tsx`

- [ ] **Step 1: Create the DisputeModal component**

```typescript
// app/(client)/client/dashboard/billing/_components/dispute-modal.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { openDispute } from '@/domains/payments/actions'

interface Props {
  jobId: string
  paymentId?: string
  onClose: () => void
}

export function DisputeModal({ jobId, paymentId, onClose }: Props) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return
    setIsPending(true)
    setError(null)
    const result = await openDispute(jobId, reason.trim(), paymentId)
    if (result.error) {
      setError(result.error)
      setIsPending(false)
      return
    }
    router.refresh()
    onClose()
  }

  const title = paymentId ? 'Dispute this payment' : 'Report an issue'
  const subtitle = paymentId
    ? 'Describe the issue with this payment. Funds will be held until the dispute is resolved or withdrawn.'
    : 'Describe the issue with this job. All pending payouts for this job will be held until resolved.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-sm">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue…"
              rows={4}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
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
                disabled={isPending || !reason.trim()}
                className="text-sm px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isPending ? 'Submitting…' : 'Submit dispute'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "dispute-modal"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/(client)/client/dashboard/billing/_components/dispute-modal.tsx"
git commit -m "feat: add DisputeModal component for payment and job-level disputes"
```

---

### Task 8: PaymentHistoryCard — escrow + dispute UI

**Files:**
- Modify: `app/(client)/client/dashboard/billing/_components/payment-history-card.tsx`

**Context:** The current `Props` interface has `careType`, `caregiverName`, `method`, `amount`, `fee`, `status`, `stripePaymentIntentId`, `stripeInvoiceId`, `createdAt`. We add `releasedAt`, `openDisputeId`, `jobId`, and `isClient`.

- [ ] **Step 1: Update PaymentHistoryCard**

Replace the `interface Props` and `export function PaymentHistoryCard` in `app/(client)/client/dashboard/billing/_components/payment-history-card.tsx` with the following complete replacement of everything from `interface Props` to the end of the file:

```typescript
interface Props {
  careType: string
  caregiverName: string | null
  method: string
  amount: number
  fee: number
  status: string
  stripePaymentIntentId: string | null
  stripeInvoiceId: string | null
  releasedAt: Date | null
  openDisputeId: string | null
  jobId: string
  isClient: boolean
  createdAt: Date
}

export function PaymentHistoryCard({
  careType, caregiverName, method, amount, fee, status,
  stripePaymentIntentId, stripeInvoiceId,
  releasedAt, openDisputeId, jobId, isClient, createdAt,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const router = useRouter()

  const receiptRef = stripeInvoiceId ?? stripePaymentIntentId
  const isMock = !receiptRef || receiptRef.startsWith('mock_pi_') || receiptRef.startsWith('mock_in_')
  const receiptSrc = !isMock ? `/api/receipt/${receiptRef}` : null

  const isHeld     = status === 'completed' && !releasedAt
  const isReleased = status === 'completed' && !!releasedAt
  const isDisputed = !!openDisputeId

  async function handleWithdraw() {
    const { withdrawDispute } = await import('@/domains/payments/actions')
    await withdrawDispute(openDisputeId!)
    router.refresh()
  }

  function handleToggle() {
    setExpanded((v) => !v)
    if (!expanded) setIframeLoaded(false)
  }

  return (
    <>
      {showDisputeModal && (
        <DisputeModal
          jobId={jobId}
          paymentId={receiptRef ?? undefined}
          onClose={() => setShowDisputeModal(false)}
        />
      )}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={handleToggle}
          className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        >
          <div>
            <p className="text-sm font-medium">{careType}</p>
            <p className="text-xs text-muted-foreground">
              {caregiverName} · {method} · {createdAt.toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-sm font-semibold">${((amount + fee) / 100).toFixed(2)}</p>
              {fee > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  incl. ${(fee / 100).toFixed(2)} Trust &amp; Support fee
                </p>
              )}
              <div className="flex items-center gap-1 justify-end flex-wrap mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  status === 'completed'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : status === 'failed'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {status}
                </span>
                {isReleased && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Released
                  </span>
                )}
                {isDisputed && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    Disputed
                  </span>
                )}
              </div>
            </div>
            <span className="text-muted-foreground">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </div>
        </button>

        {expanded && (
          <div className="border-t border-border bg-muted/20">
            {isClient && isHeld && !isDisputed && (
              <div className="px-4 pt-3 pb-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(true)}
                  className="text-xs text-destructive hover:underline"
                >
                  Dispute this payment
                </button>
              </div>
            )}
            {isClient && isDisputed && (
              <div className="px-4 pt-3 pb-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleWithdraw}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Withdraw dispute
                </button>
              </div>
            )}
            {isMock ? (
              <p className="px-4 py-3 text-xs text-muted-foreground">Receipt not available for test/seeded payments.</p>
            ) : (
              <>
                <div className="flex justify-end px-4 pt-3">
                  <a
                    href={`${receiptSrc}?download=1`}
                    download={`receipt-${receiptRef}.pdf`}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Download className="h-3 w-3" /> Download PDF
                  </a>
                </div>
                <div className="relative mt-3" style={{ height: '520px' }}>
                  {!iframeLoaded && <ReceiptSkeleton />}
                  <iframe
                    src={receiptSrc!}
                    className="w-full h-full border-0"
                    title="Stripe Receipt"
                    onLoad={() => setIframeLoaded(true)}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Add missing imports to payment-history-card.tsx**

At the top of the file, update the imports to include:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import { DisputeModal } from './dispute-modal'
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "payment-history-card"
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "app/(client)/client/dashboard/billing/_components/payment-history-card.tsx"
git commit -m "feat: add escrow badges and dispute/withdraw UI to PaymentHistoryCard"
```

---

### Task 9: Wire billing page and BillingClient

**Files:**
- Modify: `app/(client)/client/dashboard/billing/page.tsx`
- Modify: `app/(client)/client/dashboard/billing/_components/billing-client.tsx`

- [ ] **Step 1: Update billing/page.tsx to fetch disputes**

Replace the contents of `app/(client)/client/dashboard/billing/page.tsx` with:

```typescript
import { requireRole } from '@/domains/auth/session'
import { getClientPayments, getOpenDisputesForClient } from '@/domains/payments/queries'
import { db } from '@/services/db'
import { jobs, careRequests, caregiverProfiles, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getDefaultPaymentMethod } from '@/services/stripe'
import { BillingClient } from './_components/billing-client'

export default async function ClientBillingPage() {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [paymentRows, activeJobs, userRow, openDisputes] = await Promise.all([
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
  ])

  const savedCard = userRow[0]?.stripeCustomerId
    ? await getDefaultPaymentMethod(userRow[0].stripeCustomerId)
    : null

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-1">Billing</h1>
      <p className="text-sm text-muted-foreground mb-8">Record and view payments for your care services.</p>
      <BillingClient
        paymentRows={paymentRows}
        activeJobs={activeJobs}
        savedCard={savedCard}
        stripePublishableKey={process.env.STRIPE_PUBLISHABLE_KEY ?? ''}
        openDisputes={openDisputes}
      />
    </div>
  )
}
```

- [ ] **Step 2: Update BillingClient to pass dispute state and add job-level dispute button**

Replace the contents of `app/(client)/client/dashboard/billing/_components/billing-client.tsx` with:

```typescript
'use client'

import { useState } from 'react'
import { RecordPaymentModal } from './record-payment-modal'
import { SavedCardBanner } from './saved-card-banner'
import { PaymentHistoryCard } from './payment-history-card'
import { DisputeModal } from './dispute-modal'
import type { PaymentRow } from '@/domains/payments/queries'
import type { DisputeRow } from '@/domains/payments/queries'

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
}

export function BillingClient({ paymentRows, activeJobs, savedCard, stripePublishableKey, openDisputes }: Props) {
  const [modalJobId, setModalJobId] = useState<string | null>(null)
  const [disputeJobId, setDisputeJobId] = useState<string | null>(null)
  const modalJob = activeJobs.find((j) => j.jobId === modalJobId)

  const paymentDisputeMap = new Map(
    openDisputes.filter((d) => d.paymentId).map((d) => [d.paymentId!, d.disputeId]),
  )
  const jobDisputeSet = new Set(openDisputes.filter((d) => !d.paymentId).map((d) => d.jobId))

  return (
    <>
      {modalJob && (
        <RecordPaymentModal
          jobId={modalJob.jobId}
          jobLabel={`${modalJob.careType} — ${modalJob.caregiverName ?? 'Caregiver'}`}
          savedCard={savedCard}
          onClose={() => setModalJobId(null)}
        />
      )}

      {disputeJobId && (
        <DisputeModal
          jobId={disputeJobId}
          onClose={() => setDisputeJobId(null)}
        />
      )}

      <SavedCardBanner savedCard={savedCard} stripePublishableKey={stripePublishableKey} />

      <div className="mb-8">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Active Jobs</p>
        {activeJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">No active jobs yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Payments can be recorded once a caregiver is hired.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeJobs.map((job) => (
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
                  <button
                    onClick={() => setModalJobId(job.jobId)}
                    className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Record Payment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Payment History</p>
        {paymentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {paymentRows.map((row) => (
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
                releasedAt={row.releasedAt}
                openDisputeId={paymentDisputeMap.get(row.paymentId) ?? null}
                jobId={row.jobId}
                isClient={true}
                createdAt={row.createdAt}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "billing-client|billing/page"
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add \
  "app/(client)/client/dashboard/billing/page.tsx" \
  "app/(client)/client/dashboard/billing/_components/billing-client.tsx"
git commit -m "feat: wire escrow + dispute state through billing page and BillingClient"
```

---

### Task 10: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: only the two pre-existing errors (`care-plans.test.ts` and `rate-defaults.test.ts`). No new errors.

- [ ] **Step 2: Run test suite**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: all tests passing (pre-existing failures in `lib/__tests__/rate-defaults.test.ts` and `domains/clients/__tests__/care-plans.test.ts` are acceptable)

- [ ] **Step 3: Run Next.js build**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` and `Finished TypeScript`. The `DATABASE_URL is not set` error during page data collection is pre-existing and acceptable in local dev.

- [ ] **Step 4: Commit any fixes needed**

```bash
git add -A
git commit -m "fix: resolve any build issues from escrow + disputes implementation"
```
