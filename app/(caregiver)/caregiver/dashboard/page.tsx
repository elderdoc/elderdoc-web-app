import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, jobs, shifts, matches, jobApplications, careRequests } from '@/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { formatDistanceToNow, subDays, format } from 'date-fns'
import Link from 'next/link'
import { Suspense } from 'react'
import { Briefcase, Clock, Inbox, ArrowRight, Sparkles, Activity, MapPin, TrendingUp } from 'lucide-react'
import { matchJobsForCaregiver, type MatchedJob } from '@/domains/matching/match-jobs'
import { Sparkline, Donut } from '@/components/charts'

type ActivityItem =
  | { type: 'application'; careType: string; createdAt: Date }
  | { type: 'shift'; date: string; startTime: string; createdAt: Date }

const CARE_TYPE_LABELS: Record<string, string> = {
  'personal-care':          'Personal Care',
  'companionship':          'Companionship',
  'dementia-care':          'Dementia Care',
  'mobility-assistance':    'Mobility Assistance',
  'post-hospital-recovery': 'Post-Hospital Recovery',
}

const BUDGET_LABEL: Record<string, string> = {
  'hourly': '/hr', 'daily': '/day', 'per-visit': '/visit', 'monthly': '/mo', 'bi-weekly': '/2wk',
}

