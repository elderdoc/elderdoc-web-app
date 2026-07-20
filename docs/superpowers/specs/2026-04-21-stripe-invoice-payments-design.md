# Stripe Customer + Invoice Payments — Design Spec

## Goal

Replace the current Stripe PaymentIntent flow with Stripe Invoices so that the Trust & Support fee appears as a native line item on the Stripe receipt and Invoice PDF. Clients save a card once via SetupIntent; all future payments charge that saved card automatically via invoice.

## Architecture

```
Client (first visit to billing)
  → createSetupIntent() server action
  → Client enters card via <SetupElement> (Stripe Elements)
  → Card saved to Stripe Customer (off_session usage)
  → stripeCustomerId stored on users table

Client clicks "Record Payment"
  → recordInvoicePayment(jobId, subtotalCents, feeCents)
  → Server creates InvoiceItem: "Care service" = subtotal
  → Server creates InvoiceItem: "Trust & Support fee (1%)" = fee
  → Server creates Invoice → finalizes → pays with saved card
  → payments row inserted: stripeInvoiceId + stripePaymentIntentId stored
  → Webhook: invoice.payment_succeeded → status = 'completed'

Client/Caregiver opens payment card
  → /api/receipt/[invoiceId] fetches Stripe invoice_pdf URL
  → Embedded in iframe (native line items, no HTML injection)
  → Download = Stripe's own Invoice PDF
```

## Tech Stack

- Stripe Node SDK (`stripe` package, already installed)
- `@stripe/react-stripe-js` + `@stripe/stripe-js` (already installed)
- Next.js App Router server actions + API routes
- Drizzle ORM (postgres)
- Vercel (deployment, no cron needed for this phase)

---

## Schema Changes

### `users` table
```sql
ALTER TABLE users ADD COLUMN stripe_customer_id text;
```

### `payments` table
```sql
ALTER TABLE payments ADD COLUMN stripe_invoice_id text;
```

`stripePaymentIntentId` stays — Stripe Invoices generate a PaymentIntent internally, and legacy payments reference it directly.

---

## Stripe Service Layer (`services/stripe.ts`)

### New functions

**`createStripeCustomer(email: string, name: string)`**
- `stripe.customers.create({ email, name })`
- Returns `{ id: string }`

**`createSetupIntent(customerId: string)`**
- `stripe.setupIntents.create({ customer: customerId, usage: 'off_session' })`
- Returns `{ clientSecret: string }`

**`savePaymentMethodToCustomer(customerId: string, paymentMethodId: string)`**
- `stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })`
- `stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } })`

**`getDefaultPaymentMethod(customerId: string)`**
- `stripe.customers.retrieve(customerId, { expand: ['default_source', 'invoice_settings.default_payment_method'] })`
- Returns `{ brand: string, last4: string } | null`

**`createAndPayInvoice(customerId, jobId, subtotalCents, feeCents)`**
- `stripe.invoiceItems.create({ customer, amount: subtotalCents, currency: 'usd', description: 'Care service', metadata: { jobId } })`
- `stripe.invoiceItems.create({ customer, amount: feeCents, currency: 'usd', description: 'Trust & Support fee (1%)' })`
- `stripe.invoices.create({ customer, auto_advance: false, metadata: { jobId } })`
- `stripe.invoices.finalizeInvoice(invoiceId)`
- `stripe.invoices.pay(invoiceId)`
- Returns `{ invoiceId, invoicePdfUrl, paymentIntentId }`

**`getInvoicePdfUrl(invoiceId: string)`**
- `stripe.invoices.retrieve(invoiceId)`
- Returns `{ pdfUrl: string, hostedUrl: string }`

### Unchanged
- `createPaymentIntent` — kept for legacy payment backward compatibility
- `getPaymentIntentCharge` — kept for legacy receipt display
- `createConnectAccount`, `createConnectAccountLink`, `transferPayout` — used in Sub-project 2

---

## Server Actions (`domains/payments/actions.ts`)

### New actions

**`getOrCreateStripeCustomer()`**
1. Auth check → get `session.user.id`
2. Query `users.stripeCustomerId` for this user
3. If exists → return it
4. Else → `createStripeCustomer(email, name)` → `db.update(users).set({ stripeCustomerId })` → return id

**`createSetupIntent()`**
1. `getOrCreateStripeCustomer()`
2. `createSetupIntent(customerId)`
3. Return `{ clientSecret }`

