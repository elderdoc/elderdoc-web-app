# Stripe Invoice Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Stripe PaymentIntent flow with Stripe Invoices so the Trust & Support fee appears as a native line item, clients save a card once via SetupIntent, and all future payments charge that saved card automatically.

**Architecture:** Clients get a Stripe Customer on first payment, save a card via SetupIntent, then all payments go through `createAndPayInvoice` which creates two InvoiceItems (care service + Trust & Support fee) and pays the resulting Invoice with the saved card. Webhooks update payment status on `invoice.payment_succeeded` / `invoice.payment_failed`. Legacy PaymentIntent rows continue to work unchanged.

**Tech Stack:** Stripe Node SDK, @stripe/react-stripe-js, @stripe/stripe-js, Next.js App Router server actions, Drizzle ORM, postgres-js

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `db/schema.ts` | Modify | Add `stripeCustomerId` to users, `stripeInvoiceId` to payments |
| `services/stripe.ts` | Modify | Add 5 new Stripe functions |
| `domains/payments/actions.ts` | Modify | Add 5 new server actions, guard legacy webhook handler |
| `domains/payments/queries.ts` | Modify | Add `stripeInvoiceId` to `PaymentRow` + both queries |
| `app/api/webhooks/stripe/route.ts` | Modify | Add invoice handlers, guard legacy PI handlers |
| `app/(client)/client/dashboard/billing/_components/saved-card-banner.tsx` | Create | Shows saved card or "Add payment method" |
| `app/(client)/client/dashboard/billing/_components/add-card-modal.tsx` | Create | SetupIntent + SetupElement flow |
| `app/(client)/client/dashboard/billing/_components/record-payment-modal.tsx` | Modify | Remove PaymentElement, use saved card |
| `app/(client)/client/dashboard/billing/_components/billing-client.tsx` | Modify | Accept + pass `savedCard` prop |
| `app/(client)/client/dashboard/billing/_components/payment-history-card.tsx` | Modify | Use `stripeInvoiceId` for receipt when available |
| `app/(client)/client/dashboard/billing/page.tsx` | Modify | Fetch saved card server-side, pass to BillingClient |
| `app/api/receipt/[receiptId]/route.ts` | Create (rename) | Handle both `in_` (invoice) and `pi_` (legacy) prefixes |

---

## Task 1: Schema — add stripeCustomerId + stripeInvoiceId

**Files:**
- Modify: `db/schema.ts`
- Run: psql migration

- [ ] **Step 1: Add columns to schema.ts**

Open `db/schema.ts`. Find the `users` table (line 7) and add `stripeCustomerId` after `password`:

```typescript
export const users = pgTable('users', {
  id:               uuid('id').defaultRandom().primaryKey(),
  email:            text('email').notNull().unique(),
  name:             text('name'),
  image:            text('image'),
  phone:            text('phone'),
  role:             text('role', { enum: ['client', 'caregiver'] }),
  password:         text('password'),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
})
```

Find the `payments` table (line 214) and add `stripeInvoiceId` after `stripePaymentIntentId`:

```typescript
export const payments = pgTable('payments', {
  id:                    uuid('id').defaultRandom().primaryKey(),
  jobId:                 uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  amount:                numeric('amount', { precision: 10, scale: 2 }).notNull(),
  fee:                   numeric('fee', { precision: 10, scale: 2 }).notNull().default('0'),
  method:                text('method', { enum: ['stripe'] }).notNull().default('stripe'),
  status:                text('status', { enum: ['pending', 'completed', 'failed'] }).default('pending'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeInvoiceId:       text('stripe_invoice_id'),
  createdAt:             timestamp('created_at').defaultNow().notNull(),
})
```

- [ ] **Step 2: Run migration**

```bash
DATABASE_URL=postgres://elderdoc:elderdoc@localhost:5432/elderdoc psql postgres://elderdoc:elderdoc@localhost:5432/elderdoc -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text; ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_invoice_id text;"
```

Expected output:
```
ALTER TABLE
ALTER TABLE
```

