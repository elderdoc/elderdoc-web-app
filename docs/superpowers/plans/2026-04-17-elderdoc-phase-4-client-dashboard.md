# Phase 4: Client Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the client dashboard: sidebar navigation, stats/activity home page, Care Recipients modal (4 steps), Care Request modal (6 steps with AI-generated title + description), and stub pages for tabs not yet functional.

**Architecture:** Both modals are single Client Components holding all step state in `useState`; a single Server Action writes to the DB on the final step. Dashboard pages are async Server Components that read directly from DB. After modal submit, `router.refresh()` re-renders the server tree. AI generation uses `streamText` via `/api/care-request/generate` and `useCompletion` on the client.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Vercel AI SDK v6 (`streamText`, `useCompletion`), `@ai-sdk/openai`, `date-fns`, Vitest, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `domains/clients/requests.ts` | Create | Server Actions: `createCareRecipient`, `createCareRequest` |
| `domains/clients/__tests__/requests.test.ts` | Create | Unit tests for both Server Actions |
| `app/api/care-request/generate/route.ts` | Create | AI streaming route handler |
| `app/api/care-request/generate/__tests__/route.test.ts` | Create | Unit tests for route handler |
| `app/(client)/client/dashboard/layout.tsx` | Modify | Render full sidebar shell |
| `app/(client)/client/dashboard/_components/sidebar.tsx` | Create | Client Component sidebar with `usePathname()` |
| `app/(client)/client/dashboard/page.tsx` | Modify | Home: stat cards + recent requests + activity timeline |
| `app/(client)/client/dashboard/recipients/page.tsx` | Modify | Grid of recipient cards |
| `app/(client)/client/dashboard/requests/page.tsx` | Modify | List of all care requests |
| `app/(client)/client/dashboard/find-caregivers/page.tsx` | Modify | Stub — "Coming soon" |
| `app/(client)/client/dashboard/care-plans/page.tsx` | Modify | Stub — "Coming soon" |
| `app/(client)/client/dashboard/calendar/page.tsx` | Modify | Stub — "Coming soon" |
| `app/(client)/client/dashboard/_components/care-recipient-modal.tsx` | Create | 4-step modal, all state in `useState` |
| `app/(client)/client/dashboard/_components/care-recipient-shell.tsx` | Create | Step indicator + nav buttons shell |
| `app/(client)/client/dashboard/_components/care-request-modal.tsx` | Create | 6-step modal, all state in `useState` |
| `app/(client)/client/dashboard/_components/care-request-shell.tsx` | Create | Step indicator + nav buttons shell |

---

## Task 1: Server Actions (TDD)

**Files:**
- Create: `domains/clients/__tests__/requests.test.ts`
- Create: `domains/clients/requests.ts`

- [ ] **Step 1: Create test file**

```typescript
// domains/clients/__tests__/requests.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

const { mockChain, mockDb } = vi.hoisted(() => {
  const mockChain = {
    values:   vi.fn(),
    returning: vi.fn(),
    where:    vi.fn(),
    set:      vi.fn(),
  }
  mockChain.values.mockReturnValue(mockChain)
  mockChain.returning.mockResolvedValue([{ id: 'new-id' }])
  mockChain.where.mockResolvedValue(undefined)
  mockChain.set.mockReturnValue(mockChain)

  const mockDb = {
    insert: vi.fn().mockReturnValue(mockChain),
  }
  return { mockChain, mockDb }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { auth } from '@/auth'
import { createCareRecipient, createCareRequest } from '../requests'

const mockAuth = vi.mocked(auth)
const SESSION = { user: { id: 'user-1', email: 'a@b.com', name: 'Test', role: 'client' } }

beforeEach(() => {
  vi.clearAllMocks()
  mockChain.values.mockReturnValue(mockChain)
  mockChain.returning.mockResolvedValue([{ id: 'new-id' }])
  mockChain.where.mockResolvedValue(undefined)
  mockChain.set.mockReturnValue(mockChain)
  mockDb.insert.mockReturnValue(mockChain)
})

describe('createCareRecipient', () => {
  it('throws Unauthorized with no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(createCareRecipient({
      relationship: 'parent', name: 'Jane', conditions: [],
    })).rejects.toThrow('Unauthorized')
  })

  it('inserts to careRecipients with correct fields', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    await createCareRecipient({
      relationship: 'parent', name: 'Jane', dob: '01/01/1940',
      phone: '555-1234', gender: 'female', conditions: ['diabetes'],
      mobilityLevel: 'independent', notes: 'Likes cats',
    })
    expect(mockDb.insert).toHaveBeenCalledOnce()
    const insertCall = mockChain.values.mock.calls[0][0]
    expect(insertCall.clientId).toBe('user-1')
    expect(insertCall.name).toBe('Jane')
    expect(insertCall.relationship).toBe('parent')
    expect(insertCall.conditions).toEqual(['diabetes'])
  })

  it('returns the new record id', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    const result = await createCareRecipient({ relationship: 'parent', name: 'Jane', conditions: [] })
    expect(result).toEqual({ id: 'new-id' })
  })
})

describe('createCareRequest', () => {
  const BASE = {
    recipientId: 'rec-1', careType: 'personal-care',
    address: { address1: '123 Main St', city: 'Austin', state: 'Texas' },
    frequency: 'weekly', days: ['monday'], shifts: ['morning'],
    startDate: '2026-05-01', durationHours: 4,
    languagePref: ['english'], title: 'Help for Mom', description: 'Desc',
  }

  it('throws Unauthorized with no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(createCareRequest(BASE)).rejects.toThrow('Unauthorized')
  })

  it('inserts to careRequests with status active', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    await createCareRequest(BASE)
    const firstInsertValues = mockChain.values.mock.calls[0][0]
    expect(firstInsertValues.status).toBe('active')
    expect(firstInsertValues.clientId).toBe('user-1')
    expect(firstInsertValues.title).toBe('Help for Mom')
  })

  it('inserts to careRequestLocations', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    await createCareRequest(BASE)
    expect(mockDb.insert).toHaveBeenCalledTimes(2)
  })

  it('returns the new request id', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    const result = await createCareRequest(BASE)
    expect(result).toEqual({ id: 'new-id' })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/.worktrees/phase-1-foundation
npx vitest run domains/clients/__tests__/requests.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create Server Actions**

```typescript
// domains/clients/requests.ts
'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { careRecipients, careRequests, careRequestLocations } from '@/db/schema'

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
}): Promise<{ id: string }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const [row] = await db.insert(careRecipients).values({
    clientId:     session.user.id,
    relationship: data.relationship,
    name:         data.name,
    dob:          data.dob,
    phone:        data.phone,
    gender:       data.gender,
    photoUrl:     data.photoUrl,
    conditions:   data.conditions,
    mobilityLevel:data.mobilityLevel,
    notes:        data.notes,
    address:      data.address,
  }).returning({ id: careRecipients.id })

  return { id: row.id }
}

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
}): Promise<{ id: string }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const [row] = await db.insert(careRequests).values({
    clientId:     session.user.id,
    recipientId:  data.recipientId,
    careType:     data.careType,
    frequency:    data.frequency,
    days:         data.days,
    shifts:       data.shifts,
    startDate:    data.startDate,
    durationHours:data.durationHours,
    genderPref:   data.genderPref,
    languagePref: data.languagePref,
    budgetType:   data.budgetType,
    budgetAmount: data.budgetAmount,
    title:        data.title,
    description:  data.description,
    status:       'active',
  }).returning({ id: careRequests.id })

  await db.insert(careRequestLocations).values({
    requestId: row.id,
    address1:  data.address.address1,
    address2:  data.address.address2,
    city:      data.address.city,
    state:     data.address.state,
  })

  return { id: row.id }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run domains/clients/__tests__/requests.test.ts