**`saveDefaultPaymentMethod(paymentMethodId: string)`**
1. `getOrCreateStripeCustomer()`
2. `savePaymentMethodToCustomer(customerId, paymentMethodId)`
3. Return `{}`

**`getSavedCard()`**
1. Auth check — if no `stripeCustomerId` on user, return `null`
2. `getDefaultPaymentMethod(customerId)`
3. Return `{ brand, last4 } | null`

**`recordInvoicePayment(jobId, subtotalCents, feeCents)`**
1. Auth check + verify `jobs.clientId = session.user.id`
2. `getOrCreateStripeCustomer()`
3. Verify saved payment method exists — return error if not
4. `createAndPayInvoice(customerId, jobId, subtotalCents, feeCents)`
5. `db.insert(payments).values({ jobId, amount, fee, method: 'stripe', status: 'pending', stripeInvoiceId, stripePaymentIntentId })`
6. `revalidatePath('/client/dashboard/billing')`
7. Return `{ invoiceId }`

### Unchanged
- `initiateStripePayment` — kept, marked deprecated in comments, handles legacy rows
- `completeShift`, `setupStripeConnect`, `fetchStripeChargeDetails*` — no change

---

## UI Changes

### 1. Saved card banner (`billing/page.tsx` + new `_components/saved-card-banner.tsx`)

Server component fetches `getSavedCard()`. Renders above Active Jobs:

- **Card saved:** `Visa ···· 4242  [Change card]`
- **No card:** `[+ Add payment method]` button

### 2. Add/Change card modal (`_components/add-card-modal.tsx`)

Client component:
1. On mount: calls `createSetupIntent()` → gets `clientSecret`
2. Renders `<Elements>` with `clientSecret` + `<SetupElement />`
3. On submit: `stripe.confirmSetup()` → on success: `saveDefaultPaymentMethod(paymentMethodId)` → `router.refresh()`
4. Closes modal

### 3. Record Payment modal (`_components/record-payment-modal.tsx`)

Changes:
- Remove `<PaymentElement>` and `<Elements>` wrapper
- Remove `loadStripe` / Stripe form
- Add "Charging [brand] ···· [last4]" confirmation line (props passed from server)
- Pay button calls `recordInvoicePayment()` server action directly
- If no saved card: show "Add a payment method first" and disable Pay button

### 4. Receipt route (`app/api/receipt/[invoiceId]/route.ts`)

- Accept both invoice IDs (`in_`) and legacy payment intent IDs (`pi_`)
- For `in_` prefix: `getInvoicePdfUrl(invoiceId)` → proxy Stripe's `invoice_pdf` URL
- For `pi_` prefix: existing `getPaymentIntentCharge` flow (backward compat)
- No HTML injection for invoice receipts — Stripe's PDF natively has both line items
- Download = Stripe's Invoice PDF served directly

### 5. Payment history cards

- `stripeInvoiceId` added to `PaymentRow` type and both query selects
- Cards pass `stripeInvoiceId` to receipt route (preferred over `stripePaymentIntentId` when present)

---

## Webhook Updates (`app/api/webhooks/stripe/route.ts`)

### New handlers

**`invoice.payment_succeeded`**
```
extract: invoiceId = event.data.object.id
db.update(payments).set({ status: 'completed' }).where(stripeInvoiceId = invoiceId)
revalidatePath('/client/dashboard/billing')
```

**`invoice.payment_failed`**
```
extract: invoiceId = event.data.object.id
db.update(payments).set({ status: 'failed' }).where(stripeInvoiceId = invoiceId)
```

### Existing handlers (unchanged logic, guarded against double-update)

**`payment_intent.succeeded`**
- Only updates rows where `stripeInvoiceId IS NULL` (legacy payments)
- Prevents double-update when invoice webhook also fires

**`payment_intent.payment_failed`**
- Same guard: only updates legacy rows

---

## Migration

- Existing `payments` rows with `stripePaymentIntentId` and no `stripeInvoiceId` continue to work via legacy code paths
- No data migration needed — both code paths coexist
- New payments always go through `recordInvoicePayment` and get `stripeInvoiceId`

---

## Out of Scope (Sub-projects 2 and 3)

- Caregiver Connect onboarding (Sub-project 2)
- Weekly escrow billing engine (Sub-project 3)
- Dispute flow
- Cancellation refund logic
- Cron jobs