function MatchedJobCard({ job, rank }: { job: MatchedJob; rank: number }) {
  const careTypeLabel = CARE_TYPE_LABELS[job.careType] ?? job.careType
  const location = [job.city, job.state].filter(Boolean).join(', ')
  const budget = job.budgetMin
    ? `$${Number(job.budgetMin).toFixed(0)}${BUDGET_LABEL[job.budgetType ?? ''] ?? ''}`
    : null

  return (
    <Link
      href="/caregiver/dashboard/find-jobs"
      className="group/job relative block rounded-[16px] border border-border bg-card p-5 transition-all hover:border-foreground/15 hover:shadow-[0_8px_24px_-12px_rgba(15,20,16,0.1)] hover:-translate-y-0.5"
    >
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--forest-soft)] text-[14px] font-semibold tabular-nums text-[var(--forest-deep)]">
          {rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[16px] font-semibold tracking-[-0.01em] truncate transition-colors group-hover/job:text-primary">
              {job.title ?? careTypeLabel}
            </h3>
            {budget && (
              <span className="shrink-0 text-[14px] font-semibold text-foreground tabular-nums">{budget}</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] text-foreground/80">
              {careTypeLabel}
            </span>
            {job.frequency && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] text-foreground/80 capitalize">
                {job.frequency.replace(/-/g, ' ')}
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] text-foreground/80">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            )}
          </div>
          {job.reason && (
            <div className="mt-3 rounded-[10px] bg-[var(--forest-soft)]/50 px-3 py-2 text-[12.5px] text-[var(--forest-deep)] leading-snug">
              ✓ {job.reason}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

async function MatchedJobsSection({ profileId }: { profileId: string }) {
  const matched = await matchJobsForCaregiver(profileId)
  if (matched.length === 0) return null

  return (
    <section className="mb-10">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-[22px] font-semibold tracking-[-0.015em]">Top matched jobs</h2>
        </div>
        <Link href="/caregiver/dashboard/find-jobs" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline underline-offset-4">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="space-y-3">
        {matched.slice(0, 3).map((job, i) => (
          <MatchedJobCard key={job.requestId} job={job} rank={i + 1} />
        ))}
      </div>
    </section>
  )
}

export default async function CaregiverDashboard() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return (
      <div className="px-6 py-16 max-w-2xl mx-auto text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-[var(--forest-soft)] flex items-center justify-center mb-5">
          <Briefcase className="h-6 w-6 text-[var(--forest-deep)]" />
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight">
          Complete your profile to <span className="font-serif italic font-normal text-primary">get started</span>.
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground">
          Set up your profile so families can find and match with you.
        </p>
        <Link
          href="/get-started/caregiver/step-1"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all"
        >
          Start onboarding
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  const [
    [activeJobCount],
    [upcomingShiftCount],
    [pendingOfferCount],
    recentApplications,
    recentShifts,
  ] = await Promise.all([
    db.select({ value: count() })
      .from(jobs)
      .where(and(eq(jobs.caregiverId, profile.id), eq(jobs.status, 'active'))),
    db.select({ value: count() })
      .from(shifts)
      .innerJoin(jobs, eq(shifts.jobId, jobs.id))
      .where(and(eq(jobs.caregiverId, profile.id), eq(shifts.status, 'scheduled'))),
    db.select({ value: count() })
      .from(matches)
      .where(and(eq(matches.caregiverId, profile.id), eq(matches.status, 'pending'))),
    db.select({ careType: careRequests.careType, createdAt: jobApplications.createdAt })
      .from(jobApplications)
      .innerJoin(careRequests, eq(jobApplications.requestId, careRequests.id))
      .where(eq(jobApplications.caregiverId, profile.id))
      .orderBy(desc(jobApplications.createdAt))
      .limit(10),
    db.select({ date: shifts.date, startTime: shifts.startTime, createdAt: shifts.createdAt })
      .from(shifts)
      .innerJoin(jobs, eq(shifts.jobId, jobs.id))
      .where(eq(jobs.caregiverId, profile.id))
      .orderBy(desc(shifts.createdAt))
      .limit(10),
  ])

  const activity: ActivityItem[] = [
    ...recentApplications.map((a) => ({
      type: 'application' as const,
      careType: a.careType,
      createdAt: a.createdAt,
    })),
    ...recentShifts.map((s) => ({
      type: 'shift' as const,
      date: s.date,
      startTime: s.startTime,
      createdAt: s.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10)

  const stats = [
    { label: 'Active jobs',     value: Number(activeJobCount?.value ?? 0),     href: '/caregiver/dashboard/my-jobs', icon: Briefcase },
    { label: 'Upcoming shifts', value: Number(upcomingShiftCount?.value ?? 0), href: '/caregiver/dashboard/shifts',  icon: Clock },
    { label: 'Pending offers',  value: Number(pendingOfferCount?.value ?? 0),  href: '/caregiver/dashboard/offers',  icon: Inbox },
  ]

  const firstName = session.user.name?.split(' ')[0] ?? 'there'

  // 7-day shift sparkline
  const today = new Date()
  const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(today, 6 - i))
  const allShifts = await db
    .select({ date: shifts.date, status: shifts.status })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .where(eq(jobs.caregiverId, profile.id))
  const shiftsByDay: Record<string, number> = {}
  for (const r of allShifts) shiftsByDay[r.date] = (shiftsByDay[r.date] ?? 0) + 1
  const sparkData = last7Days.map(d => shiftsByDay[format(d, 'yyyy-MM-dd')] ?? 0)
  const barData = last7Days.map(d => format(d, 'EEE')[0])
  const totalShifts7d = sparkData.reduce((s, n) => s + n, 0)

  // Shift status donut
  const completed = allShifts.filter(s => s.status === 'completed').length
  const scheduled = allShifts.filter(s => s.status === 'scheduled').length
  const cancelled = allShifts.filter(s => s.status === 'cancelled').length
  const donutSegments = [
    { label: 'Completed', value: completed, color: 'var(--forest)' },
    { label: 'Scheduled', value: scheduled, color: 'var(--terracotta)' },
    { label: 'Cancelled', value: cancelled, color: '#A89F8E' },
  ].filter(s => s.value > 0)
  const totalShiftsAll = completed + scheduled + cancelled

  return (
    <div className="relative px-6 lg:px-10 py-8 lg:py-10 max-w-[1200px] mx-auto">
      {/* Soft gradient mesh */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[var(--forest-soft)] blur-[120px] opacity-40" />
      </div>

      {/* Welcome */}
      <header className="mb-10">
        <div className="flex items-center gap-2 text-[13px] font-medium text-primary mb-3">
          <Briefcase className="h-3.5 w-3.5" />
          Caregiver dashboard
        </div>
        <h1 className="text-[32px] sm:text-[42px] md:text-[48px] font-semibold tracking-[-0.025em] leading-[1.1]">
          Welcome back, <span className="font-serif italic font-normal text-primary">{firstName}</span>.
        </h1>
        <p className="mt-2 text-[15px] text-foreground/65">
          Here&apos;s what&apos;s happening with your care work today.
        </p>
      </header>

      {/* Stats */}
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
              <div className="absolute right-[-30px] top-[-30px] h-[120px] w-[120px] rounded-full bg-[var(--forest-soft)] opacity-40 transition-all group-hover/stat:opacity-60 group-hover/stat:scale-110" />

              <div className="relative flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--forest-soft)] text-[var(--forest-deep)] shadow-[0_2px_8px_-2px_rgba(15,77,52,0.18)]">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-foreground/30 transition-all group-hover/stat:translate-x-0.5 group-hover/stat:text-primary" />
              </div>

              <div className="relative mt-6">
                <div className="text-[40px] sm:text-[44px] font-semibold tabular-nums tracking-[-0.025em] leading-none">
                  {s.value}
                </div>
                <div className="mt-2 text-[13.5px] text-muted-foreground">{s.label}</div>
              </div>
            </Link>
          )
        })}
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="md:col-span-2 rounded-[18px] border border-border bg-card p-6 overflow-hidden relative">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                Last 7 days
              </div>
              <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">Shift activity</h3>
            </div>
            <div className="text-right">
              <div className="text-[28px] font-semibold tabular-nums tracking-tight leading-none">{totalShifts7d}</div>
              <div className="mt-1 text-[11.5px] text-muted-foreground">shifts</div>
            </div>
          </div>
          <div className="h-[120px] -mx-2">
            <Sparkline data={sparkData} width={600} height={120} className="w-full h-full" />
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {barData.map((d, i) => (
              <div key={i} className="text-[11px] tabular-nums text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[18px] border border-border bg-card p-6 flex flex-col">
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground mb-1">
            <Activity className="h-3.5 w-3.5" />
            All time
          </div>
          <h3 className="text-[18px] font-semibold tracking-[-0.01em]">Shift status</h3>
          {donutSegments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-6">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[12.5px] text-muted-foreground">No shifts yet</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center mt-2 mb-3">
              <Donut
                segments={donutSegments}
                size={140}
                thickness={18}
                centerValue={String(totalShiftsAll)}
                centerLabel="total"
              />
            </div>
          )}
          <div className="space-y-1.5 text-[11.5px]">
            {donutSegments.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-foreground/80">{s.label}</span>
                </div>
                <span className="tabular-nums text-muted-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Matched Jobs */}
      <Suspense fallback={
        <div className="mb-10">
          <div className="mb-5 h-7 w-44 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-[16px] bg-muted" />)}
          </div>
        </div>
      }>
        <MatchedJobsSection profileId={profile.id} />
      </Suspense>

      {/* Activity */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-[22px] font-semibold tracking-[-0.015em]">Recent activity</h2>
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
            {activity.length}
          </span>
        </div>
        {activity.length === 0 ? (
          <div className="rounded-[18px] border border-border bg-card p-8 text-center">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[14px] text-muted-foreground">No recent activity.</p>
          </div>
        ) : (
          <div className="rounded-[18px] border border-border bg-card overflow-hidden">
            <ol className="divide-y divide-border">
              {activity.map((item, i) => (
                <li key={`${item.type}-${item.createdAt.getTime()}-${i}`} className="flex gap-3 px-5 py-3.5">
                  <span className={[
                    'mt-1 h-2 w-2 shrink-0 rounded-full',
                    item.type === 'application' ? 'bg-primary' : 'bg-amber-500',
                  ].join(' ')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] leading-snug">
                      {item.type === 'application'
                        ? <>Applied for <span className="font-medium">{CARE_TYPE_LABELS[item.careType] ?? item.careType}</span> care</>
                        : <>Shift scheduled for <span className="font-medium">{item.date} at {item.startTime}</span></>}
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
      </section>
    </div>
  )
}
