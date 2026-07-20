# Structured Care Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing care plan schema with a structured 5-section ISP care plan (Activity/Mobility, Hygiene, Home Management, Nutrition, Medication) and add a "Care Plan" step to the care request wizard.

**Architecture:** The `care_plans` table is restructured — old columns dropped, new JSONB section columns added, `requestId` replaces `jobId`. A new `CARE_PLAN_SECTIONS` constant drives all UI rendering. A new `saveCareRequestCarePlan` server action upserts the plan. A new "Care Plan" step is added to the care request wizard as Step 7 (before Review & Generate, now Step 8).

**Tech Stack:** Next.js 15, Drizzle ORM, PostgreSQL, TypeScript, Tailwind CSS

---

## File Structure

- Modify: `db/schema.ts` — restructure care_plans table
- Create: `db/migrations/0011_structured_care_plan.sql`
- Modify: `lib/constants.ts` — add CARE_PLAN_SECTIONS
- Modify: `domains/clients/requests.ts` — add saveCareRequestCarePlan action
- Modify: `app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx` — add Step 7 "Care Plan"
- Create: `app/(client)/client/dashboard/requests/new/_components/care-plan-step.tsx` — extracted Care Plan step component

---

### Task 1: Schema + constants

**Files:**
- Modify: `db/schema.ts`
- Modify: `lib/constants.ts`

- [ ] **Step 1: Update `care_plans` table in `db/schema.ts`**

Replace the existing `carePlans` table definition with:
```ts
export type CareTaskEntry = {
  key: string
  frequency: 'every-visit' | 'as-needed'
  notes?: string
}

export const carePlans = pgTable('care_plans', {
  id:                     uuid('id').defaultRandom().primaryKey(),
  requestId:              uuid('request_id').references(() => careRequests.id, { onDelete: 'cascade' }).unique(),
  recipientId:            uuid('recipient_id').references(() => careRecipients.id, { onDelete: 'set null' }),
  activityMobilitySafety: jsonb('activity_mobility_safety').$type<CareTaskEntry[]>(),
  hygieneElimination:     jsonb('hygiene_elimination').$type<CareTaskEntry[]>(),
  homeManagement:         jsonb('home_management').$type<CareTaskEntry[]>(),
  hydrationNutrition:     jsonb('hydration_nutrition').$type<CareTaskEntry[]>(),
  medicationReminders:    jsonb('medication_reminders').$type<CareTaskEntry[]>(),
  updatedAt:              timestamp('updated_at').defaultNow(),
})
```

- [ ] **Step 2: Add `CARE_PLAN_SECTIONS` to `lib/constants.ts`**

Add after `CLIENT_STATUS_GROUPS`:
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
      { key: 'vacuumSweep',     label: 'Vacuum / Sweep' },
      { key: 'mopFloors',       label: 'Mop Floors' },
      { key: 'dusting',         label: 'Dusting' },
      { key: 'cleanKitchen',    label: 'Clean Kitchen' },
      { key: 'emptyGarbage',    label: 'Empty Garbage' },
      { key: 'washDishes',      label: 'Wash Dishes' },
      { key: 'cleanBedroom',    label: 'Clean Bedroom' },
      { key: 'makeBed',         label: 'Make Bed' },
      { key: 'changeLinens',    label: 'Change Linens' },
      { key: 'laundry',         label: 'Laundry' },
      { key: 'cleanBathroom',   label: 'Clean Bathroom' },
      { key: 'errandsShopping', label: 'Errands / Shopping' },
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

- [ ] **Step 3: Generate + apply migration**

```bash
npx drizzle-kit generate
```

If that fails, create `db/migrations/0011_structured_care_plan.sql`:
```sql
ALTER TABLE care_plans
  DROP COLUMN IF EXISTS daily_schedule,
  DROP COLUMN IF EXISTS medications,
  DROP COLUMN IF EXISTS dietary_restrictions,
  DROP COLUMN IF EXISTS emergency_contacts,
  DROP COLUMN IF EXISTS special_instructions,
  DROP COLUMN IF EXISTS job_id,
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES care_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES care_recipients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS activity_mobility_safety jsonb,
  ADD COLUMN IF NOT EXISTS hygiene_elimination jsonb,
  ADD COLUMN IF NOT EXISTS home_management jsonb,
  ADD COLUMN IF NOT EXISTS hydration_nutrition jsonb,
  ADD COLUMN IF NOT EXISTS medication_reminders jsonb;
```

