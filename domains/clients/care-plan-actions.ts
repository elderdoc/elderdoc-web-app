'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { carePlans, careRecipients } from '@/db/schema'
import type { CareTaskEntry } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export type CarePlanSectionKey =
  | 'activityMobilitySafety'
  | 'hygieneElimination'
  | 'homeManagement'
  | 'hydrationNutrition'
  | 'medicationReminders'

export async function upsertCarePlan(
  recipientId: string,
  data: Partial<Record<CarePlanSectionKey, CareTaskEntry[]>>,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const recipient = await db
    .select({ id: careRecipients.id })
    .from(careRecipients)
    .where(and(eq(careRecipients.id, recipientId), eq(careRecipients.clientId, session.user.id)))
    .limit(1)

  if (recipient.length === 0) return { error: 'Not found' }

  await db
    .insert(carePlans)
    .values({ recipientId, ...data })
    .onConflictDoUpdate({
      target: carePlans.recipientId,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })

  revalidatePath('/client/dashboard/care-plans')
  revalidatePath(`/client/dashboard/care-plans/${recipientId}`)
  return {}
}