- [ ] **Step 3: Verify columns exist**

```bash
DATABASE_URL=postgres://elderdoc:elderdoc@localhost:5432/elderdoc psql postgres://elderdoc:elderdoc@localhost:5432/elderdoc -c "\d users" | grep stripe
DATABASE_URL=postgres://elderdoc:elderdoc@localhost:5432/elderdoc psql postgres://elderdoc:elderdoc@localhost:5432/elderdoc -c "\d payments" | grep stripe
```

Expected: `stripe_customer_id` in users output, both `stripe_payment_intent_id` and `stripe_invoice_id` in payments output.

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts
git commit -m "feat: add stripeCustomerId to users and stripeInvoiceId to payments"
```

---

## Task 2: Stripe service layer — new functions

**Files:**
- Modify: `services/stripe.ts`

- [ ] **Step 1: Add 5 new exported functions at the bottom of services/stripe.ts**

Append after the existing `getPaymentIntentCharge` function:

```typescript
export async function createStripeCustomer(email: string, name: string) {
  if (MOCK_MODE) return { id: `mock_cus_${email.replace(/\W/g, '')}` }
  return getStripe().customers.create({ email, name })
}

export async function createSetupIntent(customerId: string) {
  if (MOCK_MODE) return { client_secret: 'mock_seti_secret' }
  return getStripe().setupIntents.create({
    customer: customerId,
    usage: 'off_session',
  })
}

export async function savePaymentMethodToCustomer(customerId: string, paymentMethodId: string) {
  if (MOCK_MODE) return
  await getStripe().paymentMethods.attach(paymentMethodId, { customer: customerId })
  await getStripe().customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  })
}

export interface SavedCard {
  brand: string
  last4: string
}

export async function getDefaultPaymentMethod(customerId: string): Promise<SavedCard | null> {
  if (MOCK_MODE) return { brand: 'visa', last4: '4242' }
  const customer = await getStripe().customers.retrieve(customerId, {
    expand: ['invoice_settings.default_payment_method'],
  }) as import('stripe').Stripe.Customer
  const pm = customer.invoice_settings?.default_payment_method
  if (!pm || typeof pm === 'string') return null
  const card = (pm as import('stripe').Stripe.PaymentMethod).card
  if (!card) return null
  return { brand: card.brand, last4: card.last4 }
}

export interface InvoiceResult {
  invoiceId: string
  invoicePdfUrl: string | null
  hostedInvoiceUrl: string | null
  paymentIntentId: string | null
}

export async function createAndPayInvoice(
  customerId: string,
  jobId: string,
  subtotalCents: number,
  feeCents: number,
): Promise<InvoiceResult> {
  if (MOCK_MODE) {
    return {
      invoiceId: `mock_in_${jobId}`,
      invoicePdfUrl: null,
      hostedInvoiceUrl: null,
      paymentIntentId: `mock_pi_inv_${jobId}`,
    }
  }
  await getStripe().invoiceItems.create({
    customer: customerId,
    amount: subtotalCents,
    currency: 'usd',
    description: 'Care service',
    metadata: { jobId },
  })
  await getStripe().invoiceItems.create({
    customer: customerId,
    amount: feeCents,
    currency: 'usd',
    description: 'Trust & Support fee (1%)',
    metadata: { jobId },
  })
  const invoice = await getStripe().invoices.create({
    customer: customerId,
    auto_advance: false,
    metadata: { jobId },
  })
  const finalized = await getStripe().invoices.finalizeInvoice(invoice.id)
  const paid = await getStripe().invoices.pay(finalized.id)
  return {
    invoiceId: paid.id,
    invoicePdfUrl: paid.invoice_pdf ?? null,
    hostedInvoiceUrl: paid.hosted_invoice_url ?? null,
    paymentIntentId: typeof paid.payment_intent === 'string'
      ? paid.payment_intent
      : paid.payment_intent?.id ?? null,
  }
}

