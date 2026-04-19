import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import {
  users, caregiverProfiles, caregiverCareTypes, caregiverCertifications,
  caregiverLanguages, caregiverWorkPrefs, caregiverLocations,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { CaregiverProfileForm } from './_components/caregiver-profile-form'

export default async function CaregiverProfilePage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const [profileRow] = await db
    .select({
      id:          caregiverProfiles.id,
      headline:    caregiverProfiles.headline,
      about:       caregiverProfiles.about,
      photoUrl:    caregiverProfiles.photoUrl,
      hourlyMin:   caregiverProfiles.hourlyMin,
      hourlyMax:   caregiverProfiles.hourlyMax,
      experience:  caregiverProfiles.experience,
      education:   caregiverProfiles.education,
      relocatable: caregiverProfiles.relocatable,
      name:        users.name,
      email:       users.email,
      phone:       users.phone,
      image:       users.image,
    })
    .from(caregiverProfiles)
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .where(eq(caregiverProfiles.userId, userId))
    .limit(1)

  if (!profileRow) notFound()

  const [careTypes, certs, langs, workPrefs, location] = await Promise.all([
    db.select({ careType: caregiverCareTypes.careType }).from(caregiverCareTypes).where(eq(caregiverCareTypes.caregiverId, profileRow.id)),
    db.select({ certification: caregiverCertifications.certification }).from(caregiverCertifications).where(eq(caregiverCertifications.caregiverId, profileRow.id)),
    db.select({ language: caregiverLanguages.language }).from(caregiverLanguages).where(eq(caregiverLanguages.caregiverId, profileRow.id)),
    db.select().from(caregiverWorkPrefs).where(eq(caregiverWorkPrefs.caregiverId, profileRow.id)),
    db.select().from(caregiverLocations).where(eq(caregiverLocations.caregiverId, profileRow.id)).limit(1),
  ])

  const workTypes    = [...new Set(workPrefs.map(w => w.workType).filter(Boolean))] as string[]
  const days         = [...new Set(workPrefs.map(w => w.day).filter(Boolean))] as string[]
  const shifts       = [...new Set(workPrefs.map(w => w.shift).filter(Boolean))] as string[]
  const travelDists  = [...new Set(workPrefs.map(w => w.travelDistanceMiles).filter(v => v != null))] as number[]
  const startAvail   = workPrefs.find(w => w.startAvailability)?.startAvailability ?? ''

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-8">My Profile</h1>
      <CaregiverProfileForm
        profile={{
          ...profileRow,
          careTypes:      careTypes.map(c => c.careType),
          certifications: certs.map(c => c.certification),
          languages:      langs.map(l => l.language),
          workTypes,
          days,
          shifts,
          startAvailability: startAvail,
          travelDistances: travelDists,
          address1: location[0]?.address1 ?? '',
          address2: location[0]?.address2 ?? '',
          city:     location[0]?.city ?? '',
          state:    location[0]?.state ?? '',
        }}
      />
    </div>
  )
}
