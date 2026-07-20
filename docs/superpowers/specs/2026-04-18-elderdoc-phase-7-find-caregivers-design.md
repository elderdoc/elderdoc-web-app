# ElderDoc Phase 7: Find Caregivers — Design Specification
**Date:** 2026-04-18
**Status:** Approved

---

## 1. Goal

Replace the `/client/dashboard/find-caregivers` stub with a two-section page: AI-ranked matches for a selected care request (from the existing `matches` table), and a full filterable directory of active caregivers. Clients can send offers to any caregiver by picking an active care request.

---

## 2. Architecture

The page is a Next.js Server Component. Filters are carried as URL `searchParams` — no client state, no API round-trip for filter changes. A client-side `FilterForm` component submits filter changes by pushing a new URL, triggering a server re-render.

Two independent query functions live in `domains/clients/find-caregivers.ts` (plain async functions, not Server Actions):
- `getMatchesForRequest(requestId, clientId)` — reads existing `matches` rows for the selected request, verifies ownership
- `searchCaregivers(filters, page)` — filters active caregiver profiles with joins

The `SendOfferModal` client component handles the offer flow: lists the client's active care requests, client picks one, calls the existing `sendOffer` Server Action.

---

## 3. Page Layout

**Route:** `/client/dashboard/find-caregivers`

```
┌─────────────────────────────────────────────┐
│  Find Caregivers                            │
│  ─────────────────────────────────────────  │
│  YOUR MATCHES                               │
│  [Request dropdown ▾]                       │
│  [ caregiver card ] [ caregiver card ] ...  │
│  ─────────────────────────────────────────  │
│  BROWSE ALL CAREGIVERS                      │
│  [Filter sidebar / bar]                     │
│  [ caregiver card ] [ caregiver card ] ...  │
│  [ < 1 2 3 > ]                              │
└─────────────────────────────────────────────┘
```

---

## 4. Your Matches Section

The client selects one of their active care requests from a `<select>` dropdown (rendered inside `FilterForm`, drives URL param `?requestId=`).

**Query:** `getMatchesForRequest(requestId, clientId)`
- SELECT from `matches` JOIN `caregiverProfiles` JOIN `users` JOIN `caregiverLocations` JOIN `caregiverCareTypes`
- WHERE `matches.requestId = requestId` AND `careRequests.clientId = clientId` (ownership check)
- ORDER BY `matches.score DESC`
- Returns up to 5 rows (AI already capped at 5)

**Card layout per match:**
- Avatar (image or initials)
- Name, city/state, headline
- Care type tags
- Hourly rate range (`$min–$max/hr`)
- Score badge: ≥80 "Strong match" · ≥60 "Good match" · else "Possible match"
- Reason sentence (italic, muted)
- `<SendOfferModal>` button — pre-populated with `requestId` from the dropdown

**Empty states:**
- No active care requests: "Create a care request to see your AI matches."
- Request selected but no matches: "No matches yet. Matches appear after you submit a care request." (with a note that matches run automatically on submission)
- No request selected: prompt to pick one from the dropdown

---

## 5. Browse All Caregivers Section

**Filters (all optional, all URL params):**

| Param | Type | DB column |
|---|---|---|
| `careType` | single | `caregiverCareTypes.careType` |
| `state` | single | `caregiverLocations.state` |
| `rateMin` | number | `caregiverProfiles.hourlyMin` |
| `rateMax` | number | `caregiverProfiles.hourlyMax` |
| `language` | multi (repeated param) | `caregiverLanguages.language` |
| `certification` | multi (repeated param) | `caregiverCertifications.certification` |
| `experience` | single | `caregiverProfiles.experience` |
| `page` | number | offset |

**Query:** `searchCaregivers(filters, page)`
- SELECT from `caregiverProfiles` JOIN `users` LEFT JOIN `caregiverLocations` LEFT JOIN `caregiverCareTypes` LEFT JOIN `caregiverLanguages` LEFT JOIN `caregiverCertifications`
- WHERE `caregiverProfiles.status = 'active'`
- Apply each filter with `eq` / `gte` / `lte` / `inArray` as appropriate
- Use `sql`-level subquery existence checks for multi-value filters (languages, certifications): `EXISTS (SELECT 1 FROM caregiverLanguages WHERE caregiverId = caregiverProfiles.id AND language = ANY(?))`
- ORDER BY `caregiverProfiles.createdAt DESC`
- LIMIT 20, OFFSET (page - 1) * 20
- Returns `{ caregivers: CaregiverResult[], total: number }`

**Card layout per caregiver:**
- Avatar (image or initials)
- Name, city/state, headline
- Care type tags (from `caregiverCareTypes`)
- Hourly rate range
- Experience badge
- `<SendOfferModal>` button

**Pagination:** simple prev/next links updating `?page=`. Show total count ("42 caregivers found").

