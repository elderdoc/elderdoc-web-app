import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, jobApplications, careRequests, careRecipients } from '@/db/schema'
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

// GET /api/caregiver/job-applications — list this caregiver's applications
export async function GET(req: NextRequest) {
  const caregiver = await getCaregiverInfo(req)
  if (!caregiver) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select({
      id:            jobApplications.id,
      status:        jobApplications.status,
      coverNote:     jobApplications.coverNote,
      createdAt:     jobApplications.createdAt,
      requestId:     careRequests.id,
      title:         careRequests.title,
      careType:      careRequests.careType,
      startDate:     careRequests.startDate,
      budgetMin:     careRequests.budgetMin,
      recipientName: careRecipients.name,
    })
    .from(jobApplications)
    .innerJoin(careRequests, eq(jobApplications.requestId, careRequests.id))
    .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
    .where(eq(jobApplications.caregiverId, caregiver.profileId))
    .orderBy(desc(jobApplications.createdAt))

  return NextResponse.json(
    rows.map((r) => ({
      id:            r.id,
      status:        r.status,
      coverNote:     r.coverNote ?? null,
      createdAt:     r.createdAt,
      requestId:     r.requestId,
      title:         r.title ?? null,
      careType:      r.careType,
      startDate:     r.startDate ?? null,
      budgetMin:     r.budgetMin != null ? parseFloat(r.budgetMin) : null,
      recipientName: r.recipientName ?? null,
    }))
  )
}

// POST /api/caregiver/job-applications — apply for a job
export async function POST(req: NextRequest) {
  const caregiver = await getCaregiverInfo(req)
  if (!caregiver) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const requestId: string | undefined = body?.requestId
  const coverNote: string | undefined = body?.coverNote

  if (!requestId) {
    return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
  }

  const [request] = await db
    .select({ id: careRequests.id, status: careRequests.status })
    .from(careRequests)
    .where(eq(careRequests.id, requestId))
    .limit(1)

  if (!request) return NextResponse.json({ error: 'Care request not found' }, { status: 404 })

  const [existing] = await db
    .select({ id: jobApplications.id })
    .from(jobApplications)
    .where(
      and(
        eq(jobApplications.requestId, requestId),
        eq(jobApplications.caregiverId, caregiver.profileId),
      )
    )
    .limit(1)

  if (existing) {
    return NextResponse.json({ error: 'You have already applied for this job' }, { status: 409 })
  }

  const [application] = await db
    .insert(jobApplications)
    .values({
      requestId,
      caregiverId: caregiver.profileId,
      coverNote: coverNote?.trim() || null,
      status: 'pending',
    })
    .returning({ id: jobApplications.id, status: jobApplications.status, createdAt: jobApplications.createdAt })

  return NextResponse.json(application, { status: 201 })
}
