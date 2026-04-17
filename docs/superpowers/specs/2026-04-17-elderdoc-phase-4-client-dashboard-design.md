# ElderDoc Phase 4: Client Dashboard — Design Specification

**Date:** 2026-04-17
**Status:** Approved

---

## Goal

Build the client dashboard: sidebar navigation shell, stats/activity home page, Care Recipients modal (4 steps), Care Request modal (6 steps with AI-generated title + description), and stub pages for tabs not yet functional. On care request submission, the request is saved as `active` with a "Matching in progress…" badge — the matching engine is Phase 5.

---

## Architecture

**State management:** Both modals (`CareRecipientModal`, `CareRequestModal`) are single Client Components holding all step state in `useState`. A single Server Action writes to the DB on the final step. No partial DB writes, no draft cleanup needed on cancel.

**Data reads:** Dashboard home, recipients page, and requests page are async Server Components that read directly from the DB on each request. After a modal submits, `router.refresh()` re-renders the server component tree.

**AI streaming:** Step 6 of the Care Request modal calls `POST /api/care-request/generate` — a Route Handler that proxies OpenAI `gpt-4o` via the Vercel AI SDK `streamText`. The client uses `useCompletion` from `ai/react` to consume the stream with a typewriter effect. Output is parsed into Title and Description fields, both editable before submission.

---

## Dashboard Layout & Navigation

`app/(client)/client/dashboard/layout.tsx` — modified to render a full sidebar.

**Sidebar contents:**
- ElderDoc wordmark at top
- Nav links: Home · Care Recipients · Care Requests · Find Caregivers · Care Plans · Calendar
- Active state via `usePathname()`
- Notification bell with unread badge (count from `notifications` table where `userId = session.user.id AND read = false`)
- User avatar (photo or initials) + name at bottom with sign-out button

**Sidebar is a Client Component** (`_components/sidebar.tsx`) because it uses `usePathname()`.

Desktop-first layout. Mobile responsiveness deferred.

Find Caregivers, Care Plans, and Calendar pages render a "Coming in a future update" empty state — same shell, no data.

---

## Home Page

**Route:** `/client/dashboard`

Three zones:

### Stats Row
Three `StatCard` components:
- **Care Recipients** — `SELECT COUNT(*) FROM careRecipients WHERE clientId = userId`
- **Active Requests** — `SELECT COUNT(*) FROM careRequests WHERE clientId = userId AND status = 'active'`
- **Pending Matches** — `SELECT COUNT(*) FROM matches JOIN careRequests ON matches.requestId = careRequests.id WHERE careRequests.clientId = userId AND matches.status = 'pending'`

### Recent Requests List
Last 5 `careRequests` ordered by `createdAt DESC`. Each row shows:
- Care type badge
- Title
- Recipient name (joined from `careRecipients`)
- Created date
- Status badge: `draft` / `active` ("Matching in progress…") / `matched` / `filled` / `cancelled`
- "View all" link to `/client/dashboard/requests`

### Activity Timeline
Last 10 entries from `careRequests` and `careRecipients` combined, ordered by `createdAt DESC`. Simple flat list:
- "You added [Name] as a care recipient" (from `careRecipients.createdAt`)
- "You created a [careType] care request" (from `careRequests.createdAt`)

Timestamps shown as relative time (e.g. "2 hours ago") using `date-fns/formatDistanceToNow`.

### Action Buttons
Top-right of the page: **"+ Add Recipient"** and **"+ Care Request"** buttons that open their respective modals.

---

## Care Recipients Page

**Route:** `/client/dashboard/recipients`

Grid of recipient cards. Each card shows: photo/initials avatar, name, relationship badge, conditions (truncated to 3), mobility level. "Add Recipient" button top-right opens the modal.

Clicking a card opens a read-only detail sheet (slide-in panel) showing all fields. Edit functionality is Phase 6.

---

## Care Requests Page

**Route:** `/client/dashboard/requests`

List of all care requests ordered by `createdAt DESC`. Each row shows: care type, title, recipient name, created date, status badge. "New Request" button top-right opens the modal.

---

## Care Recipient Modal (4 Steps)

Single Client Component: `_components/care-recipient-modal.tsx`
Shared shell: `_components/care-recipient-shell.tsx` (step indicator, title, Back/Next/Save buttons)

**Step 1 — Relationship**
Single-select cards from `RELATIONSHIP_TYPES` constant:
Myself · Parent · Spouse · Grandparent · Sibling · Other family member

Selecting "Myself" auto-fills `name` and `phone` from the session user record and skips to step 4. All other selections proceed to step 2. The step shell supports non-linear navigation: `currentStep` is a state variable that can jump from 1 to 4 when "Myself" is selected, bypassing steps 2 and 3. The Back button from step 4 returns to step 1 when "Myself" was selected (not step 3).

**Step 2 — Basic Info**
- Photo (optional) — click-to-browse → `POST /api/upload` → preview shown
- Name (text, required)
- Date of Birth (`MM/DD/YYYY` text input)
- Phone (tel input)
- Gender (single-select cards from `GENDER_OPTIONS` constant)

**Step 3 — Health & Mobility**
- Conditions: multi-select checkboxes from `CONDITIONS` constant (12 options + Other)
- Mobility Level: single-select cards from `MOBILITY_LEVELS` constant (4 options)

**Step 4 — Notes**
Textarea, max 500 chars with character counter. "Save Recipient" button calls `createCareRecipient(data)`.

On save:
- Inserts to `careRecipients`
- Modal closes
- `router.refresh()`
- Toast: "Recipient added"

---

## Care Request Modal (6 Steps)

