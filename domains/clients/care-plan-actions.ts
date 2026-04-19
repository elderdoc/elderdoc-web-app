'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { carePlans, careRecipients } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function upsertCarePlan(
  recipientId: string,
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
