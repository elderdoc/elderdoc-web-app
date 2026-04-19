import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, shifts, jobs, careRequests } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { CARE_TYPES } from '@/lib/constants'
import { ShiftCard } from './_components/shift-card'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((ct) => [ct.key, ct.label]))

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
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1">Shifts</h1>
      <p className="text-sm text-muted-foreground mb-8">Your upcoming scheduled shifts.</p>

      {upcomingShifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming shifts scheduled.</p>
      ) : (
        <div className="space-y-3">
          {upcomingShifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={{
                ...shift,
                careTypeLabel: CARE_TYPE_LABELS[shift.careType] ?? shift.careType,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
