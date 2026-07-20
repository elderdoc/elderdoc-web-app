import { auth } from '@/auth'
import { eq } from 'drizzle-orm'
import { db } from '@/services/db'
import {
  caregiverProfiles,
  caregiverCertifications,
  caregiverLanguages,
} from '@/db/schema'
import { Step2Form } from './_components/step-2-form'

export default async function CaregiverStep2() {
  const session = await auth()
  if (!session?.user?.id) return null

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id),
  })

  const [certRows, langRows] = profile
    ? await Promise.all([
        db
          .select({ certification: caregiverCertifications.certification })
          .from(caregiverCertifications)
          .where(eq(caregiverCertifications.caregiverId, profile.id)),
        db
          .select({ language: caregiverLanguages.language })
          .from(caregiverLanguages)
          .where(eq(caregiverLanguages.caregiverId, profile.id)),
      ])
    : [[], []]

  return (
    <Step2Form
      initialExperience={profile?.experience ?? ''}
      initialCertifications={certRows.map(r => r.certification)}
      initialLanguages={langRows.map(r => r.language)}
      initialEducation={profile?.education ?? ''}
    />
  )
}
