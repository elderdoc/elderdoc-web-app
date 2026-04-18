import { auth } from '@/auth'
import { db } from '@/services/db'
import { careRequests } from '@/db/schema'
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
    return Response.json(candidates)
  } catch (err) {
    console.error('[match] error:', err)
    return Response.json([])
  }
}
