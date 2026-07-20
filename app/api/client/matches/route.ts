import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { matches, careRequests, caregiverProfiles, users } from '@/db/schema'
import { eq, inArray, and, desc } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

async function getClientId(req: NextRequest): Promise<string | null> {
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
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const statusFilter = searchParams.get('status') as 'pending' | 'accepted' | 'declined' | null

  const requestRows = await db
    .select({ id: careRequests.id, careType: careRequests.careType })
    .from(careRequests)
    .where(eq(careRequests.clientId, clientId))

  if (requestRows.length === 0) return NextResponse.json([])

  const requestIds = requestRows.map((r) => r.id)
  const requestMap = new Map(requestRows.map((r) => [r.id, r]))

  const whereClause = statusFilter
    ? and(inArray(matches.requestId, requestIds), eq(matches.status, statusFilter))
    : inArray(matches.requestId, requestIds)

  const rows = await db
    .select({
      id:          matches.id,
      requestId:   matches.requestId,
      caregiverId: matches.caregiverId,
      score:       matches.score,
      reason:      matches.reason,
      status:      matches.status,
      createdAt:   matches.createdAt,
      headline:    caregiverProfiles.headline,
      photoUrl:    caregiverProfiles.photoUrl,
      hourlyMin:   caregiverProfiles.hourlyMin,
      hourlyMax:   caregiverProfiles.hourlyMax,
      rating:      caregiverProfiles.rating,
      name:        users.name,
      image:       users.image,
    })
    .from(matches)
    .innerJoin(caregiverProfiles, eq(caregiverProfiles.id, matches.caregiverId))
    .innerJoin(users, eq(users.id, caregiverProfiles.userId))
    .where(whereClause)
    .orderBy(desc(matches.score))

  return NextResponse.json(
    rows.map((r) => ({
      id:          r.id,
      requestId:   r.requestId,
      careType:    requestMap.get(r.requestId)?.careType ?? null,
      caregiverId: r.caregiverId,
      score:       r.score,
      reason:      r.reason,
      status:      r.status,
      createdAt:   r.createdAt,
      caregiver: {
        name:      r.name ?? null,
        imageUrl:  r.photoUrl ?? r.image ?? null,
        headline:  r.headline ?? null,
        hourlyMin: r.hourlyMin != null ? parseFloat(r.hourlyMin) : null,
        hourlyMax: r.hourlyMax != null ? parseFloat(r.hourlyMax) : null,
        rating:    r.rating != null ? parseFloat(r.rating) : null,
      },
    })),
  )
}
