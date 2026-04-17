import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, shifts, jobs, careRequests } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'

const SHIFT_STATUS_CLASSES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

export default async function ShiftsPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return <div className="p-8 text-muted-foreground text-sm">Complete your profile to view shifts.</div>
  }

  const upcomingShifts = await db
    .select({
      id:        shifts.id,
      date:      shifts.date,
      startTime: shifts.startTime,
      endTime:   shifts.endTime,
      status:    shifts.status,
      title:     careRequests.title,
      careType:  careRequests.careType,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .where(and(eq(jobs.caregiverId, profile.id), eq(shifts.status, 'scheduled')))
    .orderBy(asc(shifts.date))

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Shifts</h1>
      <p className="text-sm text-muted-foreground mb-8">Your upcoming scheduled shifts.</p>

      {upcomingShifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming shifts scheduled.</p>
      ) : (
        <div className="space-y-3">
          {upcomingShifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm mb-1">{shift.title ?? shift.careType}</p>
                <p className="text-xs text-muted-foreground">
                  {shift.date} · {shift.startTime} – {shift.endTime}
                </p>
              </div>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${SHIFT_STATUS_CLASSES[shift.status ?? 'scheduled'] ?? ''}`}>
                Scheduled
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