export async function getInvoicePdfUrl(invoiceId: string): Promise<{ pdfUrl: string | null; hostedUrl: string | null }> {
  if (MOCK_MODE || invoiceId.startsWith('mock_in_')) return { pdfUrl: null, hostedUrl: null }
  const invoice = await getStripe().invoices.retrieve(invoiceId)
  return {
    pdfUrl: invoice.invoice_pdf ?? null,
    hostedUrl: invoice.hosted_invoice_url ?? null,
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "services/stripe"
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add services/stripe.ts
git commit -m "feat: add Stripe Customer, SetupIntent, and Invoice service functions"
```

---

## Task 3: Server actions — customer, setup, and invoice payment

**Files:**
- Modify: `domains/payments/actions.ts`

- [ ] **Step 1: Update imports at top of domains/payments/actions.ts**

Replace the existing import block:

```typescript
'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { payments, jobs, shifts, caregiverProfiles, users } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import {
  createPaymentIntent,
  createConnectAccount,
  createConnectAccountLink,
  getPaymentIntentCharge,
  createStripeCustomer,
  createSetupIntent as stripeCreateSetupIntent,
  savePaymentMethodToCustomer,
  getDefaultPaymentMethod,
  createAndPayInvoice,
  type StripeChargeDetails,
  type SavedCard,
} from '@/services/stripe'
```

- [ ] **Step 2: Add getOrCreateStripeCustomer helper**

Add after the imports, before `initiateStripePayment`:

```typescript
async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const userRow = await db
    .select({ stripeCustomerId: users.stripeCustomerId, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .offset(0)

  if (!userRow[0]) throw new Error('User not found')
  if (userRow[0].stripeCustomerId) return userRow[0].stripeCustomerId

  const customer = await createStripeCustomer(userRow[0].email ?? '', userRow[0].name ?? '')
  await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId))
  return customer.id
}
```

- [ ] **Step 3: Add 4 new exported server actions**

Add these after `initiateStripePayment` (keep `initiateStripePayment` unchanged):

```typescript
export async function createPaymentSetupIntent(): Promise<{ clientSecret?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }
  const customerId = await getOrCreateStripeCustomer(session.user.id)
  const intent = await stripeCreateSetupIntent(customerId)
  return { clientSecret: intent.client_secret ?? undefined }
}

export async function saveDefaultPaymentMethod(
  paymentMethodId: string,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }
  const customerId = await getOrCreateStripeCustomer(session.user.id)
  await savePaymentMethodToCustomer(customerId, paymentMethodId)
  revalidatePath('/client/dashboard/billing')
  return {}
}

export async function getSavedCard(): Promise<{ card?: SavedCard; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }
  const userRow = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .offset(0)
  if (!userRow[0]?.stripeCustomerId) return { card: undefined }
  const card = await getDefaultPaymentMethod(userRow[0].stripeCustomerId)
  return { card: card ?? undefined }
}

