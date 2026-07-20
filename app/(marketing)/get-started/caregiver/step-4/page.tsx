import { auth } from '@/auth'
import { db } from '@/services/db'
import { caregiverProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Step4Form } from './_components/step-4-form'

export default async function Step4Page() {
  const session = await auth()
  if (!session?.user?.id) return null

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })

  const initialCapabilities = (profile?.careCapabilities as {
    activityMobilitySafety: string[]
    hygieneElimination: string[]
    homeManagement: string[]
    hydrationNutrition: string[]
    medicationReminders: string[]
  } | null) ?? {
    activityMobilitySafety: [],
    hygieneElimination:     [],
    homeManagement:         [],
    hydrationNutrition:     [],
    medicationReminders:    [],
  }
  const initialSpecialNeeds = (profile?.specialNeedsHandling as Record<string, boolean> | null) ?? {}
  const initialMaxCarryLbs = profile?.maxCarryLbs ?? null

  return (
    <Step4Form
      initialCapabilities={initialCapabilities}
      initialSpecialNeeds={initialSpecialNeeds}
      initialMaxCarryLbs={initialMaxCarryLbs}
    />
  )
}
