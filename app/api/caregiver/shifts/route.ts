import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, shifts, jobs, careRequests } from '@/db/schema'
import { eq, and, gte, lt, or, desc } from 'drizzle-orm'

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
  const filter = searchParams.get('filter') // today | upcoming | history

  const today = new Date().toISOString().split('T')[0]

  const shiftConditions = [eq(jobs.caregiverId, caregiver.profileId)]
  if (filter === 'today') {
    shiftConditions.push(eq(shifts.date, today))
    shiftConditions.push(eq(shifts.status, 'scheduled'))
  } else if (filter === 'upcoming') {
    shiftConditions.push(gte(shifts.date, today))
    shiftConditions.push(eq(shifts.status, 'scheduled'))
  } else if (filter === 'history') {
    shiftConditions.push(
      or(eq(shifts.status, 'completed'), eq(shifts.status, 'cancelled'))!,
    )
  }

  const rows = await db
    .select({
      shiftId:   shifts.id,
      date:      shifts.date,
      startTime: shifts.startTime,
      endTime:   shifts.endTime,
      status:    shifts.status,
      billedAt:  shifts.billedAt,
      jobId:     jobs.id,
      careType:  careRequests.careType,
      title:     careRequests.title,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .where(and(...shiftConditions))
    .orderBy(desc(shifts.date))

  return NextResponse.json(
    rows.map((r) => ({
      shiftId:   r.shiftId,
      date:      r.date,
      startTime: r.startTime,
      endTime:   r.endTime,
      status:    r.status,
      billedAt:  r.billedAt ?? null,
      jobId:     r.jobId,
      careType:  r.careType,
      title:     r.title ?? null,
    })),
  )
}
