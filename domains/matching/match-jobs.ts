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
  budgetType: string | null
  budgetAmount: string | null
  clientName: string | null
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
    })
    .from(careRequests)
    .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
    .where(
      and(
        eq(careRequests.status, 'active'),
        inArray(careRequests.careType, myCareTypes),
        ...(profile.state ? [eq(careRequestLocations.state, profile.state)] : []),
      )
    )
    .limit(20)

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
Schema: { "rankings": [{ "requestId": string, "score": number (0-100), "reason": string (one warm sentence explaining why this is a great fit) }] }
Include all requests. Highest score = best fit.`

  const userPrompt = `CAREGIVER PROFILE
Care types: ${myCareTypes.join(', ')}
Certifications: ${certRows.map(r => r.certification).join(', ') || 'none'}
Languages: ${langRows.map(r => r.language).join(', ') || 'not specified'}
Experience: ${profile.experience ?? 'not specified'}
Rate: $${profile.hourlyMin ?? '?'}–$${profile.hourlyMax ?? '?'}/hr

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
  return rankings
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => {
      const req = openRequests.find(x => x.id === r.requestId)
      return {
        requestId:   r.requestId,
        score:       r.score,
        reason:      r.reason,
        title:       req?.title ?? null,
        careType:    req?.careType ?? '',
        frequency:   req?.frequency ?? null,
        city:        req?.city ?? null,
        state:       req?.state ?? null,
        budgetType:  req?.budgetType ?? null,
        budgetAmount:req?.budgetAmount ? String(req.budgetAmount) : null,
        clientName:  clientMap.get(req?.clientId ?? '') ?? null,
      }
    })
}
