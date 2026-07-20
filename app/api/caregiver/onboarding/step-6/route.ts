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
  const { address1, address2, city, state, zip, lat, lng } = body ?? {}

  if (!city || !state || !zip) {
    return NextResponse.json(
      { error: 'city, state, and zip are required' },
      { status: 400 }
    )
  }

  const locationData = {
    address1: address1 ?? null,
    address2: address2 ?? null,
    city,
    state,
    zip,
    lat: lat != null ? String(lat) : null,
    lng: lng != null ? String(lng) : null,
  }

  const updated = await db
    .update(caregiverLocations)
    .set(locationData)
    .where(eq(caregiverLocations.caregiverId, cg.profileId))
    .returning({ id: caregiverLocations.id })

  if (updated.length === 0) {
    await db.insert(caregiverLocations).values({
      caregiverId: cg.profileId,
      ...locationData,
    })
  }

  const [curr] = await db
    .select({ step: caregiverProfiles.completedStep })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.id, cg.profileId))
    .limit(1)

  await db
    .update(caregiverProfiles)
    .set({ completedStep: Math.max(curr?.step ?? 0, 6), status: 'active' })
    .where(eq(caregiverProfiles.id, cg.profileId))

  return NextResponse.json({ success: true, completedStep: 6 })
}
