# Structured Care Plan — Design Spec

## Overview

Replace the existing care plan schema (daily schedule / medications / dietary restrictions / emergency contacts) with a 5-section structured ISP-style care plan. Each section contains a list of tasks; each task has a frequency selection (Every Visit / As Needed) and an optional notes field. The care plan is created as part of the care request wizard (a new final step before Review & Generate). It is linked to a care request, not just a recipient.

---

## Care Plan Sections and Items

### Section 1 — Activity, Mobility & Safety

| Key | Label |
|-----|-------|
| `companionship` | Companionship |
| `rom` | ROM (Range of Motion) |
| `repositioning` | Repositioning |
| `transfers` | Transfers |
| `walkerCane` | Walker / Cane |
| `transportation` | Transportation |
| `escort` | Escort |
| `wheelchair` | Wheelchair |

### Section 2 — Hygiene & Elimination

| Key | Label |
|-----|-------|
| `bathShower` | Bath / Shower |
| `bedBath` | Bed Bath |
| `oralHygiene` | Oral Hygiene |
| `hairCare` | Hair Care |
| `shaving` | Shaving |
| `nailCare` | Nail Care / File Only |
| `dressing` | Dressing |
| `toiletBsc` | Toilet / BSC |
| `diaperIncontinent` | Diaper / Incontinent |
| `hygieneOther` | Other |

### Section 3 — Home Management

| Key | Label |
|-----|-------|
| `vacuumSweep` | Vacuum / Sweep |
| `mopFloors` | Mop Floors |
| `dusting` | Dusting |
| `cleanKitchen` | Clean Kitchen |
| `emptyGarbage` | Empty Garbage |
| `washDishes` | Wash Dishes |
| `cleanBedroom` | Clean Bedroom |
| `makeBed` | Make Bed |
| `changeLinens` | Change Linens |
| `laundry` | Laundry |
| `cleanBathroom` | Clean Bathroom |
| `errandsShopping` | Errands / Shopping |

### Section 4 — Hydration & Nutrition

| Key | Label |
|-----|-------|
| `assistFeeding` | Assist w/ Feeding |
| `encourageEating` | Encouraged Eating |
| `encourageFluids` | Encouraged Fluids |
| `preparedMeals` | Prepared Meals |
| `prepBreakfast` | Prep Breakfast |
| `prepLunch` | Prep Lunch |
| `prepDinner` | Prep Dinner |
| `prepSnacks` | Prep Snacks |
| `npo` | NPO (Nothing by Mouth) |

### Section 5 — Medication Reminders

| Key | Label |
|-----|-------|
| `medMorning` | Morning |
| `medAfternoon` | Afternoon |
| `medEvening` | Evening |
| `medBedtime` | Bed Time |
| `medSnackTime` | Snack Time |

---

## Data Model

### `care_plans` table — full replacement

Drop existing columns (`dailySchedule`, `medications`, `dietaryRestrictions`, `emergencyContacts`, `specialInstructions`) and replace with:

```ts
{
  id: uuid (PK)
  requestId: uuid FK → care_requests.id (unique — one plan per request)
  recipientId: uuid FK → care_recipients.id
  activityMobilitySafety: jsonb  // CareTaskEntry[]
  hygieneElimination: jsonb      // CareTaskEntry[]
  homeManagement: jsonb          // CareTaskEntry[]
  hydrationNutrition: jsonb      // CareTaskEntry[]
  medicationReminders: jsonb     // CareTaskEntry[]
  updatedAt: timestamp
}
```

**`CareTaskEntry` shape:**
```ts
{
  key: string                           // item key from section above
  frequency: 'every-visit' | 'as-needed'
  notes?: string                        // optional
}
```

Example:
```json
[
  { "key": "bathShower", "frequency": "every-visit", "notes": "" },
  { "key": "oralHygiene", "frequency": "as-needed",  "notes": "Only if requested" }
]
```

Only items the client adds appear in the array. An item not in the array = not part of the plan.

### Migration SQL

