# Enhanced Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `matchCaregivers` to factor in schedule day coverage, care plan capability overlap, special needs handling, and max carry weight when ranking caregivers.

**Architecture:** Four helper functions extracted to `domains/matching/helpers.ts` compute overlap scores. The pre-filter in `matchCaregivers` is updated for hard schedule day elimination. The candidate context object is extended with new signals. The GPT prompt gains a scoring guidance paragraph. All helpers are unit-tested.

**Tech Stack:** TypeScript, Jest, Drizzle ORM, OpenAI GPT-4o

---

## File Structure

- Create: `domains/matching/helpers.ts` — four pure helper functions
- Create: `domains/matching/__tests__/helpers.test.ts` — unit tests
- Modify: `domains/matching/match-caregivers.ts` — pre-filter + context + prompt updates

---

### Task 1: Helper functions (TDD)

**Files:**
- Create: `domains/matching/__tests__/helpers.test.ts`
- Create: `domains/matching/helpers.ts`

- [ ] **Step 1: Write failing tests**

Create `domains/matching/__tests__/helpers.test.ts`:
```ts
import {
  computeScheduleOverlap,
  computeCarePlanOverlap,
  computeSpecialNeedsMatch,
  parseWeightLbs,
} from '../helpers'

describe('computeScheduleOverlap', () => {
  it('returns null when request has no schedule', () => {
    expect(computeScheduleOverlap(null, [])).toBeNull()
  })

  it('returns null when request schedule is empty', () => {
    expect(computeScheduleOverlap([], [])).toBeNull()
  })

  it('counts covered days when caregiver has availability', () => {
    const requestSchedule = [
      { day: 'monday', startTime: '09:00', endTime: '13:00' },
      { day: 'wednesday', startTime: '09:00', endTime: '13:00' },
    ]
    const caregiverAvailability = [
      { day: 'monday', startTime: '08:00', endTime: '17:00' },
    ]
    expect(computeScheduleOverlap(requestSchedule, caregiverAvailability)).toEqual({ requested: 2, covered: 1 })
  })

  it('returns full coverage when all days match', () => {
    const days = [{ day: 'monday', startTime: '09:00', endTime: '13:00' }]
    expect(computeScheduleOverlap(days, days)).toEqual({ requested: 1, covered: 1 })
  })

  it('returns full coverage when caregiver has no availability (pass-through)', () => {
    const request = [{ day: 'monday', startTime: '09:00', endTime: '13:00' }]
    expect(computeScheduleOverlap(request, null)).toEqual({ requested: 1, covered: 1 })
  })
})

describe('computeCarePlanOverlap', () => {
  it('returns null when requestPlan is null', () => {
    expect(computeCarePlanOverlap(null, null)).toBeNull()
  })

  it('computes per-section overlap', () => {
    const requestPlan = {
      activityMobilitySafety: [{ key: 'companionship', frequency: 'every-visit' as const }],
      hygieneElimination:     [{ key: 'bathShower', frequency: 'every-visit' as const }, { key: 'oralHygiene', frequency: 'as-needed' as const }],
      homeManagement:         [],
      hydrationNutrition:     [],
      medicationReminders:    [],
    }
    const capabilities = {
      activityMobilitySafety: ['companionship', 'rom'],
      hygieneElimination:     ['bathShower'],
      homeManagement:         [],
      hydrationNutrition:     [],
      medicationReminders:    [],
    }
    const result = computeCarePlanOverlap(requestPlan, capabilities)
    expect(result!.activityMobilitySafety).toEqual({ requested: 1, covered: 1 })
    expect(result!.hygieneElimination).toEqual({ requested: 2, covered: 1 })
    expect(result!.homeManagement).toEqual({ requested: 0, covered: 0 })
  })
})

describe('computeSpecialNeedsMatch', () => {
  it('returns null when client status has no relevant special needs', () => {
    expect(computeSpecialNeedsMatch({ livesAlone: true }, {})).toBeNull()
  })

  it('identifies hard of hearing need and coverage', () => {
    const result = computeSpecialNeedsMatch(
      { hardOfHearing: true },
      { hardOfHearing: true }
    )
    expect(result).toEqual({ required: ['hardOfHearing'], covered: ['hardOfHearing'] })
  })

  it('identifies uncovered needs', () => {
    const result = computeSpecialNeedsMatch(
      { hardOfHearing: true, amputee: true },
      { hardOfHearing: true }
    )
    expect(result).toEqual({ required: ['hardOfHearing', 'amputee'], covered: ['hardOfHearing'] })
  })
})

describe('parseWeightLbs', () => {
  it('parses "185 lbs"', () => {
    expect(parseWeightLbs('185 lbs')).toBe(185)
  })

  it('parses "185"', () => {
    expect(parseWeightLbs('185')).toBe(185)
  })

  it('parses "5\'6\""', () => {
    expect(parseWeightLbs("5'6\"")).toBeNull()
  })

  it('returns null for non-numeric strings', () => {
    expect(parseWeightLbs('unknown')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseWeightLbs('')).toBeNull()
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
npm test domains/matching/__tests__/helpers.test.ts -- --no-coverage 2>&1 | tail -20
```

