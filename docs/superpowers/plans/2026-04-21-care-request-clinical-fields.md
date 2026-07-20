# Care Request Clinical Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add supplies needed, infection control precautions, safety measures, and recipient functional status fields to the care request schema and wizard (new "Care Details" step 5).

**Architecture:** Four JSONB/text columns added to `care_requests`. New constants added to `lib/constants.ts`. A new Step 5 "Care Details" inserted into the care request wizard (between Schedule and Preferences), shifting existing steps 5–7 to 6–8. Domain actions updated.

**Tech Stack:** Next.js 15, Drizzle ORM, PostgreSQL, TypeScript, Tailwind CSS

---

## File Structure

- Modify: `db/schema.ts` — add 4 columns to careRequests
- Create: `db/migrations/0010_care_request_clinical.sql`
- Modify: `lib/constants.ts` — add INFECTION_CONTROL_ITEMS, SAFETY_MEASURE_ITEMS
- Modify: `domains/clients/requests.ts` — update createCareRequest + updateCareRequest
- Modify: `app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx` — insert Step 5 "Care Details", renumber 5→6, 6→7, 7→8

---

### Task 1: Schema + constants

**Files:**
- Modify: `db/schema.ts`
- Modify: `lib/constants.ts`

- [ ] **Step 1: Add columns to careRequests in `db/schema.ts`**

After the `startDate` field, add:
```ts
suppliesNeeded:   text('supplies_needed'),
infectionControl: jsonb('infection_control').$type<{
  enabled: boolean
  gloves?: boolean
  handWashing?: boolean
  wasteDisposal?: boolean
}>(),
safetyMeasures:   jsonb('safety_measures').$type<{
  enabled: boolean
  clearPathways?: boolean
  electricCords?: boolean
  pets?: boolean
}>(),
clientStatus:     jsonb('client_status').$type<{
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

- [ ] **Step 2: Add constants to `lib/constants.ts`**

Add after `CLIENT_STATUS_GROUPS`:
```ts
export const INFECTION_CONTROL_ITEMS = [
  { key: 'gloves',        label: 'Gloves' },
  { key: 'handWashing',   label: 'Hand washing' },
  { key: 'wasteDisposal', label: 'Waste disposal' },
] as const

export const SAFETY_MEASURE_ITEMS = [
  { key: 'clearPathways', label: 'Clear pathways' },
  { key: 'electricCords', label: 'Electric cords' },
  { key: 'pets',          label: 'Pets' },
] as const
```

- [ ] **Step 3: Generate + apply migration**

```bash
npx drizzle-kit generate
```

If that fails, create `db/migrations/0010_care_request_clinical.sql`:
```sql
ALTER TABLE care_requests
  ADD COLUMN IF NOT EXISTS supplies_needed text,
  ADD COLUMN IF NOT EXISTS infection_control jsonb,
  ADD COLUMN IF NOT EXISTS safety_measures jsonb,
  ADD COLUMN IF NOT EXISTS client_status jsonb;
```

Apply:
```bash
psql $DATABASE_URL -f db/migrations/0010_care_request_clinical.sql
```

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts lib/constants.ts db/migrations/
git commit -m "feat: care request clinical fields schema + constants"
```

---

### Task 2: Update domain actions

**Files:**
- Modify: `domains/clients/requests.ts`

- [ ] **Step 1: Update `createCareRequest` data parameter**

Add these optional fields to the data type:
```ts
suppliesNeeded?: string
infectionControl?: { enabled: boolean; gloves?: boolean; handWashing?: boolean; wasteDisposal?: boolean }
safetyMeasures?: { enabled: boolean; clearPathways?: boolean; electricCords?: boolean; pets?: boolean }
clientStatus?: Record<string, boolean | string>
```

- [ ] **Step 2: Add fields to the DB insert**

In the `tx.insert(careRequests).values({...})` call, add:
```ts
suppliesNeeded:   data.suppliesNeeded,
infectionControl: data.infectionControl,
safetyMeasures:   data.safetyMeasures,
clientStatus:     data.clientStatus,
```

- [ ] **Step 3: Update `updateCareRequest` the same way**

Add the same 4 optional fields to the data type and the `.set({...})` call.

- [ ] **Step 4: Commit**

