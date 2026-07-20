# Caregiver Capabilities — Design Spec

## Overview

Extend caregiver profiles with three capability groups used for better client matching:

1. **Care plan capabilities** — which care plan tasks from each of the 5 sections the caregiver can perform
2. **Special needs handling** — which client condition types the caregiver is comfortable with (hard of hearing, vision impairment, amputee, overweight/mobility)
3. **Max carry weight** — maximum weight (lbs) the caregiver can assist with for mobility/transfers

These are added to caregiver onboarding and to the caregiver profile edit flow. They are stored as JSONB columns on the `caregivers` table.

---

## Data Model

### `caregivers` table — new columns

| Column | Type | Description |
|--------|------|-------------|
| `care_capabilities` | `jsonb` | Which care plan tasks the caregiver can perform |
| `special_needs_handling` | `jsonb` | Which client condition types they handle |
| `max_carry_lbs` | `integer` | Max weight they can physically assist with |

**`care_capabilities` shape:**
```ts
{
  activityMobilitySafety: string[]  // item keys from CARE_PLAN_SECTIONS
  hygieneElimination:     string[]
  homeManagement:         string[]
  hydrationNutrition:     string[]
  medicationReminders:    string[]
}
```

Example:
```json
{
  "activityMobilitySafety": ["companionship", "transfers", "walkerCane"],
  "hygieneElimination": ["bathShower", "oralHygiene", "dressing"],
  "homeManagement": ["vacuumSweep", "washDishes", "laundry"],
  "hydrationNutrition": ["encourageEating", "preparedMeals"],
  "medicationReminders": ["medMorning", "medEvening"]
}
```

**`special_needs_handling` shape:**
```ts
{
  hardOfHearing?: boolean   // can work with hard-of-hearing recipients
  visionProblem?: boolean   // can work with vision-impaired recipients
  amputee?: boolean         // can work with amputee recipients
  overweightMobility?: boolean  // can assist overweight clients with mobility
}
```

### Migration SQL

```sql
ALTER TABLE caregivers
  ADD COLUMN IF NOT EXISTS care_capabilities jsonb,
  ADD COLUMN IF NOT EXISTS special_needs_handling jsonb,
  ADD COLUMN IF NOT EXISTS max_carry_lbs integer;
```

---

## Drizzle Schema Changes (`db/schema.ts`)

```ts
// in caregivers table definition:
careCapabilities: jsonb('care_capabilities').$type<{
  activityMobilitySafety: string[]
  hygieneElimination:     string[]
  homeManagement:         string[]
  hydrationNutrition:     string[]
  medicationReminders:    string[]
}>(),
specialNeedsHandling: jsonb('special_needs_handling').$type<{
  hardOfHearing?:      boolean
  visionProblem?:      boolean
  amputee?:            boolean
  overweightMobility?: boolean
}>(),
maxCarryLbs: integer('max_carry_lbs'),
```

---

## Constants (`lib/constants.ts`)

```ts
export const SPECIAL_NEEDS_HANDLING = [
  { key: 'hardOfHearing',      label: 'Hard of hearing' },
  { key: 'visionProblem',      label: 'Vision impairment' },
  { key: 'amputee',            label: 'Amputee' },
  { key: 'overweightMobility', label: 'Overweight / mobility assistance' },
] as const
```

`CARE_PLAN_SECTIONS` is already defined (Sub-project 3 spec) — reuse it.

---

## UI — Caregiver Onboarding

Add a new **Step 4 — Capabilities** between the existing Work Preferences (Step 3) and Location/Rates (Step 4, renumbered to Step 5). Profile remains Step 6.

### Updated onboarding steps

1. Care Types
2. Experience / Certifications / Languages / Education
3. Work Preferences (schedule availability — updated per Sub-project 1)
4. **Capabilities** ← new
5. Location & Rates
6. Profile

### Capabilities step layout

**Section: Care Plan Tasks**

```
Label: "Which care tasks can you perform?"
Subtext: "Select all that apply across each category."

─── Activity, Mobility & Safety ─────────────────────
  [Companionship] [ROM] [Repositioning] [Transfers]
  [Walker / Cane] [Transportation] [Escort] [Wheelchair]

─── Hygiene & Elimination ───────────────────────────
  [Bath / Shower] [Bed Bath] [Oral Hygiene] [Hair Care]
  [Shaving] [Nail Care / File Only] [Dressing]
  [Toilet / BSC] [Diaper / Incontinent] [Other]

─── Home Management ─────────────────────────────────
  (12 items — same pill-toggle style)

─── Hydration & Nutrition ───────────────────────────
  (9 items)

─── Medication Reminders ────────────────────────────
  [Morning] [Afternoon] [Evening] [Bed Time] [Snack Time]
```

Each item is a toggle pill button (same style as care types, conditions). Clicking selects/deselects.

**Section: Special Needs**

```
Label: "Which special needs clients can you work with?"
  [ ] Hard of hearing
  [ ] Vision impairment
  [ ] Amputee
  [ ] Overweight / mobility assistance
```

**Section: Max Carry Weight**

```
Label: "Maximum weight you can assist with (lbs)"
Subtext: "For mobility assistance and transfers"
<input type="number" min="0" max="500" placeholder="e.g. 150">
```

The entire step is optional — Next is always enabled.

---

## Caregiver Profile Edit

Add the same three sections (care capabilities, special needs handling, max carry weight) to the caregiver profile edit page so the caregiver can update them after onboarding.

---

## Domain Actions

### `updateCaregiverCapabilities` (new server action in `domains/caregivers/actions.ts` or equivalent)

```ts
export async function updateCaregiverCapabilities(data: {
  careCapabilities?: {
    activityMobilitySafety: string[]
    hygieneElimination:     string[]
    homeManagement:         string[]
    hydrationNutrition:     string[]
    medicationReminders:    string[]
  }
  specialNeedsHandling?: {
    hardOfHearing?:      boolean
    visionProblem?:      boolean
    amputee?:            boolean
    overweightMobility?: boolean
  }
  maxCarryLbs?: number
}): Promise<void>
```

Called from both onboarding Step 4 and the profile edit page.

The existing caregiver profile save action (used in onboarding final step) should also accept and persist these fields if they're already set.

---

## Caregiver Profile Display

Add a "Capabilities" section to the caregiver public profile card (visible to clients) showing:
- Care task categories with selected items as badges
- Special needs icons/badges
- "Can assist up to X lbs" if maxCarryLbs is set

---

## Out of Scope

- Matching algorithm updates (Sub-project 5)
- Certifications as proxy for capability (already in Sub-project 2's caregiver schema)
