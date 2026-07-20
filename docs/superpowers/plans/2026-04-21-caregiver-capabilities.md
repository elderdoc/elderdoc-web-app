# Caregiver Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add care plan capabilities, special needs handling, and max carry weight to caregiver profiles — stored on `caregiver_profiles` and surfaced in onboarding (new Step 4) and profile edit.

**Architecture:** Three columns added to `caregiver_profiles`. A new Step 4 "Capabilities" inserted into caregiver onboarding (Steps 4–5 shift to 5–6). New `saveCaregiverCapabilities` action in `domains/caregivers/onboarding.ts`. New onboarding page + form component for Step 4.

**Tech Stack:** Next.js 15, Drizzle ORM, PostgreSQL, TypeScript, Tailwind CSS

---

## File Structure

- Modify: `db/schema.ts` — add 3 columns to caregiverProfiles
- Create: `db/migrations/0012_caregiver_capabilities.sql`
- Modify: `lib/constants.ts` — add SPECIAL_NEEDS_HANDLING
- Modify: `domains/caregivers/onboarding.ts` — add saveCaregiverCapabilities, update completedStep flow
- Create: `app/(marketing)/get-started/caregiver/step-4/page.tsx` — server component
- Create: `app/(marketing)/get-started/caregiver/step-4/_components/step-4-form.tsx` — capabilities form
- Modify: `app/(marketing)/get-started/caregiver/step-4/page.tsx` — rename existing step 4 to step 5 first

**IMPORTANT:** The current Step 4 is Location & Rates and Step 5 is Profile. Before adding a new Step 4, rename those:
- `step-4/` → `step-5/` (Location & Rates)
- `step-5/` → `step-6/` (Profile)

Then create the new `step-4/` (Capabilities).

---

### Task 1: Rename existing steps 4 and 5

**Files:**
- Rename directory: `app/(marketing)/get-started/caregiver/step-4/` → `step-5/`
- Rename directory: `app/(marketing)/get-started/caregiver/step-5/` → `step-6/`
- Update all internal `redirect()` calls and `backHref` props

- [ ] **Step 1: List current caregiver onboarding steps**

```bash
ls app/\(marketing\)/get-started/caregiver/
```

- [ ] **Step 2: Rename step-5 to step-6 first (rename in reverse order)**

```bash
mv "app/(marketing)/get-started/caregiver/step-5" "app/(marketing)/get-started/caregiver/step-6"
```

- [ ] **Step 3: Rename step-4 to step-5**

```bash
mv "app/(marketing)/get-started/caregiver/step-4" "app/(marketing)/get-started/caregiver/step-5"
```

- [ ] **Step 4: Update redirect in `saveCaregiverStep3` (onboarding.ts)**

Change:
```ts
redirect('/get-started/caregiver/step-4')
```
To:
```ts
redirect('/get-started/caregiver/step-4')
```
(This stays the same — Step 3 redirects to the new Step 4 which is Capabilities.)

- [ ] **Step 5: Update redirect in old `saveCaregiverStep4` (now saves Location & Rates)**

The function is now called from Step 5 page. Change its redirect:
```ts
redirect('/get-started/caregiver/step-5')  // old
```
To:
```ts
redirect('/get-started/caregiver/step-6')  // new
```

- [ ] **Step 6: Update old `saveCaregiverStep5` (now Profile)**

Change its redirect:
```ts
redirect('/get-started/caregiver/complete')
```
This stays the same — no change needed.

- [ ] **Step 7: Update `CaregiverStepShell` `currentStep` props in renamed step pages**

In Step 5 (old Step 4 — Location & Rates), update `currentStep={4}` → `currentStep={5}`.
In Step 6 (old Step 5 — Profile), update `currentStep={5}` → `currentStep={6}`.

Also update `backHref` in each step to point to the correct previous step.

- [ ] **Step 8: Update `completedStep` values in `saveCaregiverStep4` (now step 5 action)**

Change `completedStep: 4` → `completedStep: 5`.
Change `completedStep: 5` → `completedStep: 6` in step 5 action.

- [ ] **Step 9: Commit**

```bash
git add "app/(marketing)/get-started/caregiver/"
git add domains/caregivers/onboarding.ts
git commit -m "refactor: rename caregiver onboarding steps 4-5 to 5-6 to make room for Capabilities"
```

---

