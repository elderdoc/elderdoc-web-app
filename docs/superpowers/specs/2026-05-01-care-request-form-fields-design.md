# Care Request Form Fields Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update multiple care request form fields: replace medical equipment options, change diet to free text, rename "Other" label, split language preference into preferred/required with conditional reveal, and replace the single budget amount with a min/max slider.

**Architecture:** Changes span the care request multi-step form, the `care_requests` DB table (one migration), and the domain layer. No new pages or routes.

**Tech Stack:** Next.js 15, React, Drizzle ORM, Tailwind CSS

---

## Section 1: Medical Equipment

Replace current checkbox options with exactly three:
- Cane
- Walker
- Wheelchair

Same checkbox UI, same `medicalEquipment` field structure. No DB schema change needed (stored as `text[]` already or within clientStatus jsonb — follow existing pattern).

## Section 2: Diet — Free Text

Replace the current diet dropdown/options with a plain `<input type="text">` free-form field. Label remains "Diet". No DB schema change needed (`diet` is already stored as a text field within `clientStatus` jsonb).

## Section 3: Label Change — "Other" → "Other considerations"

Rename the "Other" label to "Other considerations" everywhere it appears in the care request form (client status section). This is a copy change only, no data changes.

## Section 4: Languages — Preferred + Required

### Default state
Show "Languages Preferred" multi-select (replaces current `languagePref` field). Uses the existing `LANGUAGES` constant list.

### Conditional required
A checkbox labeled "Require specific languages" sits below the preferred select. When checked, a second "Languages Required" multi-select appears. Both selects use the same language list. A language can appear in both.

### DB changes
Remove `language_pref text[]` column. Add two new columns:
```sql
ALTER TABLE care_requests DROP COLUMN language_pref;
ALTER TABLE care_requests ADD COLUMN languages_preferred text[] NOT NULL DEFAULT '{}';
ALTER TABLE care_requests ADD COLUMN languages_required text[] NOT NULL DEFAULT '{}';
```

### Schema (`db/schema.ts`)
```typescript
languagesPreferred: text('languages_preferred').array().notNull().default([]),
languagesRequired: text('languages_required').array().notNull().default([]),
```

### Server action
`createCareRequest` replaces `languagePref: string[]` with `languagesPreferred: string[]` and `languagesRequired: string[]`.

## Section 5: Budget — Min/Max Slider

### Label
Change to "Please enter hourly rate" (or "Please enter daily rate" when per-day is selected).

### Budget type toggle
Replace `hourly | weekly` with `hourly | daily`. Two buttons: "Per hour" / "Per day".

### Slider UI
- Dual-handle range slider with two number inputs (Min / Max)
- Display range: $10 to $100
- The $100 handle is labelled "$100+" — values above $100 are stored correctly but the slider handle sits at the $100 end
- Min floor: $10 (slider cannot go below $10)
- User can type any value in the number inputs; slider updates to reflect
- If typed value exceeds $100, slider shows handle at max but stores the entered value

### Average rate display
Below the slider, show:
> "[Care type] caregivers typically earn $X–$Y per [hour/day] on average"

For multiple care types selected, show one line per care type. Computed via:
```sql
SELECT care_type, AVG(hourly_min), AVG(hourly_max)
FROM caregiver_profiles
JOIN caregiver_care_types ON ...
WHERE status = 'active'
GROUP BY care_type
```
This is a server-side query called when the preferences step loads. No AI involved.

### DB changes
Remove `budget_amount numeric(10,2)`. Add `budget_min numeric(10,2)` and `budget_max numeric(10,2)`. Change `budget_type` check constraint from `hourly|weekly` to `hourly|daily`.

```sql
ALTER TABLE care_requests DROP COLUMN budget_amount;
ALTER TABLE care_requests ADD COLUMN budget_min numeric(10,2);
ALTER TABLE care_requests ADD COLUMN budget_max numeric(10,2);
ALTER TABLE care_requests DROP CONSTRAINT IF EXISTS care_requests_budget_type_check;
ALTER TABLE care_requests ADD CONSTRAINT care_requests_budget_type_check
  CHECK (budget_type IN ('hourly', 'daily'));
```

### Schema (`db/schema.ts`)
```typescript
budgetMin: numeric('budget_min', { precision: 10, scale: 2 }),
budgetMax: numeric('budget_max', { precision: 10, scale: 2 }),
budgetType: text('budget_type').$type<'hourly' | 'daily'>(),
```

## Files Touched
- `db/schema.ts` — language columns, budget columns
- `db/migrations/<timestamp>_care-request-form-fields.sql` — migration
- `domains/clients/requests.ts` — updated params
- `lib/constants.ts` — update BUDGET_TYPES constant
- `app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx` — all UI changes
- `domains/clients/find-caregivers.ts` — update average rate query (new helper function)
