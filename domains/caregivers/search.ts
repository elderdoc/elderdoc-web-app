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

  const matchingRows = await db
    .select({ caregiverId: caregiverCareTypes.caregiverId })
    .from(caregiverCareTypes)
    .where(inArray(caregiverCareTypes.careType, params.careTypes))

  if (matchingRows.length === 0) return []

  const candidateIds = [...new Set(matchingRows.map(r => r.caregiverId))]

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

  const profiles = await db
    .select({
      id: caregiverProfiles.id,
      userId: caregiverProfiles.userId,
      headline: caregiverProfiles.headline,
      hourlyMin: caregiverProfiles.hourlyMin,
      hourlyMax: caregiverProfiles.hourlyMax,
      experience: caregiverProfiles.experience,
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
      .select({
        caregiverId: caregiverLocations.caregiverId,
        city:        caregiverLocations.city,
        state:       caregiverLocations.state,
        lat:         caregiverLocations.lat,
        lng:         caregiverLocations.lng,
      })
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

  const results = profiles.map(profile => {
    const user = userMap.get(profile.userId)
    const location = locationMap.get(profile.id)
    const careTypes = careTypeMap.get(profile.id) ?? []

    const matchingCount = careTypes.filter(ct => params.careTypes.includes(ct)).length
    const expBonus =
      profile.experience === '10+ years' ? 2 :
      profile.experience === '5-10 years' ? 1 : 0
    const rawScore = Math.min(matchingCount + expBonus, 5)
    const matchScore = Math.max(rawScore, 1)

    const matchReason = buildMatchReason(matchingCount, profile.experience, params.careTypes, careTypes)

    return {
      id: profile.id,
      name: user?.name ?? null,
      image: user?.image ?? null,
      headline: profile.headline,
      careTypes,
      city: location?.city ?? null,
      state: location?.state ?? null,
      hourlyMin: profile.hourlyMin,
      hourlyMax: profile.hourlyMax,
      experience: profile.experience,
      lat: location?.lat ? Number(location.lat) : null,
      lng: location?.lng ? Number(location.lng) : null,
      matchScore,
      matchReason,
    }
  })

  return results.sort((a, b) => b.matchScore - a.matchScore)
}

function buildMatchReason(
  matchingCount: number,
  experience: string | null,
  requested: string[],
  has: string[],
): string {
  const matched = has.filter(ct => requested.includes(ct))
  const parts: string[] = []

  if (matched.length > 0) {
    const formatted = matched
      .map(k => k.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
      .join(', ')
    parts.push(`Offers ${formatted}`)
  }

  if (experience === '10+ years') parts.push('10+ years of experience')
  else if (experience === '5-10 years') parts.push('5–10 years of experience')
  else if (experience) parts.push(`${experience} of experience`)

  return parts.join(' · ') || 'Available in your area'
}
