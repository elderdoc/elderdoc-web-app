'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function updateClientProfile(data: {
  name: string
  phone?: string
}): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await db.update(users)
    .set({ name: data.name, phone: data.phone })
    .where(eq(users.id, session.user.id))
}