Single Client Component: `_components/care-request-modal.tsx`
Shared shell: `_components/care-request-shell.tsx` (step indicator, title, Back/Next/Submit buttons)

**Step 1 — Care Type**
Single-select cards from `CARE_TYPES` constant (5 options).

**Step 2 — Select Recipient**
Cards showing all existing care recipients (name, relationship, photo/initials). Plus an "Add New Recipient" card that opens `CareRecipientModal` inline — on save, the new recipient is auto-selected and step advances. Required.

**Step 3 — Address**
Auto-fills from the selected recipient's `address` jsonb field on step entry. Editable:
- Address Line 1 (required)
- Address Line 2 (optional)
- City (required)
- State (dropdown from `US_STATES`)
- Country (locked: "United States")

**Step 4 — Schedule**
- Frequency: single-select cards (`CARE_FREQUENCIES` constant)
- Days: multi-select day cards (Mon–Sun)
- Time of Day: multi-select shift cards (`SHIFTS` constant)
- Start Date: `<input type="date">`
- Duration: single-select cards (`CARE_DURATIONS` constant)

**Step 5 — Preferences**
- Gender Preference: single-select cards (`GENDER_PREFS` constant: Male · Female · No preference)
- Languages: multi-select cards (`LANGUAGES` constant)
- Budget Type: single-select cards (`BUDGET_TYPES` constant)
- Budget Amount: number input, revealed after budget type is selected. Dollar prefix.

**Step 6 — AI Generation**
"Generate with AI" button (primary, prominent). On click:
- Calls `POST /api/care-request/generate` with the form state JSON
- `useCompletion` hook from `ai/react` consumes the stream
- Typewriter effect populates Title input and Description textarea as text arrives
- Client parses `TITLE: ...\nDESCRIPTION: ...` format after stream completes
- Both fields are fully editable after generation
- "Regenerate" button replaces "Generate with AI" once generated

"Submit Request" button enabled when `title.trim().length > 0 && description.trim().length > 0`. Calls `createCareRequest(data)`.

On submit:
- Inserts to `careRequests` (status: `'active'`)
- Inserts to `careRequestLocations`
- Modal closes
- `router.refresh()`
- Toast: "Care request submitted — we're finding your matches"

---

## AI Generation Route Handler

**Route:** `POST /api/care-request/generate`

```typescript
// app/api/care-request/generate/route.ts
import { auth } from '@/auth'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  const body = await req.json()
  // body contains: careType, recipientName, conditions, mobility,
  //               frequency, days, shifts, duration, languages, budgetType, budgetAmount

  const prompt = buildPrompt(body)

  const result = streamText({
    model: openai('gpt-4o'),
    prompt,
    system: `You are writing a care request posting for a home care platform.
Output exactly two lines:
TITLE: <one sentence, max 100 characters>
DESCRIPTION: <2-3 sentences describing the care needed, max 500 characters>
Be warm, specific, and professional.`,
  })

  return result.toDataStreamResponse()
}

function buildPrompt(data: CareRequestGenerateInput): string {
  return `Care type: ${data.careType}
Recipient: ${data.recipientName}
Conditions: ${data.conditions.join(', ') || 'none listed'}
Mobility: ${data.mobility || 'not specified'}
Schedule: ${data.frequency}, ${data.days.join('/')} ${data.shifts.join('/')}
Duration: ${data.duration} hours
Language preference: ${data.languages.join(', ') || 'none'}
Budget: ${data.budgetType} ${data.budgetAmount ? `$${data.budgetAmount}` : ''}`
}
```

**Tests** (`__tests__/route.test.ts`):
- Returns 401 when no session
- Calls `streamText` with a prompt containing the care type and recipient name
- Returns a streaming response on success

---

## Server Actions

**File:** `domains/clients/requests.ts`

```typescript
'use server'

export async function createCareRecipient(data: {
  relationship: string
  name: string
  dob?: string
  phone?: string
  gender?: string
  photoUrl?: string
  conditions: string[]
  mobilityLevel?: string
  notes?: string
  address?: { address1?: string; address2?: string; city?: string; state?: string }
}): Promise<{ id: string }>

export async function createCareRequest(data: {
  recipientId: string
  careType: string
  address: { address1: string; address2?: string; city: string; state: string }
  frequency: string
  days: string[]
  shifts: string[]
  startDate: string
  durationHours: number
  genderPref?: string
  languagePref: string[]
  budgetType?: string
  budgetAmount?: string
  title: string
  description: string
}): Promise<{ id: string }>
```

Both actions:
1. Call `auth()` — throw `Error('Unauthorized')` if no session
2. Perform DB insert
3. Return the new record's id

`createCareRequest` inserts to `careRequests` (status: `'active'`) then `careRequestLocations` sequentially.

---

## Unit Tests

**`domains/clients/__tests__/requests.test.ts`** (TDD, Vitest):

`createCareRecipient`:
- throws Unauthorized with no session
- inserts to careRecipients with correct fields
- returns the new record id

`createCareRequest`:
- throws Unauthorized with no session
- inserts to careRequests with status 'active'
- inserts to careRequestLocations
- returns the new request id

**`app/api/care-request/generate/__tests__/route.test.ts`**:
- returns 401 with no session
- calls streamText with prompt containing careType
- returns streaming response on success

---

## Out of Scope for Phase 4

- AI-powered caregiver matching (Phase 5)
- "Top Matches" overlay after submission (Phase 5)
- Care recipient editing from the dashboard (Phase 6)
- Geocoding lat/lng from address (Phase 5 — proximity search)
- Find Caregivers full implementation (Phase 5/6)
- Care Plans editing (Phase 8)
- Calendar (Phase 8)
- Real-time notifications (Phase 7)
- Mobile responsive layout
