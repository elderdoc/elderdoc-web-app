import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRecipients, careRequests } from '@/db/schema'
import { eq, isNotNull, avg } from 'drizzle-orm'
import { NewRequestForm } from './_components/new-request-form'

interface PageProps {
  searchParams: Promise<{ recipientId?: string }>
}

export default async function NewRequestPage({ searchParams }: PageProps) {
  const session = await requireRole('client')
  const userId = session.user.id!
  const { recipientId } = await searchParams

  const [recipients, avgRateRows] = await Promise.all([
    db
      .select({
        id:           careRecipients.id,
        name:         careRecipients.name,
        relationship: careRecipients.relationship,
        photoUrl:     careRecipients.photoUrl,
        address:      careRecipients.address,
        conditions:   careRecipients.conditions,
        mobilityLevel:careRecipients.mobilityLevel,
        height:       careRecipients.height,
        weight:       careRecipients.weight,
        clientStatus: careRecipients.clientStatus,
      })
      .from(careRecipients)
      .where(eq(careRecipients.clientId, userId)),
    db
      .select({
        careType: careRequests.careType,
        avgMin:   avg(careRequests.budgetMin),
        avgMax:   avg(careRequests.budgetMax),
      })
      .from(careRequests)
      .where(isNotNull(careRequests.budgetMin))
      .groupBy(careRequests.careType),
  ])

  const avgRatesByCareType: Record<string, { min: number; max: number }> = {}
  for (const row of avgRateRows) {
    if (row.avgMin && row.avgMax) {
      avgRatesByCareType[row.careType] = {
        min: Math.round(Number(row.avgMin)),
        max: Math.round(Number(row.avgMax)),
      }
    }
  }

  return (
    <NewRequestForm
      initialRecipients={recipients}
      initialRecipientId={recipientId}
      avgRatesByCareType={avgRatesByCareType}
    />
  )
}
