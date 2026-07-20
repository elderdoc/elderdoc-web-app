import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, matches, careRequests, careRecipients, users } from '@/db/schema'
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

  const rows = await db
    .select({
      matchId:       matches.id,
      score:         matches.score,
      reason:        matches.reason,
      status:        matches.status,
      createdAt:     matches.createdAt,
      requestId:     careRequests.id,
      title:         careRequests.title,
      careType:      careRequests.careType,
      description:   careRequests.description,
      startDate:     careRequests.startDate,
      budgetMin:     careRequests.budgetMin,
      budgetMax:     careRequests.budgetMax,
      budgetType:    careRequests.budgetType,
      recipientName: careRecipients.name,
      clientName:    users.name,
    })
    .from(matches)
    .innerJoin(careRequests, eq(matches.requestId, careRequests.id))
    .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
    .innerJoin(users, eq(careRequests.clientId, users.id))
    .where(and(eq(matches.caregiverId, caregiver.profileId), eq(matches.status, 'pending')))
    .orderBy(desc(matches.createdAt))

  return NextResponse.json(
    rows.map((r) => ({
      matchId:       r.matchId,
      score:         r.score,
      reason:        r.reason,
      status:        r.status,
      createdAt:     r.createdAt,
      requestId:     r.requestId,
      title:         r.title ?? null,
      careType:      r.careType,
      description:   r.description ?? null,
      startDate:     r.startDate ?? null,
      budgetMin:     r.budgetMin != null ? parseFloat(r.budgetMin) : null,
      budgetMax:     r.budgetMax != null ? parseFloat(r.budgetMax) : null,
      budgetType:    r.budgetType ?? null,
      recipientName: r.recipientName ?? null,
      clientName:    r.clientName ?? null,
    })),
  )
}
