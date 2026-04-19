import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRecipients } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { CONDITIONS } from '@/lib/constants'
import { RecipientCard } from './_components/recipient-card'

const CONDITIONS_LABELS: Record<string, string> = Object.fromEntries(
  CONDITIONS.map((c) => [c.key, c.label])
)

export default async function RecipientsPage() {
  const session = await requireRole('client')
  const userId = session.user.id!

  const recipients = await db
    .select({
      id:           careRecipients.id,
      name:         careRecipients.name,
      relationship: careRecipients.relationship,
      photoUrl:     careRecipients.photoUrl,
      conditions:   careRecipients.conditions,
      mobilityLevel:careRecipients.mobilityLevel,
      dob:          careRecipients.dob,
      phone:        careRecipients.phone,
      gender:       careRecipients.gender,
      notes:        careRecipients.notes,
      address:      careRecipients.address,
    })
    .from(careRecipients)
    .where(eq(careRecipients.clientId, userId))
    .orderBy(desc(careRecipients.createdAt))

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Care Recipients</h1>
        <Link
          href="/client/dashboard/recipients/new"
          className="self-start px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap"
        >
          + Add Recipient
        </Link>
      </div>

      {recipients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-muted-foreground">No recipients yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Add someone you care for to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recipients.map((r) => (
            <RecipientCard key={r.id} recipient={r} conditionLabels={CONDITIONS_LABELS} />
          ))}
        </div>
      )}
    </div>
  )
}
