import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRequests, careRecipients } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'
import { CareRequestModal } from '../_components/care-request-modal'

const STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  active:    'Matching in progress…',
  matched:   'Matched',
  filled:    'Filled',
  cancelled: 'Cancelled',
}

const STATUS_CLASSES: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  active:    'bg-blue-100 text-blue-700',
  matched:   'bg-green-100 text-green-700',
  filled:    'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
}

export default async function RequestsPage() {
  const session = await requireRole('client')
  const userId = session.user.id!

  const [requests, existingRecipients] = await Promise.all([
    db
      .select({
        id:           careRequests.id,
        title:        careRequests.title,
        careType:     careRequests.careType,
        status:       careRequests.status,
        createdAt:    careRequests.createdAt,
        recipientName:careRecipients.name,
      })
      .from(careRequests)
      .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
      .where(eq(careRequests.clientId, userId))
      .orderBy(desc(careRequests.createdAt)),
    db
      .select({
        id:           careRecipients.id,
        name:         careRecipients.name,
        relationship: careRecipients.relationship,
        photoUrl:     careRecipients.photoUrl,
      })
      .from(careRecipients)
      .where(eq(careRecipients.clientId, userId)),
  ])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Care Requests</h1>
        <CareRequestModal recipients={existingRecipients} />
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-muted-foreground">No care requests yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first request to start finding caregivers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4 gap-4">
              <div className="min-w-0 space-y-1">
                <p className="font-medium truncate">{req.title ?? '(Untitled)'}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5">{req.careType}</span>
                  {req.recipientName && <span>for {req.recipientName}</span>}
                  <span>· {formatDistanceToNow(req.createdAt, { addSuffix: true })}</span>
                </div>
              </div>
              <span className={['shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', STATUS_CLASSES[req.status ?? 'draft']].join(' ')}>
                {STATUS_LABELS[req.status ?? 'draft']}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
