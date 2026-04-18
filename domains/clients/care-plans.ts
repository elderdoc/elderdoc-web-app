import { db } from '@/services/db'
import { jobs, careRequests, caregiverProfiles, users, carePlans } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export type ClientCarePlanRow = {
  jobId: string
  requestId: string
  careType: string
  caregiverName: string | null
  carePlanId: string | null
  updatedAt: Date | null
}

export type CarePlanDetail = {
  id: string
  jobId: string
  dailySchedule: Array<{ time: string; activity: string }> | null
  medications: Array<{ name: string; dosage: string; frequency: string; notes?: string }> | null
  dietaryRestrictions: string[] | null
  emergencyContacts: Array<{ name: string; relationship: string; phone: string }> | null
  specialInstructions: string | null
  updatedAt: Date
}

export async function getClientCarePlans(clientId: string): Promise<ClientCarePlanRow[]> {
  return db
    .select({
      jobId:         jobs.id,
      requestId:     jobs.requestId,
      careType:      careRequests.careType,
      caregiverName: users.name,
      carePlanId:    carePlans.id,
      updatedAt:     carePlans.updatedAt,
    })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .leftJoin(carePlans, eq(carePlans.jobId, jobs.id))
    .where(and(eq(jobs.clientId, clientId), eq(jobs.status, 'active')))
    .orderBy(desc(jobs.createdAt))
    .limit(50)
    .offset(0)
}

export async function getCarePlanByJob(
  jobId: string,
  clientId: string,
): Promise<CarePlanDetail | null> {
  const ownership = await db
    .select({ jobId: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, clientId)))
    .limit(1)
    .offset(0)

  if (ownership.length === 0) return null

  const rows = await db
    .select({
      id:                  carePlans.id,
      jobId:               carePlans.jobId,
      dailySchedule:       carePlans.dailySchedule,
      medications:         carePlans.medications,
      dietaryRestrictions: carePlans.dietaryRestrictions,
      emergencyContacts:   carePlans.emergencyContacts,
      specialInstructions: carePlans.specialInstructions,
      updatedAt:           carePlans.updatedAt,
    })
    .from(carePlans)
    .where(eq(carePlans.jobId, jobId))
    .limit(1)
    .offset(0)

  if (rows.length === 0) return null
  return rows[0] as CarePlanDetail
}
