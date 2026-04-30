# Schedule Step Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual time text inputs in the care request schedule step with increment-based dropdowns (with custom text fallback), add a copy-to-day feature, and add an optional end date field.

**Architecture:** A new reusable `TimeDropdown` component handles option generation and custom fallback. The schedule step in `new-request-form.tsx` gains `increment` UI state and `endDate` form state. The DB gains one nullable `end_date` column on `care_requests`. The server action gains one optional `endDate` param.

**Tech Stack:** Next.js 15 App Router, React, Drizzle ORM, Tailwind CSS

---

## File Structure

| File | Change |
|------|--------|
| `components/ui/time-dropdown.tsx` | New — reusable dropdown with Custom fallback |
| `app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx` | Modify — add increment, endDate, copy button |
| `domains/clients/requests.ts` | Modify — add `endDate` param to `createCareRequest` |
| `db/schema.ts` | Modify — add `endDate` column to `careRequests` |
| `db/migrations/0013_schedule_end_date.sql` | New — add column migration |

---

### Task 1: TimeDropdown component

**Files:**
- Create: `components/ui/time-dropdown.tsx`

- [ ] **Step 1: Create `components/ui/time-dropdown.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  increment: 15 | 30 | 60
  placeholder?: string
}

function generateTimes(increment: 15 | 30 | 60): string[] {
  const times: string[] = []
  for (let m = 0; m < 24 * 60; m += increment) {
    const h = Math.floor(m / 60).toString().padStart(2, '0')
    const min = (m % 60).toString().padStart(2, '0')
    times.push(`${h}:${min}`)
  }
  return times
}

export function TimeDropdown({ value, onChange, increment, placeholder = 'Select time' }: Props) {
  const times = generateTimes(increment)
  const isCustom = value !== '' && !times.includes(value)
  const [showCustom, setShowCustom] = useState(isCustom)

  useEffect(() => {
    if (!times.includes(value) && value !== '') {
      setShowCustom(true)
    }
  }, [increment])

  if (showCustom) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="HH:MM"
          className="w-24 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => { setShowCustom(false); onChange('') }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={e => {
        if (e.target.value === '__custom__') {
          setShowCustom(true)
          onChange('')
        } else {
          onChange(e.target.value)
        }
      }}
      className="w-32 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none bg-background"
    >
      <option value="">{placeholder}</option>
      {times.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
      <option value="__custom__">Custom…</option>
    </select>
  )
}
```

- [ ] **Step 2: Verify the component renders in isolation**

Open any page that imports from `components/ui/` and confirm no TypeScript errors by running:
```bash
npx tsc --noEmit
```
Expected: no errors related to `time-dropdown.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/ui/time-dropdown.tsx
git commit -m "feat: add TimeDropdown component with increment and custom fallback"
```

---

### Task 2: DB schema — add endDate column

**Files:**
- Modify: `db/schema.ts` (line ~148, `careRequests` table)
- Create: `db/migrations/0013_schedule_end_date.sql`

- [ ] **Step 1: Add `endDate` to `careRequests` in `db/schema.ts`**

Find the `careRequests` table (around line 140). After `startDate: text('start_date'),` add:

```typescript
endDate: text('end_date'),
```

The full block will look like:
```typescript
startDate:    text('start_date'),
endDate:      text('end_date'),
suppliesNeeded:   text('supplies_needed'),
```

- [ ] **Step 2: Generate migration**

```bash
npm run db:generate
```
Expected: creates a new migration file in `db/migrations/` (e.g. `0013_...sql`) containing `ALTER TABLE "care_requests" ADD COLUMN "end_date" text;`

- [ ] **Step 3: Apply migration**

