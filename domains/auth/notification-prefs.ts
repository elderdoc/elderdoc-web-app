'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function updateNotificationPrefs(input: {
  notifyEmail?: boolean
  notifySms?: boolean
}): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const set: { notifyEmail?: boolean; notifySms?: boolean } = {}
  if (input.notifyEmail !== undefined) set.notifyEmail = input.notifyEmail
  if (input.notifySms   !== undefined) set.notifySms   = input.notifySms
  if (Object.keys(set).length === 0) return

  await db.update(users).set(set).where(eq(users.id, session.user.id))
}