```

Expected: 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add domains/clients/requests.ts domains/clients/__tests__/requests.test.ts
git commit -m "feat: add createCareRecipient and createCareRequest server actions"
```

---

## Task 2: AI Generation Route Handler (TDD)

**Files:**
- Create: `app/api/care-request/generate/__tests__/route.test.ts`
- Create: `app/api/care-request/generate/route.ts`

- [ ] **Step 1: Create test file**

```typescript
// app/api/care-request/generate/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('ai', () => ({
  streamText: vi.fn().mockReturnValue({ toDataStreamResponse: vi.fn().mockReturnValue(new Response('ok')) }),
}))
vi.mock('@ai-sdk/openai', () => ({ openai: vi.fn().mockReturnValue('mock-model') }))

import { auth } from '@/auth'
import { streamText } from 'ai'
import { POST } from '../route'

const mockAuth = vi.mocked(auth)
const mockStreamText = vi.mocked(streamText)
const SESSION = { user: { id: 'user-1' } }

beforeEach(() => vi.clearAllMocks())

const BODY = {
  careType: 'personal-care', recipientName: 'Jane',
  conditions: ['diabetes'], mobility: 'independent',
  frequency: 'weekly', days: ['monday'], shifts: ['morning'],
  duration: '4', languages: ['english'], budgetType: 'hourly', budgetAmount: '20',
}

function makeRequest(body: object) {
  return new Request('http://localhost/api/care-request/generate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/care-request/generate', () => {
  it('returns 401 with no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    const res = await POST(makeRequest(BODY))
    expect(res.status).toBe(401)
  })

  it('calls streamText with a prompt containing careType and recipientName', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    await POST(makeRequest(BODY))
    expect(mockStreamText).toHaveBeenCalledOnce()
    const { prompt } = mockStreamText.mock.calls[0][0] as any
    expect(prompt).toContain('personal-care')
    expect(prompt).toContain('Jane')
  })

  it('returns a streaming response on success', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    const res = await POST(makeRequest(BODY))
    expect(res).toBeInstanceOf(Response)
    expect(res.status).not.toBe(401)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run "app/api/care-request/generate/__tests__/route.test.ts"
```

Expected: FAIL — module not found

- [ ] **Step 3: Create route handler**

```typescript
// app/api/care-request/generate/route.ts
import { auth } from '@/auth'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

interface CareRequestGenerateInput {
  careType: string
  recipientName: string
  conditions: string[]
  mobility?: string
  frequency: string
  days: string[]
  shifts: string[]
  duration: string
  languages: string[]
  budgetType?: string
  budgetAmount?: string
}

function buildPrompt(data: CareRequestGenerateInput): string {
  return `Care type: ${data.careType}
