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
  const {
    gender,
    hasVehicle,
    hasDriversLicense,
    willingToTravel,
    transportationMode,
    maxCarryLbs,
  } = body ?? {}

  const updates: Record<string, unknown> = {}
  if (gender !== undefined) updates.gender = gender
  if (hasVehicle !== undefined) updates.hasVehicle = hasVehicle
  if (hasDriversLicense !== undefined) updates.hasDriversLicense = hasDriversLicense
  if (willingToTravel !== undefined) updates.willingToTravel = willingToTravel
  if (transportationMode !== undefined) updates.transportationMode = transportationMode
  if (maxCarryLbs !== undefined) updates.maxCarryLbs = maxCarryLbs

  const [curr] = await db
    .select({ step: caregiverProfiles.completedStep })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.id, cg.profileId))
    .limit(1)

  updates.completedStep = Math.max(curr?.step ?? 0, 5)

  await db
    .update(caregiverProfiles)
    .set(updates)
    .where(eq(caregiverProfiles.id, cg.profileId))

  return NextResponse.json({ success: true, completedStep: 5 })
}
