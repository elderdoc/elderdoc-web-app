import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, matches } from '@/db/schema'
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

  const updated = await db
    .update(matches)
    .set({ status: 'declined' })
    .where(
      and(
        eq(matches.id, matchId),
        eq(matches.caregiverId, caregiver.profileId),
        eq(matches.status, 'pending'),
      ),
    )
    .returning({ id: matches.id })

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Match not found or already settled' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
