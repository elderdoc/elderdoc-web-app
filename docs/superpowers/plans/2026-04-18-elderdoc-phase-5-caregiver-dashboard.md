# ElderDoc Phase 5: Caregiver Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full caregiver dashboard — sidebar layout, home stats, Find Jobs (browse + apply), Offers (accept/decline AI matches), My Jobs, and Shifts; stub out Care Plans, Payouts, and Calendar.

**Architecture:** All pages are async Server Components querying Drizzle directly. The caregiver's profile id is resolved per-page via `caregiverProfiles.userId`. Mutations (apply, accept, decline) are `'use server'` actions called from Client Components with `useTransition`. Pattern mirrors the Phase 4 client dashboard exactly. Work directly on `main` — no feature branch.

**Tech Stack:** Next.js 16 App Router · TypeScript · Drizzle ORM (PostgreSQL) · NextAuth v5 · Tailwind v4 · lucide-react · date-fns · Vitest

---

## ⚠️ Critical: caregiverId is caregiverProfiles.id, NOT users.id

`matches.caregiverId`, `jobApplications.caregiverId`, and `jobs.caregiverId` all reference `caregiverProfiles.id` — not `users.id`. Every page and action must first look up `caregiverProfiles` by `userId` to get the profile `id`.

```typescript
const profile = await db.query.caregiverProfiles.findFirst({
  where: eq(caregiverProfiles.userId, session.user.id!),
})
```

---

## File Map

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

---

## Task 1: Server Actions (TDD)

**Files:**
- Create: `domains/caregivers/__tests__/actions.test.ts`
- Create: `domains/caregivers/actions.ts`

- [ ] **Step 1: Write the failing tests**

Create `domains/caregivers/__tests__/actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

const { mockSelectChain, mockMutateChain, mockDb, mockTx } = vi.hoisted(() => {
  const mockSelectChain = {
    from:      vi.fn(),
    where:     vi.fn(),
    innerJoin: vi.fn(),
  }
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockResolvedValue([])

  const mockMutateChain = {
    values:    vi.fn(),
    returning: vi.fn(),
    set:       vi.fn(),
    where:     vi.fn(),
  }
  mockMutateChain.values.mockReturnValue(mockMutateChain)
  mockMutateChain.returning.mockResolvedValue([{ id: 'new-id' }])
  mockMutateChain.set.mockReturnValue(mockMutateChain)
  mockMutateChain.where.mockResolvedValue(undefined)

  const mockTx = {
    insert: vi.fn().mockReturnValue(mockMutateChain),
    update: vi.fn().mockReturnValue(mockMutateChain),
    select: vi.fn().mockReturnValue(mockSelectChain),
  }

  const mockDb = {
    insert:      vi.fn().mockReturnValue(mockMutateChain),
    update:      vi.fn().mockReturnValue(mockMutateChain),
    select:      vi.fn().mockReturnValue(mockSelectChain),
    transaction: vi.fn().mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    query: {
      caregiverProfiles: { findFirst: vi.fn() },
    },
  }
  return { mockSelectChain, mockMutateChain, mockDb, mockTx }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { auth } from '@/auth'
import { applyToRequest, acceptOffer, declineOffer } from '../actions'

const mockAuth = vi.mocked(auth)
const SESSION = { user: { id: 'user-1', email: 'a@b.com', name: 'Test', role: 'caregiver' } }
const PROFILE = { id: 'profile-1', userId: 'user-1' }

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockResolvedValue([])
  mockMutateChain.values.mockReturnValue(mockMutateChain)
  mockMutateChain.returning.mockResolvedValue([{ id: 'new-id' }])
  mockMutateChain.set.mockReturnValue(mockMutateChain)
  mockMutateChain.where.mockResolvedValue(undefined)
  mockDb.insert.mockReturnValue(mockMutateChain)
  mockDb.update.mockReturnValue(mockMutateChain)
  mockDb.select.mockReturnValue(mockSelectChain)
  mockTx.insert.mockReturnValue(mockMutateChain)
  mockTx.update.mockReturnValue(mockMutateChain)
  mockTx.select.mockReturnValue(mockSelectChain)
  mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx))
})

describe('applyToRequest', () => {
  it('throws Unauthorized with no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(applyToRequest('req-1', 'note')).rejects.toThrow('Unauthorized')
  })

  it('throws if profile not found', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(null)
    await expect(applyToRequest('req-1', 'note')).rejects.toThrow('Profile not found')
  })

  it('inserts to jobApplications with correct fields', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(PROFILE)
    await applyToRequest('req-1', 'I am available weekends')
    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockMutateChain.values).toHaveBeenCalledWith(expect.objectContaining({
      requestId:   'req-1',
      caregiverId: 'profile-1',
      coverNote:   'I am available weekends',
      status:      'pending',
    }))
  })
})

describe('acceptOffer', () => {
  it('throws Unauthorized with no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(acceptOffer('match-1')).rejects.toThrow('Unauthorized')
  })

  it('runs transaction: inserts job and updates match to accepted', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(PROFILE)
    mockSelectChain.where
      .mockResolvedValueOnce([{ requestId: 'req-1', caregiverId: 'profile-1' }])
      .mockResolvedValueOnce([{ clientId: 'client-1' }])
    await acceptOffer('match-1')
    expect(mockTx.insert).toHaveBeenCalled()
    expect(mockMutateChain.values).toHaveBeenCalledWith(expect.objectContaining({
      matchId:     'match-1',
      requestId:   'req-1',
      caregiverId: 'profile-1',
      clientId:    'client-1',
      status:      'active',
    }))
    expect(mockTx.update).toHaveBeenCalled()
    expect(mockMutateChain.set).toHaveBeenCalledWith({ status: 'accepted' })
  })

  it('throws Unauthorized if match belongs to another caregiver', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(PROFILE)
    mockSelectChain.where
      .mockResolvedValueOnce([{ requestId: 'req-1', caregiverId: 'other-profile' }])
    await expect(acceptOffer('match-1')).rejects.toThrow('Unauthorized')
  })
})

describe('declineOffer', () => {
  it('throws Unauthorized with no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(declineOffer('match-1')).rejects.toThrow('Unauthorized')
  })

  it('updates match status to declined', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(PROFILE)
    await declineOffer('match-1')
    expect(mockDb.update).toHaveBeenCalled()
    expect(mockMutateChain.set).toHaveBeenCalledWith({ status: 'declined' })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run domains/caregivers/__tests__/actions.test.ts
```

