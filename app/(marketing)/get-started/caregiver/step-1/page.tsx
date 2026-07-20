import { auth } from '@/auth'
import { eq } from 'drizzle-orm'
import { db } from '@/services/db'
import { caregiverProfiles, caregiverCareTypes } from '@/db/schema'
import { getActiveCareTypes } from '@/lib/care-types'
import { Step1Form } from './_components/step-1-form'

export default async function CaregiverStep1() {
  const session = await auth()
  if (!session?.user?.id) return null

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })

  const existingRows = profile
    ? await db
        .select({ careType: caregiverCareTypes.careType })
        .from(caregiverCareTypes)
        .where(eq(caregiverCareTypes.caregiverId, profile.id))
    : []

  const careTypes = await getActiveCareTypes()

  return (
    <Step1Form
      initialCareTypes={existingRows.map(r => r.careType)}
      careTypes={careTypes.map(c => ({ key: c.key, label: c.label, description: c.description, icon: c.icon }))}
    />
  )
}
