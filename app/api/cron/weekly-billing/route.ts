import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/services/db'
import { shifts, jobs, careRequests, users, payments, notifications } from '@/db/schema'
import { eq, and, isNull, isNotNull, inArray } from 'drizzle-orm'
import { getDefaultPaymentMethod, createAndPayInvoice } from '@/services/stripe'
import { calculateShiftHours } from '@/lib/shift-utils'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const unbilledRows = await db
    .select({
      shiftId:          shifts.id,
      jobId:            shifts.jobId,
      startTime:        shifts.startTime,
      endTime:          shifts.endTime,
      date:             shifts.date,
      clientId:         jobs.clientId,
      stripeCustomerId: users.stripeCustomerId,
      budgetAmount:     careRequests.budgetAmount,
      careType:         careRequests.careType,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(users, eq(jobs.clientId, users.id))
    .where(
      and(
        eq(shifts.status, 'completed'),
        isNull(shifts.billedAt),
        isNotNull(careRequests.budgetAmount),
      )
    )

  const byJob = new Map<string, typeof unbilledRows>()
  for (const row of unbilledRows) {
    if (!byJob.has(row.jobId)) byJob.set(row.jobId, [])
    byJob.get(row.jobId)!.push(row)
  }

  let billed = 0
  let skipped = 0
  let totalCharged = 0
  const errors: { jobId: string; error: string }[] = []

  for (const [jobId, jobShifts] of byJob) {
    const { clientId, stripeCustomerId, budgetAmount, careType } = jobShifts[0]

    if (!stripeCustomerId) {
      await db.insert(notifications).values({ userId: clientId, type: 'billing_no_card', payload: { jobId, careType } })
      skipped++
      continue
    }

    const savedCard = await getDefaultPaymentMethod(stripeCustomerId)
    if (!savedCard) {
      await db.insert(notifications).values({ userId: clientId, type: 'billing_no_card', payload: { jobId, careType } })
      skipped++
      continue
    }

    const rate = Number(budgetAmount)
    let subtotalCents = 0
    for (const shift of jobShifts) {
      subtotalCents += Math.round(calculateShiftHours(shift.startTime, shift.endTime) * rate * 100)
    }
    const feeCents = Math.round(subtotalCents * 0.01)

    try {
      const result = await createAndPayInvoice(stripeCustomerId, jobId, subtotalCents, feeCents)

      await db.insert(payments).values({
        jobId,
        amount: String(subtotalCents / 100),
        fee: String(feeCents / 100),
        method: 'stripe',
        status: 'pending',
        stripeInvoiceId: result.invoiceId,
        stripePaymentIntentId: result.paymentIntentId ?? undefined,
      })

      const shiftIds = jobShifts.map((s) => s.shiftId)
      await db.update(shifts).set({ billedAt: new Date() }).where(inArray(shifts.id, shiftIds))

      await db.insert(notifications).values({
        userId: clientId,
        type: 'billing_charged',
        payload: {
          jobId,
          careType,
          totalDollars: ((subtotalCents + feeCents) / 100).toFixed(2),
        },
      })

      billed++
      totalCharged += subtotalCents + feeCents
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Failed to bill job ${jobId}:`, err)
      errors.push({ jobId, error: msg })
    }
  }

  return NextResponse.json({ billed, skipped, totalCharged: totalCharged / 100, errors })
}