export async function recordInvoicePayment(
  jobId: string,
  subtotalCents: number,
  feeCents: number,
): Promise<{ invoiceId?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const existing = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, session.user.id)))
    .limit(1)
    .offset(0)
  if (existing.length === 0) return { error: 'Job not found' }

  const customerId = await getOrCreateStripeCustomer(session.user.id)

  const userRow = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .offset(0)
  const savedCard = userRow[0]?.stripeCustomerId
    ? await getDefaultPaymentMethod(userRow[0].stripeCustomerId)
    : null
  if (!savedCard) return { error: 'No saved payment method. Please add a card first.' }

  const result = await createAndPayInvoice(customerId, jobId, subtotalCents, feeCents)

  await db.insert(payments).values({
    jobId,
    amount: String(subtotalCents / 100),
    fee: String(feeCents / 100),
    method: 'stripe',
    status: 'pending',
    stripeInvoiceId: result.invoiceId,
    stripePaymentIntentId: result.paymentIntentId ?? undefined,
  })

  revalidatePath('/client/dashboard/billing')
  return { invoiceId: result.invoiceId }
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "domains/payments/actions"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add domains/payments/actions.ts
git commit -m "feat: add getOrCreateStripeCustomer, createPaymentSetupIntent, recordInvoicePayment actions"
```

---

## Task 4: Queries — add stripeInvoiceId to PaymentRow

**Files:**
- Modify: `domains/payments/queries.ts`

- [ ] **Step 1: Add stripeInvoiceId to PaymentRow interface**

```typescript
export interface PaymentRow {
  paymentId: string
  jobId: string
  careType: string
  caregiverName: string | null
  clientName: string | null
  amount: number
  fee: number
  method: string
  status: string
  stripePaymentIntentId: string | null
  stripeInvoiceId: string | null
  createdAt: Date
}
```

- [ ] **Step 2: Add stripeInvoiceId to getClientPayments select**

In `getClientPayments`, add to the `.select({})` block:
```typescript
stripeInvoiceId: payments.stripeInvoiceId,
```

And in the `.map()`:
```typescript
stripeInvoiceId: r.stripeInvoiceId ?? null,
```

- [ ] **Step 3: Add stripeInvoiceId to getCaregiverPayments select**

In `getCaregiverPayments`, same change — add to `.select({})`:
```typescript
stripeInvoiceId: payments.stripeInvoiceId,
```

And in the `.map()`:
```typescript
stripeInvoiceId: r.stripeInvoiceId ?? null,
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "queries"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add domains/payments/queries.ts
git commit -m "feat: add stripeInvoiceId to PaymentRow and both payment queries"
```

---

## Task 5: Webhooks — invoice handlers + legacy guard

**Files:**
- Modify: `app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Replace the full webhook handler**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/services/db'
import { payments } from '@/db/schema'
import { eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_stub')
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      await db
        .update(payments)
        .set({ status: 'completed' })
        .where(eq(payments.stripeInvoiceId, invoice.id))
      revalidatePath('/client/dashboard/billing')
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await db
        .update(payments)
        .set({ status: 'failed' })
        .where(eq(payments.stripeInvoiceId, invoice.id))
      break
    }

    // Legacy: only update rows that have no stripeInvoiceId (old PaymentIntent payments)
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent
      await db
        .update(payments)
        .set({ status: 'completed' })
        .where(eq(payments.stripePaymentIntentId, intent.id))
      break
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent
      await db
        .update(payments)
        .set({ status: 'failed' })
        .where(eq(payments.stripePaymentIntentId, intent.id))
      break
    }

    case 'account.updated':
    case 'transfer.created':
    case 'payout.paid':
    case 'payout.failed':
      break
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "webhooks"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "feat: add invoice.payment_succeeded/failed webhook handlers"
```

---

## Task 6: Add card modal — SetupIntent + SetupElement

**Files:**
- Create: `app/(client)/client/dashboard/billing/_components/add-card-modal.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { createPaymentSetupIntent, saveDefaultPaymentMethod } from '@/domains/payments/actions'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface Props {
  stripePublishableKey: string
  onClose: () => void
}

function SetupForm({ onClose }: { onClose: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setIsPending(true)
    setError(null)

    const { error: submitErr } = await elements.submit()
    if (submitErr) {
      setError(submitErr.message ?? 'Failed to save card')
      setIsPending(false)
      return
    }

    const { error: confirmErr, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    })

    if (confirmErr) {
      setError(confirmErr.message ?? 'Failed to save card')
      setIsPending(false)
      return
    }

    const pmId = typeof setupIntent?.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent?.payment_method?.id

    if (pmId) {
      const result = await saveDefaultPaymentMethod(pmId)
      if (result.error) {
        setError(result.error)
        setIsPending(false)
        return
      }
    }

    router.refresh()
    onClose()
    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
          className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !stripe}
          className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save card'}
        </button>
      </div>
    </form>
  )
}

export function AddCardModal({ stripePublishableKey, onClose }: Props) {
  const stripePromise = loadStripe(stripePublishableKey)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createPaymentSetupIntent().then((result) => {
      if (result.error) setError(result.error)
      else setClientSecret(result.clientSecret ?? null)
    })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-sm">
        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Add payment method</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!clientSecret && !error && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: 'stripe' } }}
            >
              <SetupForm onClose={onClose} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "add-card-modal"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/\(client\)/client/dashboard/billing/_components/add-card-modal.tsx
