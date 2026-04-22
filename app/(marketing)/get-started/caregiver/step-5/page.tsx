import { auth } from '@/auth'
import { eq, isNotNull, and } from 'drizzle-orm'
import { db } from '@/services/db'
import { caregiverProfiles, caregiverLocations, caregiverWorkPrefs } from '@/db/schema'
import { getRateDefaults } from '@/lib/rate-defaults'
import type { ExperienceKey } from '@/lib/rate-defaults'
import { Step4Form } from './_components/step-4-form'

export default async function CaregiverStep4() {
  const session = await auth()
  if (!session?.user?.id) return null

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })

  const location = profile
    ? await db
        .select()
        .from(caregiverLocations)
        .where(eq(caregiverLocations.caregiverId, profile.id))
        .limit(1)
        .then(r => r[0] ?? null)
    : null

  const travelRows = profile
    ? await db
        .select({ miles: caregiverWorkPrefs.travelDistanceMiles })
        .from(caregiverWorkPrefs)
        .where(
          and(
            eq(caregiverWorkPrefs.caregiverId, profile.id),
            isNotNull(caregiverWorkPrefs.travelDistanceMiles)
          )
        )
    : []

  const rateDefaults =
    profile?.experience
      ? getRateDefaults(profile.experience as ExperienceKey)
      : { min: 20, max: 30 }

  return (
    <Step4Form
      initialAddress1={location?.address1 ?? ''}
      initialAddress2={location?.address2 ?? ''}
      initialCity={location?.city ?? ''}
      initialState={location?.state ?? ''}
      initialZip={location?.zip ?? ''}
      initialTravelDistances={travelRows.map(r => r.miles!)}
      initialRelocatable={profile?.relocatable ?? false}
      initialHourlyMin={profile?.hourlyMin ?? String(rateDefaults.min)}
      initialHourlyMax={profile?.hourlyMax ?? String(rateDefaults.max)}
    />
  )
}
