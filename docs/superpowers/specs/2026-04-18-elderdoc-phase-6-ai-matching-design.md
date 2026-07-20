# ElderDoc Phase 6: AI Matching — Design Specification
**Date:** 2026-04-18
**Status:** Approved

---

## 1. Goal

Close the platform's core loop: after a client submits a care request, AI ranks matching caregivers and the client sends offers to their chosen matches. Caregivers see those offers in their dashboard Offers tab and can accept or decline.

---

## 2. Architecture

Three new units plus a modal addition:

| Unit | Type | Responsibility |
|---|---|---|
| `domains/matching/match-caregivers.ts` | Pure async function | Pre-filter candidates via Drizzle, rank via gpt-4o, return top 5 with display data |
| `domains/matching/send-offer.ts` | Server Action | Write one `matches` row; verify client owns the request |
| `app/api/care-request/match/route.ts` | POST Route Handler | Auth-check, call `matchCaregivers`, return JSON |
| Care request modal step 7 | Client Component modification | Matching loading state → "Your Top Matches" results |
| `send-offer-button.tsx` | Client Component | Per-card "Send Offer" button with `useTransition` pending state |

`matchCaregivers` is a plain async function — not a Server Action — so it can be called from the Route Handler and tested without Next.js context.

No new DB migrations required. The `matches` table already has `id`, `requestId`, `caregiverId`, `score`, `reason`, `status`.

---

## 3. Data Flow

```
createCareRequest() → { requestId }
  └─ POST /api/care-request/match { requestId }
       └─ matchCaregivers(requestId):
            1. SELECT careType, state from careRequests + careRequestLocations
            2. SELECT caregiverProfiles (active) with care type overlap + state match → up to 20 candidates
            3. SELECT certifications, languages, care types per candidate
            4. POST gpt-4o (JSON mode):
               system: rank candidates for a care request, return JSON only
               user:   request context + candidate list
               → { rankings: [{ caregiverId, score, reason }] }
            5. Slice to top 5, join display data (name, image, headline, rate, city/state)
            6. Return RankedCandidate[]
       └─ Route Handler returns JSON
  └─ Modal renders 5 caregiver cards
       └─ "Send Offer" per card
            └─ sendOffer(requestId, caregiverId, score, reason)
                 → verify session.user.id owns the careRequest
                 → INSERT INTO matches { requestId, caregiverId, score, reason, status: 'pending' }
                 → caregiver sees offer in their Offers tab
```

---

## 4. matchCaregivers

**File:** `domains/matching/match-caregivers.ts`

```typescript
export type RankedCandidate = {
  caregiverId: string
  score: number
  reason: string
  name: string | null
  image: string | null
  headline: string | null
  careTypes: string[]
  city: string | null
  state: string | null
  hourlyMin: string | null
  hourlyMax: string | null
}

export async function matchCaregivers(requestId: string): Promise<RankedCandidate[]>
```

**Algorithm:**

1. Fetch request: `careType`, `conditions`, `frequency`, `days`, `shifts`, `durationHours`, `languagePref`, `budgetAmount`, `budgetType`, `title`, `description` from `careRequests`. Fetch `state` from `careRequestLocations`.

2. Pre-filter candidates (Drizzle, up to 20):
   - `caregiverProfiles.status = 'active'`
   - At least one `caregiverCareTypes.careType` matching the request's `careType`
   - `caregiverLocations.state` matching the request's `state` (skip state filter if request has no state)

3. Fetch candidate context:
   - `caregiverCertifications` for each candidate
   - `caregiverLanguages` for each candidate
   - `caregiverCareTypes` for each candidate
   - `users` (name, image) for each candidate

4. Build OpenAI prompt — see Section 6.

5. Call `getOpenAI().chat.completions.create({ model: 'gpt-4o', response_format: { type: 'json_object' }, ... })`.

6. Parse `{ rankings: [{ caregiverId, score, reason }] }`. On parse failure or empty rankings, return `[]`.

7. Take top 5 by score (descending). Join display data. Return.

**If pre-filter yields 0 candidates:** skip OpenAI, return `[]`.

---

## 5. Route Handler

**File:** `app/api/care-request/match/route.ts`