```bash
git add domains/clients/requests.ts
git commit -m "feat: createCareRequest/updateCareRequest — clinical fields"
```

---

### Task 3: Insert Care Details step in wizard

**Files:**
- Modify: `app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx`

- [ ] **Step 1: Update STEP_TITLES**

Replace:
```ts
const STEP_TITLES = [
  'What type of care is needed?',
  'Who needs care?',
  'Where will care take place?',
  'Schedule',
  'Preferences',
  'Review & generate',
  'Your Top Matches',
]
```
With:
```ts
const STEP_TITLES = [
  'What type of care is needed?',
  'Who needs care?',
  'Where will care take place?',
  'Schedule',
  'Care Details',
  'Preferences',
  'Review & generate',
  'Your Top Matches',
]
```

- [ ] **Step 2: Add new fields to `RequestForm` interface**

Add after `startDate`:
```ts
suppliesNeeded: string
infectionControlEnabled: boolean
infectionControl: Record<string, boolean>
safetyMeasuresEnabled: boolean
safetyMeasures: Record<string, boolean>
careRequestClientStatus: Record<string, boolean | string>
```

- [ ] **Step 3: Update `EMPTY` constant**

Add:
```ts
suppliesNeeded: '',
infectionControlEnabled: false,
infectionControl: {},
safetyMeasuresEnabled: false,
safetyMeasures: {},
careRequestClientStatus: {},
```

- [ ] **Step 4: Update imports — add new constants**

Add to the constants import:
```ts
INFECTION_CONTROL_ITEMS, SAFETY_MEASURE_ITEMS, CLIENT_STATUS_GROUPS,
```

- [ ] **Step 5: Add the new Step 5 "Care Details" JSX block**

Insert after the closing `)}` of the Step 4 block (around line 436):

