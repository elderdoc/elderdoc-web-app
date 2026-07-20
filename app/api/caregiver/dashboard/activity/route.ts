import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, jobs, shifts, jobApplications } from '@/db/schema'
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
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))

  const [recentJobs, recentShifts, recentApplications] = await Promise.all([
    db
      .select({ id: jobs.id, status: jobs.status, createdAt: jobs.createdAt })
      .from(jobs)
      .where(eq(jobs.caregiverId, caregiver.profileId))
      .orderBy(desc(jobs.createdAt))
      .limit(limit),

    db
      .select({ id: shifts.id, date: shifts.date, status: shifts.status, createdAt: shifts.createdAt })
      .from(shifts)
      .innerJoin(jobs, eq(shifts.jobId, jobs.id))
      .where(eq(jobs.caregiverId, caregiver.profileId))
      .orderBy(desc(shifts.createdAt))
      .limit(limit),

    db
      .select({ id: jobApplications.id, status: jobApplications.status, createdAt: jobApplications.createdAt })
      .from(jobApplications)
      .where(eq(jobApplications.caregiverId, caregiver.profileId))
      .orderBy(desc(jobApplications.createdAt))
      .limit(limit),
  ])

  const items = [
    ...recentJobs.map(j => ({
      type:      'shift' as const,
      createdAt: j.createdAt.toISOString(),
      label:     'Job ' + j.status,
      sublabel:  j.status,
    })),
    ...recentShifts.map(s => ({
      type:      'shift' as const,
      createdAt: s.createdAt.toISOString(),
      label:     'Shift on ' + s.date,
      sublabel:  s.status,
    })),
    ...recentApplications.map(a => ({
      type:      'application' as const,
      createdAt: a.createdAt.toISOString(),
      label:     'Application ' + a.status,
      sublabel:  a.status,
    })),
  ]

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json(items.slice(0, limit))
}
