'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { eq, and } from 'drizzle-orm'
import { caregiverProfiles, jobApplications, matches, careRequests, jobs } from '@/db/schema'

async function getProfile(userId: string) {
  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })
  if (!profile) throw new Error('Profile not found')
  return profile
}

export async function applyToRequest(requestId: string, coverNote: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const profile = await getProfile(session.user.id)
  await db.insert(jobApplications).values({
    requestId,
    caregiverId: profile.id,
    coverNote,
    status: 'pending',
  })
}

export async function acceptOffer(matchId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const profile = await getProfile(session.user.id)

  await db.transaction(async (tx) => {
    const [match] = await tx
      .select({ requestId: matches.requestId, caregiverId: matches.caregiverId })
      .from(matches)
      .where(eq(matches.id, matchId))

    if (!match || match.caregiverId !== profile.id) throw new Error('Unauthorized')

    const [request] = await tx
      .select({ clientId: careRequests.clientId })
      .from(careRequests)
      .where(eq(careRequests.id, match.requestId))

    await tx.insert(jobs).values({
      matchId,
      requestId:   match.requestId,
      caregiverId: profile.id,
      clientId:    request.clientId,
      status:      'active',
    })

    await tx.update(matches).set({ status: 'accepted' }).where(eq(matches.id, matchId))
  })
}

export async function declineOffer(matchId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const profile = await getProfile(session.user.id)
  await db.update(matches).set({ status: 'declined' }).where(
    and(eq(matches.id, matchId), eq(matches.caregiverId, profile.id))
  )
}