---

## 6. FilterForm Client Component

**File:** `app/(client)/client/dashboard/find-caregivers/_components/filter-form.tsx`

`'use client'`. Renders all filter inputs. On any change, calls `router.push` with updated search params (debounced 300ms for text/number inputs, immediate for selects and checkboxes).

Props:
```typescript
interface Props {
  activeRequests: { id: string; title: string | null; careType: string }[]
  currentFilters: {
    requestId?: string
    careType?: string
    state?: string
    rateMin?: string
    rateMax?: string
    language?: string[]
    certification?: string[]
    experience?: string
    page?: string
  }
}
```

Sections:
1. **Your Matches** — `<select>` for `requestId` (lists `activeRequests`)
2. **Browse Filters** — care type select, state select, rate min/max inputs, language checkboxes, certification checkboxes, experience select

Changing `requestId` resets `page` to 1. Changing any browse filter resets `page` to 1.

---

## 7. SendOfferModal Client Component

**File:** `app/(client)/client/dashboard/find-caregivers/_components/send-offer-modal.tsx`

`'use client'`. Per-caregiver button that opens a modal listing the client's active care requests.

```typescript
interface Props {
  caregiverId: string
  activeRequests: { id: string; title: string | null; careType: string }[]
}
```

States:
- `idle` — "Send Offer" button
- `open` — modal visible, request list shown
- `pending` — "Sending…" after user picks a request and clicks Confirm
- `sent` — "Offer Sent ✓" (disabled, green)
- `error` — inline error text

On Confirm:
- Calls `sendOffer(selectedRequestId, caregiverId, 0, 'Manually selected')`
- score = 0, reason = 'Manually selected' (distinguishes manual from AI-ranked offers)
- On success: close modal, set `sent = true`
- On error: show inline error inside modal

If `activeRequests` is empty: button renders as disabled with tooltip "Create a care request first."

Already-offered check: the page server query reads existing `matches` rows and passes a `Set<string>` of `caregiverIds` already offered to, so `SendOfferModal` can render as "Offer Sent ✓" immediately without a client-side round-trip.

---

## 8. Domain Query Functions

**File:** `domains/clients/find-caregivers.ts`

```typescript
export type MatchResult = {
  matchId: string
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

export type CaregiverResult = {
  caregiverId: string
  name: string | null
  image: string | null
  headline: string | null
  experience: string | null
  careTypes: string[]
  languages: string[]
  certifications: string[]
  city: string | null
  state: string | null
  hourlyMin: string | null
  hourlyMax: string | null
}

export type SearchFilters = {
  careType?: string
  state?: string
  rateMin?: string
  rateMax?: string
  language?: string[]
  certification?: string[]
  experience?: string
}

export async function getMatchesForRequest(
  requestId: string,
  clientId: string,
): Promise<MatchResult[]>

export async function searchCaregivers(
  filters: SearchFilters,
  page: number,
): Promise<{ caregivers: CaregiverResult[]; total: number }>
```

Both functions are plain async functions (not Server Actions) — called directly from the Server Component page.

---

## 9. Page Server Component

**File:** `app/(client)/client/dashboard/find-caregivers/page.tsx`

```typescript
export default async function FindCaregiversPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
})
```

1. `requireRole('client')` — redirect if not client
2. Load client's active care requests (for dropdown + offer modal)
3. Load existing offered caregiverIds (from `matches` WHERE `careRequests.clientId = userId`) for "already offered" state
4. If `requestId` param present and owned by client: call `getMatchesForRequest`
5. Call `searchCaregivers` with remaining filters + page
6. Render `FilterForm` + matches section + directory section

---

## 10. Testing

**File:** `domains/clients/__tests__/find-caregivers.test.ts`

Uses `vi.hoisted()` mock pattern (same as other domain tests).

Test cases for `getMatchesForRequest`:
- Returns `[]` when requestId not owned by clientId
- Returns matches sorted by score descending
- Joins name, image, headline, careTypes onto results

Test cases for `searchCaregivers`:
- Returns all active caregivers when no filters applied
- Filters by careType
- Filters by state
- Filters by rateMin / rateMax
- Filters by language (multi-value)
- Filters by certification (multi-value)
- Filters by experience
- Respects page offset (limit 20)
- Returns correct total count

---

## 11. File Map

| File | Action |
|---|---|
| `app/(client)/client/dashboard/find-caregivers/page.tsx` | Modify (replace stub) |
| `app/(client)/client/dashboard/find-caregivers/_components/filter-form.tsx` | Create |
| `app/(client)/client/dashboard/find-caregivers/_components/send-offer-modal.tsx` | Create |
| `domains/clients/find-caregivers.ts` | Create |
| `domains/clients/__tests__/find-caregivers.test.ts` | Create |

No DB migrations required.
