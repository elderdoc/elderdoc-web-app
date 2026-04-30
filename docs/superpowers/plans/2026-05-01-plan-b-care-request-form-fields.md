# Care Request Form Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the care request form: replace medical equipment options with Cane/Walker/Wheelchair, change diet to a standalone free-text input, rename "Other" to "Other considerations", split language preference into preferred/required with conditional reveal, and replace the single budget amount field with a min/max dual-handle slider (per hour or per day).

**Architecture:** One DB migration drops `budget_amount` and `language_pref` columns, adds `budget_min`, `budget_max`, `languages_preferred`, `languages_required`. The form component replaces `budgetAmount`/`languagePref` state with min/max and split language state. Downstream code (matching, weekly billing cron, payment queries) is updated to use the new columns.

**Tech Stack:** Next.js 15 App Router, React, Drizzle ORM, Tailwind CSS

---

## File Structure

| File | Change |
|------|--------|
| `db/schema.ts` | Drop `budgetAmount`, add `budgetMin`/`budgetMax`; drop `languagePref`, add `languagesPreferred`/`languagesRequired`; update clientStatus type |
| `lib/constants.ts` | Update `BUDGET_TYPES`, update `CLIENT_STATUS_GROUPS` Medical Equipment items |
| `domains/clients/requests.ts` | Update `createCareRequest` and `updateCareRequest` params |
| `domains/matching/match-caregivers.ts` | Update column references |
| `domains/matching/match-jobs.ts` | Update column references and type |
| `domains/payments/queries.ts` | Update `budgetAmount` → `budgetMin` in shift queries |
| `app/api/cron/weekly-billing/route.ts` | Update `budgetAmount` → `budgetMin` |
| `app/(client)/client/dashboard/requests/new/page.tsx` | Query per-care-type averages |
| `app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx` | All UI changes |

---

### Task 1: DB schema changes

**Files:**
- Modify: `db/schema.ts`

- [ ] **Step 1: Update `careRequests` columns in `db/schema.ts`**

Find the `careRequests` table (around line 140). Make these changes:

Replace:
```typescript
languagePref: text('language_pref').array(),
budgetType:   text('budget_type'),
budgetAmount: numeric('budget_amount', { precision: 10, scale: 2 }),
```

With:
```typescript
languagesPreferred: text('languages_preferred').array().notNull().default([]),
languagesRequired:  text('languages_required').array().notNull().default([]),
budgetType:         text('budget_type'),
budgetMin:          numeric('budget_min', { precision: 10, scale: 2 }),
budgetMax:          numeric('budget_max', { precision: 10, scale: 2 }),
```

- [ ] **Step 2: Update `clientStatus` type to add medical equipment keys**

In the `careRequests` table `clientStatus` jsonb type (around line 163), add `cane`, `walker`, `wheelchair` and remove the old medical equipment references. The full updated type:

```typescript
clientStatus:     jsonb('client_status').$type<{
  livesAlone?: boolean; livesWith?: boolean; aloneDuringDay?: boolean
  bedBound?: boolean; upAsTolerated?: boolean
  speechProblems?: boolean; glassesOrContacts?: boolean; visionProblem?: boolean
  hardOfHearing?: boolean
  amputee?: boolean; amputeeDetails?: string
  denturesUpper?: boolean; denturesLower?: boolean; denturesPartial?: boolean
  orientedAlert?: boolean; forgetful?: boolean; confused?: boolean
  urinaryCath?: boolean; feedingTube?: boolean
  cane?: boolean; walker?: boolean; wheelchair?: boolean
  diabetic?: boolean; diet?: string; other?: string
}>(),
```

(Keep `urinaryCath` and `feedingTube` in the type so existing data is not invalidated; the UI will just stop showing them.)

- [ ] **Step 3: Generate migration**

```bash
npm run db:generate
```
Expected: generates a migration that drops `language_pref`, `budget_amount` and adds the new columns. The generated SQL will look like:
```sql
ALTER TABLE "care_requests" DROP COLUMN "language_pref";
ALTER TABLE "care_requests" DROP COLUMN "budget_amount";
ALTER TABLE "care_requests" ADD COLUMN "languages_preferred" text[] NOT NULL DEFAULT '{}';
ALTER TABLE "care_requests" ADD COLUMN "languages_required" text[] NOT NULL DEFAULT '{}';
ALTER TABLE "care_requests" ADD COLUMN "budget_min" numeric(10,2);
ALTER TABLE "care_requests" ADD COLUMN "budget_max" numeric(10,2);
```

