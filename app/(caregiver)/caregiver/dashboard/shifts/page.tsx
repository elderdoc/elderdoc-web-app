import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, shifts, jobs, careRequests } from '@/db/schema'
import { eq, and, asc, desc, or, gte } from 'drizzle-orm'
import { CARE_TYPES } from '@/lib/constants'
import { ShiftsTabs } from './_components/shifts-tabs'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((ct) => [ct.key, ct.label]))

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ShiftsPage({ searchParams }: PageProps) {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return <div className="p-4 lg:p-8 text-muted-foreground text-sm">Complete your profile to view shifts.</div>
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  const cols = {
    id:        shifts.id,
    date:      shifts.date,
    startTime: shifts.startTime,
    endTime:   shifts.endTime,
    status:    shifts.status,
    title:     careRequests.title,
    careType:  careRequests.careType,
  }

  const [todayShifts, upcomingShifts, historyShifts] = await Promise.all([
    db.select(cols)
      .from(shifts)
      .innerJoin(jobs, eq(shifts.jobId, jobs.id))
      .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
      .where(and(eq(jobs.caregiverId, profile.id), eq(shifts.status, 'scheduled'), eq(shifts.date, todayStr)))
      .orderBy(asc(shifts.startTime)),

    db.select(cols)
      .from(shifts)
      .innerJoin(jobs, eq(shifts.jobId, jobs.id))
      .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
      .where(and(eq(jobs.caregiverId, profile.id), eq(shifts.status, 'scheduled'), gte(shifts.date, todayStr)))
      .orderBy(asc(shifts.date), asc(shifts.startTime))
      .then((rows) => rows.filter((r) => r.date !== todayStr)),

    db.select(cols)
      .from(shifts)
      .innerJoin(jobs, eq(shifts.jobId, jobs.id))
      .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
      .where(and(
        eq(jobs.caregiverId, profile.id),
        or(eq(shifts.status, 'completed'), eq(shifts.status, 'cancelled')),
      ))
      .orderBy(desc(shifts.date), desc(shifts.startTime)),
  ])

  const toCard = (s: typeof todayShifts[0]) => ({
    ...s,
    careTypeLabel: CARE_TYPE_LABELS[s.careType] ?? s.careType,
  })

  const resolved = await searchParams
  const tab = (resolved.tab as string) === 'upcoming' ? 'upcoming'
    : (resolved.tab as string) === 'history' ? 'history'
    : 'today'

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-1">Shifts</h1>
      <p className="text-sm text-muted-foreground mb-8">Your scheduled and past shifts.</p>

      <ShiftsTabs
        activeTab={tab}
        today={todayShifts.map(toCard)}
        upcoming={upcomingShifts.map(toCard)}
        history={historyShifts.map(toCard)}
      />
    </div>
  )
}
