# Elderdoc Admin — Foundation & People Management Design

## Goal

Create a standalone Next.js 16 admin application at `elderdoc/elderdoc-admin` that shares the existing database schema via a `@elderdoc/db` workspace package. Sub-project 1 covers: monorepo setup, folder restructure, admin auth, layout, and all people-management views (Users, Caregivers, Clients, Care Recipients). Later sub-projects cover Operations, Finance, Calendar, and Activity.

## Architecture

### Monorepo structure

The current `elderdoc/` folder is renamed to `elderdoc-app/` and moved inside a new `elderdoc/` parent directory. A shared `packages/db` workspace package is extracted from `elderdoc-app/db/`. A new `elderdoc-admin/` app is created alongside `elderdoc-app/`.

```
elderdoc/                          ← new git root
├── package.json                   ← Bun workspace root
│                                     workspaces: ["elderdoc-app", "elderdoc-admin", "packages/db"]
├── packages/
│   └── db/
│       ├── package.json           ← name: "@elderdoc/db"
│       ├── schema.ts              ← moved from elderdoc-app/db/schema.ts
│       ├── client.ts              ← Drizzle db client (exports `db`)
│       └── migrations/            ← moved from elderdoc-app/db/migrations/
├── elderdoc-app/                  ← current app
│   ├── package.json               ← "@elderdoc/db": "workspace:*" added
│   └── ...
└── elderdoc-admin/                ← new admin app
    ├── package.json               ← "@elderdoc/db": "workspace:*"
    └── ...
```

Both apps share the same `DATABASE_URL` environment variable. No API calls between apps — both query the database directly via Drizzle.

### Database changes

Add `suspendedAt` (timestamp, nullable) and `'admin'` role to the `users` table in `@elderdoc/db/schema.ts`. This is a non-breaking change — existing rows have `suspendedAt = null` and role stays `'client'` or `'caregiver'`.

```ts
role: text('role').notNull().default('client'),  // now accepts 'admin' too
suspendedAt: timestamp('suspended_at'),
```

A new Drizzle migration is generated and committed to `packages/db/migrations/`.

### Admin app tech stack

- Next.js 16 (latest stable), App Router, TypeScript
- Drizzle ORM via `@elderdoc/db`
- NextAuth v5 with credentials provider
- Tailwind CSS v4, same CSS variable palette as elderdoc-app
- No additional UI library — all components hand-rolled

## Authentication

NextAuth v5 credentials provider. On login, checks `users` table for matching email + bcrypt password where `role = 'admin'` and `suspendedAt IS NULL`. Session stores `{ id, name, email, role }`.

A Next.js middleware file protects all routes: any request without a valid session redirects to `/login`. The only public route is `/login`.

Admin users are seeded manually (no self-registration).

## Layout

Two-panel layout: fixed left sidebar (240px) + scrollable main content area. No top navbar.

**Sidebar:**
- Elderdoc logo / wordmark at top
- Grouped navigation links with Lucide icons (see Navigation section)
- Active link: solid `--forest` left border + `--forest-soft` background
- Bottom: admin name + email chip, sign-out button

**Main content:**
- `px-8 py-7` padding
- Page title (`h1`, 24px semibold) + optional subtitle
- Content below

## Navigation

```
Overview

People
  Users
  Caregivers
  Clients
  Care Recipients

Operations
  Care Requests
  Jobs
  Shifts

Finance
  Payments
  Disputes

Platform
  Calendar
  Activity
```

Sub-project 1 implements: Overview (partial), Users, Caregivers, Clients, Care Recipients.
Remaining sections are stubbed with "Coming soon" placeholders.

## UI Design Patterns

### DataList rows (no generic tables)

All list views use a `<DataList>` pattern: a `<ul>` of 48px-height flex rows. Column widths are fixed percentages via Tailwind `w-[X%]` classes. No `<table>`, no shadcn DataTable.

- Default row: white background, `border-b border-border`
- Hover: thin 2px left border in `--forest`, `--forest-soft/30` background
- Text sizes: primary value 13.5px semibold, secondary values 12px muted

### Status filters (no dropdowns)

Inline pill group: horizontal row of text labels. Active pill: `bg-primary text-primary-foreground rounded-full px-3 py-1`. Inactive: `border border-border rounded-full px-3 py-1 text-muted-foreground`. No `<select>`.

### Row actions (no dropdown menus)

At far right of each row: text links separated by `·` — e.g. `Edit · Suspend · Delete`. Destructive actions are `text-destructive`. Reversible-but-notable actions (Suspend) are `text-amber-600`.

### Confirmation modals

Custom modal, not shadcn AlertDialog. Centered, max-width 420px, rounded-2xl, shadow. Structure:
1. Title (16px semibold) — names the action: "Delete Margaret Johnson"
2. Body (14px) — one sentence describing exactly what happens and any cascades
3. Footer — "Cancel" (outline button, left) + action verb (filled button, right)
   - Destructive actions: red filled button
   - Reversible actions (Suspend): amber filled button
   - Safe mutations (Approve): primary green filled button

