'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import {
  caregiverFavorites, caregiverProfiles, caregiverCareTypes,
  caregiverLocations, users, jobs, careRequests,
} from '@/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function toggleFavoriteCaregiver(caregiverId: string): Promise<{ favorited: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { favorited: false, error: 'Not authenticated' }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
  if (!user) return { favorited: false, error: 'Your session is stale. Please sign out and back in.' }

  const [cg] = await db
    .select({ id: caregiverProfiles.id })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.id, caregiverId))
    .limit(1)
  if (!cg) return { favorited: false, error: 'Caregiver not found' }

  const existing = await db
    .select({ clientId: caregiverFavorites.clientId })
    .from(caregiverFavorites)
    .where(and(eq(caregiverFavorites.clientId, session.user.id), eq(caregiverFavorites.caregiverId, caregiverId)))
    .limit(1)

  if (existing.length > 0) {
    await db
      .delete(caregiverFavorites)
      .where(and(eq(caregiverFavorites.clientId, session.user.id), eq(caregiverFavorites.caregiverId, caregiverId)))
    revalidatePath('/client/dashboard/my-caregivers')
    revalidatePath('/client/dashboard/find-caregivers')
    revalidatePath(`/client/dashboard/find-caregivers/${caregiverId}`)
    return { favorited: false }
  }

  await db.insert(caregiverFavorites).values({ clientId: session.user.id, caregiverId })
  revalidatePath('/client/dashboard/my-caregivers')
  revalidatePath('/client/dashboard/find-caregivers')
  revalidatePath(`/client/dashboard/find-caregivers/${caregiverId}`)
  return { favorited: true }
}

export type MyCaregiverCard = {
  caregiverId:   string
  name:          string | null
  image:         string | null
  headline:      string | null
  rating:        string | null
  hourlyMin:     string | null
  hourlyMax:     string | null
  city:          string | null
  state:         string | null
  lat:           string | null
  lng:           string | null
  distanceMiles: number | null
  careTypes:     string[]
  jobStatus:     'active' | 'completed' | 'cancelled' | null
  isFavorited:   boolean
}

async function hydrateCards(
  clientId: string,
  rows: Array<{
    caregiverId: string
    name: string | null
    image: string | null
    headline: string | null
    rating: string | null
    hourlyMin: string | null
    hourlyMax: string | null
    city: string | null
    state: string | null
    lat: string | null
    lng: string | null
    distanceMiles: number | null
    jobStatus: 'active' | 'completed' | 'cancelled' | null
  }>,
): Promise<MyCaregiverCard[]> {
  if (rows.length === 0) return []
  const ids = [...new Set(rows.map((r) => r.caregiverId))]

  const [careTypeRows, favRows] = await Promise.all([
    db.select({ caregiverId: caregiverCareTypes.caregiverId, careType: caregiverCareTypes.careType })
      .from(caregiverCareTypes)
      .where(inArray(caregiverCareTypes.caregiverId, ids)),
    db.select({ caregiverId: caregiverFavorites.caregiverId })
      .from(caregiverFavorites)
      .where(and(eq(caregiverFavorites.clientId, clientId), inArray(caregiverFavorites.caregiverId, ids))),
  ])

  const careTypeMap = new Map<string, string[]>()
  for (const r of careTypeRows) {
    const list = careTypeMap.get(r.caregiverId) ?? []
    list.push(r.careType)
    careTypeMap.set(r.caregiverId, list)
  }
  const favSet = new Set(favRows.map((r) => r.caregiverId))

  return rows.map((r) => ({
    ...r,
    careTypes:   careTypeMap.get(r.caregiverId) ?? [],
    isFavorited: favSet.has(r.caregiverId),
    distanceMiles: r.distanceMiles,
  }))
}

export async function getCurrentCaregivers(clientId: string): Promise<MyCaregiverCard[]> {
  const rows = await db
    .select({
      caregiverId: caregiverProfiles.id,
      name:        users.name,
      image:       users.image,
      headline:    caregiverProfiles.headline,
      rating:      caregiverProfiles.rating,
      hourlyMin:   caregiverProfiles.hourlyMin,
      hourlyMax:   caregiverProfiles.hourlyMax,
      city:        caregiverLocations.city,
      state:       caregiverLocations.state,
      lat:         caregiverLocations.lat,
      lng:         caregiverLocations.lng,
      jobStatus:   jobs.status,
    })
    .from(jobs)
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .leftJoin(caregiverLocations, eq(caregiverLocations.caregiverId, caregiverProfiles.id))
    .where(and(eq(jobs.clientId, clientId), eq(jobs.status, 'active')))
    .orderBy(desc(jobs.createdAt))

  const seen = new Set<string>()
  const unique = rows.filter((r) => {
    if (seen.has(r.caregiverId)) return false
    seen.add(r.caregiverId)
    return true
  })

  return hydrateCards(clientId, unique.map((r) => ({ ...r, distanceMiles: null })))
}

export async function getFavoriteCaregivers(clientId: string): Promise<MyCaregiverCard[]> {
  const rows = await db
    .select({
      caregiverId: caregiverProfiles.id,
      name:        users.name,
      image:       users.image,
      headline:    caregiverProfiles.headline,
      rating:      caregiverProfiles.rating,
      hourlyMin:   caregiverProfiles.hourlyMin,
      hourlyMax:   caregiverProfiles.hourlyMax,
      city:        caregiverLocations.city,
      state:       caregiverLocations.state,
      lat:         caregiverLocations.lat,
      lng:         caregiverLocations.lng,
      favAt:       caregiverFavorites.createdAt,
    })
    .from(caregiverFavorites)
    .innerJoin(caregiverProfiles, eq(caregiverFavorites.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .leftJoin(caregiverLocations, eq(caregiverLocations.caregiverId, caregiverProfiles.id))
    .where(eq(caregiverFavorites.clientId, clientId))
    .orderBy(desc(caregiverFavorites.createdAt))

  // Determine if each fav caregiver has an active or past job with this client
  const ids = rows.map((r) => r.caregiverId)
  const jobRows = ids.length > 0
    ? await db.select({ caregiverId: jobs.caregiverId, status: jobs.status })
        .from(jobs)
        .where(and(eq(jobs.clientId, clientId), inArray(jobs.caregiverId, ids)))
    : []

  const jobStatusMap = new Map<string, 'active' | 'completed' | 'cancelled'>()
  for (const j of jobRows) {
    const prev = jobStatusMap.get(j.caregiverId)
    if (prev === 'active') continue
    if (j.status === 'active' || !prev) jobStatusMap.set(j.caregiverId, (j.status ?? null) as 'active' | 'completed' | 'cancelled')
  }

  return hydrateCards(
    clientId,
    rows.map((r) => ({ ...r, jobStatus: jobStatusMap.get(r.caregiverId) ?? null, distanceMiles: null })),
  )
}

// Keep `careRequests` import referenced to avoid unused-import lints if it grows here
export type _KeepImport = typeof careRequests
