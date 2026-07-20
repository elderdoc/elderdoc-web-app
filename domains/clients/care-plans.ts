import { db } from '@/services/db'
import { jobs, careRequests, caregiverProfiles, users, carePlans, careRecipients } from '@/db/schema'
import { type CareTaskEntry } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export type ClientCarePlanRow = {
  recipientId:   string
  recipientName: string | null
  carePlanId:    string | null
  updatedAt:     Date | null
}

export type CarePlanDetail = {
  id:                     string
  requestId:              string | null
  recipientId:            string | null
  activityMobilitySafety: CareTaskEntry[] | null
  hygieneElimination:     CareTaskEntry[] | null
  homeManagement:         CareTaskEntry[] | null
  hydrationNutrition:     CareTaskEntry[] | null
  medicationReminders:    CareTaskEntry[] | null
  updatedAt:              Date | null
}

export async function getClientCarePlans(clientId: string): Promise<ClientCarePlanRow[]> {
  const rows = await db
    .select({
      recipientId:   careRecipients.id,
      recipientName: careRecipients.name,
      carePlanId:    carePlans.id,
      updatedAt:     carePlans.updatedAt,
    })
    .from(careRecipients)
    .leftJoin(carePlans, eq(carePlans.recipientId, careRecipients.id))
    .where(eq(careRecipients.clientId, clientId))
    .orderBy(desc(careRecipients.createdAt))
    .limit(50)
    .offset(0)

  return rows
}

export async function getCarePlanByRecipient(
  recipientId: string,
  clientId: string,
): Promise<CarePlanDetail | null> {
  const ownership = await db
    .select({ id: careRecipients.id })
    .from(careRecipients)
    .where(and(eq(careRecipients.id, recipientId), eq(careRecipients.clientId, clientId)))
    .limit(1)
    .offset(0)

  if (ownership.length === 0) return null

  const rows = await db
    .select({
      id:                     carePlans.id,
      requestId:              carePlans.requestId,
      recipientId:            carePlans.recipientId,
      activityMobilitySafety: carePlans.activityMobilitySafety,
      hygieneElimination:     carePlans.hygieneElimination,
      homeManagement:         carePlans.homeManagement,
      hydrationNutrition:     carePlans.hydrationNutrition,
      medicationReminders:    carePlans.medicationReminders,
      updatedAt:              carePlans.updatedAt,
    })
    .from(carePlans)
    .where(eq(carePlans.recipientId, recipientId))
    .limit(1)
    .offset(0)

  if (rows.length === 0) return null
  return rows[0] as CarePlanDetail
}

// Kept for caregiver side: look up care plan by the recipient associated with a job
export async function getCarePlanByJob(
  jobId: string,
  caregiverId: string,
): Promise<CarePlanDetail | null> {
  const jobRows = await db
    .select({ recipientId: careRequests.recipientId })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .where(and(eq(jobs.id, jobId), eq(jobs.caregiverId, caregiverId)))
    .limit(1)

  if (jobRows.length === 0 || !jobRows[0].recipientId) return null
  const recipientId = jobRows[0].recipientId

  const rows = await db
    .select({
      id:                     carePlans.id,
      requestId:              carePlans.requestId,
      recipientId:            carePlans.recipientId,
      activityMobilitySafety: carePlans.activityMobilitySafety,
      hygieneElimination:     carePlans.hygieneElimination,
      homeManagement:         carePlans.homeManagement,
      hydrationNutrition:     carePlans.hydrationNutrition,
      medicationReminders:    carePlans.medicationReminders,
      updatedAt:              carePlans.updatedAt,
    })
    .from(carePlans)
    .where(eq(carePlans.recipientId, recipientId))
    .limit(1)
    .offset(0)

  if (rows.length === 0) return null
  return rows[0] as CarePlanDetail
}
