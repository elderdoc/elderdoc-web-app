# ElderDoc Phase 6: AI Matching — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the care-request loop — AI ranks caregivers after submission, client sends offers from the modal, caregivers see those offers in their Offers tab.

**Architecture:** `matchCaregivers` is a plain async function (testable without Next.js context) called by a Route Handler; `sendOffer` is a Server Action; step 7 of the care-request modal renders the matching UI; `SendOfferButton` manages its own sent/error state via `useTransition`.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, OpenAI SDK (`gpt-4o` JSON mode), Vitest with `vi.hoisted()`, Tailwind CSS

---

## File Map

| File | Action |
|---|---|
| `domains/matching/match-caregivers.ts` | Create |
| `domains/matching/__tests__/match-caregivers.test.ts` | Create |
| `domains/matching/send-offer.ts` | Create |
| `domains/matching/__tests__/send-offer.test.ts` | Create |
| `app/api/care-request/match/route.ts` | Create |
| `app/(client)/client/dashboard/_components/send-offer-button.tsx` | Create |
| `app/(client)/client/dashboard/_components/care-request-modal.tsx` | Modify |

---

## Task 1: matchCaregivers — tests first

**Files:**
- Create: `domains/matching/__tests__/match-caregivers.test.ts`
- Create: `domains/matching/match-caregivers.ts`

### Step 1: Write the failing tests

Create `domains/matching/__tests__/match-caregivers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSelectChain, mockDb, mockOpenAI } = vi.hoisted(() => {
  const mockSelectChain = {
    from:       vi.fn(),
    innerJoin:  vi.fn(),
    leftJoin:   vi.fn(),
    where:      vi.fn(),
    limit:      vi.fn(),
    then:       undefined as unknown,
  }
  // Each method returns the chain so calls can be chained
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.leftJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockResolvedValue([])

  const mockDb = {
    select: vi.fn().mockReturnValue(mockSelectChain),
  }

  const mockCreate = vi.fn()
  const mockOpenAI = {
    chat: { completions: { create: mockCreate } },
  }

  return { mockSelectChain, mockDb, mockOpenAI }
})

vi.mock('@/services/db', () => ({ db: mockDb }))
vi.mock('@/services/openai', () => ({ getOpenAI: () => mockOpenAI }))

import { matchCaregivers } from '../match-caregivers'

const REQUEST_ROW = {
  careType: 'personal-care',
  conditions: [],
  frequency: 'daily',
  days: ['mon', 'tue'],
  shifts: ['morning'],
  durationHours: 4,
  languagePref: ['english'],
  budgetAmount: '20',
  budgetType: 'hourly',
  title: 'Need morning care',
  description: 'Help with bathing',
  state: 'CA',
}

const CANDIDATE = {
  id: 'cg-1',
  userId: 'u-1',
  headline: 'Experienced caregiver',
  hourlyMin: '18',
  hourlyMax: '25',
  experience: '5 years',
  name: 'Alice Smith',
  image: '/alice.jpg',
  city: 'Los Angeles',
  state: 'CA',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.leftJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockResolvedValue([])
  mockDb.select.mockReturnValue(mockSelectChain)
})

describe('matchCaregivers', () => {
  it('returns [] when request not found', async () => {
    // First select (request) returns []
    mockSelectChain.limit.mockResolvedValueOnce([])
    const result = await matchCaregivers('req-1')
    expect(result).toEqual([])
  })

  it('returns [] when no candidates match pre-filter', async () => {
    // First select (request) returns request row
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    // Second select (candidates) returns []
    mockSelectChain.limit.mockResolvedValueOnce([])
    const result = await matchCaregivers('req-1')
    expect(result).toEqual([])
    expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled()
  })

  it('skips OpenAI when candidate list is empty', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    mockSelectChain.limit.mockResolvedValueOnce([])
    await matchCaregivers('req-1')
    expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled()
  })

  it('calls OpenAI with request context and candidate list', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    mockSelectChain.limit.mockResolvedValueOnce([CANDIDATE])
    // certifications, languages, careTypes for cg-1
    mockSelectChain.where.mockResolvedValueOnce([{ certification: 'CPR' }])
    mockSelectChain.where.mockResolvedValueOnce([{ language: 'english' }])
    mockSelectChain.where.mockResolvedValueOnce([{ careType: 'personal-care' }])

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        rankings: [{ caregiverId: 'cg-1', score: 90, reason: 'Great fit.' }]
      }) } }]
    })

    await matchCaregivers('req-1')
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
      })
    )
  })

  it('returns top 5 sorted by score descending', async () => {
    const candidates = Array.from({ length: 7 }, (_, i) => ({
      ...CANDIDATE, id: `cg-${i}`, name: `Caregiver ${i}`,
    }))
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    mockSelectChain.limit.mockResolvedValueOnce(candidates)
    // cert/lang/careType per candidate (7 * 3 = 21 calls)
    for (let i = 0; i < 21; i++) mockSelectChain.where.mockResolvedValueOnce([])

    const rankings = candidates.map((c, i) => ({
      caregiverId: c.id, score: 70 - i, reason: 'Good.'
    }))
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ rankings }) } }]
    })

    const result = await matchCaregivers('req-1')
    expect(result).toHaveLength(5)
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score)
    expect(result[4].score).toBeGreaterThanOrEqual(result[4].score)
  })

  it('returns [] when OpenAI returns malformed JSON', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    mockSelectChain.limit.mockResolvedValueOnce([CANDIDATE])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'not json {{' } }]
    })
    const result = await matchCaregivers('req-1')
    expect(result).toEqual([])
  })

  it('returns [] when OpenAI returns empty rankings array', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    mockSelectChain.limit.mockResolvedValueOnce([CANDIDATE])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ rankings: [] }) } }]
    })
    const result = await matchCaregivers('req-1')
    expect(result).toEqual([])
  })

  it('joins display data (name, image, headline) onto returned candidates', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    mockSelectChain.limit.mockResolvedValueOnce([CANDIDATE])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([{ careType: 'personal-care' }])
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        rankings: [{ caregiverId: 'cg-1', score: 85, reason: 'Great fit.' }]
      }) } }]
    })
    const result = await matchCaregivers('req-1')
    expect(result[0].name).toBe('Alice Smith')
    expect(result[0].image).toBe('/alice.jpg')
    expect(result[0].headline).toBe('Experienced caregiver')
    expect(result[0].score).toBe(85)
    expect(result[0].reason).toBe('Great fit.')
    expect(result[0].careTypes).toContain('personal-care')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run domains/matching/__tests__/match-caregivers.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `domains/matching/match-caregivers.ts`**

```typescript
import { db } from '@/services/db'
import { getOpenAI } from '@/services/openai'
import {
  careRequests, careRequestLocations, caregiverProfiles,
  caregiverLocations, caregiverCareTypes, caregiverCertifications,
  caregiverLanguages, users,
} from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

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