### Task 2: Schema + constants

**Files:**
- Modify: `db/schema.ts`
- Modify: `lib/constants.ts`

- [ ] **Step 1: Add 3 columns to `caregiverProfiles` in `db/schema.ts`**

After the `availability` column (added in Sub-project 1), add:
```ts
careCapabilities:    jsonb('care_capabilities').$type<{
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
maxCarryLbs:          integer('max_carry_lbs'),
```

- [ ] **Step 2: Add `SPECIAL_NEEDS_HANDLING` to `lib/constants.ts`**

Add after `CARE_PLAN_SECTIONS`:
```ts
export const SPECIAL_NEEDS_HANDLING = [
  { key: 'hardOfHearing',      label: 'Hard of hearing' },
  { key: 'visionProblem',      label: 'Vision impairment' },
  { key: 'amputee',            label: 'Amputee' },
  { key: 'overweightMobility', label: 'Overweight / mobility assistance' },
] as const
```

- [ ] **Step 3: Generate + apply migration**

```bash
npx drizzle-kit generate
```

If that fails, create `db/migrations/0012_caregiver_capabilities.sql`:
```sql
ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS care_capabilities jsonb,
  ADD COLUMN IF NOT EXISTS special_needs_handling jsonb,
  ADD COLUMN IF NOT EXISTS max_carry_lbs integer;
```

Apply:
```bash
psql $DATABASE_URL -f db/migrations/0012_caregiver_capabilities.sql
```

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts lib/constants.ts db/migrations/
git commit -m "feat: caregiver capabilities schema + constants"
```

---

### Task 3: Domain action

**Files:**
- Modify: `domains/caregivers/onboarding.ts`

- [ ] **Step 1: Add `saveCaregiverCapabilities` action**

Add after `saveCaregiverStep3`:
```ts
export async function saveCaregiverCapabilities(data: {
  careCapabilities: {
    activityMobilitySafety: string[]
    hygieneElimination:     string[]
    homeManagement:         string[]
    hydrationNutrition:     string[]
    medicationReminders:    string[]
  }
  specialNeedsHandling: {
    hardOfHearing?:      boolean
    visionProblem?:      boolean
    amputee?:            boolean
    overweightMobility?: boolean
  }
  maxCarryLbs?: number
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const profile = await getOrCreateProfile(session.user.id)

  await db
    .update(caregiverProfiles)
    .set({
      careCapabilities:    data.careCapabilities,
      specialNeedsHandling: data.specialNeedsHandling,
      maxCarryLbs:         data.maxCarryLbs ?? null,
      completedStep:       4,
    })
    .where(eq(caregiverProfiles.id, profile.id))

  redirect('/get-started/caregiver/step-5')
}
```

- [ ] **Step 2: Commit**

```bash
git add domains/caregivers/onboarding.ts
git commit -m "feat: saveCaregiverCapabilities onboarding action"
```

---

### Task 4: Capabilities step UI

**Files:**
- Create: `app/(marketing)/get-started/caregiver/step-4/page.tsx`
- Create: `app/(marketing)/get-started/caregiver/step-4/_components/step-4-form.tsx`

- [ ] **Step 1: Create `page.tsx`**

```tsx
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Step4Form } from './_components/step-4-form'

export default async function Step4Page() {
  const session = await requireRole('caregiver')
  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, session.user.id!),
  })

  const initialCapabilities = (profile?.careCapabilities as {
    activityMobilitySafety: string[]
    hygieneElimination: string[]
    homeManagement: string[]
    hydrationNutrition: string[]
    medicationReminders: string[]
  } | null) ?? {
    activityMobilitySafety: [],
    hygieneElimination:     [],
    homeManagement:         [],
    hydrationNutrition:     [],
    medicationReminders:    [],
  }
  const initialSpecialNeeds = (profile?.specialNeedsHandling as Record<string, boolean> | null) ?? {}
  const initialMaxCarryLbs = profile?.maxCarryLbs ?? null

  return (
    <Step4Form
      initialCapabilities={initialCapabilities}
      initialSpecialNeeds={initialSpecialNeeds}
      initialMaxCarryLbs={initialMaxCarryLbs}
    />
  )
}
```

- [ ] **Step 2: Create `step-4-form.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { SelectableCard } from '@/components/selectable-card'
import { CaregiverStepShell } from '../../_components/caregiver-step-shell'
import { CARE_PLAN_SECTIONS, SPECIAL_NEEDS_HANDLING } from '@/lib/constants'
import { saveCaregiverCapabilities } from '@/domains/caregivers/onboarding'

