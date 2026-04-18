import { db } from '@/services/db'
import { getOpenAI } from '@/services/openai'
import {
  careRequests, careRequestLocations, caregiverProfiles,
  caregiverLocations, caregiverCareTypes, caregiverCertifications,
  caregiverLanguages, users,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'

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
  hourlyMin: string | null
  hourlyMax: string | null
}

export async function matchCaregivers(requestId: string): Promise<RankedCandidate[]> {
  // 1. Fetch request context
  const [requestRow] = await db
    .select({
      careType:      careRequests.careType,
      frequency:     careRequests.frequency,
      days:          careRequests.days,
      shifts:        careRequests.shifts,
      durationHours: careRequests.durationHours,
      languagePref:  careRequests.languagePref,
      budgetAmount:  careRequests.budgetAmount,
      budgetType:    careRequests.budgetType,
      title:         careRequests.title,
      description:   careRequests.description,
      state:         careRequestLocations.state,
    })
    .from(careRequests)
    .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
    .where(eq(careRequests.id, requestId))
    .limit(1)

  if (!requestRow) return []

  // 2. Pre-filter candidates
  const candidates = await db
    .select({
      id:         caregiverProfiles.id,
      userId:     caregiverProfiles.userId,
      headline:   caregiverProfiles.headline,
      hourlyMin:  caregiverProfiles.hourlyMin,
      hourlyMax:  caregiverProfiles.hourlyMax,
      experience: caregiverProfiles.experience,
      name:       users.name,
      image:      users.image,
      city:       caregiverLocations.city,
      state:      caregiverLocations.state,
    })
    .from(caregiverProfiles)
    .innerJoin(users, eq(users.id, caregiverProfiles.userId))
    .innerJoin(caregiverCareTypes, and(
      eq(caregiverCareTypes.caregiverId, caregiverProfiles.id),
      eq(caregiverCareTypes.careType, requestRow.careType),
    ))
    .leftJoin(caregiverLocations, eq(caregiverLocations.caregiverId, caregiverProfiles.id))
    .where(
      and(
        eq(caregiverProfiles.status, 'active'),
        ...(requestRow.state ? [eq(caregiverLocations.state, requestRow.state)] : []),
      )
    )
    .limit(20)

  if (candidates.length === 0) return []

  // 3. Fetch context per candidate (sequential — cert, lang, careType for each candidate)
  const certMap = new Map<string, string[]>()
  const langMap = new Map<string, string[]>()
  const typeMap = new Map<string, string[]>()

  for (const candidate of candidates) {
    const cid = candidate.id

    const certs = await db
      .select({ caregiverId: caregiverCertifications.caregiverId, certification: caregiverCertifications.certification })
      .from(caregiverCertifications)
      .where(eq(caregiverCertifications.caregiverId, cid))

    for (const r of certs) certMap.set(r.caregiverId, [...(certMap.get(r.caregiverId) ?? []), r.certification])

    const langs = await db
      .select({ caregiverId: caregiverLanguages.caregiverId, language: caregiverLanguages.language })
      .from(caregiverLanguages)
      .where(eq(caregiverLanguages.caregiverId, cid))

    for (const r of langs) langMap.set(r.caregiverId, [...(langMap.get(r.caregiverId) ?? []), r.language])

    const careTypes = await db
      .select({ caregiverId: caregiverCareTypes.caregiverId, careType: caregiverCareTypes.careType })
      .from(caregiverCareTypes)
      .where(eq(caregiverCareTypes.caregiverId, cid))

    for (const r of careTypes) typeMap.set(r.caregiverId, [...(typeMap.get(r.caregiverId) ?? []), r.careType])
  }

  // 4. Build prompt
  const systemPrompt = `You are a care coordinator matching caregivers to a care request.
Rank the provided candidates by fit. Return valid JSON only — no prose, no markdown.
Schema: { "rankings": [{ "caregiverId": string, "score": number (0-100), "reason": string (one warm sentence) }] }
Include all candidates. Highest score = best fit.`

  const userPrompt = `CARE REQUEST
Type: ${requestRow.careType}
Schedule: ${requestRow.frequency ?? 'unspecified'}, ${(requestRow.days ?? []).join(', ')}, ${(requestRow.shifts ?? []).join(', ')}
Duration: ${requestRow.durationHours ?? 'unspecified'}h/visit
Language preference: ${(requestRow.languagePref ?? []).join(', ') || 'none'}
Budget: ${requestRow.budgetType ?? ''} ${requestRow.budgetAmount ?? ''}
Notes: ${requestRow.title ?? ''}. ${requestRow.description ?? ''}

CANDIDATES
${JSON.stringify(candidates.map((c) => ({
    id:             c.id,
    careTypes:      typeMap.get(c.id) ?? [],
    certifications: certMap.get(c.id) ?? [],
    languages:      langMap.get(c.id) ?? [],
    experience:     c.experience ?? '',
    hourlyMin:      c.hourlyMin ?? '',
    hourlyMax:      c.hourlyMax ?? '',
  })))}`

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

  // 6. Top 5 by score, join display data
  return rankings
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((r) => {
      const c = candidates.find((x) => x.id === r.caregiverId)
      return {
        caregiverId: r.caregiverId,
        score:       r.score,
        reason:      r.reason,
        name:        c?.name ?? null,
        image:       c?.image ?? null,
        headline:    c?.headline ?? null,
        careTypes:   typeMap.get(r.caregiverId) ?? [],
        city:        c?.city ?? null,
        state:       c?.state ?? null,
        hourlyMin:   c?.hourlyMin ?? null,
        hourlyMax:   c?.hourlyMax ?? null,
      }
    })
}
