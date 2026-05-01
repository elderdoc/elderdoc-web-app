import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRequests, careRecipients } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
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
      budgetMin:     careRequests.budgetMin,
      schedule:      careRequests.schedule,
      createdAt:     careRequests.createdAt,
      recipientName: careRecipients.name,
    })
    .from(careRequests)
    .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
    .where(eq(careRequests.clientId, userId))
    .orderBy(desc(careRequests.createdAt))

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 max-w-[1200px] mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-[1.15]">
            Care Requests
          </h1>
          <p className="mt-1.5 text-[14.5px] text-muted-foreground">
            All your care requests in one place.
          </p>
        </div>
        <Link
          href="/client/dashboard/requests/new"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13.5px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)]"
        >
          <Plus className="h-4 w-4" />
          New care request
        </Link>
      </header>

      {requests.length === 0 ? (
        <div className="rounded-[16px] border-2 border-dashed border-border bg-card p-12 text-center max-w-2xl mx-auto">
          <div className="mx-auto h-14 w-14 rounded-full bg-[var(--forest-soft)] flex items-center justify-center mb-5">
            <FileText className="h-6 w-6 text-[var(--forest-deep)]" />
          </div>
          <h3 className="text-[18px] font-semibold">No care requests yet</h3>
          <p className="mt-2 text-[14px] text-muted-foreground max-w-sm mx-auto">
            Create your first request to start finding caregivers matched to your needs.
          </p>
          <Link
            href="/client/dashboard/requests/new"
            className="mt-6 inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)]"
          >
            <Plus className="h-4 w-4" />
            Create your first request
          </Link>
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
