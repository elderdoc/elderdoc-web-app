import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import {
  caregiverProfiles,
  caregiverCareTypes,
  matches,
  careRequests,
  careRecipients,
  careRequestLocations,
  users,
} from '@/db/schema'
import { eq, and, inArray, notInArray } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

function toInitials(name: string | null | undefined): string | null {
  if (!name) return null
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length ? parts.map((p) => p[0].toUpperCase()).join('.') + '.' : null
}

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

  // Get caregiver's care types
  const careTypeRows = await db
    .select({ careType: caregiverCareTypes.careType })
    .from(caregiverCareTypes)
    .where(eq(caregiverCareTypes.caregiverId, caregiver.profileId))

  if (careTypeRows.length === 0) return NextResponse.json([])

  const careTypes = careTypeRows.map((r) => r.careType)

  // Get request IDs already matched to this caregiver
  const alreadyMatchedRows = await db
    .select({ requestId: matches.requestId })
    .from(matches)
    .where(eq(matches.caregiverId, caregiver.profileId))

  const excludedRequestIds = alreadyMatchedRows.map((r) => r.requestId)

  const conditions = [
    eq(careRequests.status, 'active'),
    inArray(careRequests.careType, careTypes),
  ]
  if (excludedRequestIds.length > 0) {
    conditions.push(notInArray(careRequests.id, excludedRequestIds))
  }

  const rows = await db
    .select({
      id:                  careRequests.id,
      title:               careRequests.title,
      careType:            careRequests.careType,
      description:         careRequests.description,
      frequency:           careRequests.frequency,
      schedule:            careRequests.schedule,
      startDate:           careRequests.startDate,
      budgetMin:           careRequests.budgetMin,
      budgetMax:           careRequests.budgetMax,
      budgetType:          careRequests.budgetType,
      recipientName:       careRecipients.name,
      recipientConditions: careRecipients.conditions,
      clientName:          users.name,
      city:                careRequestLocations.city,
      state:               careRequestLocations.state,
    })
    .from(careRequests)
    .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
    .leftJoin(users, eq(users.id, careRequests.clientId))
    .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
    .where(and(...conditions))
    .limit(50)

  return NextResponse.json(
    rows.map((r) => ({
      id:                  r.id,
      title:               r.title ?? null,
      careType:            r.careType,
      description:         r.description ?? null,
      frequency:           r.frequency ?? null,
      schedule:            r.schedule ?? null,
      startDate:           r.startDate ?? null,
      budgetMin:           r.budgetMin != null ? parseFloat(r.budgetMin) : null,
      budgetMax:           r.budgetMax != null ? parseFloat(r.budgetMax) : null,
      budgetType:          r.budgetType ?? null,
      recipientName:       toInitials(r.recipientName),
      recipientConditions: r.recipientConditions ?? null,
      clientName:          toInitials(r.clientName),
      city:                r.city ?? null,
      state:               r.state ?? null,
    })),
  )
}
