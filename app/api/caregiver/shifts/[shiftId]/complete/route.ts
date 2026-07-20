import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, shifts, jobs, notifications } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> },
) {
  const caregiver = await getCaregiverInfo(req)
  if (!caregiver) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { shiftId } = await params

  // Verify shift belongs to this caregiver's job
  const [shift] = await db
    .select({
      id:       shifts.id,
      status:   shifts.status,
      date:     shifts.date,
      jobId:    shifts.jobId,
      clientId: jobs.clientId,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .where(and(eq(shifts.id, shiftId), eq(jobs.caregiverId, caregiver.profileId)))
    .limit(1)

  if (!shift) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (shift.status !== 'scheduled') {
    return NextResponse.json({ error: 'Shift is not in scheduled status' }, { status: 409 })
  }

  await db
    .update(shifts)
    .set({ status: 'completed' })
    .where(eq(shifts.id, shiftId))

  await db.insert(notifications).values({
    userId: shift.clientId,
    type: 'shift_completed',
    payload: { shiftId, jobId: shift.jobId, date: shift.date },
  })

  return NextResponse.json({ success: true })
}