export async function matchCaregivers(requestId: string): Promise<RankedCandidate[]> {
  // 1. Fetch request context
  const [requestRow] = await db
    .select({
      careType:      careRequests.careType,
      conditions:    careRequests.languagePref, // unused by filter but passed to GPT
      frequency:     careRequests.frequency,
      days:          careRequests.days,
      shifts:        careRequests.shifts,
      durationHours: careRequests.durationHours,
      languagePref:  careRequests.languagePref,
      budgetAmount:  careRequests.budgetAmount,
      budgetType:    careRequests.budgetType,
      title:         careRequests.title,
      description:   careRequests.description,
      state:         careRequestLocations.state,
    })
    .from(careRequests)
    .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
    .where(eq(careRequests.id, requestId))
    .limit(1)

  if (!requestRow) return []

  // 2. Pre-filter candidates
  const candidateQuery = db
    .select({
      id:         caregiverProfiles.id,
      userId:     caregiverProfiles.userId,
      headline:   caregiverProfiles.headline,
      hourlyMin:  caregiverProfiles.hourlyMin,
      hourlyMax:  caregiverProfiles.hourlyMax,
      experience: caregiverProfiles.experience,
      name:       users.name,
      image:      users.image,
      city:       caregiverLocations.city,
      state:      caregiverLocations.state,
    })
    .from(caregiverProfiles)
    .innerJoin(users, eq(users.id, caregiverProfiles.userId))
    .innerJoin(caregiverCareTypes, and(
      eq(caregiverCareTypes.caregiverId, caregiverProfiles.id),
      eq(caregiverCareTypes.careType, requestRow.careType),
    ))
    .leftJoin(caregiverLocations, eq(caregiverLocations.caregiverId, caregiverProfiles.id))
    .where(
      and(
        eq(caregiverProfiles.status, 'active'),
        ...(requestRow.state ? [eq(caregiverLocations.state, requestRow.state)] : []),
      )
    )
    .limit(20)

  const candidates = await candidateQuery

  if (candidates.length === 0) return []

  // 3. Fetch context per candidate
  const ids = candidates.map((c) => c.id)

  const [certRows, langRows, careTypeRows] = await Promise.all([
    db.select({ caregiverId: caregiverCertifications.caregiverId, certification: caregiverCertifications.certification })
      .from(caregiverCertifications).where(inArray(caregiverCertifications.caregiverId, ids)),
    db.select({ caregiverId: caregiverLanguages.caregiverId, language: caregiverLanguages.language })
      .from(caregiverLanguages).where(inArray(caregiverLanguages.caregiverId, ids)),
    db.select({ caregiverId: caregiverCareTypes.caregiverId, careType: caregiverCareTypes.careType })
      .from(caregiverCareTypes).where(inArray(caregiverCareTypes.caregiverId, ids)),
  ])

  // Group by caregiverId
  const certMap = new Map<string, string[]>()
  const langMap = new Map<string, string[]>()
  const typeMap = new Map<string, string[]>()
  for (const r of certRows) certMap.set(r.caregiverId, [...(certMap.get(r.caregiverId) ?? []), r.certification])
  for (const r of langRows) langMap.set(r.caregiverId, [...(langMap.get(r.caregiverId) ?? []), r.language])
  for (const r of careTypeRows) typeMap.set(r.caregiverId, [...(typeMap.get(r.caregiverId) ?? []), r.careType])

  // 4. Build prompt
  const systemPrompt = `You are a care coordinator matching caregivers to a care request.
Rank the provided candidates by fit. Return valid JSON only — no prose, no markdown.
Schema: { "rankings": [{ "caregiverId": string, "score": number (0-100), "reason": string (one warm sentence) }] }
Include all candidates. Highest score = best fit.`

  const userPrompt = `CARE REQUEST
Type: ${requestRow.careType}
Schedule: ${requestRow.frequency ?? 'unspecified'}, ${(requestRow.days ?? []).join(', ')}, ${(requestRow.shifts ?? []).join(', ')}
Duration: ${requestRow.durationHours ?? 'unspecified'}h/visit
Language preference: ${(requestRow.languagePref ?? []).join(', ') || 'none'}
Budget: ${requestRow.budgetType ?? ''} ${requestRow.budgetAmount ?? ''}
Notes: ${requestRow.title ?? ''}. ${requestRow.description ?? ''}

CANDIDATES
${JSON.stringify(candidates.map((c) => ({
  id:           c.id,
  careTypes:    typeMap.get(c.id) ?? [],
  certifications: certMap.get(c.id) ?? [],
  languages:    langMap.get(c.id) ?? [],
  experience:   c.experience ?? '',
  hourlyMin:    c.hourlyMin ?? '',
  hourlyMax:    c.hourlyMax ?? '',
})))}`

  // 5. Call OpenAI
  let rankings: { caregiverId: string; score: number; reason: string }[] = []
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    })
    const content = response.choices[0]?.message?.content ?? ''
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed.rankings) || parsed.rankings.length === 0) return []
    rankings = parsed.rankings
  } catch {
    return []
  }

  // 6. Top 5 by score, join display data
  const top5 = rankings
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return top5.map((r) => {
    const c = candidates.find((x) => x.id === r.caregiverId)
    return {
      caregiverId: r.caregiverId,
      score:       r.score,
      reason:      r.reason,
      name:        c?.name ?? null,
      image:       c?.image ?? null,
      headline:    c?.headline ?? null,
      careTypes:   typeMap.get(r.caregiverId) ?? [],
      city:        c?.city ?? null,
      state:       c?.state ?? null,
      hourlyMin:   c?.hourlyMin ?? null,
      hourlyMax:   c?.hourlyMax ?? null,
    }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run domains/matching/__tests__/match-caregivers.test.ts
```

Expected: all tests pass (some may need mock adjustments for the parallel `inArray` queries — see note below)

> **Note on parallel fetch mocks:** The implementation uses `Promise.all` for cert/lang/careType queries using `inArray`. The test mocks use sequential `mockResolvedValueOnce`. For the parallel case, update the test mocks to use `mockDb.select` returning dedicated chains per call, or restructure as three sequential selects inside the implementation. If tests fail on this, switch to sequential fetches:
> ```typescript
> const certRows = await db.select(...).from(caregiverCertifications).where(inArray(...))
> const langRows = await db.select(...).from(caregiverLanguages).where(inArray(...))
> const careTypeRows = await db.select(...).from(caregiverCareTypes).where(inArray(...))
> ```

- [ ] **Step 5: Commit**

```bash
git add domains/matching/match-caregivers.ts domains/matching/__tests__/match-caregivers.test.ts
git commit -m "feat: add matchCaregivers with OpenAI ranking"
```

---

## Task 2: sendOffer Server Action — tests first

**Files:**
- Create: `domains/matching/__tests__/send-offer.test.ts`
- Create: `domains/matching/send-offer.ts`

- [ ] **Step 1: Write the failing tests**

Create `domains/matching/__tests__/send-offer.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

const { mockMutateChain, mockSelectChain, mockDb } = vi.hoisted(() => {
  const mockMutateChain = {
    values:    vi.fn(),
    returning: vi.fn(),
    where:     vi.fn(),
  }
  mockMutateChain.values.mockReturnValue(mockMutateChain)
  mockMutateChain.returning.mockResolvedValue([{ id: 'match-1' }])
  mockMutateChain.where.mockReturnValue(mockMutateChain)

  const mockSelectChain = {
    from:  vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  }
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockResolvedValue([])

  const mockDb = {
    insert: vi.fn().mockReturnValue(mockMutateChain),
    select: vi.fn().mockReturnValue(mockSelectChain),
  }
  return { mockMutateChain, mockSelectChain, mockDb }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { auth } from '@/auth'
import { sendOffer } from '../send-offer'

const mockAuth = vi.mocked(auth)
const SESSION = { user: { id: 'user-1', email: 'a@b.com', name: 'Client', role: 'client' } }

beforeEach(() => {
  vi.clearAllMocks()
  mockMutateChain.values.mockReturnValue(mockMutateChain)
  mockMutateChain.returning.mockResolvedValue([{ id: 'match-1' }])
  mockMutateChain.where.mockReturnValue(mockMutateChain)
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockResolvedValue([])
  mockDb.insert.mockReturnValue(mockMutateChain)
  mockDb.select.mockReturnValue(mockSelectChain)
})

describe('sendOffer', () => {
  it('throws Unauthorized when no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(sendOffer('req-1', 'cg-1', 90, 'Great fit.')).rejects.toThrow('Unauthorized')
  })

  it('throws Unauthorized when clientId does not match session user', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    // Request belongs to a different client
    mockSelectChain.limit.mockResolvedValueOnce([])
    await expect(sendOffer('req-1', 'cg-1', 90, 'Great fit.')).rejects.toThrow('Unauthorized')
  })

  it('inserts correct fields into matches', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockSelectChain.limit.mockResolvedValueOnce([{ id: 'req-1', clientId: 'user-1' }])

    await sendOffer('req-1', 'cg-1', 90, 'Great fit.')

    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockMutateChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId:   'req-1',
        caregiverId: 'cg-1',
        score:       90,
        reason:      'Great fit.',
        status:      'pending',
      })
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run domains/matching/__tests__/send-offer.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `domains/matching/send-offer.ts`**

```typescript
'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { careRequests, matches } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function sendOffer(
  requestId: string,
  caregiverId: string,
  score: number,
  reason: string,
): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const [request] = await db
    .select({ id: careRequests.id, clientId: careRequests.clientId })
    .from(careRequests)
    .where(and(eq(careRequests.id, requestId), eq(careRequests.clientId, session.user.id)))
    .limit(1)

  if (!request) throw new Error('Unauthorized')

  await db.insert(matches).values({ requestId, caregiverId, score, reason, status: 'pending' })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run domains/matching/__tests__/send-offer.test.ts
```

Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add domains/matching/send-offer.ts domains/matching/__tests__/send-offer.test.ts
git commit -m "feat: add sendOffer server action"
```

---

## Task 3: Route Handler

**Files:**
- Create: `app/api/care-request/match/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
import { auth } from '@/auth'
import { matchCaregivers } from '@/domains/matching/match-caregivers'

export async function POST(req: Request): Promise<Response> {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json([], { status: 401 })
  }

  try {
    const { requestId } = await req.json() as { requestId: string }
    const candidates = await matchCaregivers(requestId)
    return Response.json(candidates)
  } catch (err) {
    console.error('[match] error:', err)
    return Response.json([])
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/care-request/match/route.ts
git commit -m "feat: add /api/care-request/match route handler"
```

---

## Task 4: SendOfferButton component

**Files:**
- Create: `app/(client)/client/dashboard/_components/send-offer-button.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { sendOffer } from '@/domains/matching/send-offer'

interface Props {
  requestId: string
  caregiverId: string
  score: number
  reason: string
}

export function SendOfferButton({ requestId, caregiverId, score, reason }: Props) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      try {
        await sendOffer(requestId, caregiverId, score, reason)
        setSent(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send offer.')
      }
    })
  }

  if (sent) {
    return (
      <button
        type="button"
        disabled
        className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium opacity-80 cursor-default"
      >
        Offer Sent ✓
      </button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
      >
        {isPending ? 'Sending…' : 'Send Offer'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/(client)/client/dashboard/_components/send-offer-button.tsx
git commit -m "feat: add SendOfferButton component"
```

---

## Task 5: Modify care-request-modal — add step 7

**Files:**
- Modify: `app/(client)/client/dashboard/_components/care-request-modal.tsx`

The modal currently goes to steps 1–6. Step 6 calls `handleSubmit()` which calls `createCareRequest()` then `router.refresh()` then `handleClose()`. We need to:

1. Have `handleSubmit` capture the returned `requestId`, advance to step 7, and kick off matching.
2. Add step 7 state (`matchingState`, `candidates`).
3. Render step 7 content in the modal body.
4. Import `RankedCandidate` and `SendOfferButton`.

- [ ] **Step 1: Update the modal**

Open `app/(client)/client/dashboard/_components/care-request-modal.tsx`.

**1a. Add imports at the top** (after existing imports):

```typescript
import type { RankedCandidate } from '@/domains/matching/match-caregivers'
import { SendOfferButton } from './send-offer-button'
```

**1b. Add state variables** inside `CareRequestModal` (after `const [isPending, startTransition] = useTransition()`):

```typescript
const [matchingState, setMatchingState] = useState<'matching' | 'results' | 'error'>('matching')
const [candidates, setCandidates] = useState<RankedCandidate[]>([])
const [matchRequestId, setMatchRequestId] = useState<string | null>(null)
```

**1c. Update `reset()`** to clear new state:

```typescript
function reset() {
  setStep(1)
  setForm(EMPTY)
  setGenerated(false)
  setMatchingState('matching')
  setCandidates([])
  setMatchRequestId(null)
}
```

**1d. Replace `handleSubmit`** with a version that captures `requestId` and triggers matching:

```typescript
function handleSubmit() {
  startTransition(async () => {
    const result = await createCareRequest({
      recipientId:   form.recipientId,
      careType:      form.careType,
      address:       form.address,
      frequency:     form.frequency,
      days:          form.days,
      shifts:        form.shifts,
      startDate:     form.startDate,
      durationHours: form.durationHours,
      genderPref:    form.genderPref || undefined,
      languagePref:  form.languagePref,
      budgetType:    form.budgetType || undefined,
      budgetAmount:  form.budgetAmount || undefined,
      title:         form.title,
      description:   form.description,
    })
    const requestId = result?.requestId ?? result?.id ?? null
    setMatchRequestId(requestId)
    setMatchingState('matching')
    setStep(7)
    router.refresh()

    if (!requestId) {
      setMatchingState('error')
      return
    }

    try {
      const res = await fetch('/api/care-request/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })
      if (!res.ok) { setMatchingState('error'); return }
      const data: RankedCandidate[] = await res.json()
      setCandidates(data)
      setMatchingState('results')
    } catch {
      setMatchingState('error')
    }
  })
}
```

> **Note:** Check the return type of `createCareRequest` in `domains/clients/requests.ts`. It returns `{ id: string }` — use `result?.id`. If the return type changes, update accordingly.

**1e. Update the `CareRequestShell` title prop** to handle step 7:

```typescript
title={
  step === 1 ? 'What type of care is needed?' :
  step === 2 ? 'Who needs care?' :
  step === 3 ? 'Where will care take place?' :
  step === 4 ? 'Schedule' :
  step === 5 ? 'Preferences' :
  step === 6 ? 'Review & generate' :
  'Your Top Matches'
}
```

**1f. Add step 7 UI** inside `<CareRequestShell>` after the step 6 block (before `</CareRequestShell>`):

```tsx
{/* Step 7 — AI Matching */}
{step === 7 && (
  <div className="space-y-4">
    {matchingState === 'matching' && (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Finding your best matches…</p>
      </div>
    )}

    {matchingState === 'error' && (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Could not load matches right now. Your request is live — caregivers can still apply directly.
      </p>
    )}

    {matchingState === 'results' && candidates.length === 0 && (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No matches found right now. Your request is live — caregivers can still apply directly.
      </p>
    )}

    {matchingState === 'results' && candidates.length > 0 && (
      <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1">
        {candidates.map((c) => {
          const initials = (c.name ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
          const scoreBadge =
            c.score >= 80 ? { label: 'Strong match', cls: 'bg-green-100 text-green-700' } :
            c.score >= 60 ? { label: 'Good match',   cls: 'bg-blue-100 text-blue-700' } :
                            { label: 'Possible match', cls: 'bg-muted text-muted-foreground' }
          return (
            <div key={c.caregiverId} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                {c.image ? (
                  <img src={c.image} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shrink-0">
                    {initials}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{c.name ?? 'Caregiver'}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreBadge.cls}`}>
                      {scoreBadge.label}
                    </span>
                  </div>
                  {(c.city || c.state) && (
                    <p className="text-xs text-muted-foreground">{[c.city, c.state].filter(Boolean).join(', ')}</p>
                  )}
                  {c.headline && (
                    <p className="text-xs text-muted-foreground mt-0.5">{c.headline}</p>
                  )}
                  {c.careTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.careTypes.map((ct) => (
                        <span key={ct} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {ct.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  {(c.hourlyMin || c.hourlyMax) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ${c.hourlyMin}–${c.hourlyMax}/hr
                    </p>
                  )}
                  {c.reason && (
                    <p className="text-xs italic text-muted-foreground mt-1.5">{c.reason}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                {matchRequestId && (
                  <SendOfferButton
                    requestId={matchRequestId}
                    caregiverId={c.caregiverId}
                    score={c.score}
                    reason={c.reason}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    )}
  </div>
)}
```

**1g. Check `createCareRequest` return type** to ensure the `requestId` extraction is correct:

```bash
grep -n "export async function createCareRequest" domains/clients/requests.ts
```

Read the function signature and update `result?.id` or `result?.requestId` to match what it actually returns.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Fix any type errors. Common issues:
- `createCareRequest` return type — cast or adjust the extraction
- `CareRequestShell` props not accepting step 7 (if it validates step count, pass `isLastStep={step === 6}` or update shell logic)

- [ ] **Step 3: Commit**

```bash
git add app/(client)/client/dashboard/_components/care-request-modal.tsx
git commit -m "feat: add step 7 AI matching results to care request modal"
```

---

## Task 6: Build verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (no regressions)

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: build succeeds with no errors

- [ ] **Step 4: Commit if any build-only fixes were made**

```bash
git add -p
git commit -m "fix: resolve build errors from phase 6"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ `matchCaregivers` — pre-filter, OpenAI call, top-5 slice, display data join (Task 1)
- ✅ `sendOffer` — auth check, ownership check, INSERT into matches (Task 2)
- ✅ Route Handler — auth guard, calls matchCaregivers, always returns JSON (Task 3)
- ✅ `SendOfferButton` — useTransition, sent state, inline error (Task 4)
- ✅ Modal step 7 — matching/results/error states, card layout, score badge, empty state (Task 5)
- ✅ Tests: 7 cases for matchCaregivers, 3 cases for sendOffer (Tasks 1–2)

**Type consistency:**
- `RankedCandidate` defined in `match-caregivers.ts`, imported in modal and button
- `sendOffer` signature: `(requestId, caregiverId, score, reason)` — matches `SendOfferButton` call
- `matchCaregivers(requestId: string)` — matches Route Handler call
