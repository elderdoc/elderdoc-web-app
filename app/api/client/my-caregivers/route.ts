import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { jobs, caregiverProfiles, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return (payload.sub as string) ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Step 1: Get active jobs for this client
  const activeJobs = await db
    .select({ id: jobs.id, caregiverId: jobs.caregiverId })
    .from(jobs)
    .where(and(eq(jobs.clientId, userId), eq(jobs.status, 'active')))

  if (!activeJobs.length) {
    return NextResponse.json([])
  }

  // Step 2: For each job, get caregiverProfile and user
  const results = await Promise.all(
    activeJobs.map(async (job) => {
      const profileRows = await db
        .select({
          id: caregiverProfiles.id,
          userId: caregiverProfiles.userId,
          photoUrl: caregiverProfiles.photoUrl,
          rating: caregiverProfiles.rating,
        })
        .from(caregiverProfiles)
        .where(eq(caregiverProfiles.id, job.caregiverId))
        .limit(1)

      const profile = profileRows[0] ?? null

      let name: string | null = null
      let userPhoto: string | null = null

      if (profile?.userId) {
        const userRows = await db
          .select({ name: users.name, image: users.image })
          .from(users)
          .where(eq(users.id, profile.userId))
          .limit(1)

        if (userRows[0]) {
          name = userRows[0].name
          userPhoto = userRows[0].image
        }
      }

      return {
        jobId: job.id,
        caregiverId: job.caregiverId,
        name,
        photoUrl: profile?.photoUrl ?? userPhoto,
        careTypes: [],
        rating: profile?.rating ?? null,
      }
    }),
  )

  return NextResponse.json(results)
}
