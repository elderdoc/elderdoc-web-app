'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { payments, jobs, shifts, caregiverProfiles } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import {
  createPaymentIntent,
  createConnectAccount,
  createConnectAccountLink,
} from '@/services/stripe'

export async function recordCashPayment(
  jobId: string,
  amount: number,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const existing = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, session.user.id)))
    .limit(1)
    .offset(0)

  if (existing.length === 0) return { error: 'Not found' }

  await db.insert(payments).values({
    jobId,
    amount: String(amount),
    method: 'cash',
    status: 'pending',
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

  const existing = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, session.user.id)))
    .limit(1)
    .offset(0)

  if (existing.length === 0) return { error: 'Not found' }

  const intent = await createPaymentIntent(amount, jobId)

  await db.insert(payments).values({
    jobId,
    amount: String(amount),
    method: 'stripe',
    status: 'pending',
    stripePaymentIntentId: intent.id,
  })

  revalidatePath('/client/dashboard/billing')

  const clientSecret =
    'clientSecret' in intent && intent.clientSecret != null
      ? intent.clientSecret
      : 'client_secret' in intent && (intent as { client_secret?: string | null }).client_secret != null
        ? (intent as { client_secret?: string | null }).client_secret ?? undefined
        : undefined

  return { clientSecret }
}

export async function confirmCashPayment(
  paymentId: string,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })
  if (!profile) return { error: 'Profile not found' }

  // Verify this payment belongs to a job this caregiver owns
  const [row] = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .where(and(eq(payments.id, paymentId), eq(jobs.caregiverId, profile.id), eq(payments.method, 'cash'), eq(payments.status, 'pending')))
    .limit(1)

  if (!row) return { error: 'Not found' }

  await db.update(payments).set({ status: 'completed' }).where(eq(payments.id, paymentId))

  revalidatePath('/caregiver/dashboard/payouts')
  revalidatePath('/client/dashboard/billing')
  return {}
}

export async function completeShift(
  shiftId: string,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })
  if (!profile) return { error: 'Profile not found' }

  const existing = await db
    .select({ id: shifts.id })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .where(and(eq(shifts.id, shiftId), eq(jobs.caregiverId, profile.id)))
    .limit(1)
    .offset(0)

  if (existing.length === 0) return { error: 'Not found' }

  await db.update(shifts).set({ status: 'completed' }).where(eq(shifts.id, shiftId))

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
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/caregiver/dashboard/payments`
  const link = await createConnectAccountLink(account.id, returnUrl)

  return { url: link.url }
}
