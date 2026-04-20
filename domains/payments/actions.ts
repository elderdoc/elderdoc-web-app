'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { payments, jobs, shifts, caregiverProfiles, users, disputes, notifications } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { calculateShiftHours } from '@/lib/shift-utils'
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

export async function initiateStripePayment(jobId: string, amount: number) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const intent = await createPaymentIntent(amount, jobId)
  const clientSecret =
    'clientSecret' in intent && intent.clientSecret != null
      ? intent.clientSecret
      : 'client_secret' in intent && (intent as { client_secret?: string | null }).client_secret != null
        ? (intent as { client_secret?: string | null }).client_secret ?? undefined
        : undefined
  return { clientSecret }
}

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

export async function fetchStripeChargeDetailsForClient(
  paymentIntentId: string,
): Promise<StripeChargeDetails | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const paymentRow = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .where(
      and(
        eq(payments.stripePaymentIntentId, paymentIntentId),
        eq(jobs.clientId, session.user.id),
      ),
    )
    .limit(1)
    .offset(0)
  if (paymentRow.length === 0) return null

  return getPaymentIntentCharge(paymentIntentId)
}

export async function fetchStripeChargeDetails(
  paymentIntentId: string,
): Promise<StripeChargeDetails | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })
  if (!profile) return null

  const paymentRow = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .where(
      and(
        eq(payments.stripePaymentIntentId, paymentIntentId),
        eq(jobs.caregiverId, profile.id),
      ),
    )
    .limit(1)
    .offset(0)
  if (paymentRow.length === 0) return null

  return getPaymentIntentCharge(paymentIntentId)
}

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
