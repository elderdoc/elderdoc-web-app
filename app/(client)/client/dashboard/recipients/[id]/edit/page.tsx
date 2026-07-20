import { notFound } from 'next/navigation'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRecipients } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { EditRecipientForm } from './_components/edit-recipient-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditRecipientPage({ params }: PageProps) {
  const { id } = await params
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [r] = await db
    .select()
    .from(careRecipients)
    .where(and(eq(careRecipients.id, id), eq(careRecipients.clientId, clientId)))
    .limit(1)

  if (!r) notFound()

  return <EditRecipientForm recipient={r} />
}
