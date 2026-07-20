import { auth } from '@/auth'
import { eq, isNull, and } from 'drizzle-orm'
import { db } from '@/services/db'
import { caregiverProfiles, caregiverWorkPrefs } from '@/db/schema'
import { Step3Form } from './_components/step-3-form'

export default async function CaregiverStep3() {
  const session = await auth()
  if (!session?.user?.id) return null

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })

  const workPrefRows = profile
    ? await db
        .select()
        .from(caregiverWorkPrefs)
        .where(
          and(
            eq(caregiverWorkPrefs.caregiverId, profile.id),
            isNull(caregiverWorkPrefs.travelDistanceMiles)
          )
        )
    : []

  const initialWorkTypes = workPrefRows.filter(r => r.workType).map(r => r.workType!)
  const initialStart = workPrefRows.find(r => r.startAvailability)?.startAvailability ?? ''
  const initialAvailability = (profile?.availability as Array<{ day: string; startTime: string; endTime: string }> | null) ?? []

  return (
    <Step3Form
      initialWorkTypes={initialWorkTypes}
      initialAvailability={initialAvailability}
      initialStart={initialStart}
    />
  )
}
