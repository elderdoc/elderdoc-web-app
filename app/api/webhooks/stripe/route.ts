import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/services/db'
import { payments } from '@/db/schema'
import { eq } from 'drizzle-orm'
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

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await db
          .update(payments)
          .set({ status: 'completed' })
          .where(eq(payments.stripeInvoiceId, invoice.id))
        revalidatePath('/client/dashboard/billing')
        revalidatePath('/caregiver/dashboard/payouts')
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await db
          .update(payments)
          .set({ status: 'failed' })
          .where(eq(payments.stripeInvoiceId, invoice.id))
        revalidatePath('/client/dashboard/billing')
        revalidatePath('/caregiver/dashboard/payouts')
        break
      }

      // Legacy: handles old PaymentIntent-based payments
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
  } catch (err) {
    console.error('[webhook] handler error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
