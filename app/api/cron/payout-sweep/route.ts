import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/services/db'
import { payments, jobs, caregiverProfiles, disputes } from '@/db/schema'
import { eq, and, isNull, isNotNull, lt } from 'drizzle-orm'
import { transferPayout } from '@/services/stripe'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Find all open disputes to know which jobs/payments to skip
  const openDisputes = await db
    .select({ jobId: disputes.jobId, paymentId: disputes.paymentId })
    .from(disputes)
    .where(eq(disputes.status, 'open'))

  const disputedJobIds = new Set(
    openDisputes.filter((d) => !d.paymentId).map((d) => d.jobId)
  )
  const disputedPaymentIds = new Set(
    openDisputes.filter((d) => d.paymentId).map((d) => d.paymentId as string)
  )

  // 2. Find all eligible payments (completed, unreleased, caregiver has Connect account)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const eligible = await db
    .select({
      id: payments.id,
      jobId: payments.jobId,
      amount: payments.amount,
      fee: payments.fee,
      stripeConnectAccountId: caregiverProfiles.stripeConnectAccountId,
    })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .where(
      and(
        eq(payments.status, 'completed'),
        isNull(payments.releasedAt),
        isNotNull(caregiverProfiles.stripeConnectAccountId),
        lt(payments.createdAt, cutoff),
      )
    )

  // 3. Filter out disputed payments/jobs
  const toRelease = eligible.filter(
    (p) => !disputedJobIds.has(p.jobId) && !disputedPaymentIds.has(p.id)
  )

  // 4. Process one at a time to avoid partial failures
  let released = 0
  let totalCents = 0

  for (const payment of toRelease) {
    try {
      const net = Number(payment.amount) - Number(payment.fee)
      await transferPayout(net, payment.stripeConnectAccountId!, payment.jobId)
      await db
        .update(payments)
        .set({ releasedAt: new Date() })
        .where(eq(payments.id, payment.id))
      released++
      totalCents += Math.round(net * 100)
    } catch (err) {
      console.error(`Failed to release payment ${payment.id}:`, err)
    }
  }

  return NextResponse.json({ released, totalCents })
}
