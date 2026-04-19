'use server'

import { db } from '@/services/db'
import { shifts, jobs, careRequests, caregiverProfiles, users } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export type ClientCalendarShift = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  label: string
  jobId: string
}

export type ClientActiveJob = {
  jobId: string
  label: string
}

export async function getClientCalendarShifts(
  clientId: string,
  year: number,
  month: number,
): Promise<ClientCalendarShift[]> {
  const monthStr = String(month).padStart(2, '0')
  const dateFrom = `${year}-${monthStr}-01`
  const dateTo   = `${year}-${monthStr}-31`

  const rows = await db
    .select({
      id:            shifts.id,
      date:          shifts.date,
      startTime:     shifts.startTime,
      endTime:       shifts.endTime,
      status:        shifts.status,
      careType:      careRequests.careType,
      caregiverName: users.name,
      jobId:         jobs.id,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .where(
      and(
        eq(jobs.clientId, clientId),
        eq(jobs.status, 'active'),
        gte(shifts.date, dateFrom),
        lte(shifts.date, dateTo),
      ),
    )
    .orderBy(desc(shifts.date))

  return rows.map((r) => ({
    id:        r.id,
    date:      r.date,
    startTime: r.startTime,
    endTime:   r.endTime,
    status:    r.status ?? 'scheduled',
    label:     `${r.careType} — ${r.caregiverName ?? 'Caregiver'} (${r.startTime}–${r.endTime})`,
    jobId:     r.jobId,
  }))
}

export async function getClientActiveJobs(clientId: string): Promise<ClientActiveJob[]> {
  const rows = await db
    .select({
      jobId:         jobs.id,
      careType:      careRequests.careType,
      caregiverName: users.name,
    })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .where(and(eq(jobs.clientId, clientId), eq(jobs.status, 'active')))
    .orderBy(desc(jobs.createdAt))
    .limit(50)
    .offset(0)

  return rows.map((r) => ({
    jobId: r.jobId,
    label: `${r.careType} — ${r.caregiverName ?? 'Caregiver'}`,
  }))
}

export async function addClientShift(
  jobId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const job = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, session.user.id)))
    .limit(1)

  if (job.length === 0) return { error: 'Job not found' }

  await db.insert(shifts).values({ jobId, date, startTime, endTime, status: 'scheduled' })

  revalidatePath('/client/dashboard/calendar')
  return {}
}

export async function editClientShift(
  shiftId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const [row] = await db
    .select({ id: shifts.id, status: shifts.status })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .where(and(eq(shifts.id, shiftId), eq(jobs.clientId, session.user.id)))
    .limit(1)

  if (!row) return { error: 'Shift not found' }
  if (row.status === 'cancelled') return { error: 'Cannot edit a cancelled shift' }
  if (row.status === 'completed') return { error: 'Cannot edit a completed shift' }

  await db.update(shifts).set({ date, startTime, endTime }).where(eq(shifts.id, shiftId))

  revalidatePath('/client/dashboard/calendar')
  return {}
}

export async function cancelClientShift(
  shiftId: string,
): Promise<{ error?: string; lateCancellation?: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const [row] = await db
    .select({ id: shifts.id, date: shifts.date, startTime: shifts.startTime, status: shifts.status })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .where(and(eq(shifts.id, shiftId), eq(jobs.clientId, session.user.id)))
    .limit(1)

  if (!row) return { error: 'Shift not found' }
  if (row.status === 'cancelled') return { error: 'Shift already cancelled' }
  if (row.status === 'completed') return { error: 'Cannot cancel a completed shift' }

  const shiftStart = new Date(`${row.date}T${row.startTime}`)
  const now = new Date()
  const hoursUntilShift = (shiftStart.getTime() - now.getTime()) / (1000 * 60 * 60)
  const lateCancellation = hoursUntilShift <= 4

  await db.update(shifts).set({ status: 'cancelled' }).where(eq(shifts.id, shiftId))

  revalidatePath('/client/dashboard/calendar')
  return { lateCancellation }
}
