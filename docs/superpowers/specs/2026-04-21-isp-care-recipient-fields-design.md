# ISP Care Recipient Fields — Design Spec

## Overview

Extend the care recipient profile with ISP (Individualized Service Plan) clinical fields drawn from the user's reference images. These fields capture physical measurements, functional status checkboxes, and related detail notes that caregivers need to provide appropriate care. They belong on the **care recipient** (the person receiving care), not on the care request.

---

## Scope

This spec covers Phase 1: care recipient fields only.

Later phases (brainstormed but out of scope here):
- Care plan revision with activity/hygiene/home-management/nutrition/medication sections
- Caregiver capability flags for matching (can handle hard-of-hearing, amputee, overweight, etc.)
- Enhanced caregiver–client matching based on ISP data

---

## Data Model

### `care_recipients` table — new columns

| Column | Type | Notes |
|--------|------|-------|
| `height` | `text` | Free-text, e.g. "5'6\"" |
| `weight` | `text` | Free-text, e.g. "142 lbs" |
| `client_status` | `jsonb` | Object keyed by `ClientStatusGroups` keys (see below) |

**`client_status` JSONB shape:**
```ts
{
  // Living Situation
  livesAlone?: boolean
  livesWith?: boolean
  aloneDuringDay?: boolean
  // Mobility / Activity
  bedBound?: boolean
  upAsTolerated?: boolean
  // Communication & Senses
  speechProblems?: boolean
  glassesOrContacts?: boolean
  visionProblem?: boolean
  hardOfHearing?: boolean
  // Physical
  amputee?: boolean
  amputeeDetails?: string   // required text when amputee = true
  denturesUpper?: boolean
  denturesLower?: boolean
  denturesPartial?: boolean
  // Cognitive
  orientedAlert?: boolean
  forgetful?: boolean
  confused?: boolean
  // Medical Equipment
  urinaryCath?: boolean
  feedingTube?: boolean
  // Diet
  diabetic?: boolean
  diet?: string             // free-text diet note
  other?: string            // free-text catch-all
}
```

All columns are nullable/optional — no existing records are broken.

---

## Constants (`lib/constants.ts`)

`CLIENT_STATUS_GROUPS` — array of groups, each with `{ label, items: { key, label }[] }`. Seven groups matching reference images:
1. Living Situation
2. Mobility / Activity
3. Communication & Senses
4. Physical
5. Cognitive
6. Medical Equipment
7. Diet

Keys map 1-to-1 to `clientStatus` JSONB boolean fields. Three keys also have a companion text field: `amputeeDetails`, `diet`, `other`.

---

## Domain Actions (`domains/clients/requests.ts`)

`createCareRecipient` and `updateCareRecipient` both gain three optional parameters:
- `height?: string`
- `weight?: string`
- `clientStatus?: Record<string, boolean | string>`

These are passed directly into the Drizzle insert/update.

---

## New Recipient Wizard (`app/(client)/client/dashboard/recipients/new/page.tsx`)

Current steps: 1 Relationship · 2 Basic info · 3 Health & mobility · 4 Notes

New steps: 1 Relationship · 2 Basic info · 3 Health & mobility · 4 **Functional Status** · 5 Notes

**Step 3 additions** (height/weight):
- Two text inputs added below the Conditions section: "Height" (placeholder: `5'6"`) and "Weight" (placeholder: `142 lbs`).

**New Step 4 — Functional Status:**
- Renders all `CLIENT_STATUS_GROUPS` as labelled sections.
- Each item is a toggle checkbox button (same pill-button style as Conditions).
- Three items with companion text inputs, shown inline when checked:
  - `amputee` → text input "Specify (e.g. left leg below knee)"
  - `diabetic` → text input "Diet details"
  - _(the `other` key)_ → text input "Specify"
- Step is optional (no required fields); Next/Save is always enabled here.

**Step 5 — Notes** (was Step 4): unchanged.

**`myselfSelected` shortcut** currently jumps from Step 1 → Step 4 (old notes). After this change it should jump to Step 5.

**`nextDisabled`** logic: steps 4 and 5 are always false (optional).

**`totalSteps`**: 5 for normal, 2 for myself flow.

---

## Edit Recipient Form (`app/(client)/client/dashboard/recipients/[id]/edit/_components/edit-recipient-form.tsx`)

Adds the same fields as a flat single-page form (no step wizard):
- Height and Weight inputs in a 2-column grid, placed after Mobility Level.
- Functional Status section: same `CLIENT_STATUS_GROUPS` toggle + companion text inputs, placed after Conditions.

`Recipient` interface gains: `height`, `weight`, `clientStatus` (nullable).

`updateCareRecipient` call includes the new fields.

---

## Recipient Detail Page (`app/(client)/client/dashboard/recipients/[id]/page.tsx`)

- "Personal Info" section gains Height and Weight rows (shown when present).
- New "Functional Status" section after Conditions: renders checked items as labelled badges grouped by their group heading. Companion text shown inline with the badge.

---

## Migration

Three columns added to `care_recipients`:
```sql
ALTER TABLE care_recipients ADD COLUMN IF NOT EXISTS height text;
ALTER TABLE care_recipients ADD COLUMN IF NOT EXISTS weight text;
ALTER TABLE care_recipients ADD COLUMN IF NOT EXISTS client_status jsonb;
```

Already applied to the database. Drizzle schema already updated.

---

## Out of Scope

- Care plan revision (activity, hygiene, home management, nutrition, medication sections)
- Caregiver onboarding additions (care plan capability flags)
- Enhanced matching logic based on ISP data
- Caregiver max-carry-weight field
