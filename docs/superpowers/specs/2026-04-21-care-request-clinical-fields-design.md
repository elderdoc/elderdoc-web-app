# Care Request Clinical Fields — Design Spec

## Overview

Add four clinical field groups to the care request creation wizard and schema: supplies needed (free text), infection control precautions (yes/no + checkboxes), safety measures (yes/no + checkboxes), and recipient functional status checkboxes (the same `clientStatus` groups already on care_recipient, now also captured on the care request so the request is self-contained for caregivers to review). These fields are stored as JSONB columns on `care_requests`.

---

## Data Model

### `care_requests` table — new columns

| Column | Type | Description |
|--------|------|-------------|
| `supplies_needed` | `text` | Free-text list of supplies, e.g. "Gloves, masks, gown" |
| `infection_control` | `jsonb` | `{ enabled: boolean; gloves?: boolean; handWashing?: boolean; wasteDisposal?: boolean }` |
| `safety_measures` | `jsonb` | `{ enabled: boolean; clearPathways?: boolean; electricCords?: boolean; pets?: boolean }` |
| `client_status` | `jsonb` | Same shape as `care_recipients.client_status` — see ISP spec |

**`infection_control` full shape:**
```ts
{
  enabled: boolean
  gloves?: boolean
  handWashing?: boolean
  wasteDisposal?: boolean
}
```

**`safety_measures` full shape:**
```ts
{
  enabled: boolean
  clearPathways?: boolean
  electricCords?: boolean
  pets?: boolean
}
```

**`client_status` shape** — identical to `care_recipients.client_status`:
```ts
{
  livesAlone?: boolean; livesWith?: boolean; aloneDuringDay?: boolean
  bedBound?: boolean; upAsTolerated?: boolean
  speechProblems?: boolean; glassesOrContacts?: boolean; visionProblem?: boolean
  hardOfHearing?: boolean
  amputee?: boolean; amputeeDetails?: string
  denturesUpper?: boolean; denturesLower?: boolean; denturesPartial?: boolean
  orientedAlert?: boolean; forgetful?: boolean; confused?: boolean
  urinaryCath?: boolean; feedingTube?: boolean
  diabetic?: boolean; diet?: string; other?: string
}
```

All columns nullable — existing rows unaffected.

### Migration SQL

```sql
ALTER TABLE care_requests
  ADD COLUMN IF NOT EXISTS supplies_needed text,
  ADD COLUMN IF NOT EXISTS infection_control jsonb,
  ADD COLUMN IF NOT EXISTS safety_measures jsonb,
  ADD COLUMN IF NOT EXISTS client_status jsonb;
```

---

## Drizzle Schema Changes (`db/schema.ts`)

```ts
// in careRequests table definition:
suppliesNeeded:    text('supplies_needed'),
infectionControl:  jsonb('infection_control').$type<{
  enabled: boolean
  gloves?: boolean
  handWashing?: boolean
  wasteDisposal?: boolean
}>(),
safetyMeasures:    jsonb('safety_measures').$type<{
  enabled: boolean
  clearPathways?: boolean
  electricCords?: boolean
  pets?: boolean
}>(),
clientStatus:      jsonb('client_status').$type<{
  livesAlone?: boolean; livesWith?: boolean; aloneDuringDay?: boolean
  bedBound?: boolean; upAsTolerated?: boolean
  speechProblems?: boolean; glassesOrContacts?: boolean; visionProblem?: boolean
  hardOfHearing?: boolean
  amputee?: boolean; amputeeDetails?: string
  denturesUpper?: boolean; denturesLower?: boolean; denturesPartial?: boolean
  orientedAlert?: boolean; forgetful?: boolean; confused?: boolean
  urinaryCath?: boolean; feedingTube?: boolean
  diabetic?: boolean; diet?: string; other?: string
}>(),
```

---

## Constants (`lib/constants.ts`)

Add three new constants:

