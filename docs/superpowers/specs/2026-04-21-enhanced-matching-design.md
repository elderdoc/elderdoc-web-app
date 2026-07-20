# Enhanced Matching — Design Spec

## Overview

Update `matchCaregivers` to factor in the new caregiver capability and recipient condition data added in Sub-projects 1–4. Matching is currently handled by a GPT-4o prompt that ranks up to 20 pre-filtered candidates. This spec updates both the pre-filter logic (hard eliminates) and the GPT scoring prompt (weighted signals).

---

## Current Matching Flow

1. Filter caregivers: active status + state match
2. For each candidate, build a scoring context object (care types, language, budget, experience, distance)
3. Pass top 20 candidates + request context to GPT-4o
4. GPT returns ranked list (top 5) with one-sentence reasoning per caregiver

This spec adds new signals to steps 2 and 3 without changing the overall flow architecture.

---

## New Matching Signals

### Signal 1 — Schedule day coverage (from Sub-project 1)

**Pre-filter (hard eliminate):** If the care request has a `schedule` and a caregiver has `availability`, the caregiver must cover **all requested days**. A caregiver missing even one requested day is excluded.

If the caregiver has no `availability` set, they pass the filter (treated as available).

**Scoring context:** For candidates that pass, include the count of days matched vs. days requested as a numeric signal. A caregiver covering all 5 requested days scores higher than one covering 3.

### Signal 2 — Care plan capability overlap (from Sub-project 3)

**No hard filter** — a caregiver missing some care plan capabilities is not eliminated (they may still be the best fit overall).

**Scoring context:** For each of the 5 care plan sections in the request's care plan, compute the percentage of requested items the caregiver's `careCapabilities` covers. Pass a per-section overlap percentage to GPT.

Example context:
```
activityMobilitySafety: 6/8 items covered (75%)
hygieneElimination: 4/4 items covered (100%)
homeManagement: 0/3 items covered (0%)
```

If the request has no care plan, this signal is omitted.

### Signal 3 — Special needs handling (from Sub-project 4)

**Soft filter with scoring impact:** If the recipient's `clientStatus` includes `hardOfHearing`, `visionProblem`, or `amputee`, or if the recipient's `weight` suggests overweight + mobility needs, check whether the caregiver's `specialNeedsHandling` covers those conditions.

- A caregiver that handles a relevant special need gets a positive score signal.
- A caregiver that does NOT handle a relevant special need is not eliminated but receives a lower score.

**Scoring context:**
```
recipientSpecialNeeds: ["hardOfHearing", "amputee"]
caregiverHandles: ["hardOfHearing"]     ← partial match
```

### Signal 4 — Max carry weight (from Sub-project 4)

**Soft filter:** If the recipient's `weight` is set and their `mobilityLevel` is `moderate-assistance` or `full-assistance`, check whether `caregiver.maxCarryLbs` ≥ estimated recipient weight.

- `weight` field is free-text (e.g., "185 lbs") — parse numeric portion.
- If parsing fails or caregiver hasn't set `maxCarryLbs`, skip this signal.
- A caregiver who can carry the recipient's weight gets a positive signal; one who cannot is scored lower (not hard-eliminated, since weight estimation is imprecise).

---

## Updated Scoring Context Object

The per-candidate context object passed to GPT gains these fields:

```ts
{
  // existing fields...
  careTypes: string[]
  languageMatch: boolean
  budgetFit: 'under' | 'within' | 'over'
  experience: number
  distanceMiles: number

  // new fields:
  scheduleDayCoverage: { requested: number; covered: number } | null
  carePlanOverlap: {
    activityMobilitySafety: { requested: number; covered: number }
    hygieneElimination:     { requested: number; covered: number }
    homeManagement:         { requested: number; covered: number }
    hydrationNutrition:     { requested: number; covered: number }
    medicationReminders:    { requested: number; covered: number }
  } | null
  specialNeedsMatch: {
    required: string[]
    covered:  string[]
  } | null
  weightCarryFit: 'sufficient' | 'insufficient' | 'unknown'
}
```

---

## GPT Prompt Updates (`domains/matching/match-caregivers.ts`)

Add a new paragraph to the system prompt describing how to weigh the new signals:

```
Scoring guidance for new signals:
- Schedule coverage: A caregiver covering all requested days is strongly preferred over partial coverage.
- Care plan overlap: High overlap across all sections is a strong positive signal. Zero overlap in a critical section (e.g., hygiene) should lower the ranking.
- Special needs: A caregiver who handles all of the recipient's special needs should be ranked higher. Partial coverage is acceptable but noted.
- Weight carry: If the caregiver cannot carry the recipient's weight and mobility assistance is needed, note this as a concern in the reasoning.
```

The one-sentence reasoning per caregiver should mention the most relevant new signal if it materially affected the ranking.

---

## Pre-filter Updates

```ts
// existing pre-filters:
// - status === 'active'
// - state match

// new pre-filter:
// - if request.schedule has days AND caregiver.availability has entries,
//   caregiver must have availability entries for ALL requested days
const requestedDays = new Set(request.schedule?.map(s => s.day) ?? [])
const caregiverDays = new Set(caregiver.availability?.map(a => a.day) ?? [])
const coversAllDays = requestedDays.size === 0
  || caregiver.availability == null
  || [...requestedDays].every(d => caregiverDays.has(d))
if (!coversAllDays) return false  // hard eliminate
```

---

## Helper Functions (new, in `domains/matching/`)

### `computeScheduleOverlap(requestSchedule, caregiverAvailability)`
Returns `{ requested: number; covered: number }`.

### `computeCarePlanOverlap(requestCarePlan, caregiverCapabilities)`
Returns per-section `{ requested: number; covered: number }` or `null` if request has no care plan.

### `computeSpecialNeedsMatch(recipientClientStatus, caregiverSpecialNeedsHandling)`
Returns `{ required: string[]; covered: string[] }` or `null` if no special needs.

### `parseWeightLbs(weightText)`
Extracts numeric pounds from free-text like `"185 lbs"` or `"185"`. Returns `null` if unparseable.

---

## Files Modified

- `domains/matching/match-caregivers.ts` — pre-filter + context building + GPT prompt
- `domains/matching/helpers.ts` (new) — the four helper functions above
- `domains/matching/__tests__/helpers.test.ts` (new) — unit tests for each helper

---

## Out of Scope

- Time-range overlap scoring (start/end time compatibility beyond day coverage)
- Weighting coefficients tuning (handled by GPT prompt language)
- A/B testing match quality
