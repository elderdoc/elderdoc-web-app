import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { requireRole } from '@/domains/auth/session'
import { getCarePlanByRecipient } from '@/domains/clients/care-plans'
import { db } from '@/services/db'
import { careRecipients } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { CarePlanEditor } from './_components/care-plan-editor'

interface PageProps {
  params: Promise<{ recipientId: string }>
}

export default async function CarePlanDetailPage({ params }: PageProps) {
  const { recipientId } = await params
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [recipientRows, carePlan] = await Promise.all([
    db
      .select({ name: careRecipients.name })
      .from(careRecipients)
      .where(and(eq(careRecipients.id, recipientId), eq(careRecipients.clientId, clientId)))
      .limit(1),
    getCarePlanByRecipient(recipientId, clientId),
  ])

  if (recipientRows.length === 0) notFound()
  const recipientName = recipientRows[0].name

  return (
    <div className="p-8">
      <BackButton label="← Back to Care Plans" />
      <h1 className="text-2xl font-semibold mb-1">
        {recipientName}&apos;s Care Plan
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        This care plan is shared with any caregiver hired for {recipientName}.
      </p>

      <CarePlanEditor
        key={carePlan?.updatedAt?.toISOString() ?? 'empty'}
        recipientId={recipientId}
        carePlan={carePlan}
      />
    </div>
  )
}
