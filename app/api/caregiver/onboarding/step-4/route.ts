import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, caregiverLocations } from '@/db/schema'
import { eq } from 'drizzle-orm'

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
)

async function getOrCreateProfile(
  req: NextRequest
): Promise<{ userId: string; profileId: string } | null> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    const userId = payload.sub as string
    const [existing] = await db
      .select({ id: caregiverProfiles.id })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.userId, userId))
      .limit(1)
    if (existing) return { userId, profileId: existing.id }
    const [created] = await db
      .insert(caregiverProfiles)
      .values({ userId })
      .returning({ id: caregiverProfiles.id })
    return { userId, profileId: created.id }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const cg = await getOrCreateProfile(req)
  if (!cg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { hourlyMin, hourlyMax, careCapabilities, specialNeedsHandling, maxCarryLbs } = body ?? {}

  if (hourlyMin == null && hourlyMax == null && careCapabilities == null) {
    return NextResponse.json(
      { error: 'At least one of hourlyMin, hourlyMax, or careCapabilities is required' },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}
  if (hourlyMin != null) updates.hourlyMin = String(hourlyMin)
  if (hourlyMax != null) updates.hourlyMax = String(hourlyMax)
  if (careCapabilities != null) updates.careCapabilities = careCapabilities
  if (specialNeedsHandling != null) updates.specialNeedsHandling = specialNeedsHandling
  if (maxCarryLbs != null) updates.maxCarryLbs = maxCarryLbs

  const [curr] = await db
    .select({ step: caregiverProfiles.completedStep })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.id, cg.profileId))
    .limit(1)

  updates.completedStep = Math.max(curr?.step ?? 0, 4)

  await db
    .update(caregiverProfiles)
    .set(updates)
    .where(eq(caregiverProfiles.id, cg.profileId))

  return NextResponse.json({ success: true, completedStep: 4 })
}