const labelClass = 'block text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-3'

type SectionKey = 'activityMobilitySafety' | 'hygieneElimination' | 'homeManagement' | 'hydrationNutrition' | 'medicationReminders'

interface Props {
  initialCapabilities: Record<SectionKey, string[]>
  initialSpecialNeeds: Record<string, boolean>
  initialMaxCarryLbs: number | null
}

export function Step4Form({ initialCapabilities, initialSpecialNeeds, initialMaxCarryLbs }: Props) {
  const [capabilities, setCapabilities] = useState<Record<SectionKey, string[]>>(initialCapabilities)
  const [specialNeeds, setSpecialNeeds] = useState<Record<string, boolean>>(initialSpecialNeeds)
  const [maxCarryLbs, setMaxCarryLbs] = useState<string>(initialMaxCarryLbs?.toString() ?? '')
  const [isPending, startTransition] = useTransition()

  function toggleCapability(sectionKey: SectionKey, itemKey: string) {
    setCapabilities(prev => ({
      ...prev,
      [sectionKey]: prev[sectionKey].includes(itemKey)
        ? prev[sectionKey].filter(k => k !== itemKey)
        : [...prev[sectionKey], itemKey],
    }))
  }

  function toggleSpecialNeed(key: string) {
    setSpecialNeeds(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleContinue() {
    startTransition(async () => {
      await saveCaregiverCapabilities({
        careCapabilities:    capabilities,
        specialNeedsHandling: specialNeeds,
        maxCarryLbs:         maxCarryLbs ? parseInt(maxCarryLbs, 10) : undefined,
      })
    })
  }

  return (
    <CaregiverStepShell
      currentStep={4}
      title="What are your capabilities?"
      subtitle="Select all that apply. You can skip any section."
      backHref="/get-started/caregiver/step-3"
    >
      <div className="space-y-10">
        {CARE_PLAN_SECTIONS.map(section => {
          const sKey = section.key as SectionKey
          return (
            <section key={sKey}>
              <p className={labelClass}>{section.label}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {section.items.map(item => (
                  <SelectableCard
                    key={item.key}
                    selected={capabilities[sKey].includes(item.key)}
                    onSelect={() => toggleCapability(sKey, item.key)}
                  >
                    <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                  </SelectableCard>
                ))}
              </div>
            </section>
          )
        })}

        <section>
          <p className={labelClass}>Special needs clients you can work with</p>
          <div className="grid grid-cols-2 gap-2">
            {SPECIAL_NEEDS_HANDLING.map(item => (
              <SelectableCard
                key={item.key}
                selected={!!specialNeeds[item.key]}
                onSelect={() => toggleSpecialNeed(item.key)}
              >
                <span className="text-[15px] font-medium text-foreground">{item.label}</span>
              </SelectableCard>
            ))}
          </div>
        </section>

        <section>
          <p className={labelClass}>Maximum weight you can assist with (lbs)</p>
          <p className="text-xs text-muted-foreground mb-2">For mobility assistance and transfers</p>
          <input
            type="number"
            min={0}
            max={500}
            value={maxCarryLbs}
            onChange={e => setMaxCarryLbs(e.target.value)}
            placeholder="e.g. 150"
            className="w-48 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </section>
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          disabled={isPending}
          onClick={handleContinue}
          className="rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </CaregiverStepShell>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "step-4\|caregiver-capabilities\|onboarding"
```

Expected: no errors in these files

- [ ] **Step 4: Commit**

```bash
git add "app/(marketing)/get-started/caregiver/step-4/"
git commit -m "feat: caregiver onboarding Step 4 — Capabilities (care plan tasks, special needs, max carry weight)"
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
2. Go through caregiver onboarding — verify Step 4 "Capabilities" appears between Work Preferences (Step 3) and Location & Rates (Step 5)
3. Toggle several care plan task items across sections — verify they stay selected
4. Select special needs options
5. Enter max carry weight
6. Click Continue — verify redirects to Step 5 and saves without error

- [ ] **Step 3: Commit fixups**

```bash
git add -A && git commit -m "fix: caregiver capabilities post-integration fixups"
```
