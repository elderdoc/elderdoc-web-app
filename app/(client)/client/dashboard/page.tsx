import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRecipients, careRequests, matches } from '@/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Plus, Users, FileText, Sparkles, ArrowRight } from 'lucide-react'

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
    db.select({ value: count() }).from(careRecipients).where(eq(careRecipients.clientId, userId)),
    db.select({ value: count() }).from(careRequests).where(and(eq(careRequests.clientId, userId), eq(careRequests.status, 'active'))),
    db
      .select({ value: count() })
      .from(matches)
      .innerJoin(careRequests, eq(matches.requestId, careRequests.id))
      .where(and(eq(careRequests.clientId, userId), eq(matches.status, 'pending'))),
    db
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

  const firstName = session.user.name?.split(' ')[0] ?? 'there'

  const stats = [
    { label: 'Care Recipients', value: recipientCount.value, href: '/client/dashboard/recipients', icon: Users },
    { label: 'Active Requests', value: activeRequestCount.value, href: '/client/dashboard/requests', icon: FileText },
    { label: 'Pending Matches', value: pendingMatchCount.value, href: '/client/dashboard/find-caregivers', icon: Sparkles },
  ]

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 max-w-[1200px] mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-[1.15]">
            Hi {firstName}, welcome back.
          </h1>
          <p className="mt-1.5 text-[14.5px] text-muted-foreground">
            Here&apos;s what&apos;s happening with your care today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/client/dashboard/recipients/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-[13.5px] font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            Add recipient
          </Link>
          <Link
            href="/client/dashboard/requests/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13.5px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)]"
          >
            <Plus className="h-4 w-4" />
            New care request
          </Link>
        </div>
      </header>

      {/* Stats */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <Link
                key={s.label}
                href={s.href}
                className="group/stat flex items-center justify-between gap-4 rounded-[14px] border border-border bg-card p-5 transition-all hover:border-foreground/15 hover:shadow-[0_8px_24px_-12px_rgba(15,20,16,0.1)] hover:-translate-y-0.5"
              >
                <div>
                  <div className="text-[13px] text-muted-foreground">{s.label}</div>
                  <div className="mt-1 text-[34px] font-semibold tabular-nums tracking-tight">{String(s.value)}</div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--forest-soft)] text-[var(--forest-deep)] transition-transform group-hover/stat:scale-105">
                  <Icon className="h-5 w-5" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Two-column */}
      <section className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Requests */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] font-semibold tracking-tight">Recent requests</h2>
            <Link href="/client/dashboard/requests" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline underline-offset-4">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <div className="rounded-[14px] border-2 border-dashed border-border bg-card p-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-[var(--forest-soft)] flex items-center justify-center mb-4">
                <FileText className="h-5 w-5 text-[var(--forest-deep)]" />
              </div>
              <h3 className="text-[17px] font-semibold">No requests yet</h3>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                Start by creating your first care request.
              </p>
              <Link
                href="/client/dashboard/requests/new"
                className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)]"
              >
                <Plus className="h-4 w-4" />
                Create your first request
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((req) => (
                <CareRequestCard key={req.id} req={req} />
              ))}
            </div>
          )}
        </div>

        {/* Activity */}
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight mb-4">Recent activity</h2>
          {activity.length === 0 ? (
            <div className="rounded-[14px] border border-border bg-card p-6 text-center">
              <p className="text-[14px] text-muted-foreground">
                Activity will appear here as it happens.
              </p>
            </div>
          ) : (
            <div className="rounded-[14px] border border-border bg-card overflow-hidden">
              <ol className="divide-y divide-border">
                {activity.map((item, i) => (
                  <li key={`${i}-${item.type}-${item.createdAt.getTime()}`} className="flex gap-3 px-4 py-3.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] leading-relaxed">
                        {item.type === 'recipient'
                          ? <>You added <span className="font-medium">{item.name}</span></>
                          : <>You created a <span className="font-medium">{item.careType}</span> request</>}
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
