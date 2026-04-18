'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { careRequests, matches } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function sendOffer(
  requestId: string,
  caregiverId: string,
  score: number,
  reason: string,
): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const [request] = await db
    .select({ id: careRequests.id, clientId: careRequests.clientId })
    .from(careRequests)
    .where(and(eq(careRequests.id, requestId), eq(careRequests.clientId, session.user.id)))
    .limit(1)

  if (!request) throw new Error('Unauthorized')

  await db.insert(matches).values({ requestId, caregiverId, score, reason, status: 'pending' })
}
