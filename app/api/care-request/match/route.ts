import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { auth } from '@/auth'
import { db } from '@/services/db'
import { careRequests, matches } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { matchCaregivers } from '@/domains/matching/match-caregivers'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

async function getClientId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (bearerToken) {
    try {
      const { payload } = await jwtVerify(bearerToken, secret)
      return (payload.sub as string) ?? null
    } catch {
      return null
    }
  }
  const session = await auth()
  return session?.user?.id ?? null
}

export async function POST(req: NextRequest): Promise<Response> {
  const userId = await getClientId(req)
  if (!userId) {
    return NextResponse.json([], { status: 401 })
  }

  try {
    const { requestId } = await req.json() as { requestId: string }

    const [owned] = await db
      .select({ id: careRequests.id })
      .from(careRequests)
      .where(and(eq(careRequests.id, requestId), eq(careRequests.clientId, userId)))
      .limit(1)

    if (!owned) return NextResponse.json([], { status: 403 })

    const candidates = await matchCaregivers(requestId)

    // Persist candidates to matches table (skip any that already exist)
    if (candidates.length > 0) {
      const existing = await db
        .select({ caregiverId: matches.caregiverId })
        .from(matches)
        .where(eq(matches.requestId, requestId))

      const existingIds = new Set(existing.map((m) => m.caregiverId))

      const toInsert = candidates.filter((c) => !existingIds.has(c.caregiverId))
      if (toInsert.length > 0) {
        await db.insert(matches).values(
          toInsert.map((c) => ({
            requestId,
            caregiverId: c.caregiverId,
            score:  Math.round(c.score),
            reason: c.reason,
            status: 'pending' as const,
          })),
        )
      }
    }

    return NextResponse.json(candidates)
  } catch (err) {
    console.error('[match] error:', err)
    return NextResponse.json([])
  }
}