Expected: FAIL — "Cannot find module '../helpers'"

- [ ] **Step 3: Implement helpers**

Create `domains/matching/helpers.ts`:
```ts
import type { CareTaskEntry } from '@/db/schema'

type ScheduleEntry = { day: string; startTime: string; endTime: string }
type OverlapCount = { requested: number; covered: number }
type SectionKey = 'activityMobilitySafety' | 'hygieneElimination' | 'homeManagement' | 'hydrationNutrition' | 'medicationReminders'

export function computeScheduleOverlap(
  requestSchedule: ScheduleEntry[] | null | undefined,
  caregiverAvailability: ScheduleEntry[] | null | undefined,
): OverlapCount | null {
  if (!requestSchedule || requestSchedule.length === 0) return null
  if (!caregiverAvailability || caregiverAvailability.length === 0) {
    return { requested: requestSchedule.length, covered: requestSchedule.length }
  }
  const cgDays = new Set(caregiverAvailability.map(a => a.day))
  const covered = requestSchedule.filter(s => cgDays.has(s.day)).length
  return { requested: requestSchedule.length, covered }
}

export function computeCarePlanOverlap(
  requestPlan: Record<SectionKey, CareTaskEntry[]> | null | undefined,
  capabilities: Record<SectionKey, string[]> | null | undefined,
): Record<SectionKey, OverlapCount> | null {
  if (!requestPlan) return null
  const sections: SectionKey[] = [
    'activityMobilitySafety', 'hygieneElimination', 'homeManagement',
    'hydrationNutrition', 'medicationReminders',
  ]
  const result = {} as Record<SectionKey, OverlapCount>
  for (const section of sections) {
    const requested = requestPlan[section]?.length ?? 0
    const cgKeys = new Set(capabilities?.[section] ?? [])
    const covered = (requestPlan[section] ?? []).filter(e => cgKeys.has(e.key)).length
    result[section] = { requested, covered }
  }
  return result
}

const SPECIAL_NEEDS_KEYS = ['hardOfHearing', 'visionProblem', 'amputee', 'overweightMobility'] as const
type SpecialNeedKey = typeof SPECIAL_NEEDS_KEYS[number]

export function computeSpecialNeedsMatch(
  clientStatus: Record<string, unknown> | null | undefined,
  specialNeedsHandling: Record<string, boolean> | null | undefined,
): { required: string[]; covered: string[] } | null {
  if (!clientStatus) return null
  const statusToNeedKey: Record<string, SpecialNeedKey> = {
    hardOfHearing: 'hardOfHearing',
    visionProblem: 'visionProblem',
    amputee:       'amputee',
  }
  const required = Object.keys(statusToNeedKey).filter(k => clientStatus[k])
  if (required.length === 0) return null
  const covered = required.filter(k => specialNeedsHandling?.[statusToNeedKey[k]])
  return { required, covered }
}

export function parseWeightLbs(text: string | null | undefined): number | null {
  if (!text) return null
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)?/i)
  if (!match) return null
  const n = parseFloat(match[1])
  if (!isFinite(n) || n <= 0 || n > 1000) return null
  return Math.round(n)
}
```

- [ ] **Step 4: Run tests**

```bash
npm test domains/matching/__tests__/helpers.test.ts -- --no-coverage 2>&1 | tail -20
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add domains/matching/helpers.ts domains/matching/__tests__/helpers.test.ts
git commit -m "feat: matching helper functions — schedule, care plan, special needs, weight (TDD)"
```

