import { notFound } from 'next/navigation'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRequests, careRecipients, careRequestLocations } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { EditRequestForm } from './_components/edit-request-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditRequestPage({ params }: PageProps) {
  const { id } = await params
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [rows, locationRows] = await Promise.all([
    db
      .select({
        id:            careRequests.id,
        title:         careRequests.title,
        description:   careRequests.description,
        careType:      careRequests.careType,
        status:        careRequests.status,
        frequency:     careRequests.frequency,
        schedule:      careRequests.schedule,
        startDate:     careRequests.startDate,
        genderPref:    careRequests.genderPref,
        languagesPreferred: careRequests.languagesPreferred,
        languagesRequired:  careRequests.languagesRequired,
        budgetType:    careRequests.budgetType,
        budgetMin:     careRequests.budgetMin,
        budgetMax:     careRequests.budgetMax,
        recipientName: careRecipients.name,
      })
      .from(careRequests)
      .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
      .where(and(eq(careRequests.id, id), eq(careRequests.clientId, clientId)))
      .limit(1),
    db
      .select({ address1: careRequestLocations.address1, city: careRequestLocations.city, state: careRequestLocations.state })
      .from(careRequestLocations)
      .where(eq(careRequestLocations.requestId, id))
      .limit(1),
  ])

  if (!rows.length) notFound()
  const req = rows[0]
  if (req.status === 'filled' || req.status === 'cancelled') notFound()

  return <EditRequestForm request={req} location={locationRows[0] ?? null} />
}