```ts
export const INFECTION_CONTROL_ITEMS = [
  { key: 'gloves',       label: 'Gloves' },
  { key: 'handWashing',  label: 'Hand washing' },
  { key: 'wasteDisposal',label: 'Waste disposal' },
] as const

export const SAFETY_MEASURE_ITEMS = [
  { key: 'clearPathways', label: 'Clear pathways' },
  { key: 'electricCords', label: 'Electric cords' },
  { key: 'pets',          label: 'Pets' },
] as const
```

`CLIENT_STATUS_GROUPS` is already defined in constants — reuse it here.

---

## UI — Care Request Wizard

These fields are added as a new step **after** the existing Schedule step and **before** the Preferences step. Call it **"Care Details"**.

### Step order (updated)

1. Care Type
2. Who needs care
3. Address
4. Schedule ← per-day hours (Sub-project 1)
5. **Care Details** ← new
6. Preferences
7. Review & Generate

### Care Details step layout

**Supplies Needed**
```
Label: "Supplies needed (optional)"
<textarea> placeholder: "e.g. Gloves, masks, gown, hand sanitizer"
```

**Infection Control Precautions**
```
Label: "Infection control precautions"
Toggle: Yes / No  (default No)
If Yes:
  [ ] Gloves
  [ ] Hand washing
  [ ] Waste disposal
```

**Safety Measures**
```
Label: "Safety measures"
Toggle: Yes / No  (default No)
If Yes:
  [ ] Clear pathways
  [ ] Electric cords
  [ ] Pets
```

**Recipient Status** (from CLIENT_STATUS_GROUPS)
```
Label: "Recipient status (select all that apply)"
Renders all CLIENT_STATUS_GROUPS groups with toggle-button checkboxes.
Companion text inputs for amputee (amputeeDetails) and diabetic (diet).
"Other" free-text input at the bottom.
Pre-fill: if a care recipient is selected and their care_recipient.clientStatus is set,
auto-populate this step's clientStatus from the recipient's saved data.
User can override per-request.
```

All fields on this step are optional. Next button is always enabled.

### Form state additions

```ts
suppliesNeeded: string                          // default ''
infectionControlEnabled: boolean               // default false
infectionControl: Record<string, boolean>      // { gloves, handWashing, wasteDisposal }
safetyMeasuresEnabled: boolean                 // default false
safetyMeasures: Record<string, boolean>        // { clearPathways, electricCords, pets }
clientStatus: Record<string, boolean | string> // default {}
```

### On submit, build payload:

```ts
suppliesNeeded: form.suppliesNeeded || undefined,
infectionControl: form.infectionControlEnabled
  ? { enabled: true, ...form.infectionControl }
  : { enabled: false },
safetyMeasures: form.safetyMeasuresEnabled
  ? { enabled: true, ...form.safetyMeasures }
  : { enabled: false },
clientStatus: Object.keys(form.clientStatus).length > 0 ? form.clientStatus : undefined,
```

---

## Domain Actions (`domains/clients/requests.ts`)

`createCareRequest` and `updateCareRequest` gain:

```ts
suppliesNeeded?: string
infectionControl?: { enabled: boolean; gloves?: boolean; handWashing?: boolean; wasteDisposal?: boolean }
safetyMeasures?: { enabled: boolean; clearPathways?: boolean; electricCords?: boolean; pets?: boolean }
clientStatus?: Record<string, boolean | string>
```

---

## Display (Care Request Detail Page)

Add a "Care Details" section to the care request detail/review page showing:
- Supplies needed (if set)
- Infection control: "Yes — Gloves, Hand washing" or "No"
- Safety measures: "Yes — Clear pathways, Pets" or "No"
- Recipient status: badge chips grouped by category (same display as on the care_recipient detail page)

---

## Pre-fill Behaviour

When a care recipient is selected in Step 2 and that recipient has `clientStatus` saved, the Care Details step pre-populates `clientStatus` from the recipient record. The client can change it per-request without affecting the recipient's stored profile.

---

## Out of Scope

- Infection control / safety measures on the caregiver profile (Sub-project 4 handles caregiver capabilities)
- Matching on these fields (Sub-project 5)
