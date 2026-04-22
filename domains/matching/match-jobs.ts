import { db } from '@/services/db'
import { getOpenAI } from '@/services/openai'
import {
  careRequests, careRequestLocations, caregiverProfiles,
  caregiverLocations, caregiverCareTypes, caregiverCertifications,
  caregiverLanguages, users,
} from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

export type MatchedJob = {
  requestId: string
  score: number
  reason: string
  title: string | null
  careType: string
  frequency: string | null
  city: string | null
  state: string | null
  distanceMiles: number | null
  description: string | null
  budgetType: string | null
  budgetAmount: string | null
  clientName: string | null
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function matchJobsForCaregiver(caregiverProfileId: string): Promise<MatchedJob[]> {
  // 1. Fetch caregiver profile + skills
  const [profile] = await db
    .select({
      id:         caregiverProfiles.id,
      experience: caregiverProfiles.experience,
      hourlyMin:  caregiverProfiles.hourlyMin,
      hourlyMax:  caregiverProfiles.hourlyMax,
      state:      caregiverLocations.state,
      lat:        caregiverLocations.lat,
      lng:        caregiverLocations.lng,
    })
    .from(caregiverProfiles)
    .leftJoin(caregiverLocations, eq(caregiverLocations.caregiverId, caregiverProfiles.id))
    .where(eq(caregiverProfiles.id, caregiverProfileId))
    .limit(1)

  if (!profile) return []

  const [certRows, langRows, careTypeRows] = await Promise.all([
    db.select({ certification: caregiverCertifications.certification })
      .from(caregiverCertifications)
      .where(eq(caregiverCertifications.caregiverId, caregiverProfileId)),
    db.select({ language: caregiverLanguages.language })
      .from(caregiverLanguages)
      .where(eq(caregiverLanguages.caregiverId, caregiverProfileId)),
    db.select({ careType: caregiverCareTypes.careType })
      .from(caregiverCareTypes)
      .where(eq(caregiverCareTypes.caregiverId, caregiverProfileId)),
  ])

  const myCareTypes = careTypeRows.map(r => r.careType)
  if (myCareTypes.length === 0) return []

  // 2. Pre-filter open care requests by care type (and state if available)
  const baseQuery = db
    .select({
      id:           careRequests.id,
      title:        careRequests.title,
      careType:     careRequests.careType,
      frequency:    careRequests.frequency,
      schedule:     careRequests.schedule,
      languagePref: careRequests.languagePref,
      budgetType:   careRequests.budgetType,
      budgetAmount: careRequests.budgetAmount,
      description:  careRequests.description,
      clientId:     careRequests.clientId,
      city:         careRequestLocations.city,
      state:        careRequestLocations.state,
      reqLat:       careRequestLocations.lat,
      reqLng:       careRequestLocations.lng,
    })
    .from(careRequests)
    .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
    .where(
      and(
        eq(careRequests.status, 'active'),
        inArray(careRequests.careType, myCareTypes),
      )
    )
    .limit(50)

  const openRequests = await baseQuery

  if (openRequests.length === 0) return []

  // 3. Fetch client names
  const clientIds = [...new Set(openRequests.map(r => r.clientId))]
  const clientRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, clientIds))

  const clientMap = new Map(clientRows.map(u => [u.id, u.name]))

  // 4. Build OpenAI prompt
  const systemPrompt = `You are a care coordinator matching open care requests to a caregiver.
Rank the provided requests by how well they fit the caregiver's skills, experience, and availability.
Return valid JSON only — no prose, no markdown.
Schema: { "rankings": [{ "requestId": string, "score": number (0-100), "reason": string }] }
The "reason" field must be exactly 3 warm sentences addressed directly to the caregiver using "you" and "your" (never "this caregiver" or "the caregiver"). Sentence 1: why your skills/experience match this request. Sentence 2: how the pay rate compares to your range. Sentence 3: a note on proximity or schedule fit.
Include all requests. Highest score = best fit.
Location: same state or close proximity is a positive signal but not required.`

  const userPrompt = `CAREGIVER PROFILE
Care types: ${myCareTypes.join(', ')}
Certifications: ${certRows.map(r => r.certification).join(', ') || 'none'}
Languages: ${langRows.map(r => r.language).join(', ') || 'not specified'}
Experience: ${profile.experience ?? 'not specified'}
Rate: $${profile.hourlyMin ?? '?'}–$${profile.hourlyMax ?? '?'}/hr
Location: ${profile.state ?? 'not specified'}

OPEN CARE REQUESTS
${JSON.stringify(openRequests.map(r => ({
    id:           r.id,
    careType:     r.careType,
    frequency:    r.frequency,
    schedule:     r.schedule,
    languagePref: r.languagePref,
    budgetType:   r.budgetType,
    budgetAmount: r.budgetAmount,
    description:  r.description,
    state:        r.state,
  })))}`

  // 5. Call OpenAI
  let rankings: { requestId: string; score: number; reason: string }[] = []
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    })
    const content = response.choices[0]?.message?.content ?? ''
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed.rankings) || parsed.rankings.length === 0) return []
    rankings = parsed.rankings
  } catch {
    return []
  }

  // 6. Top 5 by score, join display data
  const cgLat = profile.lat != null ? Number(profile.lat) : null
  const cgLng = profile.lng != null ? Number(profile.lng) : null

  return rankings
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => {
      const req = openRequests.find(x => x.id === r.requestId)
      const reqLat = req?.reqLat != null ? Number(req.reqLat) : null
      const reqLng = req?.reqLng != null ? Number(req.reqLng) : null
      const distanceMiles =
        cgLat != null && cgLng != null && reqLat != null && reqLng != null
          ? Math.round(haversineDistance(cgLat, cgLng, reqLat, reqLng))
          : null
      return {
        requestId:     r.requestId,
        score:         r.score,
        reason:        r.reason,
        title:         req?.title ?? null,
        careType:      req?.careType ?? '',
        frequency:     req?.frequency ?? null,
        city:          req?.city ?? null,
        state:         req?.state ?? null,
        distanceMiles,
        description:   req?.description ?? null,
        budgetType:    req?.budgetType ?? null,
        budgetAmount:  req?.budgetAmount ? String(req.budgetAmount) : null,
        clientName:    clientMap.get(req?.clientId ?? '') ?? null,
      }
    })
}
