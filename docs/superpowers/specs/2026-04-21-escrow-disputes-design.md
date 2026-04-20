# Escrow + Disputes — Design Spec

## Goal

Hold client payments in ElderDoc's Stripe platform account after collection, release them to caregivers via weekly automated sweep, and allow clients to block a release by opening a dispute. Disputes auto-resolve after 14 days or can be withdrawn by the client.

## Architecture

```
Client pays invoice → payment.releasedAt = NULL (held in escrow)

Every Monday (payout sweep cron):
  For each caregiver with stripeConnectAccountId:
    Find completed, unreleased payments with no open dispute on the job
    → transferPayout(net, connectAccountId, jobId)
    → set releasedAt = NOW()

Daily (dispute auto-resolve cron):
  Find disputes where status = 'open' AND createdAt < NOW() - 14 days
  → set status = 'resolved', resolvedAt = NOW()
  (unblocks those payments for next Monday sweep)

Client opens dispute:
  → disputes row inserted (payment-level or job-level)
  → affected payments skipped by sweep until dispute is resolved/withdrawn

Client withdraws dispute:
  → disputes.status = 'withdrawn', resolvedAt = NOW()
  → affected payments unblocked for next Monday sweep
```

## Tech Stack

- Next.js 16 App Router server actions + API routes
- Drizzle ORM (postgres)
- Stripe Node SDK (`transferPayout` already in `services/stripe.ts`)
- Vercel Cron (via `vercel.json`)

---

## Schema Changes

### `payments` table — add one column

```sql
ALTER TABLE payments ADD COLUMN released_at timestamp;
```

`releasedAt: timestamp` — null = held in escrow, non-null = transferred to caregiver's Connect account.

### `caregiverProfiles` table — add one column

```sql
ALTER TABLE caregiver_profiles ADD COLUMN stripe_connect_account_id text;
```

`stripeConnectAccountId: text` — currently `setupStripeConnect` creates the Stripe Connect account but never stores the ID back. This fixes that gap so the sweep knows where to send funds.

### New `disputes` table

```sql
CREATE TABLE disputes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  client_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id   uuid REFERENCES payments(id) ON DELETE SET NULL,
  reason       text NOT NULL,
  status       text NOT NULL DEFAULT 'open',   -- 'open' | 'resolved' | 'withdrawn'
  created_at   timestamp NOT NULL DEFAULT now(),
  resolved_at  timestamp
)
```

- `paymentId = null` → job-level dispute (blocks all unreleased payments on that job)
- `paymentId` set → payment-level dispute (blocks only that payment)
- `status = 'open'` → sweep skips affected payments
- `status = 'resolved'` → auto-resolved after 14 days by daily cron
- `status = 'withdrawn'` → client withdrew the dispute manually

---

## Stripe Service Layer (`services/stripe.ts`)

### Changes to existing function

**`setupStripeConnect`** — currently returns a Connect onboarding URL but discards the account ID. Update to return `{ url, accountId }` so the caller can store `accountId` on the caregiver profile.

No other stripe.ts changes needed — `transferPayout(amount, accountId, jobId)` already exists.

---

## Server Actions (`domains/payments/actions.ts`)

### Fix `setupStripeConnect`

After creating the Connect account, store the account ID:

```typescript
const account = await createConnectAccount(session.user.id)
await db.update(caregiverProfiles)
  .set({ stripeConnectAccountId: account.id })
  .where(eq(caregiverProfiles.userId, session.user.id))
const link = await createConnectAccountLink(account.id, returnUrl)
return { url: link.url }
```

### New: `openDispute(jobId, reason, paymentId?)`

1. Auth check — require `client` role
2. Verify `jobs.clientId = session.user.id` for the given `jobId`
3. If `paymentId` provided, verify `payments.jobId = jobId`
4. Check no existing `open` dispute on same `(jobId, paymentId)` — return error if duplicate
5. `db.insert(disputes).values({ jobId, clientId, reason, paymentId: paymentId ?? null })`
6. `revalidatePath('/client/dashboard/billing')`
7. Return `{}`

### New: `withdrawDispute(disputeId)`