- [ ] **Step 4: Apply migration**

```bash
DATABASE_URL=postgres://elderdoc:elderdoc@localhost:5432/elderdoc npm run db:migrate
```
Expected: "1 migration(s) applied"

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts db/migrations/
git commit -m "feat: migrate care_requests - split language pref, replace budget amount with min/max"
```

---

### Task 2: Update constants

**Files:**
- Modify: `lib/constants.ts`

- [ ] **Step 1: Replace Medical Equipment items in `CLIENT_STATUS_GROUPS`**

Find the `Medical Equipment` group (around line 150):
```typescript
{
  label: 'Medical Equipment',
  items: [
    { key: 'urinaryCath', label: 'Urinary cath' },
    { key: 'feedingTube', label: 'Feeding tube' },
  ],
},
```

Replace with:
```typescript
{
  label: 'Medical Equipment',
  items: [
    { key: 'cane',        label: 'Cane' },
    { key: 'walker',      label: 'Walker' },
    { key: 'wheelchair',  label: 'Wheelchair' },
  ],
},
```

- [ ] **Step 2: Update `BUDGET_TYPES` constant**

Find `BUDGET_TYPES` (around line 297):
```typescript
export const BUDGET_TYPES = [
  { key: 'hourly',  label: 'Hourly rate' },
  { key: 'weekly',  label: 'Fixed weekly' },
] as const
```

Replace with:
```typescript
export const BUDGET_TYPES = [
  { key: 'hourly', label: 'Per hour' },
  { key: 'daily',  label: 'Per day' },
] as const
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: errors about `budgetAmount`/`languagePref` missing — that's expected at this stage; we'll fix them in later tasks.

- [ ] **Step 4: Commit**

```bash
git add lib/constants.ts
git commit -m "feat: update medical equipment options and budget type labels in constants"
```

---

### Task 3: Update domain — requests server action

**Files:**
- Modify: `domains/clients/requests.ts`

- [ ] **Step 1: Update `createCareRequest` parameter type**

Replace the `languagePref` and `budgetAmount` params with the new fields:

```typescript
export async function createCareRequest(data: {
  recipientId: string
  careType: string
  address: { address1: string; address2?: string; city: string; state: string }
  frequency: string
  schedule: Array<{ day: string; startTime: string; endTime: string }>
  startDate: string
  endDate?: string
  genderPref?: string
  transportationPref?: string
  languagesPreferred: string[]         // was: languagePref: string[]
  languagesRequired: string[]          // new
  budgetType?: string
  budgetMin?: string                   // was: budgetAmount?: string
  budgetMax?: string                   // new
  title: string
  description: string
  suppliesNeeded?: string
  infectionControl?: { enabled: boolean; gloves?: boolean; handWashing?: boolean; wasteDisposal?: boolean }
  safetyMeasures?: { enabled: boolean; clearPathways?: boolean; electricCords?: boolean; pets?: boolean }
  clientStatus?: Record<string, boolean | string>
}): Promise<{ id: string }> {
```

- [ ] **Step 2: Update the DB insert call in `createCareRequest`**

Inside the `tx.insert(careRequests).values({...})` call, replace:
```typescript
languagePref:        data.languagePref,
budgetType:          data.budgetType,
budgetAmount:        data.budgetAmount?.trim() && Number.isFinite(Number(data.budgetAmount.trim())) ? data.budgetAmount.trim() : undefined,
```

With:
```typescript
languagesPreferred:  data.languagesPreferred,
languagesRequired:   data.languagesRequired,
budgetType:          data.budgetType,
budgetMin:           data.budgetMin?.trim() && Number.isFinite(Number(data.budgetMin.trim())) ? data.budgetMin.trim() : undefined,
budgetMax:           data.budgetMax?.trim() && Number.isFinite(Number(data.budgetMax.trim())) ? data.budgetMax.trim() : undefined,
```

