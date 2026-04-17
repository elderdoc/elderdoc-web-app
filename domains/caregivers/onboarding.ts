'use server'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { eq, isNull, isNotNull, and } from 'drizzle-orm'
import { db } from '@/services/db'
import {
  users,
  caregiverProfiles,
  caregiverCareTypes,
  caregiverCertifications,
  caregiverLanguages,
  caregiverWorkPrefs,
  caregiverLocations,
} from '@/db/schema'

async function getOrCreateProfile(userId: string) {
  const existing = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })
  if (existing) return existing
  const [created] = await db
    .insert(caregiverProfiles)
    .values({ userId })
    .returning()
  return created
}

export async function saveCaregiverStep1(careTypes: string[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const profile = await getOrCreateProfile(session.user.id)

  await db
    .delete(caregiverCareTypes)
    .where(eq(caregiverCareTypes.caregiverId, profile.id))

  if (careTypes.length > 0) {
    await db
      .insert(caregiverCareTypes)
      .values(careTypes.map(careType => ({ caregiverId: profile.id, careType })))
  }

  await db
    .update(caregiverProfiles)
    .set({ completedStep: 1 })
    .where(eq(caregiverProfiles.id, profile.id))

  redirect('/get-started/caregiver/step-2')
}

export async function saveCaregiverStep2(data: {
  experience: string
  certifications: string[]
  languages: string[]
  education: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const profile = await getOrCreateProfile(session.user.id)

  await db
    .update(caregiverProfiles)
    .set({ experience: data.experience, education: data.education, completedStep: 2 })
    .where(eq(caregiverProfiles.id, profile.id))

  await db
    .delete(caregiverCertifications)
    .where(eq(caregiverCertifications.caregiverId, profile.id))

  if (data.certifications.length > 0) {
    await db
      .insert(caregiverCertifications)
      .values(data.certifications.map(certification => ({ caregiverId: profile.id, certification })))
  }

  await db
    .delete(caregiverLanguages)
    .where(eq(caregiverLanguages.caregiverId, profile.id))

  if (data.languages.length > 0) {
    await db
      .insert(caregiverLanguages)
      .values(data.languages.map(language => ({ caregiverId: profile.id, language })))
  }

  redirect('/get-started/caregiver/step-3')
}

export async function saveCaregiverStep3(data: {
  workTypes: string[]
  days: string[]
  shifts: string[]
  startAvailability: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const profile = await getOrCreateProfile(session.user.id)

  await db
    .delete(caregiverWorkPrefs)
    .where(
      and(
        eq(caregiverWorkPrefs.caregiverId, profile.id),
        isNull(caregiverWorkPrefs.travelDistanceMiles)
      )
    )

  const rows: (typeof caregiverWorkPrefs.$inferInsert)[] = [
    ...data.workTypes.map(workType => ({ caregiverId: profile.id, workType })),
    ...data.days.map(day => ({ caregiverId: profile.id, day })),
    ...data.shifts.map(shift => ({ caregiverId: profile.id, shift })),
    ...(data.startAvailability
      ? [{ caregiverId: profile.id, startAvailability: data.startAvailability }]
      : []),
  ]

  if (rows.length > 0) {
    await db.insert(caregiverWorkPrefs).values(rows)
  }

  await db
    .update(caregiverProfiles)
    .set({ completedStep: 3 })
    .where(eq(caregiverProfiles.id, profile.id))

  redirect('/get-started/caregiver/step-4')
}

export async function saveCaregiverStep4(data: {
  address1: string
  address2: string
  city: string
  state: string
  travelDistances: number[]
  relocatable: boolean
  hourlyMin: string
  hourlyMax: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const profile = await getOrCreateProfile(session.user.id)

  await db
    .delete(caregiverWorkPrefs)
    .where(
      and(
        eq(caregiverWorkPrefs.caregiverId, profile.id),
        isNotNull(caregiverWorkPrefs.travelDistanceMiles)
      )
    )

  if (data.travelDistances.length > 0) {
    await db
      .insert(caregiverWorkPrefs)
      .values(
        data.travelDistances.map(miles => ({
          caregiverId: profile.id,
          travelDistanceMiles: miles,
        }))
      )
  }

  await db
    .insert(caregiverLocations)
    .values({
      caregiverId: profile.id,
      address1: data.address1,
      address2: data.address2 || null,
      city: data.city,
      state: data.state,
    })
    .onConflictDoUpdate({
      target: caregiverLocations.caregiverId,
      set: {
        address1: data.address1,
        address2: data.address2 || null,
        city: data.city,
        state: data.state,
      },
    })

  await db
    .update(caregiverProfiles)
    .set({
      hourlyMin: data.hourlyMin,
      hourlyMax: data.hourlyMax,
      relocatable: data.relocatable,
      completedStep: 4,
    })
    .where(eq(caregiverProfiles.id, profile.id))

  redirect('/get-started/caregiver/step-5')
}

export async function saveCaregiverStep5(data: {
  name: string
  phone: string
  headline: string
  about: string
  photoUrl?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const profile = await getOrCreateProfile(session.user.id)

  await db
    .update(caregiverProfiles)
    .set({
      headline: data.headline,
      about: data.about,
      ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),
      status: 'active',
      completedStep: 5,
    })
    .where(eq(caregiverProfiles.id, profile.id))

  await db
    .update(users)
    .set({ name: data.name, phone: data.phone, role: 'caregiver' })
    .where(eq(users.id, session.user.id))

  redirect('/get-started/caregiver/complete')
}
