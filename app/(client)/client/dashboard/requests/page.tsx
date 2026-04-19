import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRequests, careRecipients } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { CareRequestCard } from '../_components/care-request-card'

export default async function RequestsPage() {
  const session = await requireRole('client')
  const userId = session.user.id!

  const requests = await db
    .select({
      id:            careRequests.id,
      title:         careRequests.title,
      careType:      careRequests.careType,
      status:        careRequests.status,
      frequency:     careRequests.frequency,
      budgetType:    careRequests.budgetType,
      budgetAmount:  careRequests.budgetAmount,
      durationHours: careRequests.durationHours,
      shifts:        careRequests.shifts,
      createdAt:     careRequests.createdAt,
      recipientName: careRecipients.name,
    })
    .from(careRequests)
    .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
    .where(eq(careRequests.clientId, userId))
    .orderBy(desc(careRequests.createdAt))

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Care Requests</h1>
        <Link
          href="/client/dashboard/requests/new"
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap"
        >
          + Care Request
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-muted-foreground">No care requests yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first request to start finding caregivers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <CareRequestCard key={req.id} req={req} />
          ))}
        </div>
      )}
    </div>
  )
}
