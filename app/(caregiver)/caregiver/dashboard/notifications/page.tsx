import Link from 'next/link'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { notifications } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

function formatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function caregiverHref(type: string, payload: Record<string, string> | null): string {
  const requestId = payload?.requestId
  const jobId     = payload?.jobId
  const offerId   = payload?.offerId ?? payload?.matchId

  if (type === 'offer_received') {
    if (offerId) return `/caregiver/dashboard/offers?offerId=${offerId}`
    return '/caregiver/dashboard/offers'
  }
  if (type === 'application_accepted' || type === 'application_declined') {
    if (jobId) return `/caregiver/dashboard/messages/${jobId}`
    return '/caregiver/dashboard/my-jobs'
  }
  if (type === 'job_started') {
    if (jobId) return `/caregiver/dashboard/messages/${jobId}`
    return '/caregiver/dashboard/my-jobs'
  }
  if (type === 'shift_scheduled' || type === 'shift_completed' || type === 'shift_cancelled' || type === 'shift_edited') {
    return '/caregiver/dashboard/shifts'
  }
  if (type === 'message_received') {
    if (jobId) return `/caregiver/dashboard/messages/${jobId}`
    return '/caregiver/dashboard/messages'
  }
  if (type === 'payment_received' || type === 'payment_completed') {
    return '/caregiver/dashboard/payouts'
  }
  if (type === 'new_job_match' || type === 'new_request') {
    return '/caregiver/dashboard/find-jobs'
  }

  // Generic fallbacks
  if (jobId)     return `/caregiver/dashboard/messages/${jobId}`
  if (offerId)   return `/caregiver/dashboard/offers?offerId=${offerId}`
  if (requestId) return '/caregiver/dashboard/find-jobs'
  return '/caregiver/dashboard'
}

export default async function NotificationsPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50)

  if (rows.some((r) => !r.read)) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId))
  }

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-1">Notifications</h1>
      <p className="text-sm text-muted-foreground mb-8">Your recent activity and updates.</p>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => {
            const payload = n.payload as Record<string, string> | null
            const message = payload?.message ?? payload?.body ?? formatType(n.type)
            const href = caregiverHref(n.type, payload)
            return (
              <Link
                key={n.id}
                href={href}
                className={[
                  'block rounded-xl border px-5 py-4 transition-colors hover:bg-accent',
                  n.read
                    ? 'border-border bg-card'
                    : 'border-primary/20 bg-primary/5',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">
                      {formatType(n.type)}
                    </p>
                    <p className="text-sm">{message}</p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {n.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
