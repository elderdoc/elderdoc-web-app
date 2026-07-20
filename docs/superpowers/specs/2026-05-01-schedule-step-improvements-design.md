# Schedule Step Improvements Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace manual time text inputs in the care request schedule step with increment-based dropdowns (with custom fallback), add a copy-to-day feature, and add an optional end date field.

**Architecture:** All changes are contained to the care request form's schedule step and the `care_requests` DB table. A new reusable `TimeDropdown` component handles time generation. No new routes or server actions needed beyond adding `endDate` to `createCareRequest`.

**Tech Stack:** Next.js 15, React, Drizzle ORM, Tailwind CSS

---

## Section 1: UI — Increment Selector & Time Dropdowns

### Increment selector
A row of three toggle buttons sits above the day-time rows:
- **15 min** | **30 min** | **1 hr** (default: 30 min)
- Selecting a new increment re-generates all time dropdown options
- Custom values already typed by the user are preserved on increment change

### TimeDropdown component (`components/ui/time-dropdown.tsx`)
Props: `value: string`, `onChange: (v: string) => void`, `increment: 15 | 30 | 60`

Behaviour:
- Generates `HH:MM` options from `00:00` to `23:45` at the given increment
- Last option is always "Custom…"
- Selecting "Custom…" swaps the `<select>` for a `<input type="text" placeholder="HH:MM">`
- If the current `value` is not in the generated option list, the component renders in custom-input mode automatically

### Day rows
Each selected day renders: Day label | Start `TimeDropdown` | End `TimeDropdown` | Copy button

## Section 2: Copy Feature

- Copy button is hidden when only one day is selected
- Clicking Copy opens a small inline dropdown listing only the other currently-selected days
- Selecting a target day copies the source day's `startTime` and `endTime` to it (overwrites existing values)
- Dropdown closes after selection

## Section 3: End Date Field

- Optional `<input type="date">` added below the start date field
- Label: "End date (optional)"
- Stored as `endDate text` (nullable, `YYYY-MM-DD` format) on `care_requests`
- No automatic behaviour — purely informational for now

## Section 4: DB & Server Action

### Migration
Add one nullable column to `care_requests`:
```sql
ALTER TABLE care_requests ADD COLUMN end_date text;
```

### Schema (`db/schema.ts`)
```typescript
endDate: text('end_date'),
```

### Server action (`domains/clients/requests.ts`)
`createCareRequest` gains one optional parameter: `endDate?: string`. Written directly to the new column.

## Files Touched
- `components/ui/time-dropdown.tsx` — new component
- `app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx` — increment state, replace time inputs, copy button, end date field
- `domains/clients/requests.ts` — add `endDate` param
- `db/schema.ts` — add `endDate` column
- `db/migrations/<timestamp>_add_end_date.sql` — migration
