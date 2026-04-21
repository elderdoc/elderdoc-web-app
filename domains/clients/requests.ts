'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { careRecipients, careRequests, careRequestLocations } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function createCareRecipient(data: {
  relationship: string
  name: string
  dob?: string
  phone?: string
  gender?: string
  photoUrl?: string
  conditions: string[]
  mobilityLevel?: string
  notes?: string
  address?: { address1?: string; address2?: string; city?: string; state?: string; zip?: string }
}): Promise<{ id: string }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const [row] = await db.insert(careRecipients).values({
    clientId:     session.user.id,
    relationship: data.relationship,
    name:         data.name,
    dob:          data.dob,
    phone:        data.phone,
    gender:       data.gender,
    photoUrl:     data.photoUrl,
    conditions:   data.conditions,
    mobilityLevel:data.mobilityLevel,
    notes:        data.notes,
    address:      data.address,
  }).returning({ id: careRecipients.id })

  return { id: row.id }
}

export async function createCareRequest(data: {
  recipientId: string
  careType: string
  address: { address1: string; address2?: string; city: string; state: string }
  frequency: string
  days: string[]
  shifts: string[]
  startDate: string
  durationHours: number
  genderPref?: string
  languagePref: string[]
  budgetType?: string
  budgetAmount?: string
  title: string
  description: string
}): Promise<{ id: string }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const result = await db.transaction(async (tx) => {
    const [row] = await tx.insert(careRequests).values({
      clientId:     session.user.id,
      recipientId:  data.recipientId,
      careType:     data.careType,
      frequency:    data.frequency,
      days:         data.days,
      shifts:       data.shifts,
      startDate:    data.startDate,
      durationHours:data.durationHours,
      genderPref:   data.genderPref,
      languagePref: data.languagePref,
      budgetType:   data.budgetType,
      budgetAmount: data.budgetAmount?.trim() && Number.isFinite(Number(data.budgetAmount.trim())) ? data.budgetAmount.trim() : undefined,
      title:        data.title,
      description:  data.description,
      status:       'active',
    }).returning({ id: careRequests.id })

    await tx.insert(careRequestLocations).values({
      requestId: row.id,
      address1:  data.address.address1,
      address2:  data.address.address2,
      city:      data.address.city,
      state:     data.address.state,
    })

    return row
  })

  return { id: result.id }
}

export async function updateCareRecipient(id: string, data: {
  relationship?: string
  name: string
  dob?: string
  phone?: string
  gender?: string
  photoUrl?: string
  conditions: string[]
  mobilityLevel?: string
  notes?: string
  address?: { address1?: string; address2?: string; city?: string; state?: string; zip?: string }
}): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await db.update(careRecipients)
    .set({
      relationship:  data.relationship,
      name:          data.name,
      dob:           data.dob,
      phone:         data.phone,
      gender:        data.gender,
      photoUrl:      data.photoUrl,
      conditions:    data.conditions,
      mobilityLevel: data.mobilityLevel,
      notes:         data.notes,
      address:       data.address,
    })
    .where(and(eq(careRecipients.id, id), eq(careRecipients.clientId, session.user.id)))
}

export async function updateCareRequest(id: string, data: {
  title?: string
  description?: string
  frequency?: string
  days?: string[]
  shifts?: string[]
  startDate?: string
  durationHours?: number
  genderPref?: string
  languagePref?: string[]
  budgetType?: string
  budgetAmount?: string
}): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await db.update(careRequests)
    .set({
      title:         data.title,
      description:   data.description,
      frequency:     data.frequency,
      days:          data.days,
      shifts:        data.shifts,
      startDate:     data.startDate,
      durationHours: data.durationHours,
      genderPref:    data.genderPref,
      languagePref:  data.languagePref,
      budgetType:    data.budgetType,
      budgetAmount:  data.budgetAmount?.trim() && Number.isFinite(Number(data.budgetAmount.trim())) ? data.budgetAmount.trim() : undefined,
    })
    .where(and(eq(careRequests.id, id), eq(careRequests.clientId, session.user.id)))
}
