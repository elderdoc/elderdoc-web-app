import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getCaregiverCalendarShifts, getCaregiverActiveJobs, addCaregiverShift } from '@/domains/caregivers/calendar'
import { Calendar } from '@/components/calendar'
import type { CalendarEvent, ActiveJob } from '@/components/calendar'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function sp(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val
}

export default async function CaregiverCalendarPage({ searchParams }: PageProps) {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return (
      <div className="p-8 text-muted-foreground text-sm">
        Complete your profile to use the calendar.
      </div>
    )
  }

  const resolved = await searchParams
  const now = new Date()
  const year  = Number(sp(resolved.year))  || now.getFullYear()
  const month = Number(sp(resolved.month)) || now.getMonth() + 1

  const [rawShifts, rawJobs] = await Promise.all([
    getCaregiverCalendarShifts(profile.id, year, month),
    getCaregiverActiveJobs(profile.id),
  ])

  const events: CalendarEvent[] = rawShifts.map((s) => ({
    date:   s.date,
    label:  s.label,
    status: s.status,
    jobId:  s.jobId,
  }))

  const activeJobs: ActiveJob[] = rawJobs.map((j) => ({
    jobId: j.jobId,
    label: j.label,
  }))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1">Calendar</h1>
      <p className="text-sm text-muted-foreground mb-8">View and log your shifts.</p>

      <Calendar
        year={year}
        month={month}
        events={events}
        activeJobs={activeJobs}
        basePath="/caregiver/dashboard/calendar"
        addShiftAction={addCaregiverShift}
      />
    </div>
  )
}