- [ ] **Step 3: Update `updateCareRequest` parameter type and DB set call**

Same changes as above — replace `languagePref` with `languagesPreferred`/`languagesRequired`, and `budgetAmount` with `budgetMin`/`budgetMax` in both the param type and the `.set({...})` call.

The updated `updateCareRequest` data type:
```typescript
export async function updateCareRequest(id: string, data: {
  title?: string
  description?: string
  frequency?: string
  schedule?: Array<{ day: string; startTime: string; endTime: string }>
  startDate?: string
  endDate?: string
  genderPref?: string
  transportationPref?: string
  languagesPreferred?: string[]
  languagesRequired?: string[]
  budgetType?: string
  budgetMin?: string
  budgetMax?: string
  suppliesNeeded?: string
  infectionControl?: { enabled: boolean; gloves?: boolean; handWashing?: boolean; wasteDisposal?: boolean }
  safetyMeasures?: { enabled: boolean; clearPathways?: boolean; electricCords?: boolean; pets?: boolean }
  clientStatus?: Record<string, boolean | string>
}): Promise<void> {
```

And the `.set({...})` call:
```typescript
await db.update(careRequests)
  .set({
    title:              data.title,
    description:        data.description,
    frequency:          data.frequency,
    schedule:           data.schedule,
    startDate:          data.startDate,
    endDate:            data.endDate,
    genderPref:         data.genderPref,
    transportationPref: data.transportationPref,
    languagesPreferred: data.languagesPreferred,
    languagesRequired:  data.languagesRequired,
    budgetType:         data.budgetType,
    budgetMin:          data.budgetMin?.trim() && Number.isFinite(Number(data.budgetMin.trim())) ? data.budgetMin.trim() : undefined,
    budgetMax:          data.budgetMax?.trim() && Number.isFinite(Number(data.budgetMax.trim())) ? data.budgetMax.trim() : undefined,
    suppliesNeeded:     data.suppliesNeeded,
    infectionControl:   data.infectionControl,
    safetyMeasures:     data.safetyMeasures,
    clientStatus:       data.clientStatus,
  })
  .where(and(eq(careRequests.id, id), eq(careRequests.clientId, session.user.id)))
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: remaining errors in matching and cron files; those are fixed in later tasks.

- [ ] **Step 5: Commit**

```bash
git add domains/clients/requests.ts
git commit -m "feat: update createCareRequest/updateCareRequest for split language and budget min/max"
```

---

### Task 4: Update matching domain

**Files:**
- Modify: `domains/matching/match-caregivers.ts`
- Modify: `domains/matching/match-jobs.ts`

- [ ] **Step 1: Update `match-caregivers.ts` column references**

Find the `.select({...})` call in `match-caregivers.ts` around line 39. Replace:
```typescript
languagePref:  careRequests.languagePref,
budgetAmount:  careRequests.budgetAmount,
```
With:
```typescript
languagesPreferred: careRequests.languagesPreferred,
languagesRequired:  careRequests.languagesRequired,
budgetMin:          careRequests.budgetMin,
budgetMax:          careRequests.budgetMax,
```

Find all downstream references to `requestRow.languagePref` and `requestRow.budgetAmount` in the same file and update:
- `requestRow.languagePref` → `requestRow.languagesPreferred`
- `requestRow.budgetAmount` → `requestRow.budgetMin` (used for the AI prompt context)

Find the AI prompt string (around line 184):
```typescript
Language preference: ${(requestRow.languagePref ?? []).join(', ') || 'none'}
...
Budget: ${requestRow.budgetType ?? ''} ${requestRow.budgetAmount ?? ''}
```
Update to:
```typescript
Language preference: ${(requestRow.languagesPreferred ?? []).join(', ') || 'none'}
Required languages: ${(requestRow.languagesRequired ?? []).join(', ') || 'none'}
...
Budget: ${requestRow.budgetType ?? ''} $${requestRow.budgetMin ?? '?'}–$${requestRow.budgetMax ?? '?'}
```

- [ ] **Step 2: Update the result map in `match-caregivers.ts`**

Find where the result row is mapped (around line 132 in match-jobs.ts equivalent). Update:
```typescript
languagesPreferred: r.languagesPreferred,
languagesRequired:  r.languagesRequired,
budgetMin:          r.budgetMin,
budgetMax:          r.budgetMax,
```

- [ ] **Step 3: Update `match-jobs.ts` type and column references**

Find the `JobRequest` type (around line 22) and update:
```typescript
// Replace:
budgetAmount: string | null
// With:
budgetMin: string | null
budgetMax: string | null
languagesPreferred: string[] | null
languagesRequired: string[] | null
```

Remove `languagePref: string[] | null` if it exists.

Update all `.select({...})` calls in `match-jobs.ts` to use the new column names:
```typescript
languagesPreferred: careRequests.languagesPreferred,
languagesRequired:  careRequests.languagesRequired,
budgetMin:          careRequests.budgetMin,
budgetMax:          careRequests.budgetMax,
```

Replace all downstream references to `budgetAmount` with `budgetMin` and `languagePref` with `languagesPreferred`.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: errors from payments/queries.ts and cron files remain; those are fixed next.

- [ ] **Step 5: Commit**

```bash
git add domains/matching/match-caregivers.ts domains/matching/match-jobs.ts
git commit -m "feat: update matching domain for split language and budget min/max columns"
```

---

### Task 5: Update payment queries and weekly billing cron

**Files:**
- Modify: `domains/payments/queries.ts`
- Modify: `app/api/cron/weekly-billing/route.ts`

- [ ] **Step 1: Update `domains/payments/queries.ts` — budgetAmount → budgetMin**

In `getUnbilledShiftsForClient` and `getUnbilledShiftsForCaregiver`, find:
```typescript
hourlyRate: careRequests.budgetAmount,
```
Replace with:
```typescript
hourlyRate: careRequests.budgetMin,
```

- [ ] **Step 2: Update `app/api/cron/weekly-billing/route.ts` — budgetAmount → budgetMin**

In the `.select({...})` call, find:
```typescript
budgetAmount:     careRequests.budgetAmount,
```
Replace with:
```typescript
budgetMin:        careRequests.budgetMin,
```

In the `for` loop, find:
```typescript
const { clientId, stripeCustomerId, budgetAmount, careType } = jobShifts[0]
```
Replace with:
```typescript
const { clientId, stripeCustomerId, budgetMin, careType } = jobShifts[0]
```

Find:
```typescript
const rate = Number(budgetAmount)
```
Replace with:
```typescript
const rate = Number(budgetMin ?? 0)
```

Also update the `.where()` clause condition `isNotNull(careRequests.budgetAmount)` to `isNotNull(careRequests.budgetMin)`.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors (or only errors from the form component, which is fixed in the next task).

- [ ] **Step 4: Commit**

```bash
git add domains/payments/queries.ts app/api/cron/weekly-billing/route.ts
git commit -m "feat: update payment queries and billing cron for budgetMin column"
```

---

### Task 6: Update new-request page — per-care-type average rates

**Files:**
- Modify: `app/(client)/client/dashboard/requests/new/page.tsx`

- [ ] **Step 1: Replace single average query with per-care-type query**

The current page queries a single global average. Replace it with a per-care-type query using `caregiverCareTypes`.

Replace the current `rateRow` query in `page.tsx` with:

```typescript
import { careRecipients, caregiverProfiles, caregiverCareTypes } from '@/db/schema'
import { eq, isNotNull, avg } from 'drizzle-orm'
```

And replace the query:
```typescript
const [recipients, avgRateRows] = await Promise.all([
  db
    .select({
      id:           careRecipients.id,
      name:         careRecipients.name,
      relationship: careRecipients.relationship,
      photoUrl:     careRecipients.photoUrl,
      address:      careRecipients.address,
      conditions:   careRecipients.conditions,
      mobilityLevel:careRecipients.mobilityLevel,
      height:       careRecipients.height,
      weight:       careRecipients.weight,
      clientStatus: careRecipients.clientStatus,
    })
    .from(careRecipients)
    .where(eq(careRecipients.clientId, userId)),
  db
    .select({
      careType: caregiverCareTypes.careType,
      avgMin:   avg(caregiverProfiles.hourlyMin),
      avgMax:   avg(caregiverProfiles.hourlyMax),
    })
    .from(caregiverProfiles)
    .innerJoin(caregiverCareTypes, eq(caregiverProfiles.id, caregiverCareTypes.caregiverId))
    .where(isNotNull(caregiverProfiles.hourlyMin))
    .groupBy(caregiverCareTypes.careType),
])

