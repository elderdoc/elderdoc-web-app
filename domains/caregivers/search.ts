import { db } from '@/services/db'
import {
  caregiverProfiles,
  caregiverCareTypes,
  caregiverLocations,
  users,
} from '@/db/schema'
import { inArray } from 'drizzle-orm'
import type { CaregiverPreview } from '@/components/caregiver-card'

export async function searchCaregivers(params: {
  careTypes: string[]
  state?: string
}): Promise<CaregiverPreview[]> {
  if (params.careTypes.length === 0) return []

  // Find caregiver IDs with at least one matching care type
  const matchingRows = await db
    .select({ caregiverId: caregiverCareTypes.caregiverId })
    .from(caregiverCareTypes)
    .where(inArray(caregiverCareTypes.careType, params.careTypes))

  if (matchingRows.length === 0) return []

  const caregiverIds = [...new Set(matchingRows.map(r => r.caregiverId))]

  // Fetch profiles (limit 12)
  const profiles = await db
    .select({
      id: caregiverProfiles.id,
      userId: caregiverProfiles.userId,
      headline: caregiverProfiles.headline,
      hourlyMin: caregiverProfiles.hourlyMin,
      hourlyMax: caregiverProfiles.hourlyMax,
    })
    .from(caregiverProfiles)
    .where(inArray(caregiverProfiles.id, caregiverIds))
    .limit(12)

  if (profiles.length === 0) return []

  const profileIds = profiles.map(p => p.id)
  const userIds = profiles.map(p => p.userId)

  // Fetch user names and images in parallel with care types and locations
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

  return profiles.map(profile => {
    const user = userRows.find(u => u.id === profile.userId)
    const profileCareTypes = allCareTypes
      .filter(ct => ct.caregiverId === profile.id)
      .map(ct => ct.careType)
    const location = locations.find(l => l.caregiverId === profile.id)

    return {
      id: profile.id,
      name: user?.name ?? null,
      image: user?.image ?? null,
      headline: profile.headline,
      careTypes: profileCareTypes,
      city: location?.city ?? null,
      state: location?.state ?? null,
      hourlyMin: profile.hourlyMin,
      hourlyMax: profile.hourlyMax,
    }
  })
}
