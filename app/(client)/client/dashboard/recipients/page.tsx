import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRecipients } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { CareRecipientModal } from '../_components/care-recipient-modal'
import { CONDITIONS } from '@/lib/constants'

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
    })
    .from(careRecipients)
    .where(eq(careRecipients.clientId, userId))
    .orderBy(desc(careRecipients.createdAt))

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Care Recipients</h1>
        <CareRecipientModal />
      </div>

      {recipients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-muted-foreground">No recipients yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Add someone you care for to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {recipients.map((r) => {
            const initials = r.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
            return (
              <div key={r.id} className="rounded-lg border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  {/* TODO: replace with next/image once storage domain is in remotePatterns */}
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt={r.name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {initials}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.name}</p>
                    {r.relationship && (
                      <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                        {r.relationship.replace(/-/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
                {r.conditions && r.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.conditions.slice(0, 3).map((c) => (
                      <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-xs">{CONDITIONS_LABELS[c] ?? c}</span>
                    ))}
                    {r.conditions.length > 3 && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">+{r.conditions.length - 3} more</span>
                    )}
                  </div>
                )}
                {r.mobilityLevel && (
                  <p className="text-xs text-muted-foreground capitalize">
                    Mobility: {r.mobilityLevel.replace(/-/g, ' ')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