```sql
-- Drop old columns, add new ones
ALTER TABLE care_plans
  DROP COLUMN IF EXISTS daily_schedule,
  DROP COLUMN IF EXISTS medications,
  DROP COLUMN IF EXISTS dietary_restrictions,
  DROP COLUMN IF EXISTS emergency_contacts,
  DROP COLUMN IF EXISTS special_instructions,
  DROP COLUMN IF EXISTS job_id,
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES care_requests(id),
  ADD COLUMN IF NOT EXISTS activity_mobility_safety jsonb,
  ADD COLUMN IF NOT EXISTS hygiene_elimination jsonb,
  ADD COLUMN IF NOT EXISTS home_management jsonb,
  ADD COLUMN IF NOT EXISTS hydration_nutrition jsonb,
  ADD COLUMN IF NOT EXISTS medication_reminders jsonb;
```

---

## Drizzle Schema Changes (`db/schema.ts`)

```ts
export const carePlans = pgTable('care_plans', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  requestId:              uuid('request_id').references(() => careRequests.id),
  recipientId:            uuid('recipient_id').references(() => careRecipients.id),
  activityMobilitySafety: jsonb('activity_mobility_safety').$type<CareTaskEntry[]>(),
  hygieneElimination:     jsonb('hygiene_elimination').$type<CareTaskEntry[]>(),
  homeManagement:         jsonb('home_management').$type<CareTaskEntry[]>(),
  hydrationNutrition:     jsonb('hydration_nutrition').$type<CareTaskEntry[]>(),
  medicationReminders:    jsonb('medication_reminders').$type<CareTaskEntry[]>(),
  updatedAt:              timestamp('updated_at').defaultNow(),
})

export type CareTaskEntry = {
  key: string
  frequency: 'every-visit' | 'as-needed'
  notes?: string
}
```

---

## Constants (`lib/constants.ts`)

Add 5 section constants:

```ts
export const CARE_PLAN_SECTIONS = [
  {
    key: 'activityMobilitySafety',
    label: 'Activity, Mobility & Safety',
    items: [
      { key: 'companionship',  label: 'Companionship' },
      { key: 'rom',            label: 'ROM (Range of Motion)' },
      { key: 'repositioning',  label: 'Repositioning' },
      { key: 'transfers',      label: 'Transfers' },
      { key: 'walkerCane',     label: 'Walker / Cane' },
      { key: 'transportation', label: 'Transportation' },
      { key: 'escort',         label: 'Escort' },
      { key: 'wheelchair',     label: 'Wheelchair' },
    ],
  },
  {
    key: 'hygieneElimination',
    label: 'Hygiene & Elimination',
    items: [
      { key: 'bathShower',        label: 'Bath / Shower' },
      { key: 'bedBath',           label: 'Bed Bath' },
      { key: 'oralHygiene',       label: 'Oral Hygiene' },
      { key: 'hairCare',          label: 'Hair Care' },
      { key: 'shaving',           label: 'Shaving' },
      { key: 'nailCare',          label: 'Nail Care / File Only' },
      { key: 'dressing',          label: 'Dressing' },
      { key: 'toiletBsc',         label: 'Toilet / BSC' },
      { key: 'diaperIncontinent', label: 'Diaper / Incontinent' },
      { key: 'hygieneOther',      label: 'Other' },
    ],
  },
  {
    key: 'homeManagement',
    label: 'Home Management',
    items: [
      { key: 'vacuumSweep',    label: 'Vacuum / Sweep' },
      { key: 'mopFloors',      label: 'Mop Floors' },
      { key: 'dusting',        label: 'Dusting' },
      { key: 'cleanKitchen',   label: 'Clean Kitchen' },
      { key: 'emptyGarbage',   label: 'Empty Garbage' },
      { key: 'washDishes',     label: 'Wash Dishes' },
      { key: 'cleanBedroom',   label: 'Clean Bedroom' },
      { key: 'makeBed',        label: 'Make Bed' },
      { key: 'changeLinens',   label: 'Change Linens' },
      { key: 'laundry',        label: 'Laundry' },
      { key: 'cleanBathroom',  label: 'Clean Bathroom' },
      { key: 'errandsShopping',label: 'Errands / Shopping' },
    ],
  },
  {
    key: 'hydrationNutrition',
    label: 'Hydration & Nutrition',
    items: [
      { key: 'assistFeeding',   label: 'Assist w/ Feeding' },
      { key: 'encourageEating', label: 'Encouraged Eating' },
      { key: 'encourageFluids', label: 'Encouraged Fluids' },
      { key: 'preparedMeals',   label: 'Prepared Meals' },
      { key: 'prepBreakfast',   label: 'Prep Breakfast' },
      { key: 'prepLunch',       label: 'Prep Lunch' },
      { key: 'prepDinner',      label: 'Prep Dinner' },
      { key: 'prepSnacks',      label: 'Prep Snacks' },
      { key: 'npo',             label: 'NPO (Nothing by Mouth)' },
    ],
  },
  {
    key: 'medicationReminders',
    label: 'Medication Reminders',
    items: [
      { key: 'medMorning',   label: 'Morning' },
      { key: 'medAfternoon', label: 'Afternoon' },
      { key: 'medEvening',   label: 'Evening' },
      { key: 'medBedtime',   label: 'Bed Time' },
      { key: 'medSnackTime', label: 'Snack Time' },
    ],
  },
] as const
```