1. Auth check — require `client` role
2. Verify `disputes.clientId = session.user.id` and `disputes.status = 'open'`
3. `db.update(disputes).set({ status: 'withdrawn', resolvedAt: new Date() }).where(eq(disputes.id, disputeId))`
4. `revalidatePath('/client/dashboard/billing')`
5. Return `{}`

---

## Cron Routes

### `/api/cron/payout-sweep` — POST, runs every Monday 09:00 UTC

**Security:** Check `Authorization: Bearer ${process.env.CRON_SECRET}` header. Return 401 if missing or wrong.

**Logic:**

```typescript
// 1. Find all open disputes (job IDs and payment IDs to skip)
const openDisputes = await db.select({ jobId, paymentId }).from(disputes).where(eq(disputes.status, 'open'))
const disputedJobIds    = new Set(openDisputes.filter(d => !d.paymentId).map(d => d.jobId))
const disputedPaymentIds = new Set(openDisputes.filter(d => d.paymentId).map(d => d.paymentId))

// 2. Find all eligible payments
const eligible = await db
  .select({ id, jobId, amount, fee, caregiverId, stripeConnectAccountId })
  .from(payments)
  .innerJoin(jobs, eq(payments.jobId, jobs.id))
  .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
  .where(and(
    eq(payments.status, 'completed'),
    isNull(payments.releasedAt),
    isNotNull(caregiverProfiles.stripeConnectAccountId),
  ))

// 3. Filter out disputed
const toRelease = eligible.filter(p =>
  !disputedJobIds.has(p.jobId) && !disputedPaymentIds.has(p.id)
)

// 4. Group by caregiver, transfer, mark released
// Group by stripeConnectAccountId
// For each group: sum (amount - fee), call transferPayout(), set releasedAt = NOW()
// Process one at a time (not parallel) to avoid partial failures
```

Returns `{ released: N, totalCents: N }`.

### `/api/cron/resolve-disputes` — POST, runs daily 08:00 UTC

**Security:** Same `CRON_SECRET` check.

**Logic:**

```typescript
const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
await db.update(disputes)
  .set({ status: 'resolved', resolvedAt: new Date() })
  .where(and(eq(disputes.status, 'open'), lt(disputes.createdAt, cutoff)))
```

Returns `{ resolved: N }`.

### `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/payout-sweep",     "schedule": "0 9 * * 1" },
    { "path": "/api/cron/resolve-disputes",  "schedule": "0 8 * * *" }
  ]
}
```

---

## UI Changes

### Billing page — `PaymentHistoryCard`

For each payment with `status = 'completed'` and `releasedAt = null`:

- Show a **"Dispute"** button
- If an open dispute exists for this payment: show **"Disputed"** badge + **"Withdraw dispute"** link
- If `releasedAt` is set: show **"Released"** badge (no dispute option)

Dispute button opens `DisputeModal` (reason textarea + submit). Calls `openDispute(jobId, reason, paymentId)`.

Withdraw link calls `withdrawDispute(disputeId)` directly (no modal needed).

### Job page / messaging — job-level dispute

Add a **"Report an issue"** button scoped to the active job (visible to client only). Opens same `DisputeModal` without a `paymentId`. Calls `openDispute(jobId, reason)`.

Location: `app/(client)/client/dashboard/billing/_components/` for the modal; job-level button added to wherever the job detail or messaging thread lives.

---

## Queries (`domains/payments/queries.ts`)

Add `releasedAt` to `PaymentRow`:
```typescript
releasedAt: Date | null
```

Add a new query `getOpenDisputesForClient(clientId)` → returns disputes with `status = 'open'` for the client, joined to job + payment for display.

Add `getCaregiverPayments` update: expose `releasedAt` so caregiver payouts page can show "Pending release" vs "Paid out" status.

---

## Error Handling

- Duplicate open dispute on same `(jobId, paymentId)`: return `{ error: 'A dispute is already open for this payment' }`
- `transferPayout` failure in sweep: log error, skip that payment, continue with others (partial success is acceptable — failed ones retry next Monday)
- Missing `stripeConnectAccountId`: skip caregiver silently in sweep (they haven't completed Connect onboarding)

---

## Out of Scope

- Admin dispute resolution UI
- Partial refunds
- Caregiver response/rebuttal flow
- Stripe Disputes (chargebacks) — separate from this system