Recipient: ${data.recipientName}
Conditions: ${data.conditions.join(', ') || 'none listed'}
Mobility: ${data.mobility || 'not specified'}
Schedule: ${data.frequency}, ${data.days.join('/')} ${data.shifts.join('/')}
Duration: ${data.duration} hours
Language preference: ${data.languages.join(', ') || 'none'}
Budget: ${data.budgetType ?? ''} ${data.budgetAmount ? `$${data.budgetAmount}` : ''}`
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  const body: CareRequestGenerateInput = await req.json()
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run "app/api/care-request/generate/__tests__/route.test.ts"
```

Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add app/api/care-request/generate/route.ts "app/api/care-request/generate/__tests__/route.test.ts"
git commit -m "feat: add AI care request generation route handler"
```

---

## Task 3: Dashboard Layout & Sidebar

**Files:**
- Create: `app/(client)/client/dashboard/_components/sidebar.tsx`
- Modify: `app/(client)/client/dashboard/layout.tsx`

- [ ] **Step 1: Create sidebar Client Component**

```typescript
// app/(client)/client/dashboard/_components/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV_LINKS = [
  { href: '/client/dashboard',                label: 'Home' },
  { href: '/client/dashboard/recipients',     label: 'Care Recipients' },
  { href: '/client/dashboard/requests',       label: 'Care Requests' },
  { href: '/client/dashboard/find-caregivers',label: 'Find Caregivers' },
  { href: '/client/dashboard/care-plans',     label: 'Care Plans' },
  { href: '/client/dashboard/calendar',       label: 'Calendar' },
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
      {/* Wordmark */}
      <div className="px-6 py-5">
        <span className="text-xl font-bold tracking-tight text-foreground">ElderDoc</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV_LINKS.map((link) => {
          const isActive = link.href === '/client/dashboard'
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

      {/* Bottom: bell + user */}
      <div className="border-t border-border px-4 py-4 space-y-3">
        <Link href="/client/dashboard/notifications" className="relative flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
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
              <img src={userImage} alt="" className="h-8 w-8 rounded-full object-cover" />
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

- [ ] **Step 2: Update layout to render sidebar**

```typescript
// app/(client)/client/dashboard/layout.tsx
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { notifications } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { Sidebar } from './_components/sidebar'

export default async function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole('client')
  const userId = session.user.id!

  const unread = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))

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
        unreadCount={unread.length}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "app/(client)/client/dashboard/_components/sidebar.tsx" "app/(client)/client/dashboard/layout.tsx"
git commit -m "feat: add client dashboard sidebar and layout"
```

---

## Task 4: Home Page (Stats + Recent Requests + Activity)

**Files:**
- Modify: `app/(client)/client/dashboard/page.tsx`

- [ ] **Step 1: Replace the stub page**

```typescript
// app/(client)/client/dashboard/page.tsx
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRecipients, careRequests, matches } from '@/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { CareRecipientModal } from './_components/care-recipient-modal'
import { CareRequestModal } from './_components/care-request-modal'

export default async function ClientDashboard() {
  const session = await requireRole('client')
  const userId = session.user.id!

  const [recipientCount] = await db
    .select({ value: count() })
    .from(careRecipients)
    .where(eq(careRecipients.clientId, userId))

  const [activeRequestCount] = await db
    .select({ value: count() })
    .from(careRequests)
    .where(and(eq(careRequests.clientId, userId), eq(careRequests.status, 'active')))

  const [pendingMatchCount] = await db
    .select({ value: count() })
    .from(matches)
    .innerJoin(careRequests, eq(matches.requestId, careRequests.id))
    .where(and(eq(careRequests.clientId, userId), eq(matches.status, 'pending')))

  const recentRequests = await db
    .select({
      id:           careRequests.id,
      title:        careRequests.title,
      careType:     careRequests.careType,
      status:       careRequests.status,
      createdAt:    careRequests.createdAt,
      recipientName:careRecipients.name,
    })
    .from(careRequests)
    .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
    .where(eq(careRequests.clientId, userId))
    .orderBy(desc(careRequests.createdAt))
    .limit(5)

  const recentRecipients = await db
    .select({ name: careRecipients.name, createdAt: careRecipients.createdAt, type: db.raw("'recipient'") as unknown as 'recipient' })
    .from(careRecipients)
    .where(eq(careRecipients.clientId, userId))
    .orderBy(desc(careRecipients.createdAt))
    .limit(10)

  const recentRequestsActivity = await db
    .select({ careType: careRequests.careType, createdAt: careRequests.createdAt, type: db.raw("'request'") as unknown as 'request' })
    .from(careRequests)
    .where(eq(careRequests.clientId, userId))
    .orderBy(desc(careRequests.createdAt))
    .limit(10)

  type ActivityItem =
    | { type: 'recipient'; name: string; createdAt: Date }
    | { type: 'request'; careType: string; createdAt: Date }

  const activity: ActivityItem[] = [
    ...recentRecipients.map((r) => ({ type: 'recipient' as const, name: r.name, createdAt: r.createdAt })),
    ...recentRequestsActivity.map((r) => ({ type: 'request' as const, careType: r.careType, createdAt: r.createdAt })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)

  const STATUS_LABELS: Record<string, string> = {
    draft:     'Draft',
    active:    'Matching in progress…',
    matched:   'Matched',
    filled:    'Filled',
    cancelled: 'Cancelled',
  }

  const STATUS_CLASSES: Record<string, string> = {
    draft:     'bg-muted text-muted-foreground',
    active:    'bg-blue-100 text-blue-700',
    matched:   'bg-green-100 text-green-700',
    filled:    'bg-primary/10 text-primary',
    cancelled: 'bg-destructive/10 text-destructive',
  }

  const existingRecipients = await db
    .select({ id: careRecipients.id, name: careRecipients.name, relationship: careRecipients.relationship, photoUrl: careRecipients.photoUrl })
    .from(careRecipients)
    .where(eq(careRecipients.clientId, userId))

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, {session.user.name?.split(' ')[0]}</p>
        </div>
        <div className="flex gap-3">
          <CareRecipientModal />
          <CareRequestModal recipients={existingRecipients} />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Care Recipients', value: recipientCount.value },
          { label: 'Active Requests', value: activeRequestCount.value },
          { label: 'Pending Matches', value: pendingMatchCount.value },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{String(stat.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Recent Requests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Requests</h2>
            <Link href="/client/dashboard/requests" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((req) => (
                <div key={req.id} className="rounded-lg border border-border bg-card p-4 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium truncate">{req.title ?? '(Untitled)'}</span>
                    <span className={['shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CLASSES[req.status ?? 'draft']].join(' ')}>
                      {STATUS_LABELS[req.status ?? 'draft']}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5">{req.careType}</span>
                    {req.recipientName && <span>for {req.recipientName}</span>}
                    <span>· {formatDistanceToNow(req.createdAt, { addSuffix: true })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ol className="space-y-3">
              {activity.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                  <div>
                    <p>
                      {item.type === 'recipient'
                        ? `You added ${item.name} as a care recipient`
                        : `You created a ${item.careType} care request`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
```

Note: The `db.raw()` approach for the type literal won't work with Drizzle. Instead, fetch recipients and requests separately and map the type field in JS (not SQL). Replace the `recentRecipients` and `recentRequestsActivity` queries with:

```typescript
  const recentRecipientsRaw = await db
    .select({ name: careRecipients.name, createdAt: careRecipients.createdAt })
    .from(careRecipients)
    .where(eq(careRecipients.clientId, userId))
    .orderBy(desc(careRecipients.createdAt))
    .limit(10)

  const recentRequestsActivityRaw = await db
    .select({ careType: careRequests.careType, createdAt: careRequests.createdAt })
    .from(careRequests)
    .where(eq(careRequests.clientId, userId))
    .orderBy(desc(careRequests.createdAt))
    .limit(10)

  type ActivityItem =
    | { type: 'recipient'; name: string; createdAt: Date }
    | { type: 'request'; careType: string; createdAt: Date }

  const activity: ActivityItem[] = [
    ...recentRecipientsRaw.map((r) => ({ type: 'recipient' as const, name: r.name, createdAt: r.createdAt })),
    ...recentRequestsActivityRaw.map((r) => ({ type: 'request' as const, careType: r.careType, createdAt: r.createdAt })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)
```

Use this corrected version (no `db.raw`) in the actual file. Remove all `db.raw` references.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (modals don't exist yet — create empty stubs if needed for the build)

- [ ] **Step 3: Commit**

```bash
git add "app/(client)/client/dashboard/page.tsx"
git commit -m "feat: add client dashboard home page with stats, recent requests, and activity"
```

---

## Task 5: Recipients Page

**Files:**
- Modify: `app/(client)/client/dashboard/recipients/page.tsx`

- [ ] **Step 1: Replace the stub page**

```typescript
// app/(client)/client/dashboard/recipients/page.tsx
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRecipients } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { CareRecipientModal } from '../_components/care-recipient-modal'

export default async function RecipientsPage() {
  const session = await requireRole('client')
  const userId = session.user.id!

  const recipients = await db
    .select()
    .from(careRecipients)
    .where(eq(careRecipients.clientId, userId))
    .orderBy(desc(careRecipients.createdAt))

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Care Recipients</h1>
        <CareRecipientModal />
      </div>

      {recipients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-muted-foreground">No recipients yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Add someone you care for to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {recipients.map((r) => {
            const initials = r.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
            return (
              <div key={r.id} className="rounded-lg border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {initials}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.name}</p>
                    {r.relationship && (
                      <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                        {r.relationship.replace('-', ' ')}
                      </span>
                    )}
                  </div>
                </div>
                {r.conditions && r.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.conditions.slice(0, 3).map((c) => (
                      <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-xs">{c}</span>
                    ))}
                    {r.conditions.length > 3 && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">+{r.conditions.length - 3} more</span>
                    )}
                  </div>
                )}
                {r.mobilityLevel && (
                  <p className="text-xs text-muted-foreground capitalize">
                    Mobility: {r.mobilityLevel.replace('-', ' ')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "app/(client)/client/dashboard/recipients/page.tsx"
git commit -m "feat: add care recipients page with recipient cards"
```

---

## Task 6: Requests Page

**Files:**
- Modify: `app/(client)/client/dashboard/requests/page.tsx`

- [ ] **Step 1: Replace the stub page**

```typescript
// app/(client)/client/dashboard/requests/page.tsx
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRequests, careRecipients } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'
import { CareRequestModal } from '../_components/care-request-modal'

const STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  active:    'Matching in progress…',
  matched:   'Matched',
  filled:    'Filled',
  cancelled: 'Cancelled',
}

const STATUS_CLASSES: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  active:    'bg-blue-100 text-blue-700',
  matched:   'bg-green-100 text-green-700',
  filled:    'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
}

export default async function RequestsPage() {
  const session = await requireRole('client')
  const userId = session.user.id!

  const requests = await db
    .select({
      id:           careRequests.id,
      title:        careRequests.title,
      careType:     careRequests.careType,
      status:       careRequests.status,
      createdAt:    careRequests.createdAt,
      recipientName:careRecipients.name,
    })
    .from(careRequests)
    .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
    .where(eq(careRequests.clientId, userId))
    .orderBy(desc(careRequests.createdAt))

  const existingRecipients = await db
    .select({ id: careRecipients.id, name: careRecipients.name, relationship: careRecipients.relationship, photoUrl: careRecipients.photoUrl })
    .from(careRecipients)
    .where(eq(careRecipients.clientId, userId))

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Care Requests</h1>
        <CareRequestModal recipients={existingRecipients} />
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-muted-foreground">No care requests yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first request to start finding caregivers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4 gap-4">
              <div className="min-w-0 space-y-1">
                <p className="font-medium truncate">{req.title ?? '(Untitled)'}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5">{req.careType}</span>
                  {req.recipientName && <span>for {req.recipientName}</span>}
                  <span>· {formatDistanceToNow(req.createdAt, { addSuffix: true })}</span>
                </div>
              </div>
              <span className={['shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', STATUS_CLASSES[req.status ?? 'draft']].join(' ')}>
                {STATUS_LABELS[req.status ?? 'draft']}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "app/(client)/client/dashboard/requests/page.tsx"
git commit -m "feat: add care requests page with status badges"
```

---

## Task 7: Stub Pages

**Files:**
- Modify: `app/(client)/client/dashboard/find-caregivers/page.tsx`
- Modify: `app/(client)/client/dashboard/care-plans/page.tsx`
- Modify: `app/(client)/client/dashboard/calendar/page.tsx`

- [ ] **Step 1: Create shared coming-soon stub for all three pages**

```typescript
// app/(client)/client/dashboard/find-caregivers/page.tsx
export default function FindCaregiversPage() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Find Caregivers</h1>
        <p className="text-muted-foreground">Coming in a future update.</p>
      </div>
    </div>
  )
}
```

```typescript
// app/(client)/client/dashboard/care-plans/page.tsx
export default function CarePlansPage() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Care Plans</h1>
        <p className="text-muted-foreground">Coming in a future update.</p>
      </div>
    </div>
  )
}
```

```typescript
// app/(client)/client/dashboard/calendar/page.tsx
export default function CalendarPage() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <p className="text-muted-foreground">Coming in a future update.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(client)/client/dashboard/find-caregivers/page.tsx" "app/(client)/client/dashboard/care-plans/page.tsx" "app/(client)/client/dashboard/calendar/page.tsx"
git commit -m "feat: add coming-soon stubs for find-caregivers, care-plans, calendar"
```

---

## Task 8: Care Recipient Modal (4 Steps)

**Files:**
- Create: `app/(client)/client/dashboard/_components/care-recipient-shell.tsx`
- Create: `app/(client)/client/dashboard/_components/care-recipient-modal.tsx`

- [ ] **Step 1: Create modal shell**

```typescript
// app/(client)/client/dashboard/_components/care-recipient-shell.tsx
'use client'

import { useTransition } from 'react'

const STEPS = ['Relationship', 'Basic Info', 'Health & Mobility', 'Notes']

interface Props {
  currentStep: number
  title: string
  children: React.ReactNode
  onBack: () => void
  onNext?: () => void
  onSave?: () => void
  isSaving?: boolean
  nextDisabled?: boolean
}

export function CareRecipientShell({
  currentStep, title, children, onBack, onNext, onSave, isSaving, nextDisabled,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={[
              'flex-1 h-1 rounded-full transition-colors',
              i + 1 <= currentStep ? 'bg-primary' : 'bg-muted',
            ].join(' ')}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-1">Step {currentStep} of {STEPS.length}</p>
      <h2 className="text-xl font-semibold mb-6">{title}</h2>

      <div className="flex-1 overflow-y-auto">{children}</div>

      {/* Buttons */}
      <div className="flex justify-between pt-6 border-t border-border mt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
        {currentStep < STEPS.length ? (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Save Recipient'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the 4-step Care Recipient Modal**

```typescript
// app/(client)/client/dashboard/_components/care-recipient-modal.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCareRecipient } from '@/domains/clients/requests'
import { RELATIONSHIPS, CONDITIONS, MOBILITY_LEVELS, GENDER_OPTIONS } from '@/lib/constants'
import { CareRecipientShell } from './care-recipient-shell'

interface RecipientForm {
  relationship: string
  name: string
  dob: string
  phone: string
  gender: string
  photoUrl: string
  conditions: string[]
  mobilityLevel: string
  notes: string
}

const EMPTY: RecipientForm = {
  relationship: '', name: '', dob: '', phone: '', gender: '',
  photoUrl: '', conditions: [], mobilityLevel: '', notes: '',
}

interface Props {
  onRecipientCreated?: (id: string, name: string) => void
  triggerLabel?: string
}

export function CareRecipientModal({ onRecipientCreated, triggerLabel }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [myselfSelected, setMyselfSelected] = useState(false)
  const [form, setForm] = useState<RecipientForm>(EMPTY)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setStep(1)
    setMyselfSelected(false)
    setForm(EMPTY)
    setPhotoPreview(null)
  }

  function handleClose() {
    reset()
    setOpen(false)
  }

  function handleRelationshipSelect(key: string) {
    setForm((f) => ({ ...f, relationship: key }))
    if (key === 'myself') {
      setMyselfSelected(true)
      setStep(4)
    } else {
      setMyselfSelected(false)
    }
  }

  function handleBack() {
    if (step === 4 && myselfSelected) { setStep(1); return }
    if (step > 1) setStep((s) => s - 1)
    else handleClose()
  }

  function handleNext() {
    setStep((s) => s + 1)
  }

  function toggleCondition(key: string) {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.includes(key)
        ? f.conditions.filter((c) => c !== key)
        : [...f.conditions, key],
    }))
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const json = await res.json()
    if (json.url) {
      setForm((f) => ({ ...f, photoUrl: json.url }))
      setPhotoPreview(json.url)
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await createCareRecipient({
        relationship: form.relationship,
        name:         form.name,
        dob:          form.dob || undefined,
        phone:        form.phone || undefined,
        gender:       form.gender || undefined,
        photoUrl:     form.photoUrl || undefined,
        conditions:   form.conditions,
        mobilityLevel:form.mobilityLevel || undefined,
        notes:        form.notes || undefined,
      })
      if (onRecipientCreated) {
        onRecipientCreated(result.id, form.name)
      } else {
        router.refresh()
      }
      handleClose()
    })
  }

  const step1Valid = form.relationship.length > 0
  const step2Valid = form.name.trim().length > 0
  const step3Valid = form.mobilityLevel.length > 0
  const step4Valid = form.notes.length <= 500

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
      >
        {triggerLabel ?? '+ Add Recipient'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-lg rounded-xl bg-background p-8 shadow-xl max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>

            <CareRecipientShell
              currentStep={step}
              title={
                step === 1 ? 'Who are you caring for?' :
                step === 2 ? 'Basic information' :
                step === 3 ? 'Health & mobility' :
                'Additional notes'
              }
              onBack={handleBack}
              onNext={handleNext}
              onSave={handleSave}
              isSaving={isPending}
              nextDisabled={
                step === 1 ? !step1Valid :
                step === 2 ? !step2Valid :
                step === 3 ? !step3Valid :
                false
              }
            >
              {/* Step 1 — Relationship */}
              {step === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  {RELATIONSHIPS.map((rel) => (
                    <button
                      key={rel.key}
                      type="button"
                      onClick={() => handleRelationshipSelect(rel.key)}
                      className={[
                        'rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors text-left',
                        form.relationship === rel.key
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50',
                      ].join(' ')}
                    >
                      {rel.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2 — Basic Info */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Photo */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Photo (optional)</label>
                    <div className="flex items-center gap-4">
                      {photoPreview ? (
                        <img src={photoPreview} alt="" className="h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground text-xl">?</span>
                      )}
                      <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
                        Browse
                        <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date of Birth</label>
                    <input
                      type="text"
                      value={form.dob}
                      onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      placeholder="MM/DD/YYYY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      placeholder="(555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Gender</label>
                    <div className="grid grid-cols-2 gap-2">
                      {GENDER_OPTIONS.map((g) => (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, gender: g.key }))}
                          className={[
                            'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                            form.gender === g.key
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border hover:border-primary/50',
                          ].join(' ')}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 — Health & Mobility */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Conditions</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CONDITIONS.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => toggleCondition(c.key)}
                          className={[
                            'rounded-lg border-2 px-3 py-2 text-sm text-left transition-colors',
                            form.conditions.includes(c.key)
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border hover:border-primary/50',
                          ].join(' ')}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3">Mobility Level *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {MOBILITY_LEVELS.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, mobilityLevel: m.key }))}
                          className={[
                            'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                            form.mobilityLevel === m.key
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border hover:border-primary/50',
                          ].join(' ')}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4 — Notes */}
              {step === 4 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Additional notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    maxLength={500}
                    rows={5}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none"
                    placeholder="Any helpful context for caregivers…"
                  />
                  <p className="text-right text-xs text-muted-foreground">{form.notes.length}/500</p>
                </div>
              )}
            </CareRecipientShell>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add "app/(client)/client/dashboard/_components/care-recipient-shell.tsx" "app/(client)/client/dashboard/_components/care-recipient-modal.tsx"
git commit -m "feat: add 4-step care recipient modal"
```

---

## Task 9: Care Request Modal (6 Steps)

**Files:**
- Create: `app/(client)/client/dashboard/_components/care-request-shell.tsx`
- Create: `app/(client)/client/dashboard/_components/care-request-modal.tsx`

- [ ] **Step 1: Create modal shell**

```typescript
// app/(client)/client/dashboard/_components/care-request-shell.tsx
'use client'

const STEPS = ['Care Type', 'Recipient', 'Address', 'Schedule', 'Preferences', 'Review']

interface Props {
  currentStep: number
  title: string
  children: React.ReactNode
  onBack: () => void
  onNext?: () => void
  onSubmit?: () => void
  isSubmitting?: boolean
  nextDisabled?: boolean
  submitDisabled?: boolean
}

export function CareRequestShell({
  currentStep, title, children, onBack, onNext, onSubmit,
  isSubmitting, nextDisabled, submitDisabled,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={[
              'flex-1 h-1 rounded-full transition-colors',
              i + 1 <= currentStep ? 'bg-primary' : 'bg-muted',
            ].join(' ')}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-1">Step {currentStep} of {STEPS.length}</p>
      <h2 className="text-xl font-semibold mb-6">{title}</h2>

      <div className="flex-1 overflow-y-auto">{children}</div>

      <div className="flex justify-between pt-6 border-t border-border mt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
        {currentStep < STEPS.length ? (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || submitDisabled}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            {isSubmitting ? 'Submitting…' : 'Submit Request'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the 6-step Care Request Modal**

```typescript
// app/(client)/client/dashboard/_components/care-request-modal.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useCompletion } from 'ai/react'
import { createCareRequest } from '@/domains/clients/requests'
import {
  CARE_TYPES, CARE_FREQUENCIES, DAYS_OF_WEEK, SHIFTS, CARE_DURATIONS,
  GENDER_PREFERENCES, LANGUAGES, BUDGET_TYPES, US_STATES,
} from '@/lib/constants'
import { CareRequestShell } from './care-request-shell'
import { CareRecipientModal } from './care-recipient-modal'

interface RecipientOption {
  id: string
  name: string
  relationship: string | null
  photoUrl: string | null
}

interface Address {
  address1: string
  address2: string
  city: string
  state: string
}

interface RequestForm {
  careType: string
  recipientId: string
  recipientName: string
  address: Address
  frequency: string
  days: string[]
  shifts: string[]
  startDate: string
  durationHours: number
  genderPref: string
  languagePref: string[]
  budgetType: string
  budgetAmount: string
  title: string
  description: string
}

const EMPTY: RequestForm = {
  careType: '', recipientId: '', recipientName: '',
  address: { address1: '', address2: '', city: '', state: '' },
  frequency: '', days: [], shifts: [], startDate: '', durationHours: 0,
  genderPref: '', languagePref: [], budgetType: '', budgetAmount: '',
  title: '', description: '',
}

interface Props {
  recipients: RecipientOption[]
}

export function CareRequestModal({ recipients: initialRecipients }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<RequestForm>(EMPTY)
  const [recipients, setRecipients] = useState<RecipientOption[]>(initialRecipients)
  const [generated, setGenerated] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { complete, isLoading: isGenerating } = useCompletion({
    api: '/api/care-request/generate',
    onFinish: (_prompt, completion) => {
      const titleMatch = completion.match(/^TITLE:\s*(.+)$/m)
      const descMatch = completion.match(/^DESCRIPTION:\s*([\s\S]+)$/m)
      if (titleMatch) setForm((f) => ({ ...f, title: titleMatch[1].trim() }))
      if (descMatch) setForm((f) => ({ ...f, description: descMatch[1].trim() }))
      setGenerated(true)
    },
  })

  function reset() {
    setStep(1)
    setForm(EMPTY)
    setGenerated(false)
  }

  function handleClose() {
    reset()
    setOpen(false)
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1)
    else handleClose()
  }

  function handleNext() { setStep((s) => s + 1) }

  function toggleMulti(field: 'days' | 'shifts' | 'languagePref', key: string) {
    setForm((f) => ({
      ...f,
      [field]: (f[field] as string[]).includes(key)
        ? (f[field] as string[]).filter((v) => v !== key)
        : [...(f[field] as string[]), key],
    }))
  }

  function handleRecipientSelect(id: string) {
    const rec = recipients.find((r) => r.id === id)
    setForm((f) => ({ ...f, recipientId: id, recipientName: rec?.name ?? '' }))
  }

  function handleNewRecipientCreated(id: string, name: string) {
    const newRec: RecipientOption = { id, name, relationship: null, photoUrl: null }
    setRecipients((prev) => [...prev, newRec])
    setForm((f) => ({ ...f, recipientId: id, recipientName: name }))
    setStep(3)
  }

  function handleGenerate() {
    complete('', {
      body: {
        careType: form.careType,
        recipientName: form.recipientName,
        conditions: [],
        mobility: undefined,
        frequency: form.frequency,
        days: form.days,
        shifts: form.shifts,
        duration: String(form.durationHours),
        languages: form.languagePref,
        budgetType: form.budgetType || undefined,
        budgetAmount: form.budgetAmount || undefined,
      },
    })
  }

  function handleSubmit() {
    startTransition(async () => {
      await createCareRequest({
        recipientId:  form.recipientId,
        careType:     form.careType,
        address:      form.address,
        frequency:    form.frequency,
        days:         form.days,
        shifts:       form.shifts,
        startDate:    form.startDate,
        durationHours:form.durationHours,
        genderPref:   form.genderPref || undefined,
        languagePref: form.languagePref,
        budgetType:   form.budgetType || undefined,
        budgetAmount: form.budgetAmount || undefined,
        title:        form.title,
        description:  form.description,
      })
      router.refresh()
      handleClose()
    })
  }

  const stepValid = [
    form.careType.length > 0,
    form.recipientId.length > 0,
    form.address.address1.trim().length > 0 && form.address.city.trim().length > 0 && form.address.state.length > 0,
    form.frequency.length > 0 && form.days.length > 0 && form.shifts.length > 0 && form.startDate.length > 0 && form.durationHours > 0,
    form.genderPref.length > 0,
    form.title.trim().length > 0 && form.description.trim().length > 0,
  ]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
      >
        + Care Request
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-2xl rounded-xl bg-background p-8 shadow-xl max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>

            <CareRequestShell
              currentStep={step}
              title={
                step === 1 ? 'What type of care is needed?' :
                step === 2 ? 'Who needs care?' :
                step === 3 ? 'Where will care take place?' :
                step === 4 ? 'Schedule' :
                step === 5 ? 'Preferences' :
                'Review & generate'
              }
              onBack={handleBack}
              onNext={handleNext}
              onSubmit={handleSubmit}
              isSubmitting={isPending}
              nextDisabled={!stepValid[step - 1]}
              submitDisabled={!stepValid[5]}
            >
              {/* Step 1 — Care Type */}
              {step === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  {CARE_TYPES.map((ct) => (
                    <button
                      key={ct.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, careType: ct.key }))}
                      className={[
                        'rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors text-left',
                        form.careType === ct.key
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50',
                      ].join(' ')}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2 — Select Recipient */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {recipients.map((r) => {
                      const initials = r.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleRecipientSelect(r.id)}
                          className={[
                            'flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-sm text-left transition-colors',
                            form.recipientId === r.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50',
                          ].join(' ')}
                        >
                          {r.photoUrl ? (
                            <img src={r.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                              {initials}
                            </span>
                          )}
                          <div>
                            <p className="font-medium">{r.name}</p>
                            {r.relationship && <p className="text-xs text-muted-foreground capitalize">{r.relationship.replace('-', ' ')}</p>}
                          </div>
                        </button>
                      )
                    })}
                    <CareRecipientModal
                      onRecipientCreated={handleNewRecipientCreated}
                      triggerLabel="+ Add New Recipient"
                    />
                  </div>
                </div>
              )}

              {/* Step 3 — Address */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Address Line 1 *</label>
                    <input
                      type="text"
                      value={form.address.address1}
                      onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, address1: e.target.value } }))}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={form.address.address2}
                      onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, address2: e.target.value } }))}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">City *</label>
                      <input
                        type="text"
                        value={form.address.city}
                        onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">State *</label>
                      <select
                        value={form.address.state}
                        onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, state: e.target.value } }))}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <option value="">Select state</option>
                        {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Country</label>
                    <input type="text" value="United States" disabled className="w-full rounded-md border border-border px-3 py-2 text-sm bg-muted" />
                  </div>
                </div>
              )}

              {/* Step 4 — Schedule */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Frequency *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CARE_FREQUENCIES.map((f) => (
                        <button key={f.key} type="button"
                          onClick={() => setForm((fm) => ({ ...fm, frequency: f.key }))}
                          className={['rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors', form.frequency === f.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3">Days *</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((d) => (
                        <button key={d.key} type="button"
                          onClick={() => toggleMulti('days', d.key)}
                          className={['rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors', form.days.includes(d.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                          {d.label.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3">Time of Day *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SHIFTS.map((s) => (
                        <button key={s.key} type="button"
                          onClick={() => toggleMulti('shifts', s.key)}
                          className={['rounded-lg border-2 px-3 py-2 text-sm text-left transition-colors', form.shifts.includes(s.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                          <p className="font-medium">{s.label}</p>
                          <p className="text-xs text-muted-foreground">{s.time}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Start Date *</label>
                      <input type="date" value={form.startDate}
                        onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-3">Duration *</label>
                      <div className="flex flex-wrap gap-2">
                        {CARE_DURATIONS.map((d) => (
                          <button key={d.key} type="button"
                            onClick={() => setForm((f) => ({ ...f, durationHours: d.hours }))}
                            className={['rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors', form.durationHours === d.hours ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5 — Preferences */}
              {step === 5 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Caregiver Gender Preference *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {GENDER_PREFERENCES.map((g) => (
                        <button key={g.key} type="button"
                          onClick={() => setForm((f) => ({ ...f, genderPref: g.key }))}
                          className={['rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors', form.genderPref === g.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3">Languages</label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map((l) => (
                        <button key={l.key} type="button"
                          onClick={() => toggleMulti('languagePref', l.key)}
                          className={['rounded-lg border-2 px-3 py-2 text-sm transition-colors', form.languagePref.includes(l.key) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3">Budget Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {BUDGET_TYPES.map((b) => (
                        <button key={b.key} type="button"
                          onClick={() => setForm((f) => ({ ...f, budgetType: b.key }))}
                          className={['rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors', form.budgetType === b.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'].join(' ')}>
                          {b.label}
                        </button>
                      ))}
                    </div>
                    {form.budgetType && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-1">Budget Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <input type="number" min="0" value={form.budgetAmount}
                            onChange={(e) => setForm((f) => ({ ...f, budgetAmount: e.target.value }))}
                            className="w-full rounded-md border border-border pl-7 pr-3 py-2 text-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 6 — AI Generation */}
              {step === 6 && (
                <div className="space-y-5">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
                    >
                      {isGenerating ? 'Generating…' : generated ? 'Regenerate' : 'Generate with AI'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      maxLength={100}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      placeholder="Generate or type a title…"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      maxLength={500}
                      rows={5}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none"
                      placeholder="Generate or write a description…"
                    />
                    <p className="text-right text-xs text-muted-foreground mt-1">{form.description.length}/500</p>
                  </div>
                </div>
              )}
            </CareRequestShell>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "app/(client)/client/dashboard/_components/care-request-shell.tsx" "app/(client)/client/dashboard/_components/care-request-modal.tsx"
git commit -m "feat: add 6-step care request modal with AI generation"
```

---

## Task 10: Install date-fns and verify full build

**Files:** none created — dependency + build check only

- [ ] **Step 1: Install date-fns if not already present**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/.worktrees/phase-1-foundation
cat package.json | grep date-fns
```

If not found:

```bash
npm install date-fns
```

- [ ] **Step 2: Run full type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass (existing Phase 3 tests + 7 new Server Action tests + 3 new route handler tests)

- [ ] **Step 4: Commit (if date-fns was installed)**

```bash
git add package.json package-lock.json
git commit -m "chore: add date-fns dependency"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Sidebar with `usePathname()`, nav links, notification bell, user avatar + sign-out | Task 3 |
| Home: 3 stat cards (recipients, active requests, pending matches) | Task 4 |
| Home: recent requests list (last 5) with status badges | Task 4 |
| Home: activity timeline (last 10, relative time) | Task 4 |
| Home: "+ Add Recipient" + "+ Care Request" action buttons | Task 4 |
| Recipients page: grid of cards with photo/initials, name, relationship, conditions, mobility | Task 5 |
| Requests page: list ordered by `createdAt DESC`, status badges, "New Request" button | Task 6 |
| Find Caregivers, Care Plans, Calendar stub pages | Task 7 |
| `CareRecipientModal` 4 steps: Relationship → Basic Info → Health & Mobility → Notes | Task 8 |
| "Myself" selection skips to step 4, Back from step 4 returns to step 1 | Task 8 |
| `CareRequestModal` 6 steps: Care Type → Recipient → Address → Schedule → Preferences → AI | Task 9 |
| Step 2 "Add New Recipient" card opens `CareRecipientModal` inline, auto-selects on save | Task 9 |
| Step 6 AI generation via `useCompletion`, typewriter + editable fields | Task 9 |
| Submit inserts to `careRequests` (status: `'active'`) + `careRequestLocations` | Task 1 |
| `POST /api/care-request/generate` with `streamText` + `gpt-4o` | Task 2 |
| Server Actions: `createCareRecipient`, `createCareRequest` (TDD) | Task 1 |
| Route handler tests: 401, prompt contains careType, returns streaming response | Task 2 |
| After modal submit: `router.refresh()` | Tasks 8, 9 |

**No placeholders found.**

**Type consistency:** `RecipientOption` defined in Task 9 uses `id`, `name`, `relationship | null`, `photoUrl | null` — matches what the home page (Task 4) and requests page (Task 6) select from DB. `createCareRequest` signature matches Task 1 definition.
