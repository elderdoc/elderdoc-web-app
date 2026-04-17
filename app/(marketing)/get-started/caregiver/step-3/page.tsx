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

  return (
    <Step3Form
      initialWorkTypes={workPrefRows.filter(r => r.workType).map(r => r.workType!)}
      initialDays={workPrefRows.filter(r => r.day).map(r => r.day!)}
      initialShifts={workPrefRows.filter(r => r.shift).map(r => r.shift!)}
      initialStart={workPrefRows.find(r => r.startAvailability)?.startAvailability ?? ''}
    />
  )
}
