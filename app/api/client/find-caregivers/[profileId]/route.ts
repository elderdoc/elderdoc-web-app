import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import {
  caregiverProfiles,
  caregiverLocations,
  caregiverCareTypes,
  caregiverCertifications,
  caregiverLanguages,
  caregiverFavorites,
  users,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

async function getClientId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return (payload.sub as string) ?? null
  } catch {
    return null
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profileId } = await params

  const [row] = await db
    .select({
      id:             caregiverProfiles.id,
      headline:       caregiverProfiles.headline,
      about:          caregiverProfiles.about,
      photoUrl:       caregiverProfiles.photoUrl,
      hourlyMin:      caregiverProfiles.hourlyMin,
      hourlyMax:      caregiverProfiles.hourlyMax,
      rating:         caregiverProfiles.rating,
      experience:     caregiverProfiles.experience,
      hasVehicle:     caregiverProfiles.hasVehicle,
      willingToTravel: caregiverProfiles.willingToTravel,
      availability:   caregiverProfiles.availability,
      name:           users.name,
      city:           caregiverLocations.city,
      state:          caregiverLocations.state,
    })
    .from(caregiverProfiles)
    .innerJoin(users, eq(users.id, caregiverProfiles.userId))
    .leftJoin(caregiverLocations, eq(caregiverLocations.caregiverId, caregiverProfiles.id))
    .where(eq(caregiverProfiles.id, profileId))

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [careTypes, certifications, languages, favoriteRow] = await Promise.all([
    db
      .select({ careType: caregiverCareTypes.careType })
      .from(caregiverCareTypes)
      .where(eq(caregiverCareTypes.caregiverId, profileId)),

    db
      .select({ certification: caregiverCertifications.certification })
      .from(caregiverCertifications)
      .where(eq(caregiverCertifications.caregiverId, profileId)),

    db
      .select({ language: caregiverLanguages.language })
      .from(caregiverLanguages)
      .where(eq(caregiverLanguages.caregiverId, profileId)),

    db
      .select({ caregiverId: caregiverFavorites.caregiverId })
      .from(caregiverFavorites)
      .where(and(
        eq(caregiverFavorites.clientId, clientId),
        eq(caregiverFavorites.caregiverId, profileId),
      )),
  ])

  const availability = (row.availability ?? []).map((slot) => ({
    day:   slot.day,
    shift: slot.startTime,
  }))

  return NextResponse.json({
    id:              row.id,
    name:            row.name ?? '',
    photoUrl:        row.photoUrl ?? null,
    headline:        row.headline ?? null,
    about:           row.about ?? null,
    city:            row.city ?? null,
    state:           row.state ?? null,
    hourlyMin:       row.hourlyMin != null ? parseFloat(row.hourlyMin) : null,
    hourlyMax:       row.hourlyMax != null ? parseFloat(row.hourlyMax) : null,
    rating:          row.rating != null ? parseFloat(row.rating) : null,
    ratingCount:     null,
    experience:      row.experience ?? null,
    careTypes:       careTypes.map(r => r.careType),
    certifications:  certifications.map(r => r.certification),
    languages:       languages.map(r => r.language),
    availability,
    workPreferences: [],
    hasVehicle:      row.hasVehicle ?? false,
    willingToTravel: row.willingToTravel ?? false,
    isFavorite:      favoriteRow.length > 0,
  })
}
