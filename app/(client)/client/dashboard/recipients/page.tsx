import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRecipients } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
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
    <div className="px-6 lg:px-10 py-8 lg:py-12 max-w-[1200px] mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-[1.15]">
            Care Recipients
          </h1>
          <p className="mt-1.5 text-[14.5px] text-muted-foreground">
            The people you&apos;re finding care for.
          </p>
        </div>
        <Link
          href="/client/dashboard/recipients/new"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13.5px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)]"
        >
          <Plus className="h-4 w-4" />
          Add recipient
        </Link>
      </header>

      {recipients.length === 0 ? (
        <div className="rounded-[16px] border-2 border-dashed border-border bg-card p-12 text-center max-w-2xl mx-auto">
          <div className="mx-auto h-14 w-14 rounded-full bg-[var(--forest-soft)] flex items-center justify-center mb-5">
            <Users className="h-6 w-6 text-[var(--forest-deep)]" />
          </div>
          <h3 className="text-[18px] font-semibold">No recipients yet</h3>
          <p className="mt-2 text-[14px] text-muted-foreground max-w-sm mx-auto">
            Add the person you&apos;re finding care for. You can add multiple recipients.
          </p>
          <Link
            href="/client/dashboard/recipients/new"
            className="mt-6 inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)]"
          >
            <Plus className="h-4 w-4" />
            Add your first recipient
          </Link>
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
