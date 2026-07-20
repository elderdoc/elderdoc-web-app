# Shift-Based Weekly Billing Design

## Goal

Replace manual "Record Payment" with automated weekly billing: completed shifts are charged to the client every Sunday, held in escrow for 7 days, then released to the caregiver if no dispute.

## Architecture

Three changes to the existing system:

1. **Schema** — add `billedAt` to shifts; reduce payout-sweep hold to 7 days
2. **Weekly billing cron** — new `/api/cron/weekly-billing` route, runs Sunday 23:00 UTC
3. **UI** — replace "Record Payment" button with "Upcoming charge" view on billing page; shift-complete notification for client

## Tech Stack

Next.js 16 App Router, Drizzle ORM, Stripe (existing `createAndPayInvoice`), Vercel Cron, in-app notifications (existing `notifications` table)

---

## Data Model

### `shifts` table
Add one column:
```sql
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS billed_at timestamp;
```
- `null` → shift completed but not yet billed
- set → shift was included in a weekly invoice (value = when billed)

### `payments` table
No changes. One payment record per job per billing week — the existing structure handles this.

### Payout-sweep hold
Change `14 * 24 * 60 * 60 * 1000` → `7 * 24 * 60 * 60 * 1000` in `app/api/cron/payout-sweep/route.ts`. Funds from Sunday's charge release the following Monday if no dispute.

---

## Weekly Billing Cron

**Route:** `POST /api/cron/weekly-billing`  
**Schedule:** `0 23 * * 0` (Sunday 23:00 UTC)  
**Auth:** `Authorization: Bearer ${CRON_SECRET}` header

### Algorithm

```
1. Query all shifts WHERE status = 'completed' AND billed_at IS NULL
   JOIN jobs → careRequests (for budgetAmount) → jobs → clients (for stripeCustomerId)
   GROUP by jobId

2. For each job group:
   a. Calculate total:
      sum of ceil((endTime - startTime) in hours) × careRequest.budgetAmount
      fee = total × 0.01 (Trust & Support fee)
   b. Look up client's saved Stripe payment method
      → if none: insert notification "Add a payment method to cover your care invoice"
                 skip this job
   c. Call createAndPayInvoice(clientId, jobId, totalCents, feeCents)
      → inserts payment record (status: 'pending', in escrow)
   d. UPDATE shifts SET billed_at = now() WHERE id IN (shift ids for this job)
   e. Insert notification for client:
      "Your weekly invoice of $X for [careType] has been charged. You have 7 days to dispute."

3. Return { billed: N, skipped: M, totalCharged: dollars }
```

### Time calculation
`startTime` and `endTime` are stored as text (`HH:MM`). Parse both, compute difference in minutes, divide by 60, ceil to nearest quarter-hour (e.g. 2h 10min → 2.25h).

### Edge cases
- Job has no care request / no budgetAmount → skip, log warning
- Stripe charge fails → mark payment `failed`, insert notification to client, do NOT set `billedAt`
- Multiple active jobs for same client → each job billed separately, one invoice per job

---

## Notifications

### On shift complete (caregiver action)
Triggered inside `completeShift()` server action after updating shift status:
```
Insert notification for client (userId = job.clientId):
  "Margaret Collins completed a 3h personal-care shift on Apr 21. You'll be charged Sunday for this week's total."
```

### On weekly billing success (cron)
Insert notification for client after each successful charge:
```
"Your weekly invoice of $X for personal-care has been charged. You have 7 days to dispute any issues."
```

### On billing skipped (no card)
Insert notification for client:
```
"Add a payment method — your caregiver has completed shifts this week but you have no card on file."
```

---

## Billing Page UI

### Remove
- "Record Payment" button on active jobs
- `RecordPaymentModal` component
- `recordPaymentJobId` state in `BillingClient`

### Add: Upcoming Charge section
Shown between the saved-card banner and payment history. For each active job with completed unbilled shifts:

```
UPCOMING CHARGE — charges Sunday

[personal-care · Margaret Collins]
  Apr 21  09:00–12:00  3h   $45.00
  Apr 22  14:00–17:00  3h   $45.00
  ─────────────────────────────────
  Subtotal                  $90.00
  Trust & Support fee (1%)   $0.90
  Total due Sunday          $90.90
```

If client has no saved card, show inline warning: "Add a payment method before Sunday to avoid a missed payment."

### Payment history
No structural change — weekly invoices appear the same as manual payments did. Each row shows the week's total amount, date charged, and dispute link.

---

## Vercel Cron

Add to `vercel.json`:
```json
{ "path": "/api/cron/weekly-billing", "schedule": "0 23 * * 0" }
```

---

## Testing

- `completeShift` inserts client notification with correct message
- Weekly billing cron: given 2 completed unbilled shifts on a job, creates 1 payment, marks both shifts `billedAt`, inserts notification
- Weekly billing cron: skips jobs with no saved card, inserts "add card" notification
- Weekly billing cron: skips shifts already billed (`billedAt IS NOT NULL`)
- Payout sweep: releases payments after 7 days (not 14)
- Billing page: shows upcoming charge section when unbilled shifts exist; section absent when all shifts billed