```bash
DATABASE_URL=postgres://elderdoc:elderdoc@localhost:5432/elderdoc npm run db:migrate
```
Expected: "1 migration(s) applied"

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts db/migrations/
git commit -m "feat: add end_date column to care_requests"
```

---

### Task 3: Update createCareRequest server action

**Files:**
- Modify: `domains/clients/requests.ts`

- [ ] **Step 1: Add `endDate` to the `createCareRequest` data param type**

In `domains/clients/requests.ts`, find `createCareRequest` (line ~47). Add `endDate?: string` to the data parameter:

```typescript
export async function createCareRequest(data: {
  recipientId: string
  careType: string
  address: { address1: string; address2?: string; city: string; state: string }
  frequency: string
  schedule: Array<{ day: string; startTime: string; endTime: string }>
  startDate: string
  endDate?: string                   // ← add this
  genderPref?: string
  transportationPref?: string
  languagePref: string[]
  budgetType?: string
  budgetAmount?: string
  title: string
  description: string
  suppliesNeeded?: string
  infectionControl?: { enabled: boolean; gloves?: boolean; handWashing?: boolean; wasteDisposal?: boolean }
  safetyMeasures?: { enabled: boolean; clearPathways?: boolean; electricCords?: boolean; pets?: boolean }
  clientStatus?: Record<string, boolean | string>
}): Promise<{ id: string }> {
```

- [ ] **Step 2: Pass `endDate` to the DB insert inside `createCareRequest`**

Inside the `db.transaction` block, find the `.values({...})` call. Add `endDate: data.endDate,` after `startDate`:

```typescript
const [row] = await tx.insert(careRequests).values({
  clientId:     session.user.id,
  recipientId:  data.recipientId,
  careType:     data.careType,
  frequency:    data.frequency,
  schedule:     data.schedule,
  startDate:    data.startDate,
  endDate:      data.endDate,        // ← add this
  genderPref:          data.genderPref,
  // ... rest unchanged
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add domains/clients/requests.ts
git commit -m "feat: add endDate param to createCareRequest"
```

---

### Task 4: Update new-request-form — increment, TimeDropdown, copy button, end date

**Files:**
- Modify: `app/(client)/client/dashboard/requests/new/_components/new-request-form.tsx`

- [ ] **Step 1: Add imports and form state**

At the top of the file, add the `TimeDropdown` import:

```typescript
import { TimeDropdown } from '@/components/ui/time-dropdown'
```

Remove the existing `TimePicker` import:
```diff
- import { TimePicker } from '@/components/ui/time-picker'
```

In the `RequestForm` interface (line ~35), add `endDate`:

```typescript
interface RequestForm {
  careTypes: string[]
  recipientId: string
  recipientName: string
  address: { address1: string; address2: string; city: string; state: string }
  frequency: string
  schedule: Array<{ day: string; startTime: string; endTime: string }>
  startDate: string
  endDate: string                    // ← add this
  // ... rest unchanged
```

In `EMPTY` (line ~63), add `endDate: ''`:

```typescript
const EMPTY: RequestForm = {
  careTypes: [], recipientId: '', recipientName: '',
  address: { address1: '', address2: '', city: '', state: '' },
  frequency: '', schedule: [], startDate: '',
  endDate: '',                       // ← add this
  // ... rest unchanged
```

Inside `NewRequestForm` component (after the existing `useState` calls), add increment state:

```typescript
const [increment, setIncrement] = useState<15 | 30 | 60>(30)
const [copyMenuDay, setCopyMenuDay] = useState<string | null>(null)
```

- [ ] **Step 2: Add increment selector UI to Step 4**

In Step 4 (look for `{/* Step 4 — Schedule */}`), add the increment selector before the days/time section. Place it right after the `<div>` for Frequency and before Days:

```tsx
{/* Increment selector */}
{form.frequency && form.frequency !== 'as-needed' && (
  <div>
    <label className="block text-sm font-medium mb-2">Time increment</label>
    <div className="flex gap-2">
      {([15, 30, 60] as const).map(inc => (
        <button
          key={inc}
          type="button"
          onClick={() => setIncrement(inc)}
          className={[
            'rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors',
            increment === inc ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50',
          ].join(' ')}
        >
          {inc === 60 ? '1 hr' : `${inc} min`}
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Replace shared time TimePicker with TimeDropdown**

Find the shared time section (around line 566-577):
```tsx
<div className="flex items-center gap-3 flex-wrap">
  <div>
    <label className="block text-xs text-muted-foreground mb-1">From</label>
    <TimePicker value={form.sharedStartTime} onChange={v => setForm(f => ({ ...f, sharedStartTime: v }))} />
  </div>
  <span className="text-muted-foreground mt-5">–</span>
  <div>
    <label className="block text-xs text-muted-foreground mb-1">To</label>
    <TimePicker value={form.sharedEndTime} onChange={v => setForm(f => ({ ...f, sharedEndTime: v }))} />
  </div>
</div>
```

Replace with:
```tsx
<div className="flex items-center gap-3 flex-wrap">
  <div>
    <label className="block text-xs text-muted-foreground mb-1">From</label>
    <TimeDropdown
      value={form.sharedStartTime}
      onChange={v => setForm(f => ({ ...f, sharedStartTime: v }))}
      increment={increment}
      placeholder="Start time"
    />
  </div>
  <span className="text-muted-foreground mt-5">–</span>
  <div>
    <label className="block text-xs text-muted-foreground mb-1">To</label>
    <TimeDropdown
      value={form.sharedEndTime}
      onChange={v => setForm(f => ({ ...f, sharedEndTime: v }))}
      increment={increment}
      placeholder="End time"
    />
  </div>
</div>
```

- [ ] **Step 4: Replace per-day TimePicker rows with TimeDropdown + copy button**

Find the per-day time section (around line 580-596):
```tsx
<div className="space-y-3">
  {form.schedule.map(s => (
    <div key={s.day} className="flex items-center gap-3 flex-wrap">
      <span className="w-28 text-sm capitalize">{s.day}</span>
      <TimePicker
        value={form.dayTimes[s.day]?.startTime ?? ''}
        onChange={v => setForm(f => ({ ...f, dayTimes: { ...f.dayTimes, [s.day]: { ...f.dayTimes[s.day], startTime: v } } }))}
      />
      <span className="text-muted-foreground">–</span>
      <TimePicker
        value={form.dayTimes[s.day]?.endTime ?? ''}
        onChange={v => setForm(f => ({ ...f, dayTimes: { ...f.dayTimes, [s.day]: { ...f.dayTimes[s.day], endTime: v } } }))}
      />
    </div>
  ))}
</div>
```

Replace with:
```tsx
<div className="space-y-3">
  {form.schedule.map(s => {
    const otherDays = form.schedule.map(sd => sd.day).filter(d => d !== s.day)
    return (
      <div key={s.day} className="flex items-center gap-2 flex-wrap">
        <span className="w-28 text-sm capitalize">{s.day}</span>
        <TimeDropdown
          value={form.dayTimes[s.day]?.startTime ?? ''}
          onChange={v => setForm(f => ({ ...f, dayTimes: { ...f.dayTimes, [s.day]: { ...f.dayTimes[s.day], startTime: v } } }))}
          increment={increment}
          placeholder="Start"
        />
        <span className="text-muted-foreground">–</span>
        <TimeDropdown
          value={form.dayTimes[s.day]?.endTime ?? ''}
          onChange={v => setForm(f => ({ ...f, dayTimes: { ...f.dayTimes, [s.day]: { ...f.dayTimes[s.day], endTime: v } } }))}
          increment={increment}
          placeholder="End"
        />
        {otherDays.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setCopyMenuDay(copyMenuDay === s.day ? null : s.day)}
              className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted text-muted-foreground"
            >
              Copy to…
            </button>
            {copyMenuDay === s.day && (
              <div className="absolute top-full mt-1 left-0 z-10 bg-card border border-border rounded-lg shadow-md py-1 min-w-[120px]">
                {otherDays.map(target => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => {
                      const src = form.dayTimes[s.day]
                      setForm(f => ({
                        ...f,
                        dayTimes: {
                          ...f.dayTimes,
                          [target]: { startTime: src?.startTime ?? '', endTime: src?.endTime ?? '' },
                        },
                      }))
                      setCopyMenuDay(null)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm capitalize hover:bg-muted"
                  >
                    {target}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  })}
</div>
```

- [ ] **Step 5: Add end date field below start date**

Find the start date section (around line 599-608):
```tsx
<div>
  <label className="block text-sm font-medium mb-1">Start Date *</label>
  <DatePicker ... />
</div>
```

Add the end date field immediately after it:
```tsx
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
<div>
  <label className="block text-sm font-medium mb-1">
    End date <span className="font-normal text-muted-foreground">(optional)</span>
  </label>
  <DatePicker
    value={form.endDate}
    onChange={(val) => setForm((f) => ({ ...f, endDate: val }))}
    placeholder="Select end date"
    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
    upward
  />
</div>
```

- [ ] **Step 6: Pass endDate to createCareRequest in handleSubmit**

Find `handleSubmit` (around line 219). Find the `createCareRequest({...})` call and add `endDate`:

```typescript
result = await createCareRequest({
  recipientId:   form.recipientId,
  careType:      form.careTypes[0] ?? '',
  address:       form.address,
  frequency:     form.frequency,
  schedule:      form.schedule.map(s => ({
    day:       s.day,
    startTime: form.sameTimeEveryDay ? form.sharedStartTime : (form.dayTimes[s.day]?.startTime ?? ''),
    endTime:   form.sameTimeEveryDay ? form.sharedEndTime   : (form.dayTimes[s.day]?.endTime ?? ''),
  })),
  startDate:     form.startDate,
  endDate:       form.endDate || undefined,   // ← add this
  suppliesNeeded: form.suppliesNeeded || undefined,
  // ... rest unchanged
```

- [ ] **Step 7: Verify TypeScript and build**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Manual test**

Start dev server (`npm run dev`). Navigate to `/client/dashboard/requests/new`. Go to Step 4. Verify:
- Increment buttons appear and switch between 15/30/60 min options
- Start/end time selectors show correct options for chosen increment
- "Custom…" option reveals a text input
- Copy button appears on per-day rows (not shown when only 1 day selected)
- Copying Monday's times to Wednesday copies correctly
- End date field appears below start date and is optional

- [ ] **Step 9: Commit**

```bash
git add app/\(client\)/client/dashboard/requests/new/_components/new-request-form.tsx
git commit -m "feat: time dropdown with increment selector, copy-to-day, end date field in schedule step"
```
