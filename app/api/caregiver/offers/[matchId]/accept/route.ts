import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, matches, jobs, careRequests } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const caregiver = await getCaregiverInfo(req)
  if (!caregiver) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await params

  try {
    await db.transaction(async (tx) => {
      const [match] = await tx
        .select({ requestId: matches.requestId, caregiverId: matches.caregiverId })
        .from(matches)
        .where(and(eq(matches.id, matchId), eq(matches.status, 'pending')))
        .limit(1)

      if (!match || match.caregiverId !== caregiver.profileId) {
        throw new Error('FORBIDDEN')
      }

      const [request] = await tx
        .select({ clientId: careRequests.clientId })
        .from(careRequests)
        .where(eq(careRequests.id, match.requestId))
        .limit(1)

      if (!request) throw new Error('NOT_FOUND')

      await tx.insert(jobs).values({
        matchId,
        requestId:   match.requestId,
        caregiverId: caregiver.profileId,
        clientId:    request.clientId,
        status:      'active',
      })

      await tx.update(matches).set({ status: 'accepted' }).where(eq(matches.id, matchId))
      await tx
        .update(careRequests)
        .set({ status: 'matched' })
        .where(eq(careRequests.id, match.requestId))
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (msg === 'NOT_FOUND')  return NextResponse.json({ error: 'Not found' }, { status: 404 })
    console.error('[accept offer]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
