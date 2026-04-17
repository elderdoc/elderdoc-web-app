import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, jobs, shifts, matches, jobApplications, careRequests } from '@/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

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

export default async function CaregiverDashboard() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold">Complete your profile to get started.</h1>
        <Link href="/get-started/caregiver/step-1" className="mt-4 inline-block text-primary underline text-sm">
          Start onboarding →
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
    { label: 'Active Jobs',      value: Number(activeJobCount?.value ?? 0),     href: '/caregiver/dashboard/my-jobs' },
    { label: 'Upcoming Shifts',  value: Number(upcomingShiftCount?.value ?? 0),  href: '/caregiver/dashboard/shifts' },
    { label: 'Pending Offers',   value: Number(pendingOfferCount?.value ?? 0),   href: '/caregiver/dashboard/offers' },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">
        Welcome back{session.user.name ? `, ${session.user.name.split(' ')[0]}` : ''}
      </h1>
      <p className="text-muted-foreground text-sm mb-8">Here&apos;s what&apos;s happening with your care work.</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <p className="text-3xl font-semibold">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Activity */}
      <h2 className="text-base font-semibold mb-4">Recent Activity</h2>
      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity.</p>
      ) : (
        <ul className="space-y-3">
          {activity.map((item, i) => (
            <li key={`${item.type}-${item.createdAt.getTime()}-${i}`} className="flex items-start gap-3">
              <span className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
              <div>
                <p className="text-sm">
                  {item.type === 'application'
                    ? `Applied for ${CARE_TYPE_LABELS[item.careType] ?? item.careType} care`
                    : `Shift scheduled for ${item.date} at ${item.startTime}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