git commit -m "feat: add AddCardModal with Stripe SetupIntent and SetupElement"
```

---

## Task 7: Saved card banner

**Files:**
- Create: `app/(client)/client/dashboard/billing/_components/saved-card-banner.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { AddCardModal } from './add-card-modal'

interface Props {
  savedCard: { brand: string; last4: string } | null
  stripePublishableKey: string
}

export function SavedCardBanner({ savedCard, stripePublishableKey }: Props) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      {showModal && (
        <AddCardModal
          stripePublishableKey={stripePublishableKey}
          onClose={() => setShowModal(false)}
        />
      )}
      <div className="mb-8 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          {savedCard ? (
            <span className="text-sm">
              <span className="capitalize font-medium">{savedCard.brand}</span>
              {' '}···· {savedCard.last4}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">No payment method saved</span>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted"
        >
          {savedCard ? 'Change card' : 'Add payment method'}
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "saved-card-banner"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/\(client\)/client/dashboard/billing/_components/saved-card-banner.tsx
git commit -m "feat: add SavedCardBanner showing saved card or add-card prompt"
```

---

## Task 8: Simplify Record Payment modal — use saved card

**Files:**
- Modify: `app/(client)/client/dashboard/billing/_components/record-payment-modal.tsx`

- [ ] **Step 1: Replace full file contents**

```typescript
'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { recordInvoicePayment } from '@/domains/payments/actions'
import { useRouter } from 'next/navigation'

interface Props {
  jobId: string
  jobLabel: string
  savedCard: { brand: string; last4: string } | null
  onClose: () => void
}

const FEE_RATE = 0.01

