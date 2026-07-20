import { auth } from '@/auth'
import { db } from '@/services/db'
import { careRequests, matches } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { matchCaregivers } from '@/domains/matching/match-caregivers'

export async function POST(req: Request): Promise<Response> {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json([], { status: 401 })
  }

  try {
    const { requestId } = await req.json() as { requestId: string }

    const [owned] = await db
      .select({ id: careRequests.id })
      .from(careRequests)
      .where(and(eq(careRequests.id, requestId), eq(careRequests.clientId, session.user.id)))
      .limit(1)

    if (!owned) return Response.json([], { status: 403 })

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

    return Response.json(candidates)
  } catch (err) {
    console.error('[match] error:', err)
    return Response.json([])
  }
}
