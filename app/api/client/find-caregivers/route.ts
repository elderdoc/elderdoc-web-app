import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import {
  caregiverProfiles,
  caregiverLocations,
  caregiverCareTypes,
  caregiverFavorites,
  users,
} from '@/db/schema'
import { eq, and, gte, lte, ilike, inArray, sql } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

async function getClientId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return (payload.sub as string) ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const clientId = await getClientId(req)
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const page    = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10))
  const limit   = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))
  const offset  = (page - 1) * limit
  const q         = searchParams.get('q')?.trim() ?? ''
  const stateFilter = searchParams.get('state')
  const minRate     = searchParams.get('minRate') ? parseFloat(searchParams.get('minRate')!) : undefined
  const maxRate     = searchParams.get('maxRate') ? parseFloat(searchParams.get('maxRate')!) : undefined
  const careTypesParam = searchParams.get('careTypes')
  const careTypesList  = careTypesParam ? careTypesParam.split(',').filter(Boolean) : []

  // Build filter conditions
  const conditions = [eq(caregiverProfiles.status, 'active')]
  if (minRate !== undefined) conditions.push(gte(caregiverProfiles.hourlyMin, String(minRate)))
  if (maxRate !== undefined) conditions.push(lte(caregiverProfiles.hourlyMax, String(maxRate)))

  // Fetch base profiles joined with users and locations
  const rows = await db
    .select({
      id:         caregiverProfiles.id,
      userId:     caregiverProfiles.userId,
      headline:   caregiverProfiles.headline,
      photoUrl:   caregiverProfiles.photoUrl,
      hourlyMin:  caregiverProfiles.hourlyMin,
      hourlyMax:  caregiverProfiles.hourlyMax,
      rating:     caregiverProfiles.rating,
      experience: caregiverProfiles.experience,
      name:       users.name,
      image:      users.image,
      city:       caregiverLocations.city,
      state:      caregiverLocations.state,
    })
    .from(caregiverProfiles)
    .innerJoin(users, eq(users.id, caregiverProfiles.userId))
    .leftJoin(caregiverLocations, eq(caregiverLocations.caregiverId, caregiverProfiles.id))
    .where(
      q
        ? and(...conditions, ilike(users.name, `%${q}%`))
        : and(...conditions)
    )
    .limit(limit)
    .offset(offset)

  if (rows.length === 0) {
    return NextResponse.json([])
  }

  const profileIds = rows.map(r => r.id)

  // Fetch care types for all returned profiles in one query
  const careTypeRows = await db
    .select({ caregiverId: caregiverCareTypes.caregiverId, careType: caregiverCareTypes.careType })
    .from(caregiverCareTypes)
    .where(inArray(caregiverCareTypes.caregiverId, profileIds))

  // Fetch this client's favorites among returned profiles
  const favoriteRows = await db
    .select({ caregiverId: caregiverFavorites.caregiverId })
    .from(caregiverFavorites)
    .where(
      and(
        eq(caregiverFavorites.clientId, clientId),
        inArray(caregiverFavorites.caregiverId, profileIds),
      )
    )

  // Build lookup maps
  const careTypesMap = new Map<string, string[]>()
  for (const ct of careTypeRows) {
    const arr = careTypesMap.get(ct.caregiverId) ?? []
    arr.push(ct.careType)
    careTypesMap.set(ct.caregiverId, arr)
  }
  const favoriteSet = new Set(favoriteRows.map(f => f.caregiverId))

  // Filter by care types if requested (post-fetch filter)
  let filtered = rows
  if (careTypesList.length > 0) {
    filtered = rows.filter(r => {
      const types = careTypesMap.get(r.id) ?? []
      return careTypesList.some(ct => types.includes(ct))
    })
  }

  // Filter by state if requested
  if (stateFilter) {
    filtered = filtered.filter(r => r.state === stateFilter)
  }

  const result = filtered.map(r => ({
    id:         r.id,
    name:       r.name ?? 'Caregiver',
    imageUrl:   r.photoUrl ?? r.image ?? null,
    headline:   r.headline ?? null,
    careTypes:  careTypesMap.get(r.id) ?? [],
    city:       r.city ?? null,
    state:      r.state ?? null,
    hourlyMin:  r.hourlyMin != null ? parseFloat(r.hourlyMin) : null,
    hourlyMax:  r.hourlyMax != null ? parseFloat(r.hourlyMax) : null,
    rating:     r.rating != null ? parseFloat(r.rating) : null,
    experience: r.experience ?? null,
    isFavorite: favoriteSet.has(r.id),
  }))

  return NextResponse.json(result)
}
