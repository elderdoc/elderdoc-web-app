# Per-Day Schedule Hours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `days[]` + `shifts[]` + `durationHours` fields with a per-day `schedule` JSONB array on care requests, and add a matching `availability` JSONB array on caregiver profiles, with a "same time every day" checkbox in both UIs.

**Architecture:** Schema changes drop three columns from `care_requests` and two from `caregiver_work_prefs`, adding JSONB columns to `care_requests` and `caregiver_profiles`. Domain actions and both wizard UIs (care request Step 4 and caregiver onboarding Step 3) are updated to use the new structure. Matching is updated to use day coverage instead of shift matching.

**Tech Stack:** Next.js 15, Drizzle ORM, PostgreSQL, TypeScript, Tailwind CSS, Jest

---

## File Structure

- Modify: `db/schema.ts` — add `schedule` to careRequests, add `availability` to caregiverProfiles, remove `shift`/`day` from caregiverWorkPrefs
- Create: `db/migrations/0009_schedule_availability.sql` — migration SQL
- Modify: `domains/clients/requests.ts` — update createCareRequest + updateCareRequest signatures and DB writes
- Modify: `domains/caregivers/onboarding.ts` — update saveCaregiverStep3 to persist to availability instead of day/shift rows
- Modify: `app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx` — rewrite Step 4 UI
- Modify: `app/(marketing)/get-started/caregiver/step-3/page.tsx` — update server query to read availability
- Modify: `app/(marketing)/get-started/caregiver/step-3/_components/step-3-form.tsx` — rewrite time section
- Modify: `domains/matching/match-caregivers.ts` — update request fetch + pre-filter + prompt
- Modify: `db/seed.ts` — update seeded care requests and remove day/shift work pref rows

---

### Task 1: Schema changes

**Files:**
- Modify: `db/schema.ts`

- [ ] **Step 1: Update careRequests table in `db/schema.ts`**

Replace:
```ts
days:         text('days').array(),
shifts:       text('shifts').array(),
startDate:    text('start_date'),
durationHours:integer('duration_hours'),
```
With:
```ts
schedule:     jsonb('schedule').$type<Array<{ day: string; startTime: string; endTime: string }>>(),
startDate:    text('start_date'),
```

- [ ] **Step 2: Update caregiverProfiles table in `db/schema.ts`**

Add after `stripeConnectAccountId`:
```ts
availability: jsonb('availability').$type<Array<{ day: string; startTime: string; endTime: string }>>(),
```

- [ ] **Step 3: Update caregiverWorkPrefs table in `db/schema.ts`**

Remove:
```ts
shift:               text('shift'),
day:                 text('day'),
```
Result:
```ts
export const caregiverWorkPrefs = pgTable('caregiver_work_prefs', {
  id:                  uuid('id').defaultRandom().primaryKey(),
  caregiverId:         uuid('caregiver_id').notNull().references(() => caregiverProfiles.id, { onDelete: 'cascade' }),
  workType:            text('work_type'),
  travelDistanceMiles: integer('travel_distance_miles'),
  startAvailability:   text('start_availability'),
})
```

- [ ] **Step 4: Generate migration**

```bash
npx drizzle-kit generate
```

Expected: generates `db/migrations/0009_*.sql`

- [ ] **Step 5: Create the migration file manually if drizzle-kit fails**

Create `db/migrations/0009_schedule_availability.sql`:
```sql
ALTER TABLE care_requests
  ADD COLUMN IF NOT EXISTS schedule jsonb,
  DROP COLUMN IF EXISTS days,
  DROP COLUMN IF EXISTS shifts,
  DROP COLUMN IF EXISTS duration_hours;

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS availability jsonb;

ALTER TABLE caregiver_work_prefs
  DROP COLUMN IF EXISTS shift,
  DROP COLUMN IF EXISTS day;
```

- [ ] **Step 6: Apply migration**

```bash
psql $DATABASE_URL -f db/migrations/0009_schedule_availability.sql
```

Expected: no errors, ALTER TABLE succeeds

- [ ] **Step 7: Commit**

