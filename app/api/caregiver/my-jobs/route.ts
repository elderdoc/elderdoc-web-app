import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, jobs, careRequests, users } from '@/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'

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

  const jobRows = await db
    .select({
      id:        jobs.id,
      requestId: jobs.requestId,
      clientId:  jobs.clientId,
      status:    jobs.status,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .where(eq(jobs.caregiverId, profileId))
    .orderBy(desc(jobs.createdAt))
    .limit(50)

  if (jobRows.length === 0) return NextResponse.json({ jobs: [] })

  const requestIds = jobRows.map((j) => j.requestId)
  const clientIds  = [...new Set(jobRows.map((j) => j.clientId))]

  const [requestData, clientData] = await Promise.all([
    db
      .select({
        id:         careRequests.id,
        careType:   careRequests.careType,
        frequency:  careRequests.frequency,
        budgetType: careRequests.budgetType,
        budgetMin:  careRequests.budgetMin,
        budgetMax:  careRequests.budgetMax,
      })
      .from(careRequests)
      .where(inArray(careRequests.id, requestIds)),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, clientIds)),
  ])

  const requestMap = new Map(requestData.map((r) => [r.id, r]))
  const clientMap  = new Map(clientData.map((c) => [c.id, c]))

  const result = jobRows.map((job) => {
    const request = requestMap.get(job.requestId)
    const client  = clientMap.get(job.clientId)
    return {
      id:         job.id,
      requestId:  job.requestId,
      clientId:   job.clientId,
      status:     job.status,
      createdAt:  job.createdAt,
      careType:   request?.careType ?? null,
      frequency:  request?.frequency ?? null,
      budgetMin:  request?.budgetMin != null ? parseFloat(request.budgetMin) : null,
      budgetMax:  request?.budgetMax != null ? parseFloat(request.budgetMax) : null,
      clientName: client?.name ?? null,
    }
  })

  return NextResponse.json({ jobs: result })
}