---

## UI — Care Request Wizard

Add a **"Care Plan"** step as the last step before Review & Generate.

### Updated step order

1. Care Type
2. Who needs care
3. Address
4. Schedule
5. Care Details
6. Preferences
7. **Care Plan** ← new
8. Review & Generate

### Care Plan step layout

Each of the 5 sections renders as a collapsible or stacked card:

```
─── Activity, Mobility & Safety ─────────────────────
  [+ Add item]

  ┌─────────────────────────────────────────────────┐
  │ Companionship    ● Every Visit  ○ As Needed      │
  │ Notes: ________________________________          │
  └─────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────┐
  │ Transfers        ○ Every Visit  ● As Needed      │
  │ Notes: ________________________________          │
  └─────────────────────────────────────────────────┘
```

Clicking **"+ Add item"** opens a dropdown/list of available items for that section (items already added are hidden from the list). Selecting one adds a row with frequency radio buttons (Every Visit / As Needed) and an optional notes input. Items can be removed with an × button.

The entire step is optional — all sections can be left empty. Next is always enabled.

### Form state

```ts
carePlan: {
  activityMobilitySafety: CareTaskEntry[]
  hygieneElimination:     CareTaskEntry[]
  homeManagement:         CareTaskEntry[]
  hydrationNutrition:     CareTaskEntry[]
  medicationReminders:    CareTaskEntry[]
}
```

---

## Domain Actions

### `saveCareRequestCarePlan` (new server action in `domains/clients/requests.ts`)

```ts
export async function saveCareRequestCarePlan(
  requestId: string,
  plan: {
    activityMobilitySafety: CareTaskEntry[]
    hygieneElimination:     CareTaskEntry[]
    homeManagement:         CareTaskEntry[]
    hydrationNutrition:     CareTaskEntry[]
    medicationReminders:    CareTaskEntry[]
  }
): Promise<void>
```

Upserts into `care_plans` keyed on `requestId`. Called after `createCareRequest` returns the new request ID.

The care plan step can also be saved/updated independently from the request detail page (for editing after creation).

---

## Care Plan Display

- On the care request detail page: a "Care Plan" section renders each non-empty section as a labelled group of task rows showing item label, frequency badge, and notes.
- On the caregiver's active job view: same read-only display so caregiver knows what's expected each visit.

---

## Out of Scope

- Caregiver capability flags for care plan tasks (Sub-project 4)
- Matching on care plan overlap (Sub-project 5)
- PDF export of care plan
- Emergency contacts and medications (removed from this schema — separate feature if needed later)
