# ElderDoc Phase 3: Caregiver Onboarding — Design Specification

**Date:** 2026-04-17
**Status:** Approved

---

## Goal

Build the 5-step authenticated caregiver onboarding flow. Caregivers sign in with Google SSO before step 1. Each step persists directly to the database via Server Action. On step 5 completion, `users.role` is set to `'caregiver'` and the user is redirected to a welcome screen.

---

## Auth Flow

The "Offer Your Caregiving Services" card on the role selection page (`/get-started`) links to:

```
/sign-in?callbackUrl=/get-started/caregiver/step-1
```

After Google SSO the user lands on step 1 with `role = null`. Role is not set to `'caregiver'` until step 5 completes. Until then, the user is authenticated but roleless — the middleware must allow them to traverse `/get-started/caregiver/*`.

### Proxy Updates (`proxy.ts`)

Add protection for the caregiver onboarding routes:

```typescript
if (pathname.startsWith('/get-started/caregiver')) {
  if (!isAuthenticated) {
    return NextResponse.redirect(
      new URL(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`, req.url)
    )
  }
  // Fully onboarded caregiver visiting onboarding → send to dashboard
  if (role === 'caregiver') {
    return NextResponse.redirect(new URL('/caregiver/dashboard', req.url))
  }
}
```

---

## Architecture

### State Management

All state is server-side. Each step:
1. Is a Server Component that reads existing DB values on load (for back-navigation)
2. Renders a Client Component for interactive selections
3. On Continue, calls a Server Action that upserts to the DB
4. After successful save, navigates to the next step via `redirect()`

No URL params carry data between steps. Each step reads its own data fresh from DB.

### File Map

| File | Responsibility |
|---|---|
| `app/(marketing)/get-started/page.tsx` | Update "caregiver" card link to include sign-in redirect |
| `app/(marketing)/get-started/caregiver/_components/caregiver-step-shell.tsx` | 5-step progress shell (header, progress bar, title/subtitle, children) |
| `app/(marketing)/get-started/caregiver/step-1/page.tsx` | Care types — multi-select |
| `app/(marketing)/get-started/caregiver/step-2/page.tsx` | Background — experience, certifications, languages, education |
| `app/(marketing)/get-started/caregiver/step-3/page.tsx` | Availability — work type, days, shifts, start |
| `app/(marketing)/get-started/caregiver/step-4/page.tsx` | Location & rate — address form, travel distance, relocation, hourly rate |
| `app/(marketing)/get-started/caregiver/step-5/page.tsx` | Profile — photo (optional), name, phone, headline, about |
| `app/(marketing)/get-started/caregiver/complete/page.tsx` | Welcome/celebration screen |
| `domains/caregivers/onboarding.ts` | Server Actions: one per step |
| `app/api/upload/route.ts` | Route Handler: receives file, uploads to MinIO, returns `{ url: string }` |

---

## Steps

### Step 1 — Care Types

**Route:** `/get-started/caregiver/step-1`
**DB writes:** `caregiverCareTypes` (delete existing + insert new — idempotent)

5 individual selectable cards (multi-select):
- Personal Care
- Companionship
- Dementia Care
- Mobility Assistance
- Post-Hospital Recovery

Server Action: `saveCaregiverStep1(careTypes: string[])`
- Requires auth — `const session = await auth()`; if no session, throws
- Deletes all existing `caregiverCareTypes` for this caregiver profile
- Batch-inserts new rows
- Creates `caregiverProfiles` record with `completedStep: 1` if it doesn't exist (upsert on `userId`)
- Redirects to `/get-started/caregiver/step-2`

On page load: reads existing `caregiverCareTypes` for the user → pre-selects cards.

---

### Step 2 — Background

**Route:** `/get-started/caregiver/step-2`
**DB writes:** `caregiverProfiles` (experience, education) + `caregiverCertifications` (delete + insert) + `caregiverLanguages` (delete + insert)

Four sections, each a labeled group of individual selectable cards:

**Experience (single-select):**
- Less than 1 year
- 1–2 years
- 3–5 years
- 5–10 years
- 10+ years

**Certifications (multi-select):**
- Certified Nurse Assistant
- Home Health Aide
- Medication Aide
- Medical Assistant
- Licensed Vocational Nurse
- Registered Nurse
- Retired Nurse

**Languages (multi-select):**
English · Spanish · French · Mandarin · Cantonese · Tagalog · Vietnamese · Korean · Arabic · Portuguese · Russian · Hindi

**Education (single-select):**
- High school diploma / GED
- Some college
- Associate's degree
- Bachelor's degree
- Master's degree or higher

Server Action: `saveCaregiverStep2(data: { experience: string, certifications: string[], languages: string[], education: string })`
- Upserts `caregiverProfiles.experience` and `caregiverProfiles.education`
- Deletes + re-inserts `caregiverCertifications`
- Deletes + re-inserts `caregiverLanguages`
- Updates `completedStep: 2`
- Redirects to `/get-started/caregiver/step-3`

On page load: reads existing values → pre-selects all fields.

---

### Step 3 — Availability

**Route:** `/get-started/caregiver/step-3`
**DB writes:** `caregiverWorkPrefs` (delete all + re-insert)

Four sections of individual selectable cards:

**Work Type (multi-select):**
Full-time · Part-time · Flexible · Live-in

**Days (multi-select, each day is its own card):**
Monday · Tuesday · Wednesday · Thursday · Friday · Saturday · Sunday

**Shifts (multi-select):**
- Morning (6am–12pm)
- Afternoon (12pm–6pm)
- Evening (6pm–10pm)
- Overnight (10pm–6am)

**Start Availability (single-select):**
Immediately · Within a week · Within a month

Server Action: `saveCaregiverStep3(data: { workTypes: string[], days: string[], shifts: string[], startAvailability: string })`
- Deletes all existing `caregiverWorkPrefs` rows for this profile
- Batch-inserts: one row per selected `workType`, one row per selected `day`, one row per selected `shift`, one row for `startAvailability` — all as separate rows in the same table (matching the schema's `{ caregiverId, workType, shift, day }` structure where unused columns are null)
- Updates `completedStep: 3`
- Redirects to `/get-started/caregiver/step-4`

On page load: reads existing `caregiverWorkPrefs` → pre-selects.

---

### Step 4 — Location & Rate

**Route:** `/get-started/caregiver/step-4`
**DB writes:** `caregiverLocations` (upsert) + `caregiverProfiles` (hourlyMin, hourlyMax, relocatable)

**Location form:**
- Address Line 1 (required)
- Address Line 2 (optional)
- City (required)
- State — dropdown from `US_STATES` constant (required)
- Country — locked to "United States"

**Travel Distance (multi-select — discrete cards, NOT a slider):**
5 miles · 10 miles · 15 miles · 20 miles · 25 miles · 30+ miles

Each distance is its own individually selectable card.

**Relocation:**
Single checkbox: "Open to relocating"

**Hourly Rate:**
Two number inputs — Min and Max.
Auto-filled based on experience (read from `caregiverProfiles.experience` on page load):

| Experience | Default Min | Default Max |
|---|---|---|
| Less than 1 year | $16 | $20 |
| 1–2 years | $19 | $24 |
| 3–5 years | $22 | $30 |
| 5–10 years | $28 | $40 |
| 10+ years | $35 | $55 |

The auto-fill is read-only default — user can override both values freely.

Server Action: `saveCaregiverStep4(data: { address1, address2, city, state, travelDistances: string[], relocatable: boolean, hourlyMin: string, hourlyMax: string })`
- Upserts `caregiverLocations`
- Updates `caregiverProfiles` (hourlyMin, hourlyMax, relocatable, completedStep: 4)
- Redirects to `/get-started/caregiver/step-5`

On page load: reads existing `caregiverLocations` and `caregiverProfiles` → pre-fills all fields.

---

### Step 5 — Profile

**Route:** `/get-started/caregiver/step-5`
**DB writes:** `caregiverProfiles` (headline, about, photoUrl) + `users` (name, phone, role → 'caregiver')

**Photo Upload (optional):**
- Drag-and-drop zone or click-to-browse file input
- On file selection → `fetch('/api/upload', { method: 'POST', body: formData })` → returns `{ url: string }`
- URL stored in a hidden input field
- Shows preview of uploaded image
- If no photo uploaded, avatar falls back to initials on the dashboard

**Name:**
Pre-filled from `users.name` (Google SSO). Editable.

**Phone:**
US format. Empty by default. Required.

**Headline:**
Three selectable template cards (single-select). Selecting a template fills the text input below it. User can then edit freely.

Templates:
1. "Compassionate and experienced caregiver dedicated to improving the lives of seniors."
2. "Certified caregiver with a passion for providing dignified, personalized elderly care."
3. "Reliable and caring professional committed to helping families when they need it most."

Free-edit input below the templates (max 150 characters).

**About:**
Textarea, max 500 characters. Character counter shown.

Server Action: `saveCaregiverStep5(data: { name, phone, headline, about, photoUrl?: string })`
- Updates `users` (name, phone, role = 'caregiver')
- Updates `caregiverProfiles` (headline, about, photoUrl, status = 'active', completedStep: 5)
- Redirects to `/get-started/caregiver/complete`

On page load: reads existing `caregiverProfiles` and `users` → pre-fills all fields.

---

### Completion Screen

**Route:** `/get-started/caregiver/complete`

Full-viewport centered layout. No navigation chrome.

Content:
- Animated checkmark (CSS — no JS library)
- Heading: "Welcome to ElderDoc."
- Subtext: "Your profile is live. Families are looking for caregivers like you."
- Primary CTA: "Go to My Dashboard" → `/caregiver/dashboard`
- Secondary CTA: "Complete My Profile" → `/caregiver/dashboard` (same destination for now — profile editing is Phase 6)

Access control: this page is public (no auth check). After signing out and revisiting `/get-started/caregiver/complete`, it just shows the completion screen with the CTA.

---

## Photo Upload API

**Route:** `POST /api/upload`

```typescript
// app/api/upload/route.ts
import { auth } from '@/auth'
import { uploadFile } from '@/services/storage'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  const key = `avatars/${session.user.id}/${Date.now()}-${file.name}`
  const url = await uploadFile(key, file)
  return NextResponse.json({ url })
}
```

`services/storage.ts` already exists and exports the S3-compatible upload helper. `uploadFile(key, file)` wraps `@aws-sdk/lib-storage`.

---

## CaregiverStepShell

Shared layout component for all 5 steps. Same pattern as the client `StepShell` from Phase 2 but with 5 steps.

Props: `currentStep: number` (1–5), `title: string`, `subtitle?: string`, `children: React.ReactNode`, `backHref: string`

Steps array:
```typescript
const CAREGIVER_STEPS = [
  { label: 'Care types' },
  { label: 'Background' },
  { label: 'Availability' },
  { label: 'Location & rate' },
  { label: 'Profile' },
]
```

Renders: sticky header (Back link + ElderDoc wordmark) + `StepProgress` + centered title/subtitle + children.

---

## Server Actions (`domains/caregivers/onboarding.ts`)

All actions:
1. Call `const session = await auth()` — throw `Error('Unauthorized')` if no session
2. Look up or create `caregiverProfiles` record via `userId`
3. Perform upserts/deletes described per step
4. Call `redirect()` to next step (Next.js server-side redirect)

All delete+re-insert operations use `db.delete(...).where(eq(..., profileId))` followed by `db.insert(...).values([...])`. These run sequentially (not parallel) to avoid partial state.

---

## Role Selection Page Update

`app/(marketing)/get-started/page.tsx` — update the caregiver card's `href`:

```
Before: href="/get-started/caregiver/step-1"
After:  href="/sign-in?callbackUrl=%2Fget-started%2Fcaregiver%2Fstep-1"
```

This ensures unauthenticated users are sent to sign-in first before the proxy redirect logic applies.

---

## Out of Scope for Phase 3

- Resume mid-onboarding (returning user with `completedStep < 5`) — handled in a later phase
- Caregiver profile editing from the dashboard — Phase 6
- Geocoding `lat`/`lng` from the location form — deferred (proximity search uses state-level filtering for now)
- Password field — Google SSO only in this build; field is omitted entirely

---

## Testing

Each Server Action is tested via unit tests using a mocked `db` and `auth`:
- `saveCaregiverStep1`: throws if no session, deletes + inserts care types, creates profile if missing
- `saveCaregiverStep2`: upserts experience/education, replaces certifications/languages
- `saveCaregiverStep3`: replaces work prefs
- `saveCaregiverStep4`: upserts location, updates rate fields
- `saveCaregiverStep5`: updates user (name, phone, role), updates profile (headline, about, photoUrl, status)

Upload route: tested with mocked `auth()` and `uploadFile` — returns 401 with no session, 400 with no file, 200 with `{ url }` on success.

UI: no additional component tests needed beyond what the Server Actions cover — the selectable card pattern is already tested from Phase 2.
