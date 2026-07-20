import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, jobs, carePlans } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return (payload.sub as string) ?? null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile] = await db
    .select({ id: caregiverProfiles.id })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.userId, userId))
    .limit(1)

  if (!profile) return NextResponse.json({ error: 'Caregiver profile not found' }, { status: 404 })

  const profileId = profile.id

  const activeJobs = await db
    .select({ id: jobs.id, requestId: jobs.requestId })
    .from(jobs)
    .where(and(eq(jobs.caregiverId, profileId), eq(jobs.status, 'active')))

  if (activeJobs.length === 0) return NextResponse.json({ carePlans: [] })

  const requestIds = activeJobs.map((j) => j.requestId)

  const plans = await db
    .select()
    .from(carePlans)
    .where(inArray(carePlans.requestId, requestIds))

  return NextResponse.json({ carePlans: plans })
}
