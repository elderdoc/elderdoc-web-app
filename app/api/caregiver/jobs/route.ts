import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, jobs, careRequests, careRecipients, users } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

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

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')

  const conditions = [eq(jobs.caregiverId, caregiver.profileId)]
  if (status) conditions.push(eq(jobs.status, status as 'active' | 'completed' | 'cancelled'))

  const rows = await db
    .select({
      jobId:         jobs.id,
      status:        jobs.status,
      createdAt:     jobs.createdAt,
      requestId:     careRequests.id,
      title:         careRequests.title,
      careType:      careRequests.careType,
      startDate:     careRequests.startDate,
      budgetMin:     careRequests.budgetMin,
      recipientName: careRecipients.name,
      clientName:    users.name,
    })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
    .innerJoin(users, eq(jobs.clientId, users.id))
    .where(and(...conditions))
    .orderBy(desc(jobs.createdAt))

  return NextResponse.json(
    rows.map((r) => ({
      jobId:         r.jobId,
      status:        r.status,
      createdAt:     r.createdAt,
      requestId:     r.requestId,
      title:         r.title ?? null,
      careType:      r.careType,
      startDate:     r.startDate ?? null,
      budgetMin:     r.budgetMin != null ? parseFloat(r.budgetMin) : null,
      recipientName: r.recipientName ?? null,
      clientName:    r.clientName ?? null,
    })),
  )
}