Expected: FAIL — `actions` module not found.

- [ ] **Step 3: Implement the server actions**

Create `domains/caregivers/actions.ts`:

```typescript
'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { eq, and } from 'drizzle-orm'
import { caregiverProfiles, jobApplications, matches, careRequests, jobs } from '@/db/schema'

async function getProfile(userId: string) {
  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })
  if (!profile) throw new Error('Profile not found')
  return profile
}

export async function applyToRequest(requestId: string, coverNote: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const profile = await getProfile(session.user.id)
  await db.insert(jobApplications).values({
    requestId,
    caregiverId: profile.id,
    coverNote,
    status: 'pending',
  })
}

export async function acceptOffer(matchId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const profile = await getProfile(session.user.id)

  await db.transaction(async (tx) => {
    const [match] = await tx
      .select({ requestId: matches.requestId, caregiverId: matches.caregiverId })
      .from(matches)
      .where(eq(matches.id, matchId))

    if (!match || match.caregiverId !== profile.id) throw new Error('Unauthorized')

    const [request] = await tx
      .select({ clientId: careRequests.clientId })
      .from(careRequests)
      .where(eq(careRequests.id, match.requestId))

    await tx.insert(jobs).values({
      matchId,
      requestId:   match.requestId,
      caregiverId: profile.id,
      clientId:    request.clientId,
      status:      'active',
    })

    await tx.update(matches).set({ status: 'accepted' }).where(eq(matches.id, matchId))
  })
}

export async function declineOffer(matchId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const profile = await getProfile(session.user.id)
  await db.update(matches).set({ status: 'declined' }).where(
    and(eq(matches.id, matchId), eq(matches.caregiverId, profile.id))
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run domains/caregivers/__tests__/actions.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add domains/caregivers/actions.ts "domains/caregivers/__tests__/actions.test.ts"
git commit -m "feat: add caregiver server actions (apply, accept, decline)"
```

