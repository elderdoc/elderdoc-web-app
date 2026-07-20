# Find Caregivers Filter Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the languages filter entirely from Find Caregivers. Replace the certification multi-checkbox with a toggle that reveals a single-select dropdown.

**Architecture:** Changes are isolated to two files. The `SearchFilters` type loses `language` and changes `certification` from `string[]` to `string | undefined`. The `FilterForm` component removes the language section and replaces certification checkboxes with a toggle + dropdown.

**Tech Stack:** Next.js 15 App Router, React, Tailwind CSS

---

## File Structure

| File | Change |
|------|--------|
| `domains/clients/find-caregivers.ts` | Remove language filter SQL, change certification filter to single value |
| `app/(client)/client/dashboard/find-caregivers/_components/filter-form.tsx` | Remove language section, add certification toggle + dropdown |

---

### Task 1: Update domain — searchCaregivers

**Files:**
- Modify: `domains/clients/find-caregivers.ts`

- [ ] **Step 1: Update `SearchFilters` type**

Find `SearchFilters` (around line 44):
```typescript
export type SearchFilters = {
  careType?: string
  state?: string
  rateMin?: string
  rateMax?: string
  language?: string[]
  certification?: string[]
  experience?: string
}
```

Replace with:
```typescript
export type SearchFilters = {
  careType?: string
  state?: string
  rateMin?: string
  rateMax?: string
  certification?: string
  experience?: string
}
```

- [ ] **Step 2: Remove language filter SQL**

Find the language filter block (around line 131):
```typescript
if (filters.language && filters.language.length > 0) {
  const langList = sql.join(filters.language.map((l) => sql`${l}`), sql`, `)
  conditions.push(
    sql`EXISTS (SELECT 1 FROM ${caregiverLanguages} WHERE ${caregiverLanguages.caregiverId} = ${caregiverProfiles.id} AND ${caregiverLanguages.language} IN (${langList}))`
  )
}
```
Remove this entire block.

Also remove the `caregiverLanguages` import if it's now unused:
```typescript
// Remove from import:
caregiverLanguages,
```

- [ ] **Step 3: Change certification filter to single-value**

Find the certification filter block (around line 138):
```typescript
if (filters.certification && filters.certification.length > 0) {
  const certList = sql.join(filters.certification.map((c) => sql`${c}`), sql`, `)
  conditions.push(
    sql`EXISTS (SELECT 1 FROM ${caregiverCertifications} WHERE ${caregiverCertifications.caregiverId} = ${caregiverProfiles.id} AND ${caregiverCertifications.certification} IN (${certList}))`
  )
}
```

