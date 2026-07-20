import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, shifts, jobs, careRequests } from '@/db/schema'
import { eq, and, asc, desc, or, gte } from 'drizzle-orm'
import { getActiveCareTypes } from '@/lib/care-types'
import { ShiftsTabs } from './_components/shifts-tabs'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ShiftsPage({ searchParams }: PageProps) {
  const careTypes = await getActiveCareTypes()
  const CARE_TYPE_LABELS = Object.fromEntries(careTypes.map((ct) => [ct.key, ct.label]))

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

  const completedHours = historyShifts
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + shiftHours(s.startTime, s.endTime), 0)
  const upcomingHours = upcomingShifts.reduce((sum, s) => sum + shiftHours(s.startTime, s.endTime), 0)
  const todayHours    = todayShifts.reduce((sum, s) => sum + shiftHours(s.startTime, s.endTime), 0)

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-1">Shifts</h1>
      <p className="text-sm text-muted-foreground mb-6">Your scheduled and past shifts.</p>

      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryStat label="Hours today" value={formatHours(todayHours)} sub={`${todayShifts.length} shift${todayShifts.length === 1 ? '' : 's'}`} />
        <SummaryStat label="Upcoming hours" value={formatHours(upcomingHours)} sub={`${upcomingShifts.length} shift${upcomingShifts.length === 1 ? '' : 's'}`} />
        <SummaryStat label="Completed hours" value={formatHours(completedHours)} sub={`${historyShifts.filter(s => s.status === 'completed').length} shift${historyShifts.filter(s => s.status === 'completed').length === 1 ? '' : 's'}`} />
      </div>

      <ShiftsTabs
        activeTab={tab}
        today={todayShifts.map(toCard)}
        upcoming={upcomingShifts.map(toCard)}
        history={historyShifts.map(toCard)}
      />
    </div>
  )
}

function shiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMin = (sh ?? 0) * 60 + (sm ?? 0)
  const endMin   = (eh ?? 0) * 60 + (em ?? 0)
  const diff = endMin - startMin
  return diff > 0 ? diff / 60 : 0
}

function formatHours(h: number): string {
  if (h === 0) return '0h'
  const whole = Math.floor(h)
  const mins  = Math.round((h - whole) * 60)
  if (mins === 0) return `${whole}h`
  if (whole === 0) return `${mins}m`
  return `${whole}h ${mins}m`
}

function SummaryStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-[24px] font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{sub}</p>
    </div>
  )
}
