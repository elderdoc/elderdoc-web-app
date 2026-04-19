import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRecipients, careRequests, matches } from '@/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

import { CareRequestCard } from './_components/care-request-card'

type ActivityItem =
  | { type: 'recipient'; name: string; createdAt: Date }
  | { type: 'request'; careType: string; createdAt: Date }

export default async function ClientDashboard() {
  const session = await requireRole('client')
  const userId = session.user.id!

  const [
    [recipientCount],
    [activeRequestCount],
    [pendingMatchCount],
    recentRequests,
    recentRecipientsRaw,
    recentRequestsActivityRaw,
  ] = await Promise.all([
    // Count queries
    db.select({ value: count() }).from(careRecipients).where(eq(careRecipients.clientId, userId)),
    db.select({ value: count() }).from(careRequests).where(and(eq(careRequests.clientId, userId), eq(careRequests.status, 'active'))),
    db
      .select({ value: count() })
      .from(matches)
      .innerJoin(careRequests, eq(matches.requestId, careRequests.id))
      .where(and(eq(careRequests.clientId, userId), eq(matches.status, 'pending'))),
    // Data queries
    db
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
      .limit(5),
    db
      .select({ name: careRecipients.name, createdAt: careRecipients.createdAt })
      .from(careRecipients)
      .where(eq(careRecipients.clientId, userId))
      .orderBy(desc(careRecipients.createdAt))
      .limit(10),
    db
      .select({ careType: careRequests.careType, createdAt: careRequests.createdAt })
      .from(careRequests)
      .where(eq(careRequests.clientId, userId))
      .orderBy(desc(careRequests.createdAt))
      .limit(10),
  ])

  const activity: ActivityItem[] = [
    ...recentRecipientsRaw.map((r) => ({ type: 'recipient' as const, name: r.name, createdAt: r.createdAt })),
    ...recentRequestsActivityRaw.map((r) => ({ type: 'request' as const, careType: r.careType, createdAt: r.createdAt })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, {session.user.name?.split(' ')[0]}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/client/dashboard/recipients/new"
            className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            + Recipient
          </Link>
          <Link
            href="/client/dashboard/requests/new"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap"
          >
            + Care Request
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Care Recipients', value: recipientCount.value },
          { label: 'Active Requests', value: activeRequestCount.value },
          { label: 'Pending Matches', value: pendingMatchCount.value },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{String(stat.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Recent Requests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Requests</h2>
            <Link href="/client/dashboard/requests" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((req) => (
                <CareRequestCard key={req.id} req={req} />
              ))}
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ol className="space-y-3">
              {activity.map((item) => (
                <li key={`${item.type}-${item.createdAt.getTime()}`} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                  <div>
                    <p>
                      {item.type === 'recipient'
                        ? `You added ${item.name} as a care recipient`
                        : `You created a ${item.careType} care request`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
