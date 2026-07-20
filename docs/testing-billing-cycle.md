# Testing the Full Billing Cycle Locally

The production billing cycle spans two weeks:

1. **Weekly billing cron** charges the client for completed shifts
2. Stripe fires a webhook confirming payment succeeded → payment moves to `completed`
3. **7-day escrow hold** — funds sit in escrow
4. **Payout-sweep cron** releases funds to the caregiver's Stripe Connect account

This guide explains how to compress that entire cycle into a single testing session today.

---

## Prerequisites

Before running any of the steps below, verify the following are true in your local database.

### 1. There are completed, unbilled shifts

The weekly billing cron only processes shifts where `status = 'completed'` and `billed_at IS NULL`. Check that at least one exists:

```sql
SELECT s.id, s.date, s.start_time, s.end_time, s.status, s.billed_at,
       j.client_id, j.caregiver_id, cr.budget_amount
FROM shifts s
JOIN jobs j ON s.job_id = j.id
JOIN care_requests cr ON j.request_id = cr.id
WHERE s.status = 'completed'
  AND s.billed_at IS NULL
  AND cr.budget_amount IS NOT NULL;
```

If there are none, either run the seed (`npx tsx db/seed.ts`) or mark a scheduled shift as completed:

```sql
UPDATE shifts SET status = 'completed' WHERE status = 'scheduled' LIMIT 3;
```

### 2. The client on that job has a saved Stripe card

The cron skips any job whose client does not have a `stripe_customer_id` in the `users` table **and** a default payment method attached in Stripe. To set one up:

1. Log in as the client in the browser
2. Go to **Billing → Add payment method**
3. Use Stripe's test card number: `4242 4242 4242 4242`, any future expiry, any CVC

Once saved, the client's `stripe_customer_id` is populated in the `users` row.

### 3. The caregiver on that job has a Stripe Connect account

The payout-sweep skips caregivers without a `stripe_connect_account_id` in `caregiver_profiles`. To set one up:

