import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, shifts, jobs, careRequests, users } from '@/db/schema'
import { eq, and, gte, or } from 'drizzle-orm'

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
  const filter = searchParams.get('filter')

  const today = new Date().toISOString().split('T')[0]

  const conditions = [eq(jobs.caregiverId, caregiver.profileId)]
  if (filter === 'today') {
    conditions.push(eq(shifts.date, today))
    conditions.push(eq(shifts.status, 'scheduled'))
  } else if (filter === 'upcoming') {
    conditions.push(gte(shifts.date, today))
    conditions.push(eq(shifts.status, 'scheduled'))
  } else if (filter === 'history') {
    conditions.push(
      or(eq(shifts.status, 'completed'), eq(shifts.status, 'cancelled'))!,
    )
  }

  const rows = await db
    .select({
      id:          shifts.id,
      date:        shifts.date,
      startTime:   shifts.startTime,
      endTime:     shifts.endTime,
      status:      shifts.status,
      jobId:       jobs.id,
      title:       careRequests.title,
      careType:    careRequests.careType,
      clientName:  users.name,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(users, eq(jobs.clientId, users.id))
    .where(and(...conditions))

  return NextResponse.json(
    rows.map((r) => ({
      id:            r.id,
      jobId:         r.jobId,
      date:          r.date,
      startTime:     r.startTime,
      endTime:       r.endTime,
      status:        r.status,
      title:         r.title ?? null,
      careType:      r.careType,
      clientName:    r.clientName ?? null,
      careTypeLabel: r.careType,
    }))
  )
}
