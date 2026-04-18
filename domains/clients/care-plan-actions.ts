'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { carePlans, jobs } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function upsertCarePlan(
  jobId: string,
  data: {
    dailySchedule?: Array<{ time: string; activity: string }>
    medications?: Array<{ name: string; dosage: string; frequency: string; notes?: string }>
    dietaryRestrictions?: string[]
    emergencyContacts?: Array<{ name: string; relationship: string; phone: string }>
    specialInstructions?: string
  },
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const job = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, session.user.id)))
    .limit(1)

  if (job.length === 0) return { error: 'Not found' }

  await db
    .insert(carePlans)
    .values({ jobId, ...data })
    .onConflictDoUpdate({
      target: carePlans.jobId,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })

  revalidatePath('/client/dashboard/care-plans')
  revalidatePath(`/client/dashboard/care-plans/${jobId}`)
  return {}
}
