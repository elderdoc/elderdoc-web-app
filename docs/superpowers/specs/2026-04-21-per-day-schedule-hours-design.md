# Per-Day Schedule Hours — Design Spec

## Overview

Replace the flat `days[]` + `shifts[]` + `durationHours` structure on care requests and the `day`/`shift` columns on caregiver work preferences with a per-day start/end time schedule. Both the care request creation wizard and the caregiver onboarding work preferences step gain a "same time every day" checkbox: when checked, one time input propagates to all selected days; when unchecked, each selected day gets its own start/end time row.

---

## Data Model

### `care_requests` table

**Remove:**
- `days text[]`
- `shifts text[]`
- `duration_hours integer`

**Add:**
```ts
schedule: jsonb  // Array<{ day: string; startTime: string; endTime: string }>
```

Example value:
```json
[
  { "day": "monday",    "startTime": "09:00", "endTime": "15:00" },
  { "day": "wednesday", "startTime": "09:00", "endTime": "15:00" },
  { "day": "friday",    "startTime": "14:00", "endTime": "20:00" }
]
```

`day` values match the keys in `DAYS_OF_WEEK` from `lib/constants.ts` (`monday` … `sunday`). `startTime` and `endTime` are `"HH:MM"` 24-hour strings.

### `caregivers` table

**Add:**
```ts
availability: jsonb  // same shape as schedule above
```

### `caregiverWorkPrefs` table

**Remove columns:** `shift`, `day`  
**Keep:** `workType`, `travelDistanceMiles`, `startAvailability`

The `shift` and `day` columns are superseded by `caregivers.availability`. No other columns in `caregiverWorkPrefs` change.

### Migration SQL

```sql
-- care_requests
ALTER TABLE care_requests
  ADD COLUMN schedule jsonb,
  DROP COLUMN days,
  DROP COLUMN shifts,
  DROP COLUMN duration_hours;

-- caregivers
ALTER TABLE caregivers
  ADD COLUMN availability jsonb;

-- caregiverWorkPrefs
ALTER TABLE caregiver_work_prefs
  DROP COLUMN shift,
  DROP COLUMN day;
```

Run via `drizzle-kit generate` then apply. All existing rows get `null` for new columns; seed data must be updated to use the new shape.

---

## Drizzle Schema Changes (`db/schema.ts`)

`careRequests`:
```ts
schedule: jsonb('schedule').$type<Array<{ day: string; startTime: string; endTime: string }>>(),
// remove: days, shifts, durationHours
```

`caregivers`:
```ts
availability: jsonb('availability').$type<Array<{ day: string; startTime: string; endTime: string }>>(),
```

`caregiverWorkPrefs`:
```ts
// remove: shift, day columns
```

---

## UI — Care Request Wizard Step 4 (Schedule)

**File:** `app/(client)/client/dashboard/requests/new/_components/care-request-modal.tsx` (or equivalent step component)

**Remove:** shifts multi-select, duration hours input

**Keep:** frequency picker, start date input

**Days section — unchanged:** click-to-toggle day pill buttons

**New time section** (rendered only when at least one day is selected):

```
[ ] Same time every day   ← checkbox, default checked

If checked:
  Start Time [09:00 ▾]   End Time [17:00 ▾]
  (all selected days inherit this time)

If unchecked:
  Monday     Start Time [__:__]   End Time [__:__]
  Wednesday  Start Time [__:__]   End Time [__:__]
  Friday     Start Time [__:__]   End Time [__:__]
```

Time inputs use `<input type="time">`. Display as 12-hour AM/PM via CSS or formatting helper. Store as `"HH:MM"` 24-hour strings.

**Form state shape:**
```ts
sameTimeEveryDay: boolean          // default true
sharedStartTime: string            // used when sameTimeEveryDay = true
sharedEndTime: string
dayTimes: Record<string, { startTime: string; endTime: string }>  // keyed by day key
```

**On submit**, build `schedule`:
```ts
const schedule = selectedDays.map(day => ({
  day,
  startTime: sameTimeEveryDay ? sharedStartTime : dayTimes[day].startTime,
  endTime:   sameTimeEveryDay ? sharedEndTime   : dayTimes[day].endTime,
}))
```

**Validation:** at least one day selected and all times filled before Next is enabled on this step.

---

## UI — Caregiver Onboarding Step 3 (Work Preferences)

**File:** caregiver onboarding step 3 component (work preferences)

**Remove:** shifts multi-select

**Keep:** work types, days multi-select, travel distance, start availability

**New time section** (same pattern as care request):

```
[ ] Same hours every day   ← checkbox, default checked

If checked:
  Available From [09:00 ▾]   Until [17:00 ▾]

If unchecked:
  Monday     From [__:__]   Until [__:__]
  ...
```

**On save**, build `availability` array in same shape and persist to `caregivers.availability`.

---

## Domain Actions

### `createCareRequest` / `updateCareRequest` (`domains/clients/requests.ts`)

- Remove `days`, `shifts`, `durationHours` parameters
- Add `schedule: Array<{ day: string; startTime: string; endTime: string }>`

### Caregiver profile save action

- Add `availability: Array<{ day: string; startTime: string; endTime: string }>` to the caregiver update action
- Remove any `shift`/`day` writes to `caregiverWorkPrefs`

---

## Matching Update (`domains/matching/match-caregivers.ts`)

Current logic checks day/shift overlap via `caregiverWorkPrefs` rows.

New logic: compare `careRequest.schedule[].day` against `caregiver.availability[].day`.

A caregiver covers a requested day if their `availability` contains an entry for that day. Optionally, score partial time overlap: if caregiver available 9am–5pm and request is 1pm–7pm, that is a partial match (lower score than full overlap).

For initial implementation: **binary day coverage only** — a day either matches or doesn't. Time-range overlap scoring can be added in Sub-project 5 (enhanced matching).

---

## Seed Data Update (`db/seed.ts`)

Replace any `days: [...]`, `shifts: [...]`, `durationHours: N` in seeded care requests with `schedule: [{ day, startTime, endTime }, ...]`. Replace any day/shift entries in caregiver work prefs with `availability: [...]` on the caregiver row.

---

## Out of Scope

- Time-range overlap scoring in matching (Sub-project 5)
- Recurring schedule patterns (e.g., alternate weeks)
- Timezone handling (all times treated as local)
