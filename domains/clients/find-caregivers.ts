import { db } from '@/services/db'
import {
  matches, careRequests, caregiverProfiles, caregiverLocations,
  caregiverCareTypes, caregiverLanguages, caregiverCertifications, users,
} from '@/db/schema'
import { eq, and, gte, lte, inArray, desc, sql } from 'drizzle-orm'

export type MatchResult = {
  matchId: string
  caregiverId: string
  score: number
  reason: string
  name: string | null
  image: string | null
  headline: string | null
  careTypes: string[]
  city: string | null
  state: string | null
  lat: string | null
  lng: string | null
  rating: string | null
  hourlyMin: string | null
  hourlyMax: string | null
}

export type CaregiverResult = {
  caregiverId: string
  name: string | null
  image: string | null
  headline: string | null
  experience: string | null
  careTypes: string[]
  languages: string[]
  certifications: string[]
  city: string | null
  state: string | null
  lat: string | null
  lng: string | null
  rating: string | null
  hourlyMin: string | null
  hourlyMax: string | null
}

export type SearchFilters = {
  careType?: string
  state?: string
  rateMin?: string
  rateMax?: string
  language?: string[]
  certification?: string[]
  experience?: string
}

export async function getMatchesForRequest(
  requestId: string,
  clientId: string,
): Promise<MatchResult[]> {
  const rows = await db
    .select({
      matchId:    matches.id,
      caregiverId: matches.caregiverId,
      score:      matches.score,
      reason:     matches.reason,
      name:       users.name,
      image:      users.image,
      headline:   caregiverProfiles.headline,
      city:       caregiverLocations.city,
      state:      caregiverLocations.state,
      lat:        caregiverLocations.lat,
      lng:        caregiverLocations.lng,
      rating:     caregiverProfiles.rating,
      hourlyMin:  caregiverProfiles.hourlyMin,
      hourlyMax:  caregiverProfiles.hourlyMax,
    })
    .from(matches)
    .innerJoin(careRequests, and(
      eq(matches.requestId, careRequests.id),
      eq(careRequests.clientId, clientId),
      eq(matches.requestId, requestId),
    ))
    .innerJoin(caregiverProfiles, eq(matches.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .leftJoin(caregiverLocations, eq(caregiverProfiles.id, caregiverLocations.caregiverId))
    .orderBy(desc(matches.score))
    .limit(5)
    .offset(0)

  if (rows.length === 0) return []

  const caregiverIds = rows.map((r) => r.caregiverId)
  const careTypeRows = await db
    .select({ caregiverId: caregiverCareTypes.caregiverId, careType: caregiverCareTypes.careType })
    .from(caregiverCareTypes)
    .where(inArray(caregiverCareTypes.caregiverId, caregiverIds))

  const careTypeMap = new Map<string, string[]>()
  for (const row of careTypeRows) {
    const list = careTypeMap.get(row.caregiverId) ?? []
    list.push(row.careType)
    careTypeMap.set(row.caregiverId, list)
  }

  return rows.map((r) => ({
    ...r,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    rating: r.rating ?? null,
    careTypes: careTypeMap.get(r.caregiverId) ?? [],
  }))
}

export async function searchCaregivers(
  filters: SearchFilters,
  page: number,
): Promise<{ caregivers: CaregiverResult[]; total: number }> {
  const conditions = [eq(caregiverProfiles.status, 'active')]

  if (filters.state) {
    conditions.push(eq(caregiverLocations.state, filters.state))
  }
  if (filters.rateMin) {
    conditions.push(gte(caregiverProfiles.hourlyMin, filters.rateMin))
  }
  if (filters.rateMax) {
    conditions.push(lte(caregiverProfiles.hourlyMax, filters.rateMax))
  }
  if (filters.experience) {
    conditions.push(eq(caregiverProfiles.experience, filters.experience))
  }

  if (filters.language && filters.language.length > 0) {
    const langList = sql.join(filters.language.map((l) => sql`${l}`), sql`, `)
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${caregiverLanguages} WHERE ${caregiverLanguages.caregiverId} = ${caregiverProfiles.id} AND ${caregiverLanguages.language} IN (${langList}))`
    )
  }

  if (filters.certification && filters.certification.length > 0) {
    const certList = sql.join(filters.certification.map((c) => sql`${c}`), sql`, `)
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${caregiverCertifications} WHERE ${caregiverCertifications.caregiverId} = ${caregiverProfiles.id} AND ${caregiverCertifications.certification} IN (${certList}))`
    )
  }

  const whereClause = and(...conditions)

  // Build both count and main queries — careType filter via INNER JOIN on both so total is accurate
  let countQuery: any = db
    .select({ count: sql<number>`count(distinct ${caregiverProfiles.id})` })
    .from(caregiverProfiles)
    .leftJoin(caregiverLocations, eq(caregiverProfiles.id, caregiverLocations.caregiverId))

  let baseQuery: any = db
    .select({
      caregiverId: caregiverProfiles.id,
      name:        users.name,
      image:       users.image,
      headline:    caregiverProfiles.headline,
      experience:  caregiverProfiles.experience,
      city:        caregiverLocations.city,
      state:       caregiverLocations.state,
      lat:         caregiverLocations.lat,
      lng:         caregiverLocations.lng,
      rating:      caregiverProfiles.rating,
      hourlyMin:   caregiverProfiles.hourlyMin,
      hourlyMax:   caregiverProfiles.hourlyMax,
    })
    .from(caregiverProfiles)
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .leftJoin(caregiverLocations, eq(caregiverProfiles.id, caregiverLocations.caregiverId))

  if (filters.careType) {
    const careTypeJoin = and(
      eq(caregiverProfiles.id, caregiverCareTypes.caregiverId),
      eq(caregiverCareTypes.careType, filters.careType),
    )
    countQuery = countQuery.innerJoin(caregiverCareTypes, careTypeJoin)
    baseQuery  = baseQuery.innerJoin(caregiverCareTypes, careTypeJoin)
  }

  const [{ count }] = await countQuery.where(whereClause)
  const total = Number(count)

  type SearchRow = {
    caregiverId: string; name: string | null; image: string | null
    headline: string | null; experience: string | null
    city: string | null; state: string | null
    lat: string | null; lng: string | null
    rating: string | null
    hourlyMin: string | null; hourlyMax: string | null
  }
  const rows: SearchRow[] = await baseQuery
    .where(whereClause)
    .orderBy(caregiverProfiles.createdAt)
    .limit(20)
    .offset((page - 1) * 20)

  if (rows.length === 0) return { caregivers: [], total }

  const caregiverIds = rows.map((r) => r.caregiverId)

  // Batch fetch related data
  const [careTypeRows, languageRows, certRows] = await Promise.all([
    db
      .select({ caregiverId: caregiverCareTypes.caregiverId, careType: caregiverCareTypes.careType })
      .from(caregiverCareTypes)
      .where(inArray(caregiverCareTypes.caregiverId, caregiverIds)),
    db
      .select({ caregiverId: caregiverLanguages.caregiverId, language: caregiverLanguages.language })
      .from(caregiverLanguages)
      .where(inArray(caregiverLanguages.caregiverId, caregiverIds)),
    db
      .select({ caregiverId: caregiverCertifications.caregiverId, certification: caregiverCertifications.certification })
      .from(caregiverCertifications)
      .where(inArray(caregiverCertifications.caregiverId, caregiverIds)),
  ])

  const careTypeMap = new Map<string, string[]>()
  const languageMap = new Map<string, string[]>()
  const certMap = new Map<string, string[]>()

  for (const r of careTypeRows) {
    const list = careTypeMap.get(r.caregiverId) ?? []
    list.push(r.careType)
    careTypeMap.set(r.caregiverId, list)
  }
  for (const r of languageRows) {
    const list = languageMap.get(r.caregiverId) ?? []
    list.push(r.language)
    languageMap.set(r.caregiverId, list)
  }
  for (const r of certRows) {
    const list = certMap.get(r.caregiverId) ?? []
    list.push(r.certification)
    certMap.set(r.caregiverId, list)
  }

  const caregivers = rows.map((r) => ({
      caregiverId:    r.caregiverId,
      name:           r.name,
      image:          r.image,
      headline:       r.headline,
      experience:     r.experience,
      city:           r.city,
      state:          r.state,
      lat:            r.lat ?? null,
      lng:            r.lng ?? null,
      rating:         r.rating ?? null,
      hourlyMin:      r.hourlyMin,
      hourlyMax:      r.hourlyMax,
      careTypes:      careTypeMap.get(r.caregiverId) ?? [],
      languages:      languageMap.get(r.caregiverId) ?? [],
      certifications: certMap.get(r.caregiverId) ?? [],
    }))

  return { caregivers, total }
}
