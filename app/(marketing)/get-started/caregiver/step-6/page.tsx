import { auth } from '@/auth'
import { eq } from 'drizzle-orm'
import { db } from '@/services/db'
import { caregiverProfiles, users } from '@/db/schema'
import { Step5Form } from './_components/step-5-form'

export default async function CaregiverStep5() {
  const session = await auth()
  if (!session?.user?.id) return null

  const [profile, user] = await Promise.all([
    db.query.caregiverProfiles.findFirst({
      where: eq(caregiverProfiles.userId, session.user.id),
    }),
    db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    }),
  ])

  return (
    <Step5Form
      initialName={user?.name ?? ''}
      initialPhone={user?.phone ?? ''}
      initialHeadline={profile?.headline ?? ''}
      initialAbout={profile?.about ?? ''}
      initialPhotoUrl={profile?.photoUrl ?? null}
      initialGender={profile?.gender ?? ''}
      initialTransportationMode={profile?.transportationMode ?? ''}
    />
  )
}
