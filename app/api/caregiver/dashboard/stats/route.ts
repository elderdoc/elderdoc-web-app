import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, jobs, shifts, matches } from '@/db/schema'
import { eq, and, gte, count } from 'drizzle-orm'

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

  const today = new Date().toISOString().split('T')[0]

  const [[activeJobRow], [upcomingShiftRow], [pendingOfferRow]] = await Promise.all([
    db
      .select({ count: count() })
      .from(jobs)
      .where(and(eq(jobs.caregiverId, caregiver.profileId), eq(jobs.status, 'active'))),

    db
      .select({ count: count() })
      .from(shifts)
      .innerJoin(jobs, eq(shifts.jobId, jobs.id))
      .where(
        and(
          eq(jobs.caregiverId, caregiver.profileId),
          eq(shifts.status, 'scheduled'),
          gte(shifts.date, today),
        ),
      ),

    db
      .select({ count: count() })
      .from(matches)
      .where(and(eq(matches.caregiverId, caregiver.profileId), eq(matches.status, 'pending'))),
  ])

  return NextResponse.json({
    activeJobCount:     activeJobRow?.count ?? 0,
    upcomingShiftCount: upcomingShiftRow?.count ?? 0,
    pendingOfferCount:  pendingOfferRow?.count ?? 0,
  })
}
