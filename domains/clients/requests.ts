'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { careRecipients, careRequests, careRequestLocations, carePlans, type CareTaskEntry } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { geocodeAddress } from '@/lib/geo'

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
  height?: string
  weight?: string
  clientStatus?: Record<string, boolean | string>
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
    height:       data.height,
    weight:       data.weight,
    clientStatus: data.clientStatus,
    address:      data.address,
  }).returning({ id: careRecipients.id })

  return { id: row.id }
}

export async function createCareRequest(data: {
  recipientId: string
  careType: string
  address: { address1: string; address2?: string; city: string; state: string }
  frequency: string
  schedule: Array<{ day: string; startTime: string; endTime: string }>
  startDate: string
  genderPref?: string
  transportationPref?: string
  languagePref: string[]
  budgetType?: string
  budgetAmount?: string
  title: string
  description: string
  suppliesNeeded?: string
  infectionControl?: { enabled: boolean; gloves?: boolean; handWashing?: boolean; wasteDisposal?: boolean }
  safetyMeasures?: { enabled: boolean; clearPathways?: boolean; electricCords?: boolean; pets?: boolean }
  clientStatus?: Record<string, boolean | string>
}): Promise<{ id: string }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const result = await db.transaction(async (tx) => {
    const [row] = await tx.insert(careRequests).values({
      clientId:     session.user.id,
      recipientId:  data.recipientId,
      careType:     data.careType,
      frequency:    data.frequency,
      schedule:     data.schedule,
      startDate:    data.startDate,
      genderPref:          data.genderPref,
      transportationPref:  data.transportationPref,
      languagePref:        data.languagePref,
      budgetType:          data.budgetType,
      budgetAmount:        data.budgetAmount?.trim() && Number.isFinite(Number(data.budgetAmount.trim())) ? data.budgetAmount.trim() : undefined,
      title:               data.title,
      description:         data.description,
      status:              'active',
      suppliesNeeded:      data.suppliesNeeded,
      infectionControl:    data.infectionControl,
      safetyMeasures:      data.safetyMeasures,
      clientStatus:        data.clientStatus,
    }).returning({ id: careRequests.id })

    const coords = await geocodeAddress(data.address.address1, data.address.city, data.address.state)
    await tx.insert(careRequestLocations).values({
      requestId: row.id,
      address1:  data.address.address1,
      address2:  data.address.address2,
      city:      data.address.city,
      state:     data.address.state,
      lat:       coords ? String(coords.lat) : null,
      lng:       coords ? String(coords.lng) : null,
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
  height?: string
  weight?: string
  clientStatus?: Record<string, boolean | string>
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
      height:        data.height,
      weight:        data.weight,
      clientStatus:  data.clientStatus,
      address:       data.address,
    })
    .where(and(eq(careRecipients.id, id), eq(careRecipients.clientId, session.user.id)))
}

export async function updateCareRequest(id: string, data: {
  title?: string
  description?: string
  frequency?: string
  schedule?: Array<{ day: string; startTime: string; endTime: string }>
  startDate?: string
  genderPref?: string
  transportationPref?: string
  languagePref?: string[]
  budgetType?: string
  budgetAmount?: string
  suppliesNeeded?: string
  infectionControl?: { enabled: boolean; gloves?: boolean; handWashing?: boolean; wasteDisposal?: boolean }
  safetyMeasures?: { enabled: boolean; clearPathways?: boolean; electricCords?: boolean; pets?: boolean }
  clientStatus?: Record<string, boolean | string>
}): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await db.update(careRequests)
    .set({
      title:              data.title,
      description:        data.description,
      frequency:          data.frequency,
      schedule:           data.schedule,
      startDate:          data.startDate,
      genderPref:         data.genderPref,
      transportationPref: data.transportationPref,
      languagePref:       data.languagePref,
      budgetType:    data.budgetType,
      budgetAmount:    data.budgetAmount?.trim() && Number.isFinite(Number(data.budgetAmount.trim())) ? data.budgetAmount.trim() : undefined,
      suppliesNeeded:  data.suppliesNeeded,
      infectionControl:data.infectionControl,
      safetyMeasures:  data.safetyMeasures,
      clientStatus:    data.clientStatus,
    })
    .where(and(eq(careRequests.id, id), eq(careRequests.clientId, session.user.id)))
}

export async function saveCareRequestCarePlan(
  requestId: string,
  plan: {
    activityMobilitySafety: CareTaskEntry[]
    hygieneElimination:     CareTaskEntry[]
    homeManagement:         CareTaskEntry[]
    hydrationNutrition:     CareTaskEntry[]
    medicationReminders:    CareTaskEntry[]
  }
): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const [req] = await db
    .select({ id: careRequests.id, recipientId: careRequests.recipientId })
    .from(careRequests)
    .where(and(eq(careRequests.id, requestId), eq(careRequests.clientId, session.user.id)))
    .limit(1)
  if (!req) throw new Error('Not found')

  await db
    .insert(carePlans)
    .values({
      requestId,
      recipientId: req.recipientId ?? undefined,
      activityMobilitySafety: plan.activityMobilitySafety,
      hygieneElimination:     plan.hygieneElimination,
      homeManagement:         plan.homeManagement,
      hydrationNutrition:     plan.hydrationNutrition,
      medicationReminders:    plan.medicationReminders,
    })
    .onConflictDoUpdate({
      target: carePlans.requestId,
      set: {
        activityMobilitySafety: plan.activityMobilitySafety,
        hygieneElimination:     plan.hygieneElimination,
        homeManagement:         plan.homeManagement,
        hydrationNutrition:     plan.hydrationNutrition,
        medicationReminders:    plan.medicationReminders,
        updatedAt:              new Date(),
      },
    })
}