---

## Task 2: Dashboard Layout & Sidebar

**Files:**
- Create: `app/(caregiver)/caregiver/dashboard/_components/sidebar.tsx`
- Modify: `app/(caregiver)/caregiver/dashboard/layout.tsx`

- [ ] **Step 1: Create the sidebar Client Component**

Create `app/(caregiver)/caregiver/dashboard/_components/sidebar.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Bell } from 'lucide-react'

const NAV_LINKS = [
  { href: '/caregiver/dashboard',            label: 'Home' },
  { href: '/caregiver/dashboard/find-jobs',  label: 'Find Jobs' },
  { href: '/caregiver/dashboard/offers',     label: 'Offers' },
  { href: '/caregiver/dashboard/my-jobs',    label: 'My Jobs' },
  { href: '/caregiver/dashboard/shifts',     label: 'Shifts' },
  { href: '/caregiver/dashboard/care-plans', label: 'Care Plans' },
  { href: '/caregiver/dashboard/payouts',    label: 'Payouts' },
  { href: '/caregiver/dashboard/calendar',   label: 'Calendar' },
]

interface SidebarProps {
  userName: string | null
  userInitials: string
  userImage: string | null
  unreadCount: number
}

export function Sidebar({ userName, userInitials, userImage, unreadCount }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="px-6 py-5">
        <span className="text-xl font-bold tracking-tight text-foreground">ElderDoc</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_LINKS.map((link) => {
          const isActive = link.href === '/caregiver/dashboard'
            ? pathname === link.href
            : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              ].join(' ')}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border px-4 py-4 space-y-3">
        <Link
          href="/caregiver/dashboard/notifications"
          className="relative flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {userImage ? (
              <img src={userImage} alt={userName ?? 'User avatar'} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {userInitials}
              </span>
            )}
            <span className="truncate text-sm font-medium">{userName ?? 'User'}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/sign-in' })}
            className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Replace the layout stub**

Replace the entire contents of `app/(caregiver)/caregiver/dashboard/layout.tsx`:

```typescript
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { notifications } from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { Sidebar } from './_components/sidebar'

export default async function CaregiverDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const [unreadRow] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))

  const unreadCount = Number(unreadRow?.value ?? 0)

  const name = session.user.name ?? null
  const image = session.user.image ?? null
  const initials = name
    ? name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={name}
        userInitials={initials}
        userImage={image}
        unreadCount={unreadCount}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "rate-defaults"
```

Expected: no errors (the rate-defaults error is pre-existing and unrelated).

- [ ] **Step 4: Commit**

```bash
git add 'app/(caregiver)/caregiver/dashboard/_components/sidebar.tsx' 'app/(caregiver)/caregiver/dashboard/layout.tsx'
git commit -m "feat: add caregiver dashboard sidebar and layout"
```

---

## Task 3: Home Page

**Files:**
- Modify: `app/(caregiver)/caregiver/dashboard/page.tsx`

- [ ] **Step 1: Replace the stub with the full home page**

Replace the entire contents of `app/(caregiver)/caregiver/dashboard/page.tsx`:

```typescript
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, jobs, shifts, matches, jobApplications, careRequests } from '@/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

type ActivityItem =
  | { type: 'application'; careType: string; createdAt: Date }
  | { type: 'shift'; date: string; startTime: string; createdAt: Date }

const CARE_TYPE_LABELS: Record<string, string> = {
  'personal-care':          'Personal Care',
  'companionship':          'Companionship',
  'dementia-care':          'Dementia Care',
  'mobility-assistance':    'Mobility Assistance',
  'post-hospital-recovery': 'Post-Hospital Recovery',
}

