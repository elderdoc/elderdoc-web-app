import { db } from '@/services/db'
import { getOpenAI } from '@/services/openai'
import {
  careRequests, careRequestLocations, caregiverProfiles,
  caregiverLocations, caregiverCareTypes, caregiverCertifications,
  caregiverLanguages, users, carePlans, careRecipients, jobs,
} from '@/db/schema'
import { eq, and, inArray, count } from 'drizzle-orm'
import { haversineDistance, formatMiles } from '@/lib/geo'
import { computeScheduleOverlap, computeCarePlanOverlap, computeSpecialNeedsMatch, parseWeightLbs } from './helpers'

export type RankedCandidate = {
  caregiverId: string
  score: number
  reason: string
  name: string | null
  image: string | null
  headline: string | null
  careTypes: string[]
  city: string | null
  state: string | null
  distanceLabel: string | null
  proximityMiles: number | null
  rating: string | null
  hourlyMin: string | null
  hourlyMax: string | null
  completedJobs: number
  hasVehicle: boolean
  hasDriversLicense: boolean
}

export async function matchCaregivers(requestId: string): Promise<RankedCandidate[]> {
  // 1. Fetch request context
  const [requestRow] = await db
    .select({
      careType:      careRequests.careType,
      frequency:     careRequests.frequency,
      schedule:      careRequests.schedule,
      languagesPreferred: careRequests.languagesPreferred,
      languagesRequired:  careRequests.languagesRequired,
      budgetMin:          careRequests.budgetMin,
      budgetMax:          careRequests.budgetMax,
      budgetType:    careRequests.budgetType,
      title:         careRequests.title,
      description:   careRequests.description,
      state:         careRequestLocations.state,
      lat:           careRequestLocations.lat,
      lng:           careRequestLocations.lng,
      clientStatus:  careRequests.clientStatus,
      recipientId:   careRequests.recipientId,
      genderPref:    careRequests.genderPref,
      transportationPref: careRequests.transportationPref,
    })
    .from(careRequests)
    .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
    .where(eq(careRequests.id, requestId))
    .limit(1)

  if (!requestRow) return []

  const [carePlanRow] = requestRow.recipientId
    ? await db.select().from(carePlans).where(eq(carePlans.requestId, requestId)).limit(1)
    : []

  const [recipientRow] = requestRow.recipientId
    ? await db
        .select({ weight: careRecipients.weight, mobilityLevel: careRecipients.mobilityLevel })
        .from(careRecipients)
        .where(eq(careRecipients.id, requestRow.recipientId))
        .limit(1)
    : []

  // 2. Pre-filter candidates
  const candidates = await db
    .select({
      id:           caregiverProfiles.id,
      headline:     caregiverProfiles.headline,
      hourlyMin:    caregiverProfiles.hourlyMin,
      hourlyMax:    caregiverProfiles.hourlyMax,
      experience:   caregiverProfiles.experience,
      availability:         caregiverProfiles.availability,
      careCapabilities:     caregiverProfiles.careCapabilities,
      specialNeedsHandling: caregiverProfiles.specialNeedsHandling,
      maxCarryLbs:          caregiverProfiles.maxCarryLbs,
      hasVehicle:           caregiverProfiles.hasVehicle,
      hasDriversLicense:    caregiverProfiles.hasDriversLicense,
      willingToTravel:      caregiverProfiles.willingToTravel,
      name:                 users.name,
      image:        users.image,
      gender:       caregiverProfiles.gender,
      city:         caregiverLocations.city,
      state:        caregiverLocations.state,
      lat:          caregiverLocations.lat,
      lng:          caregiverLocations.lng,
      rating:       caregiverProfiles.rating,
    })
    .from(caregiverProfiles)
    .innerJoin(users, eq(users.id, caregiverProfiles.userId))
    .innerJoin(caregiverCareTypes, and(
      eq(caregiverCareTypes.caregiverId, caregiverProfiles.id),
      eq(caregiverCareTypes.careType, requestRow.careType),
    ))
    .leftJoin(caregiverLocations, eq(caregiverLocations.caregiverId, caregiverProfiles.id))
    .where(eq(caregiverProfiles.status, 'active'))
    .limit(50)

  if (candidates.length === 0) return []

  const requestedDays = new Set(
    (requestRow.schedule as Array<{ day: string }> | null)?.map(s => s.day) ?? []
  )

  const filteredCandidates = candidates.filter(c => {
    if (requestRow.genderPref && requestRow.genderPref !== 'no-preference' && c.gender && c.gender !== requestRow.genderPref) return false
    if (requestedDays.size === 0) return true
    const cgAvail = c.availability as Array<{ day: string }> | null
    if (!cgAvail || cgAvail.length === 0) return true  // no availability set — pass through
    const cgDays = new Set(cgAvail.map(a => a.day))
    return [...requestedDays].every(d => cgDays.has(d))
  })

  if (filteredCandidates.length === 0) return []

  // 3. Fetch context per candidate (batch queries using inArray)
  const ids = filteredCandidates.map((c) => c.id)

  const [certRows, langRows, careTypeRows, jobCountRows] = await Promise.all([
    db.select({ caregiverId: caregiverCertifications.caregiverId, certification: caregiverCertifications.certification })
      .from(caregiverCertifications)
      .where(inArray(caregiverCertifications.caregiverId, ids)),
    db.select({ caregiverId: caregiverLanguages.caregiverId, language: caregiverLanguages.language })
      .from(caregiverLanguages)
      .where(inArray(caregiverLanguages.caregiverId, ids)),
    db.select({ caregiverId: caregiverCareTypes.caregiverId, careType: caregiverCareTypes.careType })
      .from(caregiverCareTypes)
      .where(inArray(caregiverCareTypes.caregiverId, ids)),
    db.select({ caregiverId: jobs.caregiverId, total: count() })
      .from(jobs)
      .where(and(inArray(jobs.caregiverId, ids), eq(jobs.status, 'completed')))
      .groupBy(jobs.caregiverId),
  ])

  const certMap = new Map<string, string[]>()
  const langMap = new Map<string, string[]>()
  const typeMap = new Map<string, string[]>()
  const jobCountMap = new Map<string, number>()

  for (const r of certRows) certMap.set(r.caregiverId, [...(certMap.get(r.caregiverId) ?? []), r.certification])
  for (const r of langRows) langMap.set(r.caregiverId, [...(langMap.get(r.caregiverId) ?? []), r.language])
  for (const r of careTypeRows) typeMap.set(r.caregiverId, [...(typeMap.get(r.caregiverId) ?? []), r.careType])
  for (const r of jobCountRows) jobCountMap.set(r.caregiverId, r.total)

  const reqLat = requestRow.lat ? Number(requestRow.lat) : null
  const reqLng = requestRow.lng ? Number(requestRow.lng) : null

  // 4. Build prompt
  const systemPrompt = `You are a care coordinator matching caregivers to a care request.
Rank the provided candidates by fit. Return valid JSON only — no prose, no markdown.
Schema: { "rankings": [{ "caregiverId": string, "score": number (0-100), "reason": string }] }
Include all candidates. Highest score = best fit.

SCORING WEIGHTS (apply in this priority order):
1. proximityMiles (highest weight — 30 pts): ≤25 mi = full 30 pts; 26–50 mi = 22 pts; 51–100 mi = 14 pts; 101–200 mi = 6 pts; >200 mi or unknown = 0 pts.
2. scheduleDayCoverage (20 pts): full coverage = 20, partial = proportional, none = 0.
3. specialNeedsMatch (20 pts): all needs met = 20, partial = proportional, none = 0.
4. carePlanOverlap (15 pts): high overlap across sections = up to 15.
5. languageMatch (10 pts): all preferred languages covered = 10.
6. weightCarryFit (5 pts): sufficient = 5, insufficient = −5, unknown = 0.
7. transportationFit: if transportationPref is "requires-vehicle" and caregiver does NOT have vehicle+license, apply −10 pts. If they do, apply +5 pts. If "client-provides" or "commute-ok" or "no-preference", no penalty/bonus based on vehicle.

REASON GUIDELINES:
- Write 3–5 natural, flowing sentences. Do NOT follow a fixed template — vary the structure for each candidate so no two cards sound the same.
- Lead with the most compelling thing about this candidate for this specific request — that could be proximity, a standout rating, rare special needs experience, years in the field, or a high job count.
- Weave in the relevant facts naturally: distance in miles, rating (e.g. "rated 4.8"), completed jobs (e.g. "has completed 12 jobs on the platform"), languages spoken, special needs handled (name them specifically: hard of hearing, vision impairment, amputee, mobility/overweight assistance, dementia, etc.), schedule fit, certifications, weight carry capacity, vehicle/transportation (if relevant to the request).
- Only mention factors that are actually present and relevant — skip factors with no data or no impact on this match.
- If transportation is needed and the caregiver has a vehicle and license, mention it naturally. If they don't, flag it honestly.
- If something is a genuine concern (far distance, insufficient weight carry, missing a needed language), mention it briefly and honestly — don't oversell a weak match.
- Sound like a knowledgeable, warm care coordinator speaking to a family — not a list of attributes being read off. Make it feel personal and earned.`

  const userPrompt = `CARE REQUEST
Type: ${requestRow.careType}
Schedule: ${requestRow.frequency ?? 'unspecified'}, days: ${
  (requestRow.schedule as Array<{ day: string; startTime: string; endTime: string }> | null)
    ?.map(s => `${s.day} ${s.startTime}–${s.endTime}`).join(', ') ?? 'unspecified'
}
Language preference: ${(requestRow.languagesPreferred ?? []).join(', ') || 'none'}
Required languages: ${(requestRow.languagesRequired ?? []).join(', ') || 'none'}
Transportation preference: ${requestRow.transportationPref ?? 'no-preference'}
Budget: ${requestRow.budgetType ?? ''} $${requestRow.budgetMin ?? '?'}–$${requestRow.budgetMax ?? '?'}
Notes: ${requestRow.title ?? ''}. ${requestRow.description ?? ''}

CANDIDATES
${JSON.stringify(filteredCandidates.map((c) => {
    const scheduleOverlap = computeScheduleOverlap(
      requestRow.schedule as Array<{ day: string; startTime: string; endTime: string }> | null,
      c.availability as Array<{ day: string; startTime: string; endTime: string }> | null,
    )
    const carePlanOverlap = carePlanRow
      ? computeCarePlanOverlap(
          {
            activityMobilitySafety: (carePlanRow.activityMobilitySafety as import('@/db/schema').CareTaskEntry[] | null) ?? [],
            hygieneElimination:     (carePlanRow.hygieneElimination as import('@/db/schema').CareTaskEntry[] | null) ?? [],
            homeManagement:         (carePlanRow.homeManagement as import('@/db/schema').CareTaskEntry[] | null) ?? [],
            hydrationNutrition:     (carePlanRow.hydrationNutrition as import('@/db/schema').CareTaskEntry[] | null) ?? [],
            medicationReminders:    (carePlanRow.medicationReminders as import('@/db/schema').CareTaskEntry[] | null) ?? [],
          },
          c.careCapabilities as Record<string, string[]> | null,
        )
      : null
    const specialNeedsMatch = computeSpecialNeedsMatch(
      requestRow.clientStatus as Record<string, unknown> | null,
      c.specialNeedsHandling as Record<string, boolean> | null,
    )
    const recipientWeightLbs = parseWeightLbs(recipientRow?.weight ?? null)
    const needsMobilityHelp = recipientRow?.mobilityLevel === 'moderate-assistance'
      || recipientRow?.mobilityLevel === 'full-assistance'
    const weightCarryFit: 'sufficient' | 'insufficient' | 'unknown' =
      recipientWeightLbs && needsMobilityHelp && c.maxCarryLbs != null
        ? (c.maxCarryLbs >= recipientWeightLbs ? 'sufficient' : 'insufficient')
        : 'unknown'
    const cgLat = c.lat ? Number(c.lat) : null
    const cgLng = c.lng ? Number(c.lng) : null
    const proximityMiles = reqLat && reqLng && cgLat && cgLng
      ? Math.round(haversineDistance(reqLat, reqLng, cgLat, cgLng))
      : null
    const specialNeedsHandled = Object.entries(
      (c.specialNeedsHandling as Record<string, boolean> | null) ?? {}
    ).filter(([, v]) => v).map(([k]) => k)
    const transportationFit: 'meets' | 'does-not-meet' | 'not-required' =
      requestRow.transportationPref === 'requires-vehicle'
        ? (c.hasVehicle && c.hasDriversLicense ? 'meets' : 'does-not-meet')
        : 'not-required'
    return {
      id:                  c.id,
      careTypes:           typeMap.get(c.id) ?? [],
      certifications:      certMap.get(c.id) ?? [],
      languages:           langMap.get(c.id) ?? [],
      experience:          c.experience ?? '',
      rating:              c.rating ? Number(c.rating) : null,
      completedJobs:       jobCountMap.get(c.id) ?? 0,
      maxCarryLbs:         c.maxCarryLbs ?? null,
      hasVehicle:          c.hasVehicle ?? false,
      hasDriversLicense:   c.hasDriversLicense ?? false,
      willingToTravel:     c.willingToTravel ?? false,
      transportationFit,
      proximityMiles,
      scheduleDayCoverage: scheduleOverlap,
      carePlanOverlap,
      specialNeedsMatch,
      specialNeedsHandled,
      weightCarryFit,
    }
  }))}`

  // 5. Call OpenAI
  let rankings: { caregiverId: string; score: number; reason: string }[] = []
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

  const MIN_SCORE = 30

  // 6. Top 5 by score, filtered to meaningful matches only
  return rankings
    .sort((a, b) => b.score - a.score)
    .filter((r) => r.score >= MIN_SCORE)
    .slice(0, 5)
    .map((r) => {
      const c = filteredCandidates.find((x) => x.id === r.caregiverId)
      const cgLat = c?.lat ? Number(c.lat) : null
      const cgLng = c?.lng ? Number(c.lng) : null
      const rawMiles = reqLat && reqLng && cgLat && cgLng
        ? Math.round(haversineDistance(reqLat, reqLng, cgLat, cgLng))
        : null
      const distanceLabel = rawMiles !== null ? formatMiles(rawMiles) : null
      return {
        caregiverId:      r.caregiverId,
        score:            r.score,
        reason:           r.reason,
        name:             c?.name ?? null,
        image:            c?.image ?? null,
        headline:         c?.headline ?? null,
        careTypes:        typeMap.get(r.caregiverId) ?? [],
        city:             c?.city ?? null,
        state:            c?.state ?? null,
        distanceLabel,
        proximityMiles:   rawMiles,
        rating:           c?.rating ?? null,
        hourlyMin:        c?.hourlyMin ?? null,
        hourlyMax:        c?.hourlyMax ?? null,
        completedJobs:    jobCountMap.get(r.caregiverId) ?? 0,
        hasVehicle:       c?.hasVehicle ?? false,
        hasDriversLicense: c?.hasDriversLicense ?? false,
      }
    })
}
