import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import {
  caregiverProfiles,
  caregiverWorkPrefs,
} from '@/db/schema'
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

interface AvailabilitySlot {
  day: string
  startTime: string
  endTime: string
}

export async function POST(req: NextRequest) {
  const cg = await getOrCreateProfile(req)
  if (!cg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    workTypes,
    availability,
    startAvailability,
    travelDistanceMiles,
  } = body ?? {}

  if (!Array.isArray(workTypes) || workTypes.length === 0) {
    return NextResponse.json(
      { error: 'workTypes must be a non-empty array' },
      { status: 400 }
    )
  }

  // Replace work prefs — each workType becomes its own row
  await db
    .delete(caregiverWorkPrefs)
    .where(eq(caregiverWorkPrefs.caregiverId, cg.profileId))

  await db.insert(caregiverWorkPrefs).values(
    workTypes.map((workType: string) => ({
      caregiverId: cg.profileId,
      workType,
      travelDistanceMiles: travelDistanceMiles ?? null,
      startAvailability: startAvailability ?? null,
    }))
  )

  // Update completedStep without going backwards
  const [curr] = await db
    .select({ step: caregiverProfiles.completedStep })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.id, cg.profileId))
    .limit(1)

  const newStep = Math.max(curr?.step ?? 0, 3)

  await db
    .update(caregiverProfiles)
    .set({ completedStep: newStep, availability: availability as AvailabilitySlot[] })
    .where(eq(caregiverProfiles.id, cg.profileId))

  return NextResponse.json({ success: true, completedStep: 3 })
}
