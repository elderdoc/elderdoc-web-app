import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRecipients, careRequests, matches, shifts, jobs } from '@/db/schema'
import { eq, and, desc, count, sql } from 'drizzle-orm'
import { formatDistanceToNow, subDays, format } from 'date-fns'
import Link from 'next/link'
import { Plus, Users, FileText, Sparkles, ArrowRight, Heart, Activity, TrendingUp } from 'lucide-react'

import { CareRequestCard } from './_components/care-request-card'
import { BarChart, Donut } from '@/components/charts'

function formatCareType(key: string): string {
  const map: Record<string, string> = {
    'personal-care': 'Personal Care',
    'companionship': 'Companionship',
    'dementia-care': 'Dementia Care',
    'mobility-assistance': 'Mobility Assistance',
    'post-hospital-recovery': 'Post-Hospital Recovery',
  }
  return map[key] ?? key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

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

  // Build 7-day shift activity for sparkline
  const today = new Date()
  const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(today, 6 - i))
  const shiftRows = await db
    .select({ date: shifts.date, status: shifts.status })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .where(eq(jobs.clientId, userId))
  const shiftsByDay: Record<string, number> = {}
  for (const r of shiftRows) {
    shiftsByDay[r.date] = (shiftsByDay[r.date] ?? 0) + 1
  }
  const barData = last7Days.map(d => ({
    label: format(d, 'EEE'),
    sublabel: format(d, 'M/d'),
    value: shiftsByDay[format(d, 'yyyy-MM-dd')] ?? 0,
  }))
  const totalShifts = barData.reduce((s, d) => s + d.value, 0)
  const busyDay = barData.reduce((best, d) => d.value > best.value ? d : best, barData[0])

  // Care types breakdown for donut
  const careTypeRows = await db
    .select({ careType: careRequests.careType, count: count() })
    .from(careRequests)
    .where(eq(careRequests.clientId, userId))
    .groupBy(careRequests.careType)
  const donutColors = ['var(--forest)', 'var(--terracotta)', '#7C9885', '#D4A574', '#A89F8E']
  const donutSegments = careTypeRows.slice(0, 5).map((r, i) => ({
    label: formatCareType(r.careType),
    value: Number(r.count),
    color: donutColors[i] ?? donutColors[0],
  }))
  const totalRequests = careTypeRows.reduce((s, r) => s + Number(r.count), 0)

  const firstName = session.user.name?.split(' ')[0] ?? 'there'

  const stats = [
    { label: 'Care Recipients', value: recipientCount.value, href: '/client/dashboard/recipients', icon: Users, color: 'forest' },
    { label: 'Active Requests', value: activeRequestCount.value, href: '/client/dashboard/requests', icon: FileText, color: 'forest' },
    { label: 'Pending Matches', value: pendingMatchCount.value, href: '/client/dashboard/matches', icon: Sparkles, color: 'forest' },
  ]

  return (
    <div className="relative px-6 lg:px-10 py-8 lg:py-10 max-w-[1200px] mx-auto">
      {/* Soft gradient mesh */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[var(--forest-soft)] blur-[120px] opacity-40" />
      </div>

      {/* Welcome hero */}
      <header className="mb-10">
        <div className="flex items-center gap-2 text-[13px] font-medium text-primary mb-3">
          <Heart className="h-3.5 w-3.5" />
          Family dashboard
        </div>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[32px] sm:text-[42px] md:text-[48px] font-semibold tracking-[-0.025em] leading-[1.1]">
              Hi {firstName}, <span className="font-serif italic font-normal text-primary">welcome back</span>.
            </h1>
            <p className="mt-2 text-[15px] text-foreground/65 max-w-md">
              Here&apos;s what&apos;s happening with your care today.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/client/dashboard/recipients/new"
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-card px-5 text-[14px] font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-muted hover:-translate-y-0.5 hover:shadow-[0_8px_18px_-6px_rgba(15,20,16,0.1)]"
            >
              <Plus className="h-4 w-4" />
              Add recipient
            </Link>
            <Link
              href="/client/dashboard/requests/new"
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.5)]"
            >
              <Plus className="h-4 w-4" />
              New care request
            </Link>
          </div>
        </div>
      </header>

      {/* Stats — modern cards with subtle ornaments */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group/stat relative overflow-hidden rounded-[18px] border border-border bg-card p-5 transition-all hover:border-foreground/15 hover:shadow-[0_12px_32px_-12px_rgba(15,20,16,0.12)] hover:-translate-y-1 animate-rise"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Decorative orb */}
              <div className="absolute right-[-30px] top-[-30px] h-[120px] w-[120px] rounded-full bg-[var(--forest-soft)] opacity-40 transition-all group-hover/stat:opacity-60 group-hover/stat:scale-110" />

              <div className="relative flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--forest-soft)] text-[var(--forest-deep)] shadow-[0_2px_8px_-2px_rgba(15,77,52,0.18)]">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-foreground/30 transition-all group-hover/stat:translate-x-0.5 group-hover/stat:text-primary" />
              </div>

              <div className="relative mt-6">
                <div className="text-[40px] sm:text-[44px] font-semibold tabular-nums tracking-[-0.025em] leading-none">
                  {String(s.value)}
                </div>
                <div className="mt-2 text-[13.5px] text-muted-foreground">{s.label}</div>
              </div>
            </Link>
          )
        })}
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {/* Care activity bar chart */}
        <div className="md:col-span-2 rounded-[18px] border border-border bg-card p-6 overflow-hidden">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                Last 7 days
              </div>
              <h3 className="mt-0.5 text-[18px] font-semibold tracking-[-0.01em]">Care activity</h3>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[28px] font-semibold tabular-nums tracking-tight leading-none">{totalShifts}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">shifts this week</div>
            </div>
          </div>
          {totalShifts === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[13px] text-muted-foreground">No care shifts this week yet.</p>
              <p className="text-[12px] text-muted-foreground/60 mt-0.5">Shifts will appear here once scheduled.</p>
            </div>
          ) : (
            <>
              <BarChart data={barData} height={148} className="mt-4" />
              {busyDay.value > 0 && (
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Busiest day: <span className="font-medium text-foreground/80">{busyDay.label}</span> with{' '}
                  <span className="font-medium text-foreground/80">{busyDay.value} shift{busyDay.value !== 1 ? 's' : ''}</span>
                </p>
              )}
            </>
          )}
        </div>

        {/* Care types donut */}
        <div className="rounded-[18px] border border-border bg-card p-6 flex flex-col">
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground mb-0.5">
            <Sparkles className="h-3.5 w-3.5" />
            Breakdown
          </div>
          <h3 className="text-[18px] font-semibold tracking-[-0.01em]">Care types</h3>
          {donutSegments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-6 text-center">
              <div>
                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[12.5px] text-muted-foreground">No requests yet</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center mt-2 mb-3">
              <Donut
                segments={donutSegments}
                size={140}
                thickness={18}
                centerValue={String(totalRequests)}
                centerLabel="requests"
              />
            </div>
          )}
          <div className="space-y-2 text-[12px]">
            {donutSegments.slice(0, 4).map((s) => {
              const pct = totalRequests > 0 ? Math.round((s.value / totalRequests) * 100) : 0
              return (
                <div key={s.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="truncate text-foreground/80">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 tabular-nums text-muted-foreground">
                    <span>{s.value}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Two-column */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Requests */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[22px] font-semibold tracking-[-0.015em]">Recent requests</h2>
            <Link href="/client/dashboard/requests" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline underline-offset-4">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <div className="rounded-[18px] border-2 border-dashed border-border bg-card/50 p-10 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-[var(--forest-soft)] flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-[var(--forest-deep)]" />
              </div>
              <h3 className="text-[18px] font-semibold">No requests yet</h3>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                Start by creating your first care request.
              </p>
              <Link
                href="/client/dashboard/requests/new"
                className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)]"
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
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-[22px] font-semibold tracking-[-0.015em]">Activity</h2>
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
              {activity.length}
            </span>
          </div>
          {activity.length === 0 ? (
            <div className="rounded-[18px] border border-border bg-card p-6 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[13.5px] text-muted-foreground">
                Activity will appear here as it happens.
              </p>
            </div>
          ) : (
            <div className="rounded-[18px] border border-border bg-card overflow-hidden">
              <ol className="divide-y divide-border">
                {activity.map((item, i) => (
                  <li key={`${i}-${item.type}-${item.createdAt.getTime()}`} className="flex gap-3 px-4 py-3.5">
                    <span className={[
                      'mt-1 h-2 w-2 shrink-0 rounded-full',
                      item.type === 'recipient' ? 'bg-primary' : 'bg-amber-500',
                    ].join(' ')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] leading-snug">
                        {item.type === 'recipient'
                          ? <>You added <span className="font-medium">{item.name}</span></>
                          : <>You created a <span className="font-medium">{item.careType}</span> request</>}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
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