```bash
git add db/schema.ts db/migrations/
git commit -m "feat: schedule/availability JSONB schema — replace days/shifts/durationHours"
```

---

### Task 2: Update domain actions

**Files:**
- Modify: `domains/clients/requests.ts`

- [ ] **Step 1: Update `createCareRequest` signature**

Replace the `days`, `shifts`, `durationHours` parameters with `schedule`:
```ts
export async function createCareRequest(data: {
  recipientId: string
  careType: string
  address: { address1: string; address2?: string; city: string; state: string }
  frequency: string
  schedule: Array<{ day: string; startTime: string; endTime: string }>
  startDate: string
  genderPref?: string
  languagePref: string[]
  budgetType?: string
  budgetAmount?: string
  title: string
  description: string
}): Promise<{ id: string }>
```

- [ ] **Step 2: Update the DB insert in `createCareRequest`**

Replace:
```ts
frequency:    data.frequency,
days:         data.days,
shifts:       data.shifts,
startDate:    data.startDate,
durationHours:data.durationHours,
```
With:
```ts
frequency:    data.frequency,
schedule:     data.schedule,
startDate:    data.startDate,
```

- [ ] **Step 3: Update `updateCareRequest` signature**

Replace `days?`, `shifts?`, `durationHours?` with:
```ts
schedule?: Array<{ day: string; startTime: string; endTime: string }>
```

- [ ] **Step 4: Update the DB set in `updateCareRequest`**

Replace:
```ts
frequency:     data.frequency,
days:          data.days,
shifts:        data.shifts,
startDate:     data.startDate,
durationHours: data.durationHours,
```
With:
```ts
frequency:     data.frequency,
schedule:      data.schedule,
startDate:     data.startDate,
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "domains/clients/requests.ts"
```

Expected: no new errors for this file

- [ ] **Step 6: Commit**

```bash
git add domains/clients/requests.ts
git commit -m "feat: update createCareRequest/updateCareRequest to use schedule"
```

---

### Task 3: Update caregiver onboarding action

**Files:**
- Modify: `domains/caregivers/onboarding.ts`

- [ ] **Step 1: Update `saveCaregiverStep3` signature**

Replace:
```ts
export async function saveCaregiverStep3(data: {
  workTypes: string[]
  days: string[]
  shifts: string[]
  startAvailability: string
})
```
With:
```ts
export async function saveCaregiverStep3(data: {
  workTypes: string[]
  availability: Array<{ day: string; startTime: string; endTime: string }>
  startAvailability: string
})
```

- [ ] **Step 2: Update the work prefs inserts — remove day/shift rows**

Replace the rows array:
```ts
const rows: (typeof caregiverWorkPrefs.$inferInsert)[] = [
  ...data.workTypes.map(workType => ({ caregiverId: profile.id, workType })),
  ...(data.startAvailability
    ? [{ caregiverId: profile.id, startAvailability: data.startAvailability }]
    : []),
]
```

(Remove the `...data.days.map(...)` and `...data.shifts.map(...)` lines.)

- [ ] **Step 3: Persist availability to caregiverProfiles**

After the caregiverWorkPrefs insert, add:
```ts
await db
  .update(caregiverProfiles)
  .set({ availability: data.availability, completedStep: 3 })
  .where(eq(caregiverProfiles.id, profile.id))
```

