import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/services/db'
import { payments } from '@/db/schema'
import { eq } from 'drizzle-orm'

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

    case 'account.updated': {
      // Caregiver Connect account status changed — extend here when storing stripeAccountId
      break
    }

    case 'transfer.created':
    case 'payout.paid':
    case 'payout.failed':
      // Logged for now; extend when payout tracking is added
      break
  }

  return NextResponse.json({ received: true })
}