1. Log in as the caregiver in the browser
2. Go to **Payouts → Set up payouts** and complete the Connect onboarding flow (use Stripe's test data throughout)

Once complete, `stripe_connect_account_id` is populated in `caregiver_profiles`.

### 4. CRON_SECRET is set

`CRON_SECRET=dev-cron-secret` is set in `.env.local`. All curl commands below use that value. If you change it, update the header accordingly.

---

## Step 1 — Trigger Weekly Billing

This charges the client for all completed, unbilled shifts. It groups shifts by job, calculates the subtotal based on shift hours × hourly rate, adds a 1% platform fee, creates a Stripe invoice, marks shifts as billed, and inserts a `payment` row with `status = 'pending'`.

```bash
curl -X POST http://localhost:3000/api/cron/weekly-billing \
  -H "Authorization: Bearer dev-cron-secret"
```

**Expected response:**

```json
{ "billed": 1, "skipped": 0, "totalCharged": 96.96 }
```

- `billed` — number of jobs successfully invoiced
- `skipped` — jobs where the client had no saved card (a `billing_no_card` notification is inserted for them)
- `totalCharged` — total dollars charged across all jobs

**If `billed` is 0 and `skipped` is also 0**, there are no eligible shifts (either all are already billed, or none are `completed`). Go back to Prerequisite 1.

**If `billed` is 0 and `skipped` > 0**, the client has no saved card. Go back to Prerequisite 2.

After this step, confirm a payment row was created:

```sql
SELECT id, job_id, amount, fee, status, stripe_invoice_id, created_at
FROM payments
ORDER BY created_at DESC
LIMIT 5;
```

The row should have `status = 'pending'` and a non-null `stripe_invoice_id`.

---

## Step 2 — Confirm Payment via Stripe Webhook

The payment stays `pending` until Stripe fires `invoice.payment_succeeded`, which the webhook handler at `/api/webhooks/stripe` processes to set `status = 'completed'`.

### Option A — Use the Stripe CLI (recommended)

This is the most realistic path. It replays actual Stripe events against your local server.

**Terminal 1** — start the webhook forwarder:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Leave this running. The CLI will print a line like:
```
Ready! Your webhook signing secret is whsec_... (^C to quit)
```

**Terminal 2** — trigger the invoice payment event:

```bash
stripe trigger invoice.payment_succeeded
```

The forwarder in Terminal 1 will show the event being delivered. Your webhook handler will update the matching payment row to `status = 'completed'`.

> **Note:** `stripe trigger` creates a synthetic event, not one tied to the specific invoice created in Step 1. The webhook handler matches by `stripe_invoice_id`. If the synthetic event's invoice ID doesn't match your payment row, the update won't land. In that case use Option B.

### Option B — Update the database directly (fastest for testing)

Skip the webhook entirely and set the payment to `completed` manually. Run this in your terminal:

```bash
psql postgres://elderdoc:elderdoc@localhost:5432/elderdoc -c \
  "UPDATE payments SET status = 'completed' WHERE status = 'pending' AND released_at IS NULL;"
```

This is equivalent to what the webhook does. After this, the payment is eligible for the escrow release check — but it still won't be released until it is old enough (see Step 3).

---

## Step 3 — Backdate the Payment to Bypass the 7-Day Hold

The payout-sweep cron only releases payments where:

```ts
lt(payments.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
```

That means `created_at` must be more than 7 days in the past. To test today, backdate all eligible payments:

```bash
psql postgres://elderdoc:elderdoc@localhost:5432/elderdoc -c \
  "UPDATE payments SET created_at = NOW() - INTERVAL '8 days' WHERE status = 'completed' AND released_at IS NULL;"
```

Confirm the update:

```bash
psql postgres://elderdoc:elderdoc@localhost:5432/elderdoc -c \
  "SELECT id, status, created_at, released_at FROM payments WHERE status = 'completed';"
```

The `created_at` should now be 8 days ago and `released_at` should still be `NULL`.

---

## Step 4 — Trigger the Payout Sweep

This finds all eligible payments (completed, unreleased, caregiver has a Connect account, older than 7 days, no open dispute), transfers the net amount to the caregiver's Stripe Connect account, and stamps `released_at` on the payment row.

```bash
curl -X POST http://localhost:3000/api/cron/payout-sweep \
  -H "Authorization: Bearer dev-cron-secret"
```

**Expected response:**

```json
{ "released": 1, "totalCents": 9600 }
```

- `released` — number of payments transferred to caregivers
- `totalCents` — total cents sent out (amount minus fee)

**If `released` is 0**, check:

1. The payment `status` is `completed` — run Option B from Step 2 if not
2. The `created_at` is backdated — run the SQL from Step 3 if not
3. The caregiver has a `stripe_connect_account_id` — complete Connect onboarding (Prerequisite 3)
4. There is no open dispute on the job — check:

```sql
SELECT * FROM disputes WHERE status = 'open';
```

After this step, the payment row should have `released_at` populated:

```sql
SELECT id, status, created_at, released_at FROM payments ORDER BY created_at DESC LIMIT 5;
```

---

## Step 5 — Verify in the UI

### Client side
Log in as the client and go to **Billing**. The payment should appear in payment history with status **Released**.

### Caregiver side
Log in as the caregiver and go to **Payouts**. The payment should appear with a **Released** badge and a `released_at` timestamp.

---

## Bonus: Testing the Dispute Flow

To test the dispute path within the same cycle:

1. After Step 2 (payment is `completed`), open a dispute from the client billing page before running Step 4
2. Run the payout-sweep — the payment should be **skipped** (dispute is open)
3. Resolve the dispute (withdraw it from the client side, or wait for the auto-resolve cron)
4. Re-run the payout-sweep — the payment should now be released

### Auto-resolve cron (14-day timeout)

Disputes auto-resolve after 14 days. To test this today, backdate the dispute:

```sql
UPDATE disputes
SET created_at = NOW() - INTERVAL '15 days'
WHERE status = 'open';
```

Then trigger the resolve-disputes cron:

```bash
curl -X POST http://localhost:3000/api/cron/resolve-disputes \
  -H "Authorization: Bearer dev-cron-secret"
```

Expected response: `{ "resolved": 1 }`

After that, re-run the payout-sweep (Step 4) — the payment is no longer blocked and will be released.

---

## Quick Reference

| Step | Command | What it does |
|------|---------|--------------|
| Weekly billing | `POST /api/cron/weekly-billing` | Charges client, creates `payment` with `status=pending` |
| Webhook (manual) | SQL: `UPDATE payments SET status='completed'` | Simulates Stripe confirming payment |
| Backdate payment | SQL: `UPDATE payments SET created_at = NOW() - INTERVAL '8 days'` | Bypasses 7-day escrow hold |
| Payout sweep | `POST /api/cron/payout-sweep` | Transfers net amount to caregiver Connect account |
| Auto-resolve disputes | `POST /api/cron/resolve-disputes` | Resolves disputes older than 14 days |

All cron routes require: `Authorization: Bearer dev-cron-secret` (since `CRON_SECRET` is not set in `.env.local`).