Remove the separate `completedStep: 3` update (it's now combined above).

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "domains/caregivers/onboarding.ts"
```

Expected: no new errors

- [ ] **Step 5: Commit**

```bash
git add domains/caregivers/onboarding.ts
git commit -m "feat: saveCaregiverStep3 — persist per-day availability to caregiverProfiles"
```

---

### Task 4: Update caregiver onboarding Step 3 page (server query)

**Files:**
- Modify: `app/(marketing)/get-started/caregiver/step-3/page.tsx`

- [ ] **Step 1: Read the current file**

Read `app/(marketing)/get-started/caregiver/step-3/page.tsx` to see the current query. It currently queries `caregiverWorkPrefs` for day/shift rows to populate `initialDays` and `initialShifts`.

- [ ] **Step 2: Update the component to pass availability from caregiverProfiles**

The page fetches `caregiverProfiles` — add `availability` to the select. Replace the `initialDays` / `initialShifts` derivation from workPref rows with:

```ts
import { db } from '@/services/db'
import { caregiverProfiles, caregiverWorkPrefs } from '@/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { requireRole } from '@/domains/auth/session'
import { Step3Form } from './_components/step-3-form'

export default async function Step3Page() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  const workPrefRows = profile
    ? await db.select().from(caregiverWorkPrefs).where(
        and(
          eq(caregiverWorkPrefs.caregiverId, profile.id),
          isNull(caregiverWorkPrefs.travelDistanceMiles),
        )
      )
    : []

  const initialWorkTypes = workPrefRows.filter(r => r.workType).map(r => r.workType!)
  const initialStart = workPrefRows.find(r => r.startAvailability)?.startAvailability ?? ''
  const initialAvailability = (profile?.availability as Array<{ day: string; startTime: string; endTime: string }> | null) ?? []

  return (
    <Step3Form
      initialWorkTypes={initialWorkTypes}
      initialAvailability={initialAvailability}
      initialStart={initialStart}
    />
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(marketing)/get-started/caregiver/step-3/page.tsx"
git commit -m "feat: caregiver step-3 page — read availability from caregiverProfiles"
```

---

### Task 5: Update caregiver onboarding Step 3 form UI

**Files:**
- Modify: `app/(marketing)/get-started/caregiver/step-3/_components/step-3-form.tsx`

- [ ] **Step 1: Update Props interface**

Replace:
```ts
interface Props {
  initialWorkTypes: string[]
  initialDays: string[]
  initialShifts: string[]
  initialStart: string
}
```
With:
```ts
interface Props {
  initialWorkTypes: string[]
  initialAvailability: Array<{ day: string; startTime: string; endTime: string }>
  initialStart: string
}
```

- [ ] **Step 2: Update state**

Replace:
```ts
const [days, setDays] = useState<string[]>(initialDays)
const [shiftTime, setShiftTime] = useState(initialShifts[0] ?? '')
```
With:
```ts
const [days, setDays] = useState<string[]>(
  initialAvailability.map(a => a.day)
)
const [sameHoursEveryDay, setSameHoursEveryDay] = useState(true)
const [sharedStartTime, setSharedStartTime] = useState(
  initialAvailability[0]?.startTime ?? ''
)
const [sharedEndTime, setSharedEndTime] = useState(
  initialAvailability[0]?.endTime ?? ''
)
const [dayTimes, setDayTimes] = useState<Record<string, { startTime: string; endTime: string }>>(
  Object.fromEntries(initialAvailability.map(a => [a.day, { startTime: a.startTime, endTime: a.endTime }]))
)
```

- [ ] **Step 3: Update validation**

Replace:
```ts
const isValid = workTypes.length > 0 && days.length > 0 && shiftTime.trim().length > 0 && startAvailability.length > 0
```
With:
```ts
const timesComplete = days.length === 0 ? false : sameHoursEveryDay
  ? sharedStartTime.length > 0 && sharedEndTime.length > 0
  : days.every(d => dayTimes[d]?.startTime && dayTimes[d]?.endTime)
const isValid = workTypes.length > 0 && days.length > 0 && timesComplete && startAvailability.length > 0
```

- [ ] **Step 4: Update `handleContinue` to build availability**

Replace:
```ts
await saveCaregiverStep3({ workTypes, days, shifts: [shiftTime.trim()], startAvailability })
```
With:
```ts
const availability = days.map(day => ({
  day,
  startTime: sameHoursEveryDay ? sharedStartTime : (dayTimes[day]?.startTime ?? ''),
  endTime:   sameHoursEveryDay ? sharedEndTime   : (dayTimes[day]?.endTime ?? ''),
}))
await saveCaregiverStep3({ workTypes, availability, startAvailability })
```

- [ ] **Step 5: Replace the Shift Availability section with the new time UI**

Replace the entire "Shift Time" section:
```tsx
{/* Availability Hours */}
<section>
  <p className={labelClass}>Availability Hours</p>
  {days.length > 0 && (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={sameHoursEveryDay}
          onChange={e => setSameHoursEveryDay(e.target.checked)}
          className="rounded border-border"
        />
        Same hours every day
      </label>
      {sameHoursEveryDay ? (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">From</label>
            <input type="time" value={sharedStartTime}
              onChange={e => setSharedStartTime(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <span className="text-muted-foreground mt-5">–</span>
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">Until</label>
            <input type="time" value={sharedEndTime}
              onChange={e => setSharedEndTime(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {days.map(day => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-24 text-sm capitalize">{day}</span>
              <div className="flex-1">
                <input type="time"
                  value={dayTimes[day]?.startTime ?? ''}
                  onChange={e => setDayTimes(prev => ({ ...prev, [day]: { ...prev[day], startTime: e.target.value } }))}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <span className="text-muted-foreground">–</span>
              <div className="flex-1">
                <input type="time"
                  value={dayTimes[day]?.endTime ?? ''}
                  onChange={e => setDayTimes(prev => ({ ...prev, [day]: { ...prev[day], endTime: e.target.value } }))}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )}
  {days.length === 0 && (
    <p className="text-sm text-muted-foreground">Select days above to set availability hours.</p>
  )}
</section>
```

- [ ] **Step 6: Commit**

```bash
git add "app/(marketing)/get-started/caregiver/step-3/_components/step-3-form.tsx"
git commit -m "feat: caregiver step-3 form — per-day availability hours with same-hours checkbox"
```

---

### Task 6: Update care request wizard Step 4

**Files:**
- Modify: `app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx`

- [ ] **Step 1: Update `RequestForm` interface**

Replace:
```ts
days: string[]
shifts: string[]
startDate: string
durationHours: number
```
With:
```ts
schedule: Array<{ day: string; startTime: string; endTime: string }>
startDate: string
sameTimeEveryDay: boolean
sharedStartTime: string
sharedEndTime: string
dayTimes: Record<string, { startTime: string; endTime: string }>
```

- [ ] **Step 2: Update EMPTY constant**

Replace:
```ts
frequency: '', days: [], shifts: [], startDate: '', durationHours: 0,
```
With:
```ts
frequency: '', schedule: [], startDate: '',
sameTimeEveryDay: true, sharedStartTime: '', sharedEndTime: '', dayTimes: {},
```

- [ ] **Step 3: Update `toggleMulti` — remove 'days' and 'shifts' from the union**

Replace:
```ts
function toggleMulti(field: 'careTypes' | 'days' | 'shifts' | 'languagePref', key: string) {
```
With:
```ts
function toggleMulti(field: 'careTypes' | 'languagePref', key: string) {
```

- [ ] **Step 4: Add a `toggleDay` helper function**

After `toggleMulti`, add:
```ts
function toggleDay(day: string) {
  setForm(f => {
    const selected = f.schedule.map(s => s.day)
    if (selected.includes(day)) {
      const updated = { ...f.dayTimes }
      delete updated[day]
      return { ...f, schedule: f.schedule.filter(s => s.day !== day), dayTimes: updated }
    }
    return { ...f, schedule: [...f.schedule, { day, startTime: '', endTime: '' }] }
  })
}
```

- [ ] **Step 5: Rewrite Step 4 schedule UI (lines 366–436)**

Replace the entire `{step === 4 && ( ... )}` block with:
```tsx
{/* Step 4 — Schedule */}
{step === 4 && (
  <div className="space-y-8">
    <div>
      <label className="block text-sm font-medium mb-3">Frequency *</label>
      <div className="grid grid-cols-3 gap-2">
        {CARE_FREQUENCIES.map((f) => (
          <button key={f.key} type="button"
            onClick={() => setForm((fm) => ({ ...fm, frequency: f.key }))}
            className={['rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-colors', form.frequency === f.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium mb-3">Days *</label>
      <div className="flex flex-wrap gap-2">
        {DAYS_OF_WEEK.map((d) => (
          <button key={d.key} type="button"
            onClick={() => toggleDay(d.key)}
            className={['rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors', form.schedule.some(s => s.day === d.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
            {d.label.slice(0, 3)}
          </button>
        ))}
      </div>
    </div>
    {form.schedule.length > 0 && (
      <div>
        <label className="block text-sm font-medium mb-3">Shift Time *</label>
        <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={form.sameTimeEveryDay}
            onChange={e => setForm(f => ({ ...f, sameTimeEveryDay: e.target.checked }))}
            className="rounded border-border"
          />
          Same time every day
        </label>
        {form.sameTimeEveryDay ? (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">From</label>
              <input type="time" value={form.sharedStartTime}
                onChange={e => setForm(f => ({ ...f, sharedStartTime: e.target.value }))}
                className="w-full rounded-lg border border-border px-3 py-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <span className="text-muted-foreground mt-5">–</span>
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">To</label>
              <input type="time" value={form.sharedEndTime}
                onChange={e => setForm(f => ({ ...f, sharedEndTime: e.target.value }))}
                className="w-full rounded-lg border border-border px-3 py-3 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {form.schedule.map(s => (
              <div key={s.day} className="flex items-center gap-3">
                <span className="w-28 text-sm capitalize">{s.day}</span>
                <div className="flex-1">
                  <input type="time"
                    value={form.dayTimes[s.day]?.startTime ?? ''}
                    onChange={e => setForm(f => ({ ...f, dayTimes: { ...f.dayTimes, [s.day]: { ...f.dayTimes[s.day], startTime: e.target.value } } }))}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </div>
                <span className="text-muted-foreground">–</span>
                <div className="flex-1">
                  <input type="time"
                    value={form.dayTimes[s.day]?.endTime ?? ''}
                    onChange={e => setForm(f => ({ ...f, dayTimes: { ...f.dayTimes, [s.day]: { ...f.dayTimes[s.day], endTime: e.target.value } } }))}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
    <div>
      <label className="block text-sm font-medium mb-1">Start Date *</label>
      <DatePicker
        value={form.startDate}
        onChange={(val) => setForm((f) => ({ ...f, startDate: val }))}
        placeholder="Select start date"
        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
        upward
      />
    </div>
  </div>
)}
```

- [ ] **Step 6: Update the `nextDisabled` step 4 condition**

Find the `nextDisabled` logic (around line 209). Update the step 4 check:

Replace whatever checks `days` and `shifts` for step 4 with:
```ts
step === 4 ? !form.frequency || form.schedule.length === 0 || !form.startDate || (() => {
  const timesOk = form.sameTimeEveryDay
    ? form.sharedStartTime.length > 0 && form.sharedEndTime.length > 0
    : form.schedule.every(s => form.dayTimes[s.day]?.startTime && form.dayTimes[s.day]?.endTime)
  return !timesOk
})() :
```

- [ ] **Step 7: Update `handleSave` to build the schedule array**

Find where `createCareRequest` is called. Replace the `days`, `shifts`, `durationHours` fields:
```ts
schedule: form.schedule.map(s => ({
  day:       s.day,
  startTime: form.sameTimeEveryDay ? form.sharedStartTime : (form.dayTimes[s.day]?.startTime ?? ''),
  endTime:   form.sameTimeEveryDay ? form.sharedEndTime   : (form.dayTimes[s.day]?.endTime ?? ''),
})),
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "new-request-form"
```

Expected: no errors in this file

- [ ] **Step 9: Commit**

```bash
git add "app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx"
git commit -m "feat: care request wizard Step 4 — per-day schedule hours"
```

---

### Task 7: Update matchCaregivers

**Files:**
- Modify: `domains/matching/match-caregivers.ts`

- [ ] **Step 1: Update request fetch — replace days/shifts/durationHours with schedule**

Replace:
```ts
days:          careRequests.days,
shifts:        careRequests.shifts,
durationHours: careRequests.durationHours,
```
With:
```ts
schedule:      careRequests.schedule,
```

- [ ] **Step 2: Add availability to candidate fetch**

In the candidates select, add:
```ts
availability:  caregiverProfiles.availability,
```

- [ ] **Step 3: Add day-coverage pre-filter**

After `if (candidates.length === 0) return []`, add:

```ts
const requestedDays = new Set(
  (requestRow.schedule as Array<{ day: string }> | null)?.map(s => s.day) ?? []
)

const filteredCandidates = candidates.filter(c => {
  if (requestedDays.size === 0) return true
  const cgAvail = c.availability as Array<{ day: string }> | null
  if (!cgAvail || cgAvail.length === 0) return true  // no availability set — pass through
  const cgDays = new Set(cgAvail.map(a => a.day))
  return [...requestedDays].every(d => cgDays.has(d))
})

if (filteredCandidates.length === 0) return []
```

Replace all subsequent references to `candidates` with `filteredCandidates` (the `ids` array, batch queries, and rankings map).

- [ ] **Step 4: Update the prompt to use schedule**

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

- [ ] **Step 5: Commit**

```bash
git add domains/matching/match-caregivers.ts
git commit -m "feat: matchCaregivers — schedule day-coverage pre-filter + updated prompt"
```

---

### Task 8: Update seed data

**Files:**
- Modify: `db/seed.ts`

- [ ] **Step 1: Read `db/seed.ts` to find all references to `days`, `shifts`, `durationHours`**

```bash
grep -n "days\|shifts\|durationHours" db/seed.ts
```

- [ ] **Step 2: Replace all `days:` + `shifts:` + `durationHours:` in seeded care requests**

For each seeded care request, replace:
```ts
days:         ['monday', 'wednesday', 'friday'],
shifts:       ['morning'],
durationHours: 4,
```
With:
```ts
schedule: [
  { day: 'monday',    startTime: '09:00', endTime: '13:00' },
  { day: 'wednesday', startTime: '09:00', endTime: '13:00' },
  { day: 'friday',    startTime: '09:00', endTime: '13:00' },
],
```

Use whatever days were previously seeded, and use `09:00`–`13:00` as a sensible default (4 hours).

- [ ] **Step 3: Remove day/shift rows from caregiver work prefs seeding**

Find any code that inserts `day` or `shift` rows into `caregiverWorkPrefs` and remove those rows. Only `workType` and `startAvailability` rows remain.

- [ ] **Step 4: Add `availability` to seeded caregiver profiles**

Add an `availability` field update for each seeded caregiver, e.g.:
```ts
await db.update(caregiverProfiles)
  .set({ availability: [
    { day: 'monday',    startTime: '08:00', endTime: '17:00' },
    { day: 'tuesday',   startTime: '08:00', endTime: '17:00' },
    { day: 'wednesday', startTime: '08:00', endTime: '17:00' },
    { day: 'thursday',  startTime: '08:00', endTime: '17:00' },
    { day: 'friday',    startTime: '08:00', endTime: '17:00' },
  ]})
  .where(eq(caregiverProfiles.id, profileId))
```

Or set it during the profile insert if the seed creates profiles directly.

- [ ] **Step 5: Run seed**

```bash
npx ts-node --project tsconfig.json -e "require('./db/seed.ts')"
```

Or whatever the project's seed command is (check `package.json` scripts).

- [ ] **Step 6: Commit**

```bash
git add db/seed.ts
git commit -m "feat: update seed data for schedule/availability schema"
```

---

### Task 9: Build verification

**Files:** No changes — verification only

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: only pre-existing errors (stripe.ts type cast, care-plans.test.ts, rate-defaults.test.ts) — no new errors

- [ ] **Step 2: Run tests**

```bash
npm test 2>&1 | tail -20
```

Expected: test suite passes (or same failures as before this change)

- [ ] **Step 3: Manual smoke test**

1. Start dev server: `npm run dev`
2. Log in as a client, create a care request — verify Step 4 shows days pills + "Same time every day" checkbox + single time input pair
3. Uncheck "Same time every day" — verify a row appears for each selected day
4. Submit request — verify it saves without error
5. Log in as a caregiver, go through onboarding Step 3 — verify same time UI appears below days
6. Submit Step 3 — verify it saves without error

- [ ] **Step 4: Commit if any fixups were needed**

```bash
git add -A
git commit -m "fix: schedule/availability post-integration fixups"
```