All CRUD mutations and status changes go through this modal. No silent state changes.

### Suspended badge

`bg-destructive/10 text-destructive border border-destructive/20 rounded-full px-2 py-0.5 text-[11px] font-medium` — shown inline in the name column of any list row.

### Stat tiles (no charts)

Large number (32px black), label below (12px muted), optional secondary value in smaller muted text (e.g. "↑ 12 this week"). No bar charts, no sparklines, no pie charts.

## Pages — Sub-project 1

### `/` — Overview

6 stat tiles in a horizontal row:
1. Total users (count of all users)
2. Active caregivers (caregiverProfiles where status = 'active')
3. Open care requests (careRequests where status = 'active')
4. Active jobs (jobs where status = 'active')
5. Platform fees collected (sum of payments.fee where status = 'completed')
6. Open disputes (disputes where status = 'open')

Below: recent activity feed — last 20 rows from `notifications` table, newest first. Each row: icon, event description, timestamp relative (e.g. "2 hours ago").

### `/users` — All Users

**List view:**
- Inline filter: All / Clients / Caregivers / Admins / Suspended
- Search input (filters by name or email, client-side on loaded data)
- Columns: Name (+ Suspended badge if applicable) | Email | Role | Joined

**Row actions:** Edit · Suspend (or Unsuspend) · Delete

**Edit panel:** Right-side slide-in panel (not a new page). Fields: name, email, phone, role (pill segmented control: Client / Caregiver / Admin — no `<select>`). Save button triggers confirmation modal: "Update [Name]'s account?"

**Suspend flow:**
- Confirmation modal: "Suspend [Name]? They will immediately lose access to elderdoc until unsuspended." Amber button.
- Sets `users.suspendedAt = now()`

**Unsuspend flow:**
- Confirmation modal: "Restore access for [Name]?" Green button.
- Sets `users.suspendedAt = null`

**Delete flow:**
- Confirmation modal with cascade warning. Red button.
- Hard delete from `users` table (cascades via DB foreign keys)

### `/caregivers` — Caregiver Profiles

**List view:**
- Inline filter: Pending / Active / Inactive / Suspended
- Columns: Name | Care types | Certifications | Rate range | Location | Status | Applied

**Row actions:** View · Approve (pending only) · Suspend · Delete

**Detail page** (`/caregivers/[id]`): Full read-only profile display — all `caregiverProfiles` fields, certifications, languages, care types, work preferences, location. Edit button opens edit panel with all editable fields.

**Approve flow:**
- Confirmation modal: "Approve [Name] as an active caregiver? They will be visible to clients and eligible for matches." Green button.
- Sets `caregiverProfiles.status = 'active'`

### `/clients` — Client Profiles

**List view:**
- Columns: Name | Email | Recipients | Active requests | Active jobs | Joined

**Row actions:** View · Suspend · Delete

**Detail page** (`/clients/[id]`): Shows user info + list of their care recipients + list of their care requests (status badges) + payment summary (total paid).

### `/recipients` — Care Recipients

**List view:**
- Columns: Name | Client | Relationship | Conditions (first 2 + count) | Mobility | Created

**Row actions:** Edit · Delete

**Edit panel:** All care recipient fields — name, dob, phone, gender, conditions (multi-select), mobility level, notes.

**Delete flow:**
- Confirmation modal: "Delete [Name]? This will remove them from all associated care requests." Red button.

## Error handling

All server actions return `{ success: boolean, error?: string }`. Errors surface as an inline red message below the form or modal. No unhandled promise rejections — all mutations are wrapped in try/catch.

## File structure — elderdoc-admin

```
elderdoc-admin/
├── app/
│   ├── layout.tsx                 ← root layout (font, globals)
│   ├── login/
│   │   └── page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx             ← sidebar + main content wrapper
│   │   ├── page.tsx               ← overview
│   │   ├── users/
│   │   │   └── page.tsx
│   │   ├── caregivers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── recipients/
│   │   │   └── page.tsx
│   │   └── (stubs)/               ← operations, finance, platform
│   │       └── ...
├── components/
│   ├── data-list.tsx              ← DataList + DataRow primitives
│   ├── status-filter.tsx          ← pill group filter
│   ├── confirm-modal.tsx          ← reusable confirmation modal
│   ├── edit-panel.tsx             ← right-side slide-in panel
│   └── sidebar.tsx
├── domains/
│   ├── users.ts                   ← admin queries + actions for users
│   ├── caregivers.ts
│   ├── clients.ts
│   └── recipients.ts
├── lib/
│   └── auth.ts                    ← NextAuth config
├── middleware.ts                  ← session guard
└── package.json
```