---

### Task 2: Update matchCaregivers

**Files:**
- Modify: `domains/matching/match-caregivers.ts`

- [ ] **Step 1: Add helper imports**

At the top of `domains/matching/match-caregivers.ts`, add:
```ts
import { computeScheduleOverlap, computeCarePlanOverlap, computeSpecialNeedsMatch, parseWeightLbs } from './helpers'
import { carePlans, careRecipients } from '@/db/schema'
```

- [ ] **Step 2: Update request fetch — replace days/shifts/durationHours with schedule, add recipient fields**

Replace:
```ts
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
    lat:           careRequestLocations.lat,
    lng:           careRequestLocations.lng,
  })
  .from(careRequests)
  .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
  .where(eq(careRequests.id, requestId))
  .limit(1)
```

With:
```ts
const [requestRow] = await db
  .select({
    careType:      careRequests.careType,
    frequency:     careRequests.frequency,
    schedule:      careRequests.schedule,
    languagePref:  careRequests.languagePref,
    budgetAmount:  careRequests.budgetAmount,
    budgetType:    careRequests.budgetType,
    title:         careRequests.title,
    description:   careRequests.description,
    clientStatus:  careRequests.clientStatus,
    recipientId:   careRequests.recipientId,
    state:         careRequestLocations.state,
    lat:           careRequestLocations.lat,
    lng:           careRequestLocations.lng,
  })
  .from(careRequests)
  .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
  .where(eq(careRequests.id, requestId))
  .limit(1)
```

- [ ] **Step 3: Fetch care plan and recipient data**

After fetching `requestRow`, add:
```ts
// Fetch care plan for this request
const [carePlanRow] = requestRow.recipientId
  ? await db.select().from(carePlans).where(eq(carePlans.requestId, requestId)).limit(1)
  : []

// Fetch recipient weight + mobility level for carry-weight signal
const [recipientRow] = requestRow.recipientId
  ? await db
      .select({ weight: careRecipients.weight, mobilityLevel: careRecipients.mobilityLevel })
      .from(careRecipients)
      .where(eq(careRecipients.id, requestRow.recipientId))
      .limit(1)
  : []
```

- [ ] **Step 4: Update candidate select — add capabilities columns**

In the candidates `db.select({...})`, add:
```ts
availability:         caregiverProfiles.availability,
careCapabilities:     caregiverProfiles.careCapabilities,
specialNeedsHandling: caregiverProfiles.specialNeedsHandling,
maxCarryLbs:          caregiverProfiles.maxCarryLbs,
```

- [ ] **Step 5: Add day-coverage pre-filter**

Replace:
```ts
if (candidates.length === 0) return []
```
With:
```ts
if (candidates.length === 0) return []

const requestedDays = new Set(
  (requestRow.schedule as Array<{ day: string }> | null)?.map(s => s.day) ?? []
)

const filteredCandidates = candidates.filter(c => {
  if (requestedDays.size === 0) return true
  const cgAvail = c.availability as Array<{ day: string }> | null
  if (!cgAvail || cgAvail.length === 0) return true
  const cgDays = new Set(cgAvail.map(a => a.day))
  return [...requestedDays].every(d => cgDays.has(d))
})

if (filteredCandidates.length === 0) return []
```

Replace all references to `candidates` below this point with `filteredCandidates`.

- [ ] **Step 6: Build per-candidate context with new signals**

