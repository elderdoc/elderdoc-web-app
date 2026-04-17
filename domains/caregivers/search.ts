import { db } from '@/services/db'
import {
  caregiverProfiles,
  caregiverCareTypes,
  caregiverLocations,
  users,
} from '@/db/schema'
import { inArray, eq, and } from 'drizzle-orm'
import type { CaregiverPreview } from '@/components/caregiver-card'

export async function searchCaregivers(params: {
  careTypes: string[]
  state?: string
}): Promise<CaregiverPreview[]> {
  if (params.careTypes.length === 0) return []

  // Find caregiver profile IDs with at least one matching care type
  const matchingRows = await db
    .select({ caregiverId: caregiverCareTypes.caregiverId })
    .from(caregiverCareTypes)
    .where(inArray(caregiverCareTypes.careType, params.careTypes))

  if (matchingRows.length === 0) return []

  const candidateIds = [...new Set(matchingRows.map(r => r.caregiverId))]

  // Narrow by state before fetching profiles (so limit applies after filtering)
  let filteredIds = candidateIds
  if (params.state) {
    const locationRows = await db
      .select({ caregiverId: caregiverLocations.caregiverId })
      .from(caregiverLocations)
      .where(
        and(
          inArray(caregiverLocations.caregiverId, candidateIds),
          eq(caregiverLocations.state, params.state),
        )
      )
    filteredIds = locationRows.map(r => r.caregiverId)
    if (filteredIds.length === 0) return []
  }

  // Fetch active profiles only (limit 12)
  const profiles = await db
    .select({
      id: caregiverProfiles.id,
      userId: caregiverProfiles.userId,
      headline: caregiverProfiles.headline,
      hourlyMin: caregiverProfiles.hourlyMin,
      hourlyMax: caregiverProfiles.hourlyMax,
    })
    .from(caregiverProfiles)
    .where(
      and(
        inArray(caregiverProfiles.id, filteredIds),
        eq(caregiverProfiles.status, 'active'),
      )
    )
    .limit(12)

  if (profiles.length === 0) return []

  const profileIds = profiles.map(p => p.id)
  const userIds = profiles.map(p => p.userId)

  const [userRows, allCareTypes, locations] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, image: users.image })
      .from(users)
      .where(inArray(users.id, userIds)),
    db
      .select({ caregiverId: caregiverCareTypes.caregiverId, careType: caregiverCareTypes.careType })
      .from(caregiverCareTypes)
      .where(inArray(caregiverCareTypes.caregiverId, profileIds)),
    db
      .select({ caregiverId: caregiverLocations.caregiverId, city: caregiverLocations.city, state: caregiverLocations.state })
      .from(caregiverLocations)
      .where(inArray(caregiverLocations.caregiverId, profileIds)),
  ])

  const userMap = new Map(userRows.map(u => [u.id, u]))
  const locationMap = new Map(locations.map(l => [l.caregiverId, l]))
  const careTypeMap = new Map<string, string[]>()
  for (const ct of allCareTypes) {
    if (!careTypeMap.has(ct.caregiverId)) careTypeMap.set(ct.caregiverId, [])
    careTypeMap.get(ct.caregiverId)!.push(ct.careType)
  }

  return profiles.map(profile => {
    const user = userMap.get(profile.userId)
    const location = locationMap.get(profile.id)

    return {
      id: profile.id,
      name: user?.name ?? null,
      image: user?.image ?? null,
      headline: profile.headline,
      careTypes: careTypeMap.get(profile.id) ?? [],
      city: location?.city ?? null,
      state: location?.state ?? null,
      hourlyMin: profile.hourlyMin,
      hourlyMax: profile.hourlyMax,
    }
  })
}
