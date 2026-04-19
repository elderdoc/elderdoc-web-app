import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRecipients, caregiverProfiles } from '@/db/schema'
import { eq, isNotNull, avg } from 'drizzle-orm'
import { NewRequestForm } from './_components/new-request-form'

interface PageProps {
  searchParams: Promise<{ recipientId?: string }>
}

export default async function NewRequestPage({ searchParams }: PageProps) {
  const session = await requireRole('client')
  const userId = session.user.id!
  const { recipientId } = await searchParams

  const [recipients, rateRow] = await Promise.all([
    db
      .select({
        id:           careRecipients.id,
        name:         careRecipients.name,
        relationship: careRecipients.relationship,
        photoUrl:     careRecipients.photoUrl,
      })
      .from(careRecipients)
      .where(eq(careRecipients.clientId, userId)),
    db
      .select({
        avgMin: avg(caregiverProfiles.hourlyMin),
        avgMax: avg(caregiverProfiles.hourlyMax),
      })
      .from(caregiverProfiles)
      .where(isNotNull(caregiverProfiles.hourlyMin)),
  ])

  const avgHourlyMin = rateRow[0]?.avgMin ? Math.round(Number(rateRow[0].avgMin)) : null
  const avgHourlyMax = rateRow[0]?.avgMax ? Math.round(Number(rateRow[0].avgMax)) : null

  return (
    <NewRequestForm
      initialRecipients={recipients}
      initialRecipientId={recipientId}
      avgHourlyMin={avgHourlyMin}
      avgHourlyMax={avgHourlyMax}
    />
  )
}