Update the `JSON.stringify(candidates.map(...))` section. Replace with:
```ts
${JSON.stringify(filteredCandidates.map((c) => {
  const scheduleOverlap = computeScheduleOverlap(
    requestRow.schedule as Array<{ day: string; startTime: string; endTime: string }> | null,
    c.availability as Array<{ day: string; startTime: string; endTime: string }> | null,
  )
  const carePlanOverlap = carePlanRow
    ? computeCarePlanOverlap(
        {
          activityMobilitySafety: carePlanRow.activityMobilitySafety ?? [],
          hygieneElimination:     carePlanRow.hygieneElimination ?? [],
          homeManagement:         carePlanRow.homeManagement ?? [],
          hydrationNutrition:     carePlanRow.hydrationNutrition ?? [],
          medicationReminders:    carePlanRow.medicationReminders ?? [],
        },
        c.careCapabilities as Record<string, string[]> | null,
      )
    : null
  const specialNeedsMatch = computeSpecialNeedsMatch(
    requestRow.clientStatus as Record<string, unknown> | null,
    c.specialNeedsHandling as Record<string, boolean> | null,
  )
  const recipientWeightLbs = parseWeightLbs(recipientRow?.weight)
  const needsMobilityHelp = recipientRow?.mobilityLevel === 'moderate-assistance'
    || recipientRow?.mobilityLevel === 'full-assistance'
  const weightCarryFit: 'sufficient' | 'insufficient' | 'unknown' =
    recipientWeightLbs && needsMobilityHelp && c.maxCarryLbs != null
      ? (c.maxCarryLbs >= recipientWeightLbs ? 'sufficient' : 'insufficient')
      : 'unknown'

  return {
    id:                c.id,
    careTypes:         typeMap.get(c.id) ?? [],
    certifications:    certMap.get(c.id) ?? [],
    languages:         langMap.get(c.id) ?? [],
    experience:        c.experience ?? '',
    hourlyMin:         c.hourlyMin ?? '',
    hourlyMax:         c.hourlyMax ?? '',
    scheduleDayCoverage: scheduleOverlap,
    carePlanOverlap,
    specialNeedsMatch,
    weightCarryFit,
  }
}))}
```

- [ ] **Step 7: Update the GPT prompt — add system prompt guidance paragraph**

After the existing system prompt, add:
```ts
const systemPrompt = `You are a care coordinator matching caregivers to a care request.
Rank the provided candidates by fit. Return valid JSON only — no prose, no markdown.
Schema: { "rankings": [{ "caregiverId": string, "score": number (0-100), "reason": string (one warm sentence) }] }
Include all candidates. Highest score = best fit.

Scoring guidance for new signals:
- scheduleDayCoverage: If provided, a caregiver covering all requested days (covered === requested) is strongly preferred.
- carePlanOverlap: High overlap across sections is a positive signal. Zero overlap in a section with many items should lower the ranking.
- specialNeedsMatch: A caregiver covering all required special needs should rank higher. Note partial matches in the reason.
- weightCarryFit: If "insufficient", note this as a concern. If "sufficient", it is a positive signal for mobility tasks.`
```

- [ ] **Step 8: Update the user prompt — update schedule line**

Replace:
```ts
Schedule: ${requestRow.frequency ?? 'unspecified'}, ${(requestRow.days ?? []).join(', ')}, ${(requestRow.shifts ?? []).join(', ')}
Duration: ${requestRow.durationHours ?? 'unspecified'}h/visit
```
With:
```ts
Schedule: ${requestRow.frequency ?? 'unspecified'}, days: ${
  (requestRow.schedule as Array<{ day: string; startTime: string; endTime: string }> | null)
    ?.map(s => `${s.day} ${s.startTime}–${s.endTime}`).join(', ') ?? 'unspecified'
}
```

- [ ] **Step 9: Update `filteredCandidates` → replace `candidates` in the rankings `.find()` call**

At the bottom where `rankings.map((r) => { const c = candidates.find(...)`, replace `candidates.find` with `filteredCandidates.find`.

- [ ] **Step 10: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "match-caregivers\|helpers"
```

Expected: no errors in these files

- [ ] **Step 11: Commit**

```bash
git add domains/matching/match-caregivers.ts
git commit -m "feat: matchCaregivers — schedule coverage, care plan overlap, special needs, weight signals"
```

---

### Task 3: Build + test verification

- [ ] **Step 1: Run full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: helpers tests pass, existing tests pass or have same failures as before

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "care-plans.test\|rate-defaults.test\|stripe.ts"
```

Expected: no new errors

- [ ] **Step 3: Manual smoke test**

1. `npm run dev`
2. Create a care request with a care plan (Sub-project 3 required)
3. Proceed to Step 9 (Your Top Matches)
4. Verify the matching runs without error and returns ranked results
5. Check server logs — confirm no TypeScript runtime errors

- [ ] **Step 4: Commit fixups**

```bash
git add -A && git commit -m "fix: enhanced matching post-integration fixups"
```
