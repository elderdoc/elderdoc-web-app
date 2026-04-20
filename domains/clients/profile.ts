'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { users, clientLocations } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function updateClientProfile(data: {
  name: string
  phone?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
}): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await db.update(users)
    .set({ name: data.name, phone: data.phone })
    .where(eq(users.id, session.user.id))

  await db.insert(clientLocations)
    .values({
      clientId: session.user.id,
      address1: data.address1 || null,
      address2: data.address2 || null,
      city:     data.city     || null,
      state:    data.state    || null,
    })
    .onConflictDoUpdate({
      target: clientLocations.clientId,
      set: {
        address1: data.address1 || null,
        address2: data.address2 || null,
        city:     data.city     || null,
        state:    data.state    || null,
      },
    })
}
