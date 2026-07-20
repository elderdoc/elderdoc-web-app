# ElderDoc Phase 5: Caregiver Dashboard — Design Specification
**Date:** 2026-04-18
**Status:** Approved

---

## 1. Goal

Build the full caregiver dashboard experience: sidebar layout, home stats, Find Jobs (browse + apply), Offers (accept/decline AI matches), My Jobs, and Shifts. Care Plans, Payouts, Calendar, and Messages remain stubs.

---

## 2. Architecture

All pages are async Server Components querying Drizzle directly — no loading states, no API round-trips for reads. The caregiver's `userId` comes from `requireRole('caregiver')` at the layout level.

Mutations (apply, accept, decline) are Server Actions in `domains/caregivers/actions.ts`, called from Client Components using `useTransition`. This mirrors the Phase 4 client dashboard pattern exactly.

---

## 3. Pages & Scope

| Page | Status | Responsibility |
|---|---|---|
| Layout + Sidebar | Full | Auth guard, unread notification count, nav, user avatar, sign-out |
| Home (`/caregiver/dashboard`) | Full | Stats + recent activity feed |
| Find Jobs (`/find-jobs`) | Full | Browse active care requests, apply modal |
| Offers (`/offers`) | Full | Pending AI matches, accept / decline |
| My Jobs (`/my-jobs`) | Full | Active + completed jobs list |
| Shifts (`/shifts`) | Full | Upcoming scheduled shifts |
| Care Plans (`/care-plans`) | Stub | "Coming soon" placeholder |
| Payouts (`/payouts`) | Stub | "Coming soon" placeholder |
| Calendar (`/calendar`) | Stub | "Coming soon" placeholder |

---

## 4. Data Flow

### Layout
- `requireRole('caregiver')` — redirects if not authenticated or wrong role
- Queries unread notification count with `count()` aggregate (same as client layout)
- Computes initials from `session.user.name`
- Passes `userName`, `userInitials`, `userImage`, `unreadCount` to `<Sidebar />`

### Home
Single `Promise.all` with 5 queries:
1. Active jobs count — `jobs` where `caregiverId = userId` and `status = 'active'`
2. Upcoming shifts count — `shifts` joined to `jobs` where `caregiverId = userId` and shift `status = 'scheduled'`
3. Pending offers count — `matches` where `caregiverId = userId` and `status = 'pending'`
4. Recent applications — last 5 `jobApplications` where `caregiverId = userId`, joined to `careRequests` for title/careType
5. Recent shifts — last 5 `shifts` joined to `jobs` where `caregiverId = userId`, ordered by date

Merge recent applications + recent shifts into a single activity timeline, sort by `createdAt` descending, slice to 10.

### Find Jobs
- Queries `careRequests` where `status = 'active'`
- Excludes requests the caregiver already applied to: subquery on `jobApplications` where `caregiverId = userId`
- Excludes requests already matched: subquery on `matches` where `caregiverId = userId`
- Narrow select: `id`, `careType`, `frequency`, `durationHours`, `startDate`, `title`
- Joins `careRequestLocations` for `city`, `state`
- Passes results + `caregiverId` to page; Apply button opens `<ApplyModal />`

### Offers
- Queries `matches` where `caregiverId = userId` and `status = 'pending'`
- Joins `careRequests` for `title`, `careType`, `frequency`
- Joins `careRequestLocations` for `city`, `state`
- Narrow select only
- Renders `<OfferActions matchId={...} />` per offer card

### My Jobs
- Queries `jobs` where `caregiverId = userId`
- Joins `careRequests` for `title`, `careType`
- Joins `users` (client) for client name
- Orders by `createdAt` descending

### Shifts
- Queries `shifts` joined to `jobs` where `jobs.caregiverId = userId` and `shifts.status = 'scheduled'`
- Orders by `date` ascending
- Narrow select: `id`, `date`, `startTime`, `endTime`, `status`, job `title` via join

---

## 5. Server Actions (`domains/caregivers/actions.ts`)

```typescript
'use server'

applyToRequest(requestId: string, coverNote: string): Promise<void>
// - auth() check, throw if no session
// - inserts into jobApplications: { requestId, caregiverId: userId, coverNote, status: 'pending' }

acceptOffer(matchId: string): Promise<void>
// - auth() check
// - db.transaction:
//   1. fetch match to get requestId + caregiverId (verify caregiverId === userId)
//   2. fetch careRequest to get clientId
//   3. insert into jobs: { matchId, requestId, caregiverId, clientId, status: 'active' }
//   4. update matches set status = 'accepted' where id = matchId

declineOffer(matchId: string): Promise<void>
// - auth() check
// - update matches set status = 'declined' where id = matchId and caregiverId = userId
```

---

## 6. Client Components

### `sidebar.tsx`
- `'use client'` — uses `usePathname()` for active nav state
- Nav links: Home, Find Jobs, My Jobs, Shifts, Offers, Care Plans, Payouts, Calendar
- Home uses exact match (`pathname === '/caregiver/dashboard'`), others use `startsWith`
- Bell icon from `lucide-react` with unread count badge (same as client sidebar)
- User avatar (image or initials), name, sign-out button

### `apply-modal.tsx`
- `'use client'`
- Trigger: "Apply" button per job card on Find Jobs page
- Single `<textarea>` for cover note (required, max 500 chars)
- Calls `applyToRequest(requestId, coverNote)` via `useTransition`
- On success: closes modal, calls `router.refresh()`
- Character counter displayed below textarea

### `offer-actions.tsx`
- `'use client'`
- Props: `matchId: string`
- Two buttons: "Accept" (primary) and "Decline" (destructive/outline)
- Each wrapped in `useTransition` — shows pending state on the active button
- Accept calls `acceptOffer(matchId)` then `router.refresh()`
- Decline calls `declineOffer(matchId)` then `router.refresh()`

---

## 7. Testing

File: `domains/caregivers/__tests__/actions.test.ts`

Uses `vi.hoisted()` mock pattern (same as Phase 4).

Test cases:
- `applyToRequest`: throws if unauthorized, inserts correct fields, returns void
- `acceptOffer`: throws if unauthorized, runs transaction (inserts job + updates match), throws if match doesn't belong to user
- `declineOffer`: throws if unauthorized, updates match status to 'declined', scoped to userId (cannot decline another caregiver's match)

---

## 8. File Map

| File | Action |
|---|---|
| `domains/caregivers/actions.ts` | Create |
| `domains/caregivers/__tests__/actions.test.ts` | Create |
| `app/(caregiver)/caregiver/dashboard/layout.tsx` | Modify |
| `app/(caregiver)/caregiver/dashboard/_components/sidebar.tsx` | Create |
| `app/(caregiver)/caregiver/dashboard/page.tsx` | Modify |
| `app/(caregiver)/caregiver/dashboard/find-jobs/page.tsx` | Modify |
| `app/(caregiver)/caregiver/dashboard/_components/apply-modal.tsx` | Create |
| `app/(caregiver)/caregiver/dashboard/offers/page.tsx` | Modify |
| `app/(caregiver)/caregiver/dashboard/_components/offer-actions.tsx` | Create |
| `app/(caregiver)/caregiver/dashboard/my-jobs/page.tsx` | Modify |
| `app/(caregiver)/caregiver/dashboard/shifts/page.tsx` | Modify |
| `app/(caregiver)/caregiver/dashboard/care-plans/page.tsx` | Modify (stub) |
| `app/(caregiver)/caregiver/dashboard/payouts/page.tsx` | Modify (stub) |
| `app/(caregiver)/caregiver/dashboard/calendar/page.tsx` | Modify (stub) |