export default async function CaregiverDashboard() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold">Complete your profile to get started.</h1>
        <Link href="/get-started/caregiver/step-1" className="mt-4 inline-block text-primary underline text-sm">
          Start onboarding →
        </Link>
      </div>
    )
  }

  const [
    [activeJobCount],
    [upcomingShiftCount],
    [pendingOfferCount],
    recentApplications,
    recentShifts,
  ] = await Promise.all([
    db.select({ value: count() })
      .from(jobs)
      .where(and(eq(jobs.caregiverId, profile.id), eq(jobs.status, 'active'))),
    db.select({ value: count() })
      .from(shifts)
      .innerJoin(jobs, eq(shifts.jobId, jobs.id))
      .where(and(eq(jobs.caregiverId, profile.id), eq(shifts.status, 'scheduled'))),
    db.select({ value: count() })
      .from(matches)
      .where(and(eq(matches.caregiverId, profile.id), eq(matches.status, 'pending'))),
    db.select({ careType: careRequests.careType, createdAt: jobApplications.createdAt })
      .from(jobApplications)
      .innerJoin(careRequests, eq(jobApplications.requestId, careRequests.id))
      .where(eq(jobApplications.caregiverId, profile.id))
      .orderBy(desc(jobApplications.createdAt))
      .limit(10),
    db.select({ date: shifts.date, startTime: shifts.startTime, createdAt: shifts.createdAt })
      .from(shifts)
      .innerJoin(jobs, eq(shifts.jobId, jobs.id))
      .where(and(eq(jobs.caregiverId, profile.id), eq(shifts.status, 'scheduled')))
      .orderBy(desc(shifts.createdAt))
      .limit(10),
  ])

  const activity: ActivityItem[] = [
    ...recentApplications.map((a) => ({
      type: 'application' as const,
      careType: a.careType,
      createdAt: a.createdAt,
    })),
    ...recentShifts.map((s) => ({
      type: 'shift' as const,
      date: s.date,
      startTime: s.startTime,
      createdAt: s.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10)

  const stats = [
    { label: 'Active Jobs',      value: Number(activeJobCount?.value ?? 0),     href: '/caregiver/dashboard/my-jobs' },
    { label: 'Upcoming Shifts',  value: Number(upcomingShiftCount?.value ?? 0),  href: '/caregiver/dashboard/shifts' },
    { label: 'Pending Offers',   value: Number(pendingOfferCount?.value ?? 0),   href: '/caregiver/dashboard/offers' },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">
        Welcome back{session.user.name ? `, ${session.user.name.split(' ')[0]}` : ''}
      </h1>
      <p className="text-muted-foreground text-sm mb-8">Here's what's happening with your care work.</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <p className="text-3xl font-semibold">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Activity */}
      <h2 className="text-base font-semibold mb-4">Recent Activity</h2>
      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity.</p>
      ) : (
        <ul className="space-y-3">
          {activity.map((item, i) => (
            <li key={`${item.type}-${item.createdAt.getTime()}-${i}`} className="flex items-start gap-3">
              <span className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
              <div>
                <p className="text-sm">
                  {item.type === 'application'
                    ? `Applied for ${CARE_TYPE_LABELS[item.careType] ?? item.careType} care`
                    : `Shift scheduled for ${item.date} at ${item.startTime}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "rate-defaults"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add 'app/(caregiver)/caregiver/dashboard/page.tsx'
git commit -m "feat: add caregiver dashboard home page with stats and activity"
```

---

## Task 4: Find Jobs Page + Apply Modal

**Files:**
- Create: `app/(caregiver)/caregiver/dashboard/_components/apply-modal.tsx`
- Modify: `app/(caregiver)/caregiver/dashboard/find-jobs/page.tsx`

- [ ] **Step 1: Create the Apply Modal Client Component**

Create `app/(caregiver)/caregiver/dashboard/_components/apply-modal.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { applyToRequest } from '@/domains/caregivers/actions'

interface Props {
  requestId: string
  requestTitle: string
}

export function ApplyModal({ requestId, requestTitle }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [coverNote, setCoverNote] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    setCoverNote('')
    setOpen(false)
  }

  function handleSubmit() {
    if (!coverNote.trim()) return
    startTransition(async () => {
      await applyToRequest(requestId, coverNote.trim())
      router.refresh()
      handleClose()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
      >
        Apply
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md rounded-xl bg-background p-8 shadow-xl">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-1">Apply to this request</h2>
            <p className="text-sm text-muted-foreground mb-5">{requestTitle}</p>
            <label className="block text-sm font-medium mb-2">
              Cover note <span className="text-destructive">*</span>
            </label>
            <textarea
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              maxLength={500}
              rows={5}
              className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none"
              placeholder="Introduce yourself and explain why you're a great fit…"
            />
            <p className="text-right text-xs text-muted-foreground mt-1 mb-5">{coverNote.length}/500</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !coverNote.trim()}
                className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
              >
                {isPending ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Build the Find Jobs page**

Replace the entire contents of `app/(caregiver)/caregiver/dashboard/find-jobs/page.tsx`:

```typescript
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import {
  caregiverProfiles, careRequests, careRequestLocations, jobApplications, matches,
} from '@/db/schema'
import { eq, and, notInArray } from 'drizzle-orm'
import { CARE_TYPES } from '@/lib/constants'
import { ApplyModal } from '../_components/apply-modal'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((ct) => [ct.key, ct.label]))

export default async function FindJobsPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return <div className="p-8 text-muted-foreground text-sm">Complete your profile to browse jobs.</div>
  }

  const [appliedIds, matchedIds] = await Promise.all([
    db.select({ id: jobApplications.requestId })
      .from(jobApplications)
      .where(eq(jobApplications.caregiverId, profile.id))
      .then((rows) => rows.map((r) => r.id)),
    db.select({ id: matches.requestId })
      .from(matches)
      .where(eq(matches.caregiverId, profile.id))
      .then((rows) => rows.map((r) => r.id)),
  ])

  const excludedIds = [...new Set([...appliedIds, ...matchedIds])]
  const statusFilter = eq(careRequests.status, 'active')
  const where = excludedIds.length > 0
    ? and(statusFilter, notInArray(careRequests.id, excludedIds))
    : statusFilter

  const requests = await db
    .select({
      id:           careRequests.id,
      title:        careRequests.title,
      careType:     careRequests.careType,
      frequency:    careRequests.frequency,
      durationHours:careRequests.durationHours,
      startDate:    careRequests.startDate,
      budgetType:   careRequests.budgetType,
      budgetAmount: careRequests.budgetAmount,
      city:         careRequestLocations.city,
      state:        careRequestLocations.state,
    })
    .from(careRequests)
    .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
    .where(where)
    .orderBy(careRequests.createdAt)

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Find Jobs</h1>
      <p className="text-sm text-muted-foreground mb-8">Browse open care requests and apply.</p>

      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open requests available right now.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const location = [req.city, req.state].filter(Boolean).join(', ')
            const title = req.title ?? `${CARE_TYPE_LABELS[req.careType] ?? req.careType} Request`
            return (
              <div
                key={req.id}
                className="rounded-xl border border-border bg-card p-5 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm mb-1">{title}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{CARE_TYPE_LABELS[req.careType] ?? req.careType}</span>
                    {location && <span>{location}</span>}
                    {req.frequency && <span className="capitalize">{req.frequency.replace(/-/g, ' ')}</span>}
                    {req.durationHours && <span>{req.durationHours}h/visit</span>}
                    {req.startDate && <span>Starts {req.startDate}</span>}
                    {req.budgetAmount && (
                      <span>${req.budgetAmount}{req.budgetType === 'hourly' ? '/hr' : ''}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <ApplyModal requestId={req.id} requestTitle={title} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "rate-defaults"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add 'app/(caregiver)/caregiver/dashboard/_components/apply-modal.tsx' 'app/(caregiver)/caregiver/dashboard/find-jobs/page.tsx'
git commit -m "feat: add find jobs page with apply modal"
```

---

## Task 5: Offers Page + OfferActions

**Files:**
- Create: `app/(caregiver)/caregiver/dashboard/_components/offer-actions.tsx`
- Modify: `app/(caregiver)/caregiver/dashboard/offers/page.tsx`

- [ ] **Step 1: Create OfferActions Client Component**

Create `app/(caregiver)/caregiver/dashboard/_components/offer-actions.tsx`:

```typescript
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptOffer, declineOffer } from '@/domains/caregivers/actions'

interface Props {
  matchId: string
}

export function OfferActions({ matchId }: Props) {
  const router = useRouter()
  const [isAccepting, startAccept] = useTransition()
  const [isDeclining, startDecline] = useTransition()

  function handleAccept() {
    startAccept(async () => {
      await acceptOffer(matchId)
      router.refresh()
    })
  }

  function handleDecline() {
    startDecline(async () => {
      await declineOffer(matchId)
      router.refresh()
    })
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button
        type="button"
        onClick={handleDecline}
        disabled={isDeclining || isAccepting}
        className="px-4 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground disabled:opacity-40 transition-colors"
      >
        {isDeclining ? 'Declining…' : 'Decline'}
      </button>
      <button
        type="button"
        onClick={handleAccept}
        disabled={isAccepting || isDeclining}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
      >
        {isAccepting ? 'Accepting…' : 'Accept'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Build the Offers page**

Replace the entire contents of `app/(caregiver)/caregiver/dashboard/offers/page.tsx`:

```typescript
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, matches, careRequests, careRequestLocations } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { CARE_TYPES } from '@/lib/constants'
import { OfferActions } from '../_components/offer-actions'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((ct) => [ct.key, ct.label]))

export default async function OffersPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return <div className="p-8 text-muted-foreground text-sm">Complete your profile to view offers.</div>
  }

  const offers = await db
    .select({
      matchId:   matches.id,
      score:     matches.score,
      reason:    matches.reason,
      title:     careRequests.title,
      careType:  careRequests.careType,
      frequency: careRequests.frequency,
      city:      careRequestLocations.city,
      state:     careRequestLocations.state,
    })
    .from(matches)
    .innerJoin(careRequests, eq(matches.requestId, careRequests.id))
    .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
    .where(and(eq(matches.caregiverId, profile.id), eq(matches.status, 'pending')))
    .orderBy(desc(matches.createdAt))

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Offers</h1>
      <p className="text-sm text-muted-foreground mb-8">AI-matched care requests waiting for your response.</p>

      {offers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending offers right now.</p>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => {
            const location = [offer.city, offer.state].filter(Boolean).join(', ')
            const title = offer.title ?? `${CARE_TYPE_LABELS[offer.careType] ?? offer.careType} Request`
            const scoreLabel = offer.score >= 80 ? 'Strong match' : offer.score >= 60 ? 'Good match' : 'Possible match'
            return (
              <div
                key={offer.matchId}
                className="rounded-xl border border-border bg-card p-5 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {scoreLabel}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                    <span>{CARE_TYPE_LABELS[offer.careType] ?? offer.careType}</span>
                    {location && <span>{location}</span>}
                    {offer.frequency && <span className="capitalize">{offer.frequency.replace(/-/g, ' ')}</span>}
                  </div>
                  {offer.reason && (
                    <p className="text-xs text-muted-foreground italic">"{offer.reason}"</p>
                  )}
                </div>
                <OfferActions matchId={offer.matchId} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "rate-defaults"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add 'app/(caregiver)/caregiver/dashboard/_components/offer-actions.tsx' 'app/(caregiver)/caregiver/dashboard/offers/page.tsx'
git commit -m "feat: add offers page with accept/decline actions"
```

---

## Task 6: My Jobs Page

**Files:**
- Modify: `app/(caregiver)/caregiver/dashboard/my-jobs/page.tsx`

- [ ] **Step 1: Build the My Jobs page**

Replace the entire contents of `app/(caregiver)/caregiver/dashboard/my-jobs/page.tsx`:

```typescript
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, jobs, careRequests, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { CARE_TYPES } from '@/lib/constants'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((ct) => [ct.key, ct.label]))

const JOB_STATUS_LABELS: Record<string, string> = {
  active:    'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const JOB_STATUS_CLASSES: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

export default async function MyJobsPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return <div className="p-8 text-muted-foreground text-sm">Complete your profile to view your jobs.</div>
  }

  const myJobs = await db
    .select({
      id:          jobs.id,
      status:      jobs.status,
      createdAt:   jobs.createdAt,
      title:       careRequests.title,
      careType:    careRequests.careType,
      clientName:  users.name,
    })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(users, eq(jobs.clientId, users.id))
    .where(eq(jobs.caregiverId, profile.id))
    .orderBy(desc(jobs.createdAt))

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">My Jobs</h1>
      <p className="text-sm text-muted-foreground mb-8">Your accepted care positions.</p>

      {myJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No jobs yet. Check your offers or browse open requests.</p>
      ) : (
        <div className="space-y-4">
          {myJobs.map((job) => {
            const title = job.title ?? `${CARE_TYPE_LABELS[job.careType] ?? job.careType} Request`
            const statusLabel = JOB_STATUS_LABELS[job.status ?? 'active'] ?? job.status
            const statusClass = JOB_STATUS_CLASSES[job.status ?? 'active'] ?? 'bg-muted text-muted-foreground'
            return (
              <div
                key={job.id}
                className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm mb-1">{title}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{CARE_TYPE_LABELS[job.careType] ?? job.careType}</span>
                    {job.clientName && <span>Client: {job.clientName}</span>}
                    <span>Started {job.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "rate-defaults"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add 'app/(caregiver)/caregiver/dashboard/my-jobs/page.tsx'
git commit -m "feat: add my jobs page"
```

---

## Task 7: Shifts Page

**Files:**
- Modify: `app/(caregiver)/caregiver/dashboard/shifts/page.tsx`

- [ ] **Step 1: Build the Shifts page**

Replace the entire contents of `app/(caregiver)/caregiver/dashboard/shifts/page.tsx`:

```typescript
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, shifts, jobs, careRequests } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'

const SHIFT_STATUS_CLASSES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

export default async function ShiftsPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return <div className="p-8 text-muted-foreground text-sm">Complete your profile to view shifts.</div>
  }

  const upcomingShifts = await db
    .select({
      id:        shifts.id,
      date:      shifts.date,
      startTime: shifts.startTime,
      endTime:   shifts.endTime,
      status:    shifts.status,
      title:     careRequests.title,
      careType:  careRequests.careType,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .where(and(eq(jobs.caregiverId, profile.id), eq(shifts.status, 'scheduled')))
    .orderBy(asc(shifts.date))

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Shifts</h1>
      <p className="text-sm text-muted-foreground mb-8">Your upcoming scheduled shifts.</p>

      {upcomingShifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming shifts scheduled.</p>
      ) : (
        <div className="space-y-3">
          {upcomingShifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm mb-1">{shift.title ?? shift.careType}</p>
                <p className="text-xs text-muted-foreground">
                  {shift.date} · {shift.startTime} – {shift.endTime}
                </p>
              </div>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${SHIFT_STATUS_CLASSES[shift.status ?? 'scheduled'] ?? ''}`}>
                Scheduled
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "rate-defaults"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add 'app/(caregiver)/caregiver/dashboard/shifts/page.tsx'
git commit -m "feat: add shifts page"
```

---

## Task 8: Stub Pages

**Files:**
- Modify: `app/(caregiver)/caregiver/dashboard/care-plans/page.tsx`
- Modify: `app/(caregiver)/caregiver/dashboard/payouts/page.tsx`
- Modify: `app/(caregiver)/caregiver/dashboard/calendar/page.tsx`

- [ ] **Step 1: Update Care Plans stub**

Replace `app/(caregiver)/caregiver/dashboard/care-plans/page.tsx`:

```typescript
export default function CarePlansPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1">Care Plans</h1>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  )
}
```

- [ ] **Step 2: Update Payouts stub**

Replace `app/(caregiver)/caregiver/dashboard/payouts/page.tsx`:

```typescript
export default function PayoutsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1">Payouts</h1>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  )
}
```

- [ ] **Step 3: Update Calendar stub**

Replace `app/(caregiver)/caregiver/dashboard/calendar/page.tsx`:

```typescript
export default function CalendarPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1">Calendar</h1>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add 'app/(caregiver)/caregiver/dashboard/care-plans/page.tsx' 'app/(caregiver)/caregiver/dashboard/payouts/page.tsx' 'app/(caregiver)/caregiver/dashboard/calendar/page.tsx'
git commit -m "feat: update caregiver dashboard stub pages"
```

---

## Task 9: Build Verification

**Files:** none

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (previously 83 + 7 new = 90 total).

- [ ] **Step 2: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "rate-defaults"
```

Expected: no errors.

- [ ] **Step 3: Done**

All 9 tasks complete. Proceed to `superpowers:finishing-a-development-branch`.
