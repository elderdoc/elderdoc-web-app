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
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const stats = [
    { num: '01', label: 'Care Recipients', value: recipientCount.value, href: '/client/dashboard/recipients' },
    { num: '02', label: 'Active Requests', value: activeRequestCount.value, href: '/client/dashboard/requests' },
    { num: '03', label: 'Pending Matches', value: pendingMatchCount.value, href: '/client/dashboard/find-caregivers' },
  ]

  return (
    <div className="px-6 lg:px-12 py-10 lg:py-14 max-w-[1400px] mx-auto">
      {/* Masthead */}
      <header className="border-b border-foreground/30 pb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {today}
        </div>
        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="ed-eyebrow">A note for {firstName}</p>
            <h1 className="ed-display mt-3 text-[44px] sm:text-[60px] md:text-[72px]">
              Good to see you,{' '}
              <span className="italic font-light text-[var(--forest-deep)]">{firstName}</span>.
            </h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/client/dashboard/recipients/new"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/15 bg-transparent px-4 text-[13px] font-medium text-foreground transition-all hover:border-foreground/40 hover:bg-foreground/[0.025]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Recipient
            </Link>
            <Link
              href="/client/dashboard/requests/new"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_18px_-6px_rgba(15,20,16,0.3)]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              New Care Request
            </Link>
          </div>
        </div>
      </header>

      {/* Stats — editorial figures */}
      <section className="mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="group/stat relative bg-background p-6 transition-colors hover:bg-card"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {s.num} · {s.label}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="text-foreground/30 transition-all group-hover/stat:translate-x-0.5 group-hover/stat:text-foreground"
                >
                  <path d="M3 11L11 3M11 3H5M11 3v6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="ed-figure mt-4 text-[68px] leading-[1] tracking-[-0.045em]">
                {String(s.value).padStart(2, '0')}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Two-column editorial split */}
      <section className="mt-16 grid grid-cols-12 gap-x-6 gap-y-12 lg:gap-x-10">
        {/* Recent Requests */}
        <div className="col-span-12 lg:col-span-7">
          <div className="flex items-baseline justify-between border-b border-foreground/30 pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Section I
              </p>
              <h2 className="ed-display mt-1 text-[28px] md:text-[32px]">
                Recent Requests
              </h2>
            </div>
            <Link href="/client/dashboard/requests" className="ed-link text-[13px]">
              View all →
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <div className="mt-8 border border-dashed border-border rounded-md p-10 text-center">
              <p className="font-display text-[20px] tracking-[-0.02em] text-foreground/80">
                No requests yet.
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Begin by adding a recipient and creating a care request.
              </p>
              <Link
                href="/client/dashboard/requests/new"
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-all hover:translate-y-[-1px]"
              >
                Create your first request
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {recentRequests.map((req) => (
                <CareRequestCard key={req.id} req={req} />
              ))}
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="col-span-12 lg:col-span-5">
          <div className="border-b border-foreground/30 pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Section II
            </p>
            <h2 className="ed-display mt-1 text-[28px] md:text-[32px]">
              In the Margins
            </h2>
          </div>

          {activity.length === 0 ? (
            <p className="mt-8 text-[14px] text-muted-foreground italic">
              Your activity will appear here as it happens.
            </p>
          ) : (
            <ol className="mt-6 space-y-0">
              {activity.map((item, i) => (
                <li
                  key={`${i}-${item.type}-${item.createdAt.getTime()}`}
                  className="group/item relative flex gap-5 border-b border-border py-4 last:border-b-0"
                >
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70 mt-1 shrink-0 w-6">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] leading-relaxed">
                      {item.type === 'recipient' ? (
                        <>You added <span className="font-display italic text-[var(--forest-deep)]">{item.name}</span> as a recipient</>
                      ) : (
                        <>You created a <span className="font-display italic text-[var(--forest-deep)]">{item.careType}</span> request</>
                      )}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

    </div>
  )
}