Apply:
```bash
psql $DATABASE_URL -f db/migrations/0011_structured_care_plan.sql
```

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts lib/constants.ts db/migrations/
git commit -m "feat: structured care plan schema + CARE_PLAN_SECTIONS constant"
```

---

### Task 2: Domain action

**Files:**
- Modify: `domains/clients/requests.ts`

- [ ] **Step 1: Add `CareTaskEntry` import from schema**

At the top of `domains/clients/requests.ts`, add `carePlans, CareTaskEntry` to the schema import:
```ts
import { careRecipients, careRequests, careRequestLocations, carePlans } from '@/db/schema'
import type { CareTaskEntry } from '@/db/schema'
```

- [ ] **Step 2: Add `saveCareRequestCarePlan` server action**

Add at the end of `domains/clients/requests.ts`:
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
): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  // Verify the request belongs to this client
  const [req] = await db
    .select({ id: careRequests.id, recipientId: careRequests.recipientId })
    .from(careRequests)
    .where(and(eq(careRequests.id, requestId), eq(careRequests.clientId, session.user.id)))
    .limit(1)
  if (!req) throw new Error('Not found')

  await db
    .insert(carePlans)
    .values({
      requestId,
      recipientId: req.recipientId ?? undefined,
      activityMobilitySafety: plan.activityMobilitySafety,
      hygieneElimination:     plan.hygieneElimination,
      homeManagement:         plan.homeManagement,
      hydrationNutrition:     plan.hydrationNutrition,
      medicationReminders:    plan.medicationReminders,
    })
    .onConflictDoUpdate({
      target: carePlans.requestId,
      set: {
        activityMobilitySafety: plan.activityMobilitySafety,
        hygieneElimination:     plan.hygieneElimination,
        homeManagement:         plan.homeManagement,
        hydrationNutrition:     plan.hydrationNutrition,
        medicationReminders:    plan.medicationReminders,
        updatedAt:              new Date(),
      },
    })
}
```

- [ ] **Step 3: Commit**

```bash
git add domains/clients/requests.ts
git commit -m "feat: saveCareRequestCarePlan server action"
```

---

### Task 3: Care Plan step component

**Files:**
- Create: `app/(client)/client/dashboard/requests/new/_components/care-plan-step.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { CARE_PLAN_SECTIONS } from '@/lib/constants'
import type { CareTaskEntry } from '@/db/schema'

type SectionKey = 'activityMobilitySafety' | 'hygieneElimination' | 'homeManagement' | 'hydrationNutrition' | 'medicationReminders'

export type CarePlanState = Record<SectionKey, CareTaskEntry[]>

export const EMPTY_CARE_PLAN: CarePlanState = {
  activityMobilitySafety: [],
  hygieneElimination:     [],
  homeManagement:         [],
  hydrationNutrition:     [],
  medicationReminders:    [],
}

interface Props {
  value: CarePlanState
  onChange: (plan: CarePlanState) => void
}

export function CarePlanStep({ value, onChange }: Props) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  function addItem(sectionKey: SectionKey, itemKey: string) {
    const existing = value[sectionKey]
    if (existing.some(e => e.key === itemKey)) return
    onChange({
      ...value,
      [sectionKey]: [...existing, { key: itemKey, frequency: 'every-visit', notes: '' }],
    })
    setOpenDropdown(null)
  }

  function removeItem(sectionKey: SectionKey, itemKey: string) {
    onChange({
      ...value,
      [sectionKey]: value[sectionKey].filter(e => e.key !== itemKey),
    })
  }

  function updateEntry(sectionKey: SectionKey, itemKey: string, patch: Partial<CareTaskEntry>) {
    onChange({
      ...value,
      [sectionKey]: value[sectionKey].map(e =>
        e.key === itemKey ? { ...e, ...patch } : e
      ),
    })
  }

  return (
    <div className="space-y-8">
      {CARE_PLAN_SECTIONS.map(section => {
        const sKey = section.key as SectionKey
        const entries = value[sKey]
        const availableItems = section.items.filter(item => !entries.some(e => e.key === item.key))

        return (
          <div key={sKey}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{section.label}</h3>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === sKey ? null : sKey)}
                  className="text-xs text-primary hover:underline"
                >
                  + Add item
                </button>
                {openDropdown === sKey && availableItems.length > 0 && (
                  <div className="absolute right-0 top-6 z-10 w-52 rounded-lg border border-border bg-card shadow-lg">
                    {availableItems.map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => addItem(sKey, item.key)}
                        className="block w-full px-4 py-2.5 text-left text-sm hover:bg-muted"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {entries.length === 0 && (
              <p className="text-xs text-muted-foreground">No items added yet.</p>
            )}

            <div className="space-y-3">
              {entries.map(entry => {
                const itemLabel = section.items.find(i => i.key === entry.key)?.label ?? entry.key
                return (
                  <div key={entry.key} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{itemLabel}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(sKey, entry.key)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex gap-3 mb-2">
                      {(['every-visit', 'as-needed'] as const).map(freq => (
                        <label key={freq} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name={`${sKey}-${entry.key}-freq`}
                            checked={entry.frequency === freq}
                            onChange={() => updateEntry(sKey, entry.key, { frequency: freq })}
                          />
                          {freq === 'every-visit' ? 'Every Visit' : 'As Needed'}
                        </label>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={entry.notes ?? ''}
                      onChange={e => updateEntry(sKey, entry.key, { notes: e.target.value })}
                      placeholder="Notes (optional)"
                      className="w-full rounded-md border border-border px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(client)/client/dashboard/requests/new/_components/care-plan-step.tsx"
git commit -m "feat: CarePlanStep component"
```

