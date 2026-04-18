import { requireRole } from '@/domains/auth/session'
import { getClientCalendarShifts, getClientActiveJobs, addClientShift } from '@/domains/clients/calendar'
import { Calendar } from '@/components/calendar'
import type { CalendarEvent, ActiveJob } from '@/components/calendar'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function sp(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val
}

export default async function ClientCalendarPage({ searchParams }: PageProps) {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const resolved = await searchParams
  const now = new Date()
  const year  = Number(sp(resolved.year))  || now.getFullYear()
  const month = Number(sp(resolved.month)) || now.getMonth() + 1

  const [rawShifts, rawJobs] = await Promise.all([
    getClientCalendarShifts(clientId, year, month),
    getClientActiveJobs(clientId),
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
      <p className="text-sm text-muted-foreground mb-8">View and schedule shifts.</p>

      <Calendar
        year={year}
        month={month}
        events={events}
        activeJobs={activeJobs}
        basePath="/client/dashboard/calendar"
        addShiftAction={addClientShift}
      />
    </div>
  )
}