export function RecordPaymentModal({ jobId, jobLabel, savedCard, onClose }: Props) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [showFeeInfo, setShowFeeInfo] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotalCents = Math.round(parseFloat(amount) * 100)
  const amountValid = !isNaN(subtotalCents) && subtotalCents > 0
  const feeCents = amountValid ? Math.round(subtotalCents * FEE_RATE) : 0
  const totalCents = subtotalCents + feeCents

  async function handlePay() {
    if (!amountValid || !savedCard) return
    setIsPending(true)
    setError(null)
    const result = await recordInvoicePayment(jobId, subtotalCents, feeCents)
    if (result.error) {
      setError(result.error)
      setIsPending(false)
      return
    }
    router.refresh()
    onClose()
    setIsPending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-card rounded-xl border border-border shadow-lg w-full max-h-[90vh] overflow-y-auto transition-all ${amountValid ? 'max-w-md' : 'max-w-sm'}`}>
        <div className="p-6 flex flex-col gap-5">

          <div>
            <h2 className="text-lg font-semibold mb-0.5">Record Payment</h2>
            <p className="text-sm text-muted-foreground">{jobLabel}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
              Amount for caregiver (USD)
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

          {amountValid && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal (to caregiver)</span>
                <span className="font-medium">${(subtotalCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1">
                  Trust &amp; Support Fee (1%)
                  <button
                    type="button"
                    onClick={() => setShowFeeInfo((v) => !v)}
                    className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label="What is the Trust & Support fee?"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </span>
                <span className="font-medium">${(feeCents / 100).toFixed(2)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="font-semibold">${(totalCents / 100).toFixed(2)}</span>
              </div>

              {showFeeInfo && (
                <div className="mt-3 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">What&apos;s the Trust &amp; Support Fee?</p>
                  <p>
                    ElderDoc applies a Trust &amp; Support fee to all invoices. Expenses and reimbursements are not subject
                    to this fee. You&apos;ll see this fee as a separate item on your receipt once the task is complete.
                  </p>
                  <p>This fee helps to support:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>The ElderDoc Pledge.</li>
                    <li>Operational and safety measures to protect users.</li>
                    <li>Investment in our Customer Support Team.</li>
                    <li>Tools, team training, and channels to support you in getting your task completed.</li>
                  </ul>
                  <p>All expenses and tips go directly to your caregiver.</p>
                </div>
              )}

              {savedCard && (
                <div className="flex items-center justify-between pt-1 border-t border-border mt-2">
                  <span className="text-muted-foreground text-xs">Charging</span>
                  <span className="text-xs font-medium capitalize">
                    {savedCard.brand} ···· {savedCard.last4}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          {!savedCard && (
            <p className="text-xs text-destructive">Add a payment method before recording a payment.</p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handlePay}
              disabled={!amountValid || !savedCard || isPending}
              className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Processing…' : amountValid ? `Pay $${(totalCents / 100).toFixed(2)}` : 'Enter amount first'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "record-payment-modal"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/\(client\)/client/dashboard/billing/_components/record-payment-modal.tsx
git commit -m "feat: simplify RecordPaymentModal to use saved card via recordInvoicePayment"
```

---

## Task 9: Wire BillingClient — pass savedCard prop

**Files:**
- Modify: `app/(client)/client/dashboard/billing/_components/billing-client.tsx`

- [ ] **Step 1: Replace full file contents**

```typescript
'use client'

import { useState } from 'react'
import { RecordPaymentModal } from './record-payment-modal'
import { SavedCardBanner } from './saved-card-banner'
import type { PaymentRow } from '@/domains/payments/queries'

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
}

export function BillingClient({ paymentRows, activeJobs, savedCard, stripePublishableKey }: Props) {
  const [modalJobId, setModalJobId] = useState<string | null>(null)
  const modalJob = activeJobs.find((j) => j.jobId === modalJobId)

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
                <button
                  onClick={() => setModalJobId(job.jobId)}
                  className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Record Payment
                </button>
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
              <PaymentHistoryCardWrapper key={row.paymentId} row={row} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function PaymentHistoryCardWrapper({ row }: { row: PaymentRow }) {
  const { PaymentHistoryCard } = require('./payment-history-card')
  return (
    <PaymentHistoryCard
      careType={row.careType}
      caregiverName={row.caregiverName}
      method={row.method}
      amount={row.amount}
      fee={row.fee}
      status={row.status}
      stripePaymentIntentId={row.stripePaymentIntentId}
      stripeInvoiceId={row.stripeInvoiceId}
      createdAt={row.createdAt}
    />
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "billing-client"
```

Expected: no output (the `require` is intentional to avoid circular type issues — if tsc complains about require, use a direct import instead).

**Fix if tsc errors on require:** Replace the `PaymentHistoryCardWrapper` with a direct import at top of file:
```typescript
import { PaymentHistoryCard } from './payment-history-card'
```
And render `<PaymentHistoryCard ... />` directly in the map.

- [ ] **Step 3: Commit**

```bash
git add app/\(client\)/client/dashboard/billing/_components/billing-client.tsx
git commit -m "feat: wire BillingClient with savedCard prop and SavedCardBanner"
```

---

## Task 10: Billing page — fetch savedCard server-side

**Files:**
- Modify: `app/(client)/client/dashboard/billing/page.tsx`

- [ ] **Step 1: Replace full file contents**

```typescript
import { requireRole } from '@/domains/auth/session'
import { getClientPayments } from '@/domains/payments/queries'
import { db } from '@/services/db'
import { jobs, careRequests, caregiverProfiles, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getDefaultPaymentMethod } from '@/services/stripe'
import { BillingClient } from './_components/billing-client'

export default async function ClientBillingPage() {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [paymentRows, activeJobs, userRow] = await Promise.all([
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
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "billing/page"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/\(client\)/client/dashboard/billing/page.tsx
git commit -m "feat: fetch savedCard server-side on billing page"
```

---

## Task 11: Receipt route — support invoice IDs (in_)

**Files:**
- Create: `app/api/receipt/[receiptId]/route.ts`
- The existing `app/api/receipt/[paymentIntentId]/route.ts` stays for backward compat — rename the folder

- [ ] **Step 1: Rename the existing receipt route folder**

```bash
mv "app/api/receipt/[paymentIntentId]" "app/api/receipt/[receiptId]"
```

- [ ] **Step 2: Replace the route handler to support both in_ and pi_ prefixes**

Open `app/api/receipt/[receiptId]/route.ts` and replace in full:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/services/db'
import { payments, jobs, caregiverProfiles } from '@/db/schema'
import { eq, and, or } from 'drizzle-orm'
import { getPaymentIntentCharge, getInvoicePdfUrl } from '@/services/stripe'

async function authorizeByInvoice(invoiceId: string, userId: string): Promise<boolean> {
  const clientRow = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .where(and(eq(payments.stripeInvoiceId, invoiceId), eq(jobs.clientId, userId)))
    .limit(1).offset(0)
  if (clientRow.length > 0) return true

  const profile = await db.query.caregiverProfiles.findFirst({ where: eq(caregiverProfiles.userId, userId) })
  if (!profile) return false

  const cgRow = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .where(and(eq(payments.stripeInvoiceId, invoiceId), eq(jobs.caregiverId, profile.id)))
    .limit(1).offset(0)
  return cgRow.length > 0
}

async function authorizeByIntent(intentId: string, userId: string): Promise<boolean> {
  const clientRow = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .where(and(eq(payments.stripePaymentIntentId, intentId), eq(jobs.clientId, userId)))
    .limit(1).offset(0)
  if (clientRow.length > 0) return true

  const profile = await db.query.caregiverProfiles.findFirst({ where: eq(caregiverProfiles.userId, userId) })
  if (!profile) return false

  const cgRow = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .where(and(eq(payments.stripePaymentIntentId, intentId), eq(jobs.caregiverId, profile.id)))
    .limit(1).offset(0)
  return cgRow.length > 0
}

function buildCleanHtml(raw: string): string {
  let html = raw
  html = html.replace(/Something wrong with the email\?[\s\S]*?<\/[^>]+>/gi, '')
  html = html.replace(/<(?:p|div|td)[^>]*>(?:(?!<\/(?:p|div|td)>)[\s\S])*?You(?:'|&#39;|&apos;|\u2019|')re receiving this email because[\s\S]*?<\/(?:p|div|td)>/gi, '')
  html = html.replace(/to provide invoicing and payment processing\.?\s*/gi, '')
  return html
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

  const { receiptId } = await params
  const download = req.nextUrl.searchParams.get('download') === '1'

  if (receiptId.startsWith('mock_')) {
    return new NextResponse('Receipt not available for test payments.', { status: 404 })
  }

  const isInvoice = receiptId.startsWith('in_')

  // Authorization
  const allowed = isInvoice
    ? await authorizeByInvoice(receiptId, session.user.id)
    : await authorizeByIntent(receiptId, session.user.id)
  if (!allowed) return new NextResponse('Forbidden', { status: 403 })

  if (isInvoice) {
    // Invoice: use Stripe's own PDF — no HTML injection needed, fee is native
    const { pdfUrl, hostedUrl } = await getInvoicePdfUrl(receiptId)

    if (download) {
      if (!pdfUrl) return new NextResponse('PDF not available.', { status: 404 })
      const res = await fetch(pdfUrl)
      if (!res.ok) return new NextResponse('Failed to fetch PDF.', { status: 502 })
      const pdf = await res.arrayBuffer()
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${receiptId}.pdf"`,
        },
      })
    }

    // Embed: proxy the hosted invoice HTML
    if (!hostedUrl) return new NextResponse('Invoice not available.', { status: 404 })
    const res = await fetch(hostedUrl)
    if (!res.ok) return new NextResponse('Failed to fetch invoice.', { status: 502 })
    const html = buildCleanHtml(await res.text())
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  // Legacy PaymentIntent path
  const paymentRow = await db
    .select({ fee: payments.fee })
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, receiptId))
    .limit(1).offset(0)
  const feeCents = paymentRow[0] ? Math.round(Number(paymentRow[0].fee) * 100) : 0

  const charge = await getPaymentIntentCharge(receiptId)
  if (!charge.receiptUrl) return new NextResponse('No receipt available.', { status: 404 })

  const rawRes = await fetch(charge.receiptUrl)
  if (!rawRes.ok) return new NextResponse('Failed to fetch receipt.', { status: 502 })
  let html = buildCleanHtml(await rawRes.text())

  // Inject fee row for legacy receipts (not needed for invoices)
  if (feeCents > 0) {
    const feeFormatted = `$${(feeCents / 100).toFixed(2)}`
    const amountPaidPattern = /(<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?Amount paid[\s\S]*?<\/tr>)/i
    const feeRow = `<tr>
      <td style="padding:8px 0;color:#525f7f;font-size:14px;">Trust &amp; Support fee (1%)</td>
      <td style="padding:8px 0;color:#525f7f;font-size:14px;text-align:right;">${feeFormatted}</td>
    </tr>`
    if (amountPaidPattern.test(html)) {
      html = html.replace(amountPaidPattern, `${feeRow}$1`)
    }
  }

  if (download) {
    const puppeteer = await import('puppeteer-core')
    const browser = await puppeteer.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })
      const pdfUint8 = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } })
      return new NextResponse(Buffer.from(pdfUint8), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="receipt-${receiptId}.pdf"`,
        },
      })
    } finally {
      await browser.close()
    }
  }

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
```

- [ ] **Step 3: Update payment-history-card.tsx to prefer stripeInvoiceId**

Open `app/(client)/client/dashboard/billing/_components/payment-history-card.tsx`.

Add `stripeInvoiceId` to the Props interface:
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
  createdAt: Date
}
```

Update the destructure and `receiptSrc` logic:
```typescript
export function PaymentHistoryCard({
  careType, caregiverName, method, amount, fee, status,
  stripePaymentIntentId, stripeInvoiceId, createdAt,
}: Props) {
  // Prefer invoice ID; fall back to payment intent ID for legacy rows
  const receiptRef = stripeInvoiceId ?? stripePaymentIntentId
  const isMock = !receiptRef || receiptRef.startsWith('mock_')
  const receiptSrc = !isMock ? `/api/receipt/${receiptRef}` : null
```

Also update the download link filename:
```typescript
download={`receipt-${receiptRef}.pdf`}
```

- [ ] **Step 4: Update caregiver payment-card.tsx similarly**

Open `app/(caregiver)/caregiver/dashboard/payouts/_components/payment-card.tsx`.

The caregiver card uses `stripePaymentIntentId` only. Since caregiver payments query doesn't yet return `stripeInvoiceId`, add it to the caregiver query in `domains/payments/queries.ts` `getCaregiverPayments` (it's already done in Task 4 — just verify the card component also passes it through). For now the caregiver card can keep using `stripePaymentIntentId` since both columns are populated for invoice payments.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v "test\." | head -20
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add app/api/receipt/ app/\(client\)/client/dashboard/billing/_components/payment-history-card.tsx app/\(caregiver\)/caregiver/dashboard/payouts/_components/payment-card.tsx
git commit -m "feat: receipt route supports invoice IDs (in_) with native Stripe PDF"
```

---

## Task 12: Build verification

- [ ] **Step 1: Full type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v "test\."
```

Expected: no errors outside of pre-existing test file issues.

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 3: Smoke test in browser**

1. Sign in as a client (e.g. Susan Bradley / Password123!)
2. Go to `/client/dashboard/billing`
3. Verify: saved card banner shows "No payment method saved" + "Add payment method" button
4. Click "Add payment method" → modal opens with Stripe card form
5. Enter test card `4242 4242 4242 4242`, any future date, any CVC
6. Click "Save card" → modal closes, banner now shows "Visa ···· 4242"
7. Click "Record Payment" on an active job
8. Enter amount (e.g. 50) → breakdown shows subtotal, 1% fee, total, "Charging Visa ···· 4242"
9. Click Pay → payment recorded
10. Payment history card appears → click to expand → receipt loads in iframe with both line items natively

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: stripe invoice payments — saved card, invoice line items, native receipt PDF"
```
