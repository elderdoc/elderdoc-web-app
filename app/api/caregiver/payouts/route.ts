import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, payments, jobs, careRequests } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

async function getCaregiverInfo(req: NextRequest): Promise<{ userId: string; profileId: string } | null> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    const userId = (payload.sub as string) ?? null
    if (!userId) return null
    const [profile] = await db
      .select({ id: caregiverProfiles.id })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.userId, userId))
      .limit(1)
    if (!profile) return null
    return { userId, profileId: profile.id }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const caregiver = await getCaregiverInfo(req)
  if (!caregiver) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select({
      paymentId:       payments.id,
      amount:          payments.amount,
      fee:             payments.fee,
      method:          payments.method,
      status:          payments.status,
      stripeInvoiceId: payments.stripeInvoiceId,
      releasedAt:      payments.releasedAt,
      createdAt:       payments.createdAt,
      jobId:           jobs.id,
      careType:        careRequests.careType,
      requestTitle:    careRequests.title,
    })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .where(eq(jobs.caregiverId, caregiver.profileId))
    .orderBy(desc(payments.createdAt))

  return NextResponse.json(
    rows.map((r) => ({
      paymentId:    r.paymentId,
      amount:       r.amount != null ? parseFloat(r.amount) : null,
      fee:          r.fee != null ? parseFloat(r.fee) : null,
      method:       r.method,
      status:       r.status,
      invoiceId:    r.stripeInvoiceId ?? null,
      releasedAt:   r.releasedAt ?? null,
      createdAt:    r.createdAt,
      jobId:        r.jobId,
      careType:     r.careType,
      requestTitle: r.requestTitle ?? null,
    })),
  )
}
