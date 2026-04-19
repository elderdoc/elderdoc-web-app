'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import {
  users, caregiverProfiles, caregiverCareTypes, caregiverCertifications,
  caregiverLanguages, caregiverWorkPrefs, caregiverLocations,
} from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function updateCaregiverProfile(data: {
  name: string
  phone?: string
  headline?: string
  about?: string
  photoUrl?: string
  hourlyMin?: string
  hourlyMax?: string
  experience?: string
  education?: string
  relocatable: boolean
  careTypes: string[]
  certifications: string[]
  languages: string[]
  workTypes: string[]
  days: string[]
  shifts: string[]
  startAvailability?: string
  travelDistances: number[]
  address1?: string
  address2?: string
  city?: string
  state?: string
}): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })
  if (!profile) throw new Error('Profile not found')

  await db.transaction(async (tx) => {
    await tx.update(users)
      .set({ name: data.name, phone: data.phone })
      .where(eq(users.id, session.user.id))

    await tx.update(caregiverProfiles)
      .set({
        headline:    data.headline,
        about:       data.about,
        hourlyMin:   data.hourlyMin,
        hourlyMax:   data.hourlyMax,
        experience:  data.experience,
        education:   data.education,
        relocatable: data.relocatable,
        ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),
      })
      .where(eq(caregiverProfiles.id, profile.id))

    await tx.delete(caregiverCareTypes).where(eq(caregiverCareTypes.caregiverId, profile.id))
    if (data.careTypes.length > 0) {
      await tx.insert(caregiverCareTypes).values(data.careTypes.map(careType => ({ caregiverId: profile.id, careType })))
    }

    await tx.delete(caregiverCertifications).where(eq(caregiverCertifications.caregiverId, profile.id))
    if (data.certifications.length > 0) {
      await tx.insert(caregiverCertifications).values(data.certifications.map(certification => ({ caregiverId: profile.id, certification })))
    }

    await tx.delete(caregiverLanguages).where(eq(caregiverLanguages.caregiverId, profile.id))
    if (data.languages.length > 0) {
      await tx.insert(caregiverLanguages).values(data.languages.map(language => ({ caregiverId: profile.id, language })))
    }

    await tx.delete(caregiverWorkPrefs).where(eq(caregiverWorkPrefs.caregiverId, profile.id))
    const workPrefRows: (typeof caregiverWorkPrefs.$inferInsert)[] = [
      ...data.workTypes.map(workType => ({ caregiverId: profile.id, workType })),
      ...data.days.map(day => ({ caregiverId: profile.id, day })),
      ...data.shifts.map(shift => ({ caregiverId: profile.id, shift })),
      ...(data.startAvailability ? [{ caregiverId: profile.id, startAvailability: data.startAvailability }] : []),
      ...data.travelDistances.map(miles => ({ caregiverId: profile.id, travelDistanceMiles: miles })),
    ]
    if (workPrefRows.length > 0) {
      await tx.insert(caregiverWorkPrefs).values(workPrefRows)
    }

    await tx.insert(caregiverLocations)
      .values({
        caregiverId: profile.id,
        address1: data.address1 ?? null,
        address2: data.address2 ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
      })
      .onConflictDoUpdate({
        target: caregiverLocations.caregiverId,
        set: {
          address1: data.address1 ?? null,
          address2: data.address2 ?? null,
          city: data.city ?? null,
          state: data.state ?? null,
        },
      })
  })
}