const avgRatesByCareType: Record<string, { min: number; max: number }> = {}
for (const row of avgRateRows) {
  if (row.avgMin && row.avgMax) {
    avgRatesByCareType[row.careType] = {
      min: Math.round(Number(row.avgMin)),
      max: Math.round(Number(row.avgMax)),
    }
  }
}
```

- [ ] **Step 2: Update the `NewRequestForm` props**

Replace:
```tsx
return (
  <NewRequestForm
    initialRecipients={recipients}
    initialRecipientId={recipientId}
    avgHourlyMin={avgHourlyMin}
    avgHourlyMax={avgHourlyMax}
  />
)
```
With:
```tsx
return (
  <NewRequestForm
    initialRecipients={recipients}
    initialRecipientId={recipientId}
    avgRatesByCareType={avgRatesByCareType}
  />
)
```

- [ ] **Step 3: Commit**

```bash
git add app/\(client\)/client/dashboard/requests/new/page.tsx
git commit -m "feat: query per-care-type average rates for care request form"
```

---

### Task 7: Update new-request-form UI

**Files:**
- Modify: `app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx`

- [ ] **Step 1: Update Props interface**

Replace `avgHourlyMin: number | null` and `avgHourlyMax: number | null` with:
```typescript
interface Props {
  initialRecipients: RecipientOption[]
  initialRecipientId?: string
  avgRatesByCareType: Record<string, { min: number; max: number }>
}
```

Update the function signature:
```typescript
export function NewRequestForm({ initialRecipients, initialRecipientId, avgRatesByCareType }: Props) {
```

- [ ] **Step 2: Update RequestForm state interface**

Replace:
```typescript
languagePref: string[]
budgetType: string
budgetAmount: string
```
With:
```typescript
languagesPreferred: string[]
languagesRequired: string[]
requireLanguages: boolean
budgetType: string
budgetMin: string
budgetMax: string
```

- [ ] **Step 3: Update EMPTY state**

Replace:
```typescript
genderPref: '', transportationPref: '', languagePref: [], budgetType: '', budgetAmount: '',
```
With:
```typescript
genderPref: '', transportationPref: '',
languagesPreferred: [], languagesRequired: [], requireLanguages: false,
budgetType: '', budgetMin: '', budgetMax: '',
```

- [ ] **Step 4: Remove old toggleMulti for languagePref, add new language handlers**

Remove the `toggleMulti` usage for `'languagePref'`. Add two new toggle functions after the existing `toggleMulti` function:

```typescript
function togglePreferredLanguage(key: string) {
  setForm(f => ({
    ...f,
    languagesPreferred: f.languagesPreferred.includes(key)
      ? f.languagesPreferred.filter(v => v !== key)
      : [...f.languagesPreferred, key],
  }))
}

function toggleRequiredLanguage(key: string) {
  setForm(f => ({
    ...f,
    languagesRequired: f.languagesRequired.includes(key)
      ? f.languagesRequired.filter(v => v !== key)
      : [...f.languagesRequired, key],
  }))
}
```

- [ ] **Step 5: Update step validation for budget**

Find `stepValid[5]` (step 6 budget validation, around line 294):
```typescript
form.genderPref.length > 0 && form.transportationPref.length > 0 && form.budgetType.length > 0 && form.budgetAmount.trim().length > 0,
```
Replace with:
```typescript
form.genderPref.length > 0 && form.transportationPref.length > 0 && form.budgetType.length > 0 && form.budgetMin.trim().length > 0 && form.budgetMax.trim().length > 0,
```

Also update `stepHint[5]` (around line 316-320):
```typescript
if (!form.budgetType) return 'Select a budget type.'
if (!form.budgetMin.trim()) return 'Enter a minimum rate.'
if (!form.budgetMax.trim()) return 'Enter a maximum rate.'
return null
```

- [ ] **Step 6: Replace Medical Equipment "Other" label**

In Step 5 (Care Details), find the "Other" label (around line 743):
```typescript
<label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Other</label>
```
Replace with:
```typescript
<label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Other considerations</label>
```

- [ ] **Step 7: Replace Diet conditional with standalone free-text input**

In Step 5, find the diabetic conditional diet input (lines 729-735):
```tsx
{checked && item.key === 'diabetic' && (
  <input type="text"
    value={typeof form.careRequestClientStatus.diet === 'string' ? form.careRequestClientStatus.diet : ''}
    onChange={e => setForm(f => ({ ...f, careRequestClientStatus: { ...f.careRequestClientStatus, diet: e.target.value } }))}
    className="rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-none"
    placeholder="Diet details" />
)}
```
Remove it.

After the `CLIENT_STATUS_GROUPS.map(...)` block (and after the "Other considerations" input), add a standalone Diet section:

```tsx
<div>
  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Diet</label>
  <input
    type="text"
    value={typeof form.careRequestClientStatus.diet === 'string' ? form.careRequestClientStatus.diet : ''}
    onChange={e => setForm(f => ({ ...f, careRequestClientStatus: { ...f.careRequestClientStatus, diet: e.target.value } }))}
    className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
    placeholder="e.g. Diabetic, low sodium, pureed…"
  />
</div>
```

- [ ] **Step 8: Replace language section in Step 6 (Preferences)**

Find the Languages section in Step 6 (around line 796-807):
```tsx
<div>
  <label className="block text-sm font-medium mb-3">Languages</label>
  <div className="flex flex-wrap gap-2">
    {LANGUAGES.map((l) => (
      <button key={l.key} type="button"
        onClick={() => toggleMulti('languagePref', l.key)}
        className={['rounded-xl border-2 px-4 py-2 text-sm transition-colors', form.languagePref.includes(l.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
        {l.label}
      </button>
    ))}
  </div>
</div>
```

Replace with:
```tsx
<div>
  <label className="block text-sm font-medium mb-2">Languages Preferred</label>
  <div className="flex flex-wrap gap-2 mb-3">
    {LANGUAGES.map((l) => (
      <button key={l.key} type="button"
        onClick={() => togglePreferredLanguage(l.key)}
        className={['rounded-xl border-2 px-4 py-2 text-sm transition-colors', form.languagesPreferred.includes(l.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
        {l.label}
      </button>
    ))}
  </div>
  <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
    <input
      type="checkbox"
      checked={form.requireLanguages}
      onChange={e => setForm(f => ({ ...f, requireLanguages: e.target.checked, languagesRequired: e.target.checked ? f.languagesRequired : [] }))}
      className="h-4 w-4 rounded border-border accent-primary"
    />
    <span className="text-sm">Require specific languages</span>
  </label>
  {form.requireLanguages && (
    <div>
      <label className="block text-xs text-muted-foreground mb-2">Languages Required</label>
      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map((l) => (
          <button key={l.key} type="button"
            onClick={() => toggleRequiredLanguage(l.key)}
            className={['rounded-xl border-2 px-4 py-2 text-sm transition-colors', form.languagesRequired.includes(l.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 9: Replace budget section in Step 6 with min/max slider**

Find the Budget section in Step 6 (around line 808-850). Replace the entire budget block with:

```tsx
<div>
  <label className="block text-sm font-medium mb-3">Please enter hourly rate *</label>
  <div className="flex gap-2 mb-4">
    {BUDGET_TYPES.map((b) => (
      <button key={b.key} type="button"
        onClick={() => setForm((f) => ({ ...f, budgetType: b.key }))}
        className={['rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors', form.budgetType === b.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
        {b.label}
      </button>
    ))}
  </div>
  {form.budgetType && (() => {
    const SMIN = 10, SMAX = 100
    const lo = Math.min(Math.max(Number(form.budgetMin) || SMIN, SMIN), SMAX)
    const hi = Math.min(Math.max(Number(form.budgetMax) || SMAX, SMIN), SMAX)
    const loPct = ((lo - SMIN) / (SMAX - SMIN)) * 100
    const hiPct = ((hi - SMIN) / (SMAX - SMIN)) * 100
    const thumbCls = 'appearance-none bg-transparent absolute inset-0 w-full h-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:bg-transparent'
    const unit = form.budgetType === 'hourly' ? '/hr' : '/day'

    // Show average rates for selected care types
    const avgLines = form.careTypes.map(ct => {
      const avg = avgRatesByCareType[ct]
      if (!avg) return null
      const typeLabel = ct.replace(/-/g, ' ')
      return (
        <p key={ct} className="text-xs text-muted-foreground capitalize">
          {typeLabel} caregivers typically earn <span className="font-medium text-foreground">${avg.min}–${avg.max}{unit}</span> on average
        </p>
      )
    }).filter(Boolean)

    return (
      <div className="space-y-4">
        {/* Slider */}
        <div className="px-1">
          <div className="relative h-5 flex items-center">
            <div className="absolute inset-x-0 h-[5px] rounded-full bg-muted" />
            <div
              className="absolute h-[5px] rounded-full bg-primary"
              style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
            />
            <input
              type="range"
              min={SMIN}
              max={SMAX}
              value={lo}
              onChange={e => {
                const v = Number(e.target.value)
                setForm(f => ({ ...f, budgetMin: String(v) }))
                if (v > hi) setForm(f => ({ ...f, budgetMax: String(v) }))
              }}
              style={{ zIndex: lo >= hi - 2 ? 5 : 3 }}
              className={thumbCls}
            />
            <input
              type="range"
              min={SMIN}
              max={SMAX}
              value={hi}
              onChange={e => {
                const v = Number(e.target.value)
                setForm(f => ({ ...f, budgetMax: String(v) }))
                if (v < lo) setForm(f => ({ ...f, budgetMin: String(v) }))
              }}
              style={{ zIndex: lo >= hi - 2 ? 3 : 5 }}
              className={thumbCls}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">$10</span>
            <span className="text-xs text-muted-foreground">$100+</span>
          </div>
        </div>
        {/* Number inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Min rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min={SMIN}
                value={form.budgetMin}
                onChange={e => setForm(f => ({ ...f, budgetMin: e.target.value }))}
                className="w-full rounded-lg border border-border pl-7 pr-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                placeholder="10"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Max rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min={SMIN}
                value={form.budgetMax}
                onChange={e => setForm(f => ({ ...f, budgetMax: e.target.value }))}
                className="w-full rounded-lg border border-border pl-7 pr-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                placeholder="100+"
              />
            </div>
          </div>
        </div>
        {/* Average rate display */}
        {avgLines.length > 0 && (
          <div className="space-y-1">
            {avgLines}
          </div>
        )}
      </div>
    )
  })()}
</div>
```

- [ ] **Step 10: Update handleSubmit to use new field names**

In `handleSubmit`, find the `createCareRequest({...})` call. Replace:
```typescript
languagePref:       form.languagePref,
budgetType:    form.budgetType || undefined,
budgetAmount:  form.budgetAmount || undefined,
```
With:
```typescript
languagesPreferred: form.languagesPreferred,
languagesRequired:  form.languagesRequired,
budgetType:    form.budgetType || undefined,
budgetMin:     form.budgetMin || undefined,
budgetMax:     form.budgetMax || undefined,
```

Also update the `handleGenerate` fetch body to replace `languages: form.languagePref` with `languages: form.languagesPreferred` and `budgetAmount: form.budgetAmount` with `budgetMin: form.budgetMin, budgetMax: form.budgetMax`.

- [ ] **Step 11: Verify TypeScript and build**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 12: Manual test**

Start dev server. Navigate to `/client/dashboard/requests/new`. Verify:
- Step 5 Medical Equipment shows Cane, Walker, Wheelchair
- Step 5 Diet is a standalone free-text input (always visible)
- Step 5 "Other" label is now "Other considerations"
- Step 6 Languages shows "Languages Preferred" toggles, checkbox "Require specific languages", and conditional "Languages Required" section
- Step 6 Budget shows "Per hour" / "Per day" buttons, dual-handle slider ($10–$100+), two number inputs, average rate display per selected care type

- [ ] **Step 13: Commit**

```bash
git add app/\(client\)/client/dashboard/requests/new/_components/new-request-form.tsx
git commit -m "feat: update care request form - medical equipment, diet free text, languages split, budget min/max slider"
```