```typescript
export async function POST(req: Request): Promise<Response>
// - auth() check → 401 if no session
// - body: { requestId: string }
// - calls matchCaregivers(requestId)
// - returns Response.json(candidates)
// - on any error: returns Response.json([], { status: 200 }) — never 500 to the client
```

The client always gets a valid JSON array. Errors are logged server-side only.

---

## 6. OpenAI Prompt

**System:**
```
You are a care coordinator matching caregivers to a care request.
Rank the provided candidates by fit. Return valid JSON only — no prose, no markdown.
Schema: { "rankings": [{ "caregiverId": string, "score": number (0-100), "reason": string (one warm sentence) }] }
Include all candidates. Highest score = best fit.
```

**User (assembled from request + candidate data):**
```
CARE REQUEST
Type: {careType}
Schedule: {frequency}, {days}, {shifts}
Duration: {durationHours}h/visit
Language preference: {languagePref}
Budget: {budgetType} {budgetAmount}
Notes: {title}. {description}

CANDIDATES
[{ id, careTypes, certifications, languages, experience, hourlyMin, hourlyMax }]
```

---

## 7. sendOffer Server Action

**File:** `domains/matching/send-offer.ts`

```typescript
'use server'

export async function sendOffer(
  requestId: string,
  caregiverId: string,
  score: number,
  reason: string
): Promise<void>
// - auth() check → throw 'Unauthorized'
// - SELECT careRequests where id = requestId and clientId = session.user.id → throw 'Unauthorized' if not found
// - INSERT INTO matches { requestId, caregiverId, score, reason, status: 'pending' }
```

No idempotency guard needed at this stage — the UI disables the button after send.

---

## 8. Care Request Modal — Step 7 (Matching State)

**File:** `app/(client)/client/dashboard/_components/care-request-modal.tsx` (modify)

After `createCareRequest()` resolves in step 6, the modal transitions to `step === 7`:

**Step 7 states:**
- `matching` — spinner + "Finding your best matches…"
- `results` — 5 caregiver cards (or empty state if 0 returned)
- `error` — fallback message if fetch itself fails

**Card layout (per candidate):**
- Avatar (image or initials)
- Name, city/state, headline
- Care type tags
- Hourly rate range
- Score badge: ≥80 "Strong match" · ≥60 "Good match" · else "Possible match"
- Reason sentence (italic, muted)
- `<SendOfferButton>` (see Section 9)

**Empty state:** "No matches found right now. Your request is live — caregivers can still apply directly."

**Close button:** always visible; closes modal and calls `router.refresh()`.

---

## 9. SendOfferButton Client Component

**File:** `app/(client)/client/dashboard/_components/send-offer-button.tsx`

```typescript
'use client'

interface Props {
  requestId: string
  caregiverId: string
  score: number
  reason: string
}
```

- `useTransition` for pending state
- On click: calls `sendOffer(requestId, caregiverId, score, reason)`
- On success: button changes to "Offer Sent ✓" (disabled, success style)
- On error: shows inline error text below button
- Tracks sent state in local `useState` — no re-render of parent needed

---

## 10. Testing

### `domains/matching/__tests__/match-caregivers.test.ts`

Uses `vi.hoisted()` mock pattern.

Test cases:
- Returns `[]` when no candidates match pre-filter
- Skips OpenAI when candidate list is empty
- Calls OpenAI with request context and candidate list
- Returns top 5 sorted by score descending
- Returns `[]` when OpenAI returns malformed JSON
- Returns `[]` when OpenAI returns empty rankings array
- Joins display data (name, image, headline) onto returned candidates

### `domains/matching/__tests__/send-offer.test.ts`

Test cases:
- Throws `Unauthorized` when no session
- Throws `Unauthorized` when clientId does not match session user
- Inserts correct fields into matches (requestId, caregiverId, score, reason, status: 'pending')

---

## 11. File Map

| File | Action |
|---|---|
| `domains/matching/match-caregivers.ts` | Create |
| `domains/matching/send-offer.ts` | Create |
| `domains/matching/__tests__/match-caregivers.test.ts` | Create |
| `domains/matching/__tests__/send-offer.test.ts` | Create |
| `app/api/care-request/match/route.ts` | Create |
| `app/(client)/client/dashboard/_components/care-request-modal.tsx` | Modify |
| `app/(client)/client/dashboard/_components/send-offer-button.tsx` | Create |
