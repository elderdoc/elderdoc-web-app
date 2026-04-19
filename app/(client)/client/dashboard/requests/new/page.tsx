import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRecipients } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { NewRequestForm } from './_components/new-request-form'

interface PageProps {
  searchParams: Promise<{ recipientId?: string }>
}

export default async function NewRequestPage({ searchParams }: PageProps) {
  const session = await requireRole('client')
  const userId = session.user.id!
  const { recipientId } = await searchParams

  const recipients = await db
    .select({
      id:           careRecipients.id,
      name:         careRecipients.name,
      relationship: careRecipients.relationship,
      photoUrl:     careRecipients.photoUrl,
    })
    .from(careRecipients)
    .where(eq(careRecipients.clientId, userId))

  return <NewRequestForm initialRecipients={recipients} initialRecipientId={recipientId} />
}