---

### Task 4: Wire Care Plan step into wizard

**Files:**
- Modify: `app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx`

At this point the wizard has 8 steps after Sub-project 2 changes (1-8). The Care Plan step goes in at position 7, shifting old Step 7 (Review & Generate) to 8 and old Step 8 (Matches) to 9.

- [ ] **Step 1: Update STEP_TITLES**

Add `'Care Plan'` at position 7 (index 6):
```ts
const STEP_TITLES = [
  'What type of care is needed?',   // 1
  'Who needs care?',                 // 2
  'Where will care take place?',     // 3
  'Schedule',                        // 4
  'Care Details',                    // 5
  'Preferences',                     // 6
  'Care Plan',                       // 7 ← new
  'Review & generate',               // 8
  'Your Top Matches',                // 9
]
```

- [ ] **Step 2: Add `carePlan` to `RequestForm` interface and EMPTY**

Add to `RequestForm`:
```ts
carePlan: CarePlanState
```

Add to `EMPTY`:
```ts
carePlan: EMPTY_CARE_PLAN,
```

- [ ] **Step 3: Import `CarePlanStep`, `CarePlanState`, `EMPTY_CARE_PLAN`**

```ts
import { CarePlanStep, CarePlanState, EMPTY_CARE_PLAN } from './care-plan-step'
```

- [ ] **Step 4: Add Step 7 "Care Plan" JSX block**

Insert after the closing `)}` of the Step 6 (Preferences) block:
```tsx
{/* Step 7 — Care Plan */}
{step === 7 && (
  <CarePlanStep
    value={form.carePlan}
    onChange={plan => setForm(f => ({ ...f, carePlan: plan }))}
  />
)}
```

- [ ] **Step 5: Shift `step === 7` → `step === 8` and `step === 8` → `step === 9` for existing Review and Matches blocks**

Search for `step === 7` and `step === 8` in the file and increment by 1 each. Also update the total step count check (e.g., `step < 8` → `step < 9`).

- [ ] **Step 6: Add `nextDisabled` case for step 7 — always false (care plan is optional)**

Add:
```ts
step === 7 ? false :
```

- [ ] **Step 7: Update handleSave — call `saveCareRequestCarePlan` after request creation**

In `handleSave` (where `createCareRequest` is called), after getting the `requestId`, add:
```ts
const hasAnyPlan = Object.values(form.carePlan).some(arr => arr.length > 0)
if (hasAnyPlan) {
  await saveCareRequestCarePlan(requestId, form.carePlan)
}
```

Add the import:
```ts
import { createCareRequest, saveCareRequestCarePlan } from '@/domains/clients/requests'
```

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "new-request-form\|care-plan-step"
```

Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add "app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx"
git commit -m "feat: care request wizard — Care Plan step 7"
```

---

### Task 5: Build verification

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "care-plans.test\|rate-defaults.test\|stripe.ts"
```

Expected: no new errors

- [ ] **Step 2: Manual smoke test**

1. `npm run dev`
2. Create a care request — verify Step 7 "Care Plan" appears
3. Add items to each section — verify frequency radio + notes input work
4. Remove an item with × — verify it disappears
5. Submit — verify care plan saves without error
6. Verify leaving all sections empty still allows submission

- [ ] **Step 3: Commit fixups**

```bash
git add -A && git commit -m "fix: structured care plan post-integration fixups"
```
