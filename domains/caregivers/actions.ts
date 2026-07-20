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

  const [existing] = await db
    .select({ id: jobApplications.id })
    .from(jobApplications)
    .where(and(
      eq(jobApplications.requestId, requestId),
      eq(jobApplications.caregiverId, profile.id)
    ))
  if (existing) throw new Error('Already applied')

  const [careReq] = await db
    .select({ status: careRequests.status })
    .from(careRequests)
    .where(eq(careRequests.id, requestId))
  if (!careReq || careReq.status !== 'active') throw new Error('Request not available')

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
      .where(and(eq(matches.id, matchId), eq(matches.status, 'pending')))

    if (!match || match.caregiverId !== profile.id) throw new Error('Unauthorized')

    const [request] = await tx
      .select({ clientId: careRequests.clientId })
      .from(careRequests)
      .where(eq(careRequests.id, match.requestId))

    if (!request) throw new Error('Request not found')

    await tx.insert(jobs).values({
      matchId,
      requestId:   match.requestId,
      caregiverId: profile.id,
      clientId:    request.clientId,
      status:      'active',
    })

    await tx.update(matches).set({ status: 'accepted' }).where(eq(matches.id, matchId))
    await tx.update(careRequests).set({ status: 'matched' }).where(eq(careRequests.id, match.requestId))
  })
}

export async function declineOffer(matchId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const profile = await getProfile(session.user.id)
  const updated = await db
    .update(matches)
    .set({ status: 'declined' })
    .where(and(eq(matches.id, matchId), eq(matches.caregiverId, profile.id), eq(matches.status, 'pending')))
    .returning({ id: matches.id })
  if (updated.length === 0) throw new Error('Match not found or already settled')
}