Replace with:
```typescript
if (filters.certification && filters.certification !== 'none') {
  conditions.push(
    sql`EXISTS (SELECT 1 FROM ${caregiverCertifications} WHERE ${caregiverCertifications.caregiverId} = ${caregiverProfiles.id} AND ${caregiverCertifications.certification} = ${filters.certification})`
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: errors in filter-form.tsx about removed types — those are fixed in the next task.

- [ ] **Step 5: Commit**

```bash
git add domains/clients/find-caregivers.ts
git commit -m "feat: remove language filter, change certification to single-select in searchCaregivers"
```

---

### Task 2: Update FilterForm component

**Files:**
- Modify: `app/(client)/client/dashboard/find-caregivers/_components/filter-form.tsx`

- [ ] **Step 1: Update the `Props` interface**

Find `currentFilters` in the `Props` interface:
```typescript
currentFilters: {
  requestId?: string
  careType?: string
  state?: string
  rateMin?: string
  rateMax?: string
  language?: string[]
  certification?: string[]
  experience?: string
  sort?: string
  page?: string
}
```

Replace with:
```typescript
currentFilters: {
  requestId?: string
  careType?: string
  state?: string
  rateMin?: string
  rateMax?: string
  certification?: string
  experience?: string
  sort?: string
  page?: string
}
```

- [ ] **Step 2: Update `buildParams` — remove language, change certification to string**

Find the `buildParams` function. Remove `language` from the `merged` object and params building:

```typescript
const buildParams = useCallback(
  (overrides: Record<string, string | string[] | undefined>) => {
    const params = new URLSearchParams()

    const merged = {
      requestId:     currentFilters.requestId,
      careType:      currentFilters.careType,
      state:         currentFilters.state,
      rateMin:       currentFilters.rateMin,
      rateMax:       currentFilters.rateMax,
      certification: currentFilters.certification,
      experience:    currentFilters.experience,
      sort:          currentFilters.sort,
      page:          currentFilters.page,
      ...overrides,
    }

    if (merged.requestId)    params.set('requestId', merged.requestId as string)
    if (merged.careType)     params.set('careType', merged.careType as string)
    if (merged.state)        params.set('state', merged.state as string)
    if (merged.rateMin)      params.set('rateMin', merged.rateMin as string)
    if (merged.rateMax)      params.set('rateMax', merged.rateMax as string)
    if (merged.experience)   params.set('experience', merged.experience as string)
    if (merged.sort)         params.set('sort', merged.sort as string)
    if (merged.page)         params.set('page', merged.page as string)
    if (merged.certification && merged.certification !== 'none') {
      params.set('certification', merged.certification as string)
    }
    return params.toString()
  },
  [currentFilters],
)
```

- [ ] **Step 3: Remove `handleCheckboxMulti` function**

Delete the entire `handleCheckboxMulti` function — it's no longer needed.

- [ ] **Step 4: Add `showCertFilter` state**

After the `debounceRef` line, add:
```typescript
const [showCertFilter, setShowCertFilter] = useState(
  !!currentFilters.certification && currentFilters.certification !== 'none'
)
```

- [ ] **Step 5: Remove the Languages section**

Delete the entire Languages `<div>` block (around lines 211-229):
```tsx
{/* Languages */}
<div className="mb-4">
  <p className="text-xs font-medium mb-2">Languages</p>
  <div className="flex flex-wrap gap-x-4 gap-y-1">
    {LANGUAGES.map((lang) => (
      ...
    ))}
  </div>
</div>
```

Also remove `LANGUAGES` from the import at the top:
```diff
- import { CARE_TYPES, CERTIFICATIONS, LANGUAGES, US_STATES } from '@/lib/constants'
+ import { CARE_TYPES, CERTIFICATIONS, US_STATES } from '@/lib/constants'
```

- [ ] **Step 6: Replace Certifications section with toggle + dropdown**

Find the Certifications section (around lines 231-249):
```tsx
{/* Certifications */}
<div>
  <p className="text-xs font-medium mb-2">Certifications</p>
  <div className="flex flex-wrap gap-x-4 gap-y-1">
    {CERTIFICATIONS.map((cert) => (
      <label key={cert.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
        <input
          type="checkbox"
          value={cert.key}
          checked={(currentFilters.certification ?? []).includes(cert.key)}
          onChange={(e) =>
            handleCheckboxMulti('certification', cert.key, e.target.checked)
          }
        />
        {cert.label}
      </label>
    ))}
  </div>
</div>
```

Replace with:
```tsx
{/* Certifications */}
<div>
  <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
    <input
      type="checkbox"
      checked={showCertFilter}
      onChange={e => {
        setShowCertFilter(e.target.checked)
        if (!e.target.checked) push({ certification: undefined })
      }}
      className="h-4 w-4 rounded border-input accent-primary"
    />
    <span className="text-xs font-medium">Special certifications needed</span>
  </label>
  {showCertFilter && (
    <SelectField
      options={[
        { value: 'none', label: 'None' },
        ...CERTIFICATIONS.map(c => ({ value: c.key, label: c.label })),
      ]}
      value={currentFilters.certification ?? 'none'}
      onChange={val => push({ certification: val === 'none' ? undefined : val })}
      placeholder="None"
      className="max-w-xs"
    />
  )}
</div>
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Manual test**

Start dev server. Navigate to `/client/dashboard/find-caregivers`. Verify:
- No "Languages" filter section visible
- Certifications shows only a checkbox "Special certifications needed"
- Checking the box reveals a dropdown with None + all certification options
- Selecting a certification filters results; selecting None removes filter
- Unchecking the checkbox hides the dropdown and clears the filter

- [ ] **Step 9: Commit**

```bash
git add domains/clients/find-caregivers.ts app/\(client\)/client/dashboard/find-caregivers/_components/filter-form.tsx
git commit -m "feat: remove language filter, replace certification checkboxes with toggle + dropdown"
```
