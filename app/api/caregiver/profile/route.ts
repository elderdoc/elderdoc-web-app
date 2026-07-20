import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import {
  caregiverProfiles,
  caregiverCareTypes,
  caregiverLanguages,
  caregiverCertifications,
  caregiverLocations,
  caregiverWorkPrefs,
} from '@/db/schema'
import { eq } from 'drizzle-orm'

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

export async function GET(req: NextRequest) {
  const caregiver = await getCaregiverInfo(req)
  if (!caregiver) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile, careTypes, languages, certifications, locationRows, workPrefs] =
    await Promise.all([
      db
        .select()
        .from(caregiverProfiles)
        .where(eq(caregiverProfiles.id, caregiver.profileId))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select({ careType: caregiverCareTypes.careType })
        .from(caregiverCareTypes)
        .where(eq(caregiverCareTypes.caregiverId, caregiver.profileId)),
      db
        .select({ language: caregiverLanguages.language })
        .from(caregiverLanguages)
        .where(eq(caregiverLanguages.caregiverId, caregiver.profileId)),
      db
        .select({ certification: caregiverCertifications.certification })
        .from(caregiverCertifications)
        .where(eq(caregiverCertifications.caregiverId, caregiver.profileId)),
      db
        .select()
        .from(caregiverLocations)
        .where(eq(caregiverLocations.caregiverId, caregiver.profileId))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select()
        .from(caregiverWorkPrefs)
        .where(eq(caregiverWorkPrefs.caregiverId, caregiver.profileId))
        .limit(1)
        .then((r) => r[0] ?? null),
    ])

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  return NextResponse.json({
    id:                  profile.id,
    userId:              profile.userId,
    headline:            profile.headline ?? null,
    about:               profile.about ?? null,
    photoUrl:            profile.photoUrl ?? null,
    hourlyMin:           profile.hourlyMin != null ? parseFloat(profile.hourlyMin) : null,
    hourlyMax:           profile.hourlyMax != null ? parseFloat(profile.hourlyMax) : null,
    rating:              profile.rating != null ? parseFloat(profile.rating) : null,
    experience:          profile.experience ?? null,
    education:           profile.education ?? null,
    relocatable:         profile.relocatable ?? false,
    status:              profile.status ?? null,
    completedStep:       profile.completedStep ?? 0,
    gender:              profile.gender ?? null,
    hasVehicle:          profile.hasVehicle ?? false,
    hasDriversLicense:   profile.hasDriversLicense ?? false,
    willingToTravel:     profile.willingToTravel ?? false,
    transportationMode:  profile.transportationMode ?? null,
    maxCarryLbs:         profile.maxCarryLbs ?? null,
    availability:        profile.availability ?? null,
    careCapabilities:    profile.careCapabilities ?? null,
    specialNeedsHandling: profile.specialNeedsHandling ?? null,
    careTypes:           careTypes.map((r) => r.careType),
    languages:           languages.map((r) => r.language),
    certifications:      certifications.map((r) => r.certification),
    location:            locationRows ?? null,
    workPrefs:           workPrefs ?? null,
  })
}

export async function PATCH(req: NextRequest) {
  const caregiver = await getCaregiverInfo(req)
  if (!caregiver) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const allowed = [
    'headline', 'about', 'hourlyMin', 'hourlyMax', 'experience', 'education',
    'relocatable', 'gender', 'hasVehicle', 'hasDriversLicense', 'willingToTravel',
    'transportationMode', 'maxCarryLbs', 'availability', 'careCapabilities',
    'specialNeedsHandling',
  ] as const

  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) {
      if (key === 'hourlyMin' || key === 'hourlyMax') {
        updates[key] = body[key] != null ? String(body[key]) : null
      } else {
        updates[key] = body[key]
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const [updated] = await db
    .update(caregiverProfiles)
    .set(updates)
    .where(eq(caregiverProfiles.id, caregiver.profileId))
    .returning({ id: caregiverProfiles.id })

  return NextResponse.json({ success: true, id: updated.id })
}