```tsx
{/* Step 5 — Care Details */}
{step === 5 && (
  <div className="space-y-8">
    {/* Supplies needed */}
    <div>
      <label className="block text-sm font-medium mb-2">Supplies needed (optional)</label>
      <textarea
        value={form.suppliesNeeded}
        onChange={e => setForm(f => ({ ...f, suppliesNeeded: e.target.value }))}
        rows={3}
        className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none resize-none"
        placeholder="e.g. Gloves, masks, gown, hand sanitizer"
      />
    </div>

    {/* Infection control */}
    <div>
      <label className="block text-sm font-medium mb-3">Infection control precautions</label>
      <div className="flex gap-3 mb-3">
        {['Yes', 'No'].map(opt => (
          <button key={opt} type="button"
            onClick={() => setForm(f => ({ ...f, infectionControlEnabled: opt === 'Yes' }))}
            className={['rounded-xl border-2 px-5 py-2 text-sm font-medium transition-colors',
              (opt === 'Yes' ? form.infectionControlEnabled : !form.infectionControlEnabled)
                ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
            ].join(' ')}>
            {opt}
          </button>
        ))}
      </div>
      {form.infectionControlEnabled && (
        <div className="flex flex-wrap gap-2">
          {INFECTION_CONTROL_ITEMS.map(item => (
            <button key={item.key} type="button"
              onClick={() => setForm(f => ({
                ...f,
                infectionControl: {
                  ...f.infectionControl,
                  [item.key]: !f.infectionControl[item.key],
                },
              }))}
              className={['rounded-xl border-2 px-4 py-2.5 text-sm transition-colors',
                form.infectionControl[item.key] ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
              ].join(' ')}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Safety measures */}
    <div>
      <label className="block text-sm font-medium mb-3">Safety measures</label>
      <div className="flex gap-3 mb-3">
        {['Yes', 'No'].map(opt => (
          <button key={opt} type="button"
            onClick={() => setForm(f => ({ ...f, safetyMeasuresEnabled: opt === 'Yes' }))}
            className={['rounded-xl border-2 px-5 py-2 text-sm font-medium transition-colors',
              (opt === 'Yes' ? form.safetyMeasuresEnabled : !form.safetyMeasuresEnabled)
                ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
            ].join(' ')}>
            {opt}
          </button>
        ))}
      </div>
      {form.safetyMeasuresEnabled && (
        <div className="flex flex-wrap gap-2">
          {SAFETY_MEASURE_ITEMS.map(item => (
            <button key={item.key} type="button"
              onClick={() => setForm(f => ({
                ...f,
                safetyMeasures: {
                  ...f.safetyMeasures,
                  [item.key]: !f.safetyMeasures[item.key],
                },
              }))}
              className={['rounded-xl border-2 px-4 py-2.5 text-sm transition-colors',
                form.safetyMeasures[item.key] ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
              ].join(' ')}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Recipient status */}
    <div>
      <label className="block text-sm font-medium mb-4">Recipient status (optional)</label>
      <div className="space-y-6">
        {CLIENT_STATUS_GROUPS.map(group => (
          <div key={group.label}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{group.label}</h3>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map(item => {
                const checked = !!form.careRequestClientStatus[item.key]
                return (
                  <div key={item.key} className="flex flex-col gap-1">
                    <button type="button"
                      onClick={() => setForm(f => {
                        const s = { ...f.careRequestClientStatus }
                        if (s[item.key]) { delete s[item.key] } else { s[item.key] = true }
                        return { ...f, careRequestClientStatus: s }
                      })}
                      className={['rounded-xl border-2 px-4 py-3 text-sm text-left transition-colors',
                        checked ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
                      ].join(' ')}>
                      {item.label}
                    </button>
                    {checked && item.key === 'amputee' && (
                      <input type="text"
                        value={typeof form.careRequestClientStatus.amputeeDetails === 'string' ? form.careRequestClientStatus.amputeeDetails : ''}
                        onChange={e => setForm(f => ({ ...f, careRequestClientStatus: { ...f.careRequestClientStatus, amputeeDetails: e.target.value } }))}
                        className="rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-none"
                        placeholder="e.g. left leg below knee" />
                    )}
                    {checked && item.key === 'diabetic' && (
                      <input type="text"
                        value={typeof form.careRequestClientStatus.diet === 'string' ? form.careRequestClientStatus.diet : ''}
                        onChange={e => setForm(f => ({ ...f, careRequestClientStatus: { ...f.careRequestClientStatus, diet: e.target.value } }))}
                        className="rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-none"
                        placeholder="Diet details" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Other</label>
          <input type="text"
            value={typeof form.careRequestClientStatus.other === 'string' ? form.careRequestClientStatus.other : ''}
            onChange={e => setForm(f => ({ ...f, careRequestClientStatus: { ...f.careRequestClientStatus, other: e.target.value } }))}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
            placeholder="Specify any other relevant status…" />
        </div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Shift all `step === 5` → `step === 6`, `step === 6` → `step === 7`, `step === 7` → `step === 8`**

Search for `step === 5`, `step === 6`, `step === 7` in the file and increment each by 1. Also update `step < 5` navigation guard to `step < 8` (or whatever the final step check is).

Also update `nextDisabled` to add step 5 (care details) as always `false` (optional step), and update `nextDisabled` checks for old step 5 (now step 6 — Preferences) etc.

- [ ] **Step 7: Update handleSave to pass clinical fields to createCareRequest**

In the `createCareRequest({...})` call, add:
```ts
suppliesNeeded:   form.suppliesNeeded || undefined,
infectionControl: { enabled: form.infectionControlEnabled, ...form.infectionControl },
safetyMeasures:   { enabled: form.safetyMeasuresEnabled, ...form.safetyMeasures },
clientStatus:     Object.keys(form.careRequestClientStatus).length > 0
  ? form.careRequestClientStatus : undefined,
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "new-request-form"
```

Expected: no errors in this file

- [ ] **Step 9: Commit**

```bash
git add "app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx"
git commit -m "feat: care request wizard — Care Details step (supplies, infection control, safety, status)"
```

---

### Task 4: Build verification

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "care-plans.test\|rate-defaults.test"
```

Expected: no new errors

- [ ] **Step 2: Manual smoke test**

1. `npm run dev`
2. Create a care request — confirm Step 5 "Care Details" appears with all 4 sections
3. Toggle infection control Yes/No — confirm checkboxes show/hide
4. Toggle safety measures Yes/No — confirm checkboxes show/hide
5. Submit request — confirm no errors, data saves

- [ ] **Step 3: Commit fixups if needed**

```bash
git add -A && git commit -m "fix: care request clinical fields post-integration fixups"
```
