import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import {
  caregiverProfiles,
  caregiverCertifications,
  caregiverLanguages,
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

export async function POST(req: NextRequest) {
  const cg = await getOrCreateProfile(req)
  if (!cg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { experience, certifications, languages, education } = body ?? {}

  // Replace certifications
  await db
    .delete(caregiverCertifications)
    .where(eq(caregiverCertifications.caregiverId, cg.profileId))

  if (Array.isArray(certifications) && certifications.length > 0) {
    await db.insert(caregiverCertifications).values(
      certifications.map((certification: string) => ({
        caregiverId: cg.profileId,
        certification,
      }))
    )
  }

  // Replace languages
  await db
    .delete(caregiverLanguages)
    .where(eq(caregiverLanguages.caregiverId, cg.profileId))

  if (Array.isArray(languages) && languages.length > 0) {
    await db.insert(caregiverLanguages).values(
      languages.map((language: string) => ({
        caregiverId: cg.profileId,
        language,
      }))
    )
  }

  // Update completedStep without going backwards
  const [curr] = await db
    .select({ step: caregiverProfiles.completedStep })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.id, cg.profileId))
    .limit(1)

  const newStep = Math.max(curr?.step ?? 0, 2)

  await db
    .update(caregiverProfiles)
    .set({ completedStep: newStep, experience, education })
    .where(eq(caregiverProfiles.id, cg.profileId))

  return NextResponse.json({ success: true, completedStep: 2 })
}
