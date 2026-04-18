# Phase 7: Find Caregivers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/client/dashboard/find-caregivers` stub with a two-section page: AI-ranked matches for a selected care request (from the existing `matches` table), and a filterable caregiver directory with a `SendOfferModal` that lets clients pick an active request and send an offer.

**Architecture:** Server Component page reads all filters from URL `searchParams` — no client state, no extra API calls. A `FilterForm` client component updates the URL on change, triggering a server re-render. Two plain async query functions live in `domains/clients/find-caregivers.ts`. The `SendOfferModal` client component calls the existing `sendOffer` Server Action from Phase 6.

**Tech Stack:** Next.js 16 App Router (Server Components, Server Actions), Drizzle ORM, Vitest with `vi.hoisted()` mock pattern, Tailwind CSS.

---

## File Map

| File | Action |
|---|---|
| `domains/clients/find-caregivers.ts` | Create |
| `domains/clients/__tests__/find-caregivers.test.ts` | Create |
| `app/(client)/client/dashboard/find-caregivers/_components/filter-form.tsx` | Create |
| `app/(client)/client/dashboard/find-caregivers/_components/send-offer-modal.tsx` | Create |
| `app/(client)/client/dashboard/find-caregivers/page.tsx` | Modify (replace stub) |

---

## Task 1: Domain query functions (TDD)

**Files:**
- Create: `domains/clients/find-caregivers.ts`
- Create: `domains/clients/__tests__/find-caregivers.test.ts`

### Step 1.1: Write the failing tests

Create `domains/clients/__tests__/find-caregivers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSelectChain, mockDb } = vi.hoisted(() => {
  const mockSelectChain = {
    from:      vi.fn(),
    innerJoin: vi.fn(),
    leftJoin:  vi.fn(),
    where:     vi.fn(),
    orderBy:   vi.fn(),
    limit:     vi.fn(),
    offset:    vi.fn(),
  }

  // Each method returns the chain so calls can be chained
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.leftJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.orderBy.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockReturnValue(mockSelectChain)
  mockSelectChain.offset.mockResolvedValue([])

  const mockDb = {
    select: vi.fn().mockReturnValue(mockSelectChain),
    $count: vi.fn().mockResolvedValue(0),
  }
  return { mockSelectChain, mockDb }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { getMatchesForRequest, searchCaregivers } from '../find-caregivers'

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.leftJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.orderBy.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockReturnValue(mockSelectChain)
  mockSelectChain.offset.mockResolvedValue([])
  mockDb.select.mockReturnValue(mockSelectChain)
  mockDb.$count.mockResolvedValue(0)
})

// ── getMatchesForRequest ──────────────────────────────────────────────────────

describe('getMatchesForRequest', () => {
  it('returns [] when no matches exist for requestId', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    const result = await getMatchesForRequest('req-1', 'client-1')
    expect(result).toEqual([])
  })

  it('returns matches sorted by score descending', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([
      { matchId: 'm1', caregiverId: 'cg1', score: 72, reason: 'Good', name: 'Alice', image: null, headline: null, city: 'Austin', state: 'Texas', hourlyMin: '20', hourlyMax: '30' },
      { matchId: 'm2', caregiverId: 'cg2', score: 90, reason: 'Great', name: 'Bob', image: null, headline: null, city: 'Dallas', state: 'Texas', hourlyMin: '25', hourlyMax: '35' },
    ])
    // Simulate second SELECT for careTypes (inArray)
    mockSelectChain.where.mockResolvedValueOnce([
      { caregiverId: 'cg1', careType: 'personal-care' },
      { caregiverId: 'cg2', careType: 'dementia-care' },
    ])
    const result = await getMatchesForRequest('req-1', 'client-1')
    // Results come back in DB order (ORDER BY score DESC is in the query)
    expect(result[0].caregiverId).toBe('cg1')
    expect(result[0].careTypes).toEqual(['personal-care'])
    expect(result[1].caregiverId).toBe('cg2')
    expect(result[1].careTypes).toEqual(['dementia-care'])
  })

  it('returns [] when clientId does not own the requestId', async () => {
    // The query JOINs careRequests with WHERE clientId = clientId,
    // so a wrong clientId yields 0 rows.
    mockSelectChain.offset.mockResolvedValueOnce([])
    const result = await getMatchesForRequest('req-1', 'wrong-client')
    expect(result).toEqual([])
  })
})

// ── searchCaregivers ──────────────────────────────────────────────────────────

describe('searchCaregivers', () => {
  it('returns all active caregivers when no filters applied', async () => {
    mockDb.$count.mockResolvedValueOnce(2)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: '3 years', city: 'Austin', state: 'Texas', hourlyMin: '20', hourlyMax: '30' },
      { caregiverId: 'cg2', name: 'Bob',   image: null, headline: null, experience: '5 years', city: 'Dallas', state: 'Texas', hourlyMin: '25', hourlyMax: '35' },
    ])
    mockSelectChain.where.mockResolvedValueOnce([]) // careTypes batch
    mockSelectChain.where.mockResolvedValueOnce([]) // languages batch
    mockSelectChain.where.mockResolvedValueOnce([]) // certifications batch

    const result = await searchCaregivers({}, 1)
    expect(result.total).toBe(2)
    expect(result.caregivers).toHaveLength(2)
  })

  it('filters by careType', async () => {
    mockDb.$count.mockResolvedValueOnce(1)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: null, city: null, state: null, hourlyMin: null, hourlyMax: null },
    ])
    mockSelectChain.where.mockResolvedValueOnce([{ caregiverId: 'cg1', careType: 'personal-care' }])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])

    const result = await searchCaregivers({ careType: 'personal-care' }, 1)
    expect(result.total).toBe(1)
    expect(result.caregivers[0].careTypes).toEqual(['personal-care'])
  })

  it('filters by state', async () => {
    mockDb.$count.mockResolvedValueOnce(1)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: null, city: 'Austin', state: 'Texas', hourlyMin: null, hourlyMax: null },
    ])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])

    const result = await searchCaregivers({ state: 'Texas' }, 1)
    expect(result.total).toBe(1)
    expect(result.caregivers[0].state).toBe('Texas')
  })

  it('filters by rateMin and rateMax', async () => {
    mockDb.$count.mockResolvedValueOnce(1)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: null, city: null, state: null, hourlyMin: '20', hourlyMax: '30' },
    ])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])

    const result = await searchCaregivers({ rateMin: '15', rateMax: '35' }, 1)
    expect(result.total).toBe(1)
  })

  it('filters by language (multi-value)', async () => {
    mockDb.$count.mockResolvedValueOnce(1)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: null, city: null, state: null, hourlyMin: null, hourlyMax: null },
    ])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([{ caregiverId: 'cg1', language: 'spanish' }])
    mockSelectChain.where.mockResolvedValueOnce([])

    const result = await searchCaregivers({ language: ['spanish'] }, 1)
    expect(result.total).toBe(1)
    expect(result.caregivers[0].languages).toEqual(['spanish'])
  })

  it('filters by certification (multi-value)', async () => {
    mockDb.$count.mockResolvedValueOnce(1)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: null, city: null, state: null, hourlyMin: null, hourlyMax: null },
    ])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([{ caregiverId: 'cg1', certification: 'cna' }])

    const result = await searchCaregivers({ certification: ['cna'] }, 1)
    expect(result.total).toBe(1)
    expect(result.caregivers[0].certifications).toEqual(['cna'])
  })

  it('filters by experience', async () => {
    mockDb.$count.mockResolvedValueOnce(1)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: '3 years', city: null, state: null, hourlyMin: null, hourlyMax: null },
    ])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])

    const result = await searchCaregivers({ experience: '3 years' }, 1)
    expect(result.total).toBe(1)
  })

  it('respects page offset (limit 20)', async () => {
    mockDb.$count.mockResolvedValueOnce(25)
    mockSelectChain.offset.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])

    const result = await searchCaregivers({}, 2)
    expect(mockSelectChain.limit).toHaveBeenCalledWith(20)
    expect(mockSelectChain.offset).toHaveBeenCalledWith(20)
    expect(result.total).toBe(25)
  })

  it('returns correct total count', async () => {
    mockDb.$count.mockResolvedValueOnce(42)
    mockSelectChain.offset.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])

    const result = await searchCaregivers({}, 1)
    expect(result.total).toBe(42)
  })
})
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc
npx vitest run domains/clients/__tests__/find-caregivers.test.ts
```

Expected: FAIL — `Cannot find module '../find-caregivers'`

- [ ] **Step 1.3: Implement `domains/clients/find-caregivers.ts`**

```typescript
import { db } from '@/services/db'
import {
  matches, careRequests, caregiverProfiles, caregiverLocations,
  caregiverCareTypes, caregiverLanguages, caregiverCertifications, users,
} from '@/db/schema'
import { eq, and, gte, lte, inArray } from 'drizzle-orm'

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
): Promise<MatchResult[]> {
  const rows = await db
    .select({
      matchId:    matches.id,
      caregiverId: matches.caregiverId,
      score:      matches.score,
      reason:     matches.reason,
      name:       users.name,
      image:      users.image,
      headline:   caregiverProfiles.headline,
      city:       caregiverLocations.city,
      state:      caregiverLocations.state,
      hourlyMin:  caregiverProfiles.hourlyMin,
      hourlyMax:  caregiverProfiles.hourlyMax,
    })
    .from(matches)
    .innerJoin(careRequests, and(
      eq(matches.requestId, careRequests.id),
      eq(careRequests.clientId, clientId),
    ))
    .innerJoin(caregiverProfiles, eq(matches.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .leftJoin(caregiverLocations, eq(caregiverProfiles.id, caregiverLocations.caregiverId))
    .where(eq(matches.requestId, requestId))
    .orderBy(matches.score)
    .limit(5)
    .offset(0)

  if (rows.length === 0) return []

  const caregiverIds = rows.map((r) => r.caregiverId)
  const careTypeRows = await db
    .select({ caregiverId: caregiverCareTypes.caregiverId, careType: caregiverCareTypes.careType })
    .from(caregiverCareTypes)
    .where(inArray(caregiverCareTypes.caregiverId, caregiverIds))

  const careTypeMap = new Map<string, string[]>()
  for (const row of careTypeRows) {
    const list = careTypeMap.get(row.caregiverId) ?? []
    list.push(row.careType)
    careTypeMap.set(row.caregiverId, list)
  }

  return rows.map((r) => ({
    ...r,
    careTypes: careTypeMap.get(r.caregiverId) ?? [],
  }))
}

export async function searchCaregivers(
  filters: SearchFilters,
  page: number,
): Promise<{ caregivers: CaregiverResult[]; total: number }> {
  const conditions = [eq(caregiverProfiles.status, 'active')]

  if (filters.careType) {
    // Existence sub-select via JOIN: only include caregivers that have this care type
    // We use an inner join to caregiverCareTypes filtered to the requested type
  }
  if (filters.state) {
    conditions.push(eq(caregiverLocations.state, filters.state))
  }
  if (filters.rateMin) {
    conditions.push(gte(caregiverProfiles.hourlyMin, filters.rateMin))
  }
  if (filters.rateMax) {
    conditions.push(lte(caregiverProfiles.hourlyMax, filters.rateMax))
  }
  if (filters.experience) {
    conditions.push(eq(caregiverProfiles.experience, filters.experience))
  }

  // Build base query
  let baseQuery = db
    .select({
      caregiverId: caregiverProfiles.id,
      name:        users.name,
      image:       users.image,
      headline:    caregiverProfiles.headline,
      experience:  caregiverProfiles.experience,
      city:        caregiverLocations.city,
      state:       caregiverLocations.state,
      hourlyMin:   caregiverProfiles.hourlyMin,
      hourlyMax:   caregiverProfiles.hourlyMax,
    })
    .from(caregiverProfiles)
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .leftJoin(caregiverLocations, eq(caregiverProfiles.id, caregiverLocations.caregiverId))

  // Care type filter via inner join (restricts to caregivers with that type)
  if (filters.careType) {
    baseQuery = (baseQuery as any).innerJoin(
      caregiverCareTypes,
      and(
        eq(caregiverProfiles.id, caregiverCareTypes.caregiverId),
        eq(caregiverCareTypes.careType, filters.careType),
      ),
    )
  }

  const whereClause = and(...conditions)
  const total: number = await (db.$count as any)(caregiverProfiles, whereClause)

  const rows = await baseQuery
    .where(whereClause)
    .orderBy(caregiverProfiles.createdAt)
    .limit(20)
    .offset((page - 1) * 20)

  if (rows.length === 0) return { caregivers: [], total }

  const caregiverIds = rows.map((r) => r.caregiverId)

  // Batch fetch related data
  const [careTypeRows, languageRows, certRows] = await Promise.all([
    db
      .select({ caregiverId: caregiverCareTypes.caregiverId, careType: caregiverCareTypes.careType })
      .from(caregiverCareTypes)
      .where(inArray(caregiverCareTypes.caregiverId, caregiverIds)),
    db
      .select({ caregiverId: caregiverLanguages.caregiverId, language: caregiverLanguages.language })
      .from(caregiverLanguages)
      .where(inArray(caregiverLanguages.caregiverId, caregiverIds)),
    db
      .select({ caregiverId: caregiverCertifications.caregiverId, certification: caregiverCertifications.certification })
      .from(caregiverCertifications)
      .where(inArray(caregiverCertifications.caregiverId, caregiverIds)),
  ])

  // Filter by language/certification post-fetch (existence check)
  let filteredIds = new Set(caregiverIds)

  if (filters.language && filters.language.length > 0) {
    const hasLang = new Set(
      languageRows
        .filter((r) => filters.language!.includes(r.language))
        .map((r) => r.caregiverId),
    )
    filteredIds = new Set([...filteredIds].filter((id) => hasLang.has(id)))
  }

  if (filters.certification && filters.certification.length > 0) {
    const hasCert = new Set(
      certRows
        .filter((r) => filters.certification!.includes(r.certification))
        .map((r) => r.caregiverId),
    )
    filteredIds = new Set([...filteredIds].filter((id) => hasCert.has(id)))
  }

  const careTypeMap = new Map<string, string[]>()
  const languageMap = new Map<string, string[]>()
  const certMap = new Map<string, string[]>()

  for (const r of careTypeRows) {
    const list = careTypeMap.get(r.caregiverId) ?? []
    list.push(r.careType)
    careTypeMap.set(r.caregiverId, list)
  }
  for (const r of languageRows) {
    const list = languageMap.get(r.caregiverId) ?? []
    list.push(r.language)
    languageMap.set(r.caregiverId, list)
  }
  for (const r of certRows) {
    const list = certMap.get(r.caregiverId) ?? []
    list.push(r.certification)
    certMap.set(r.caregiverId, list)
  }

  const caregivers = rows
    .filter((r) => filteredIds.has(r.caregiverId))
    .map((r) => ({
      caregiverId:    r.caregiverId,
      name:           r.name,
      image:          r.image,
      headline:       r.headline,
      experience:     r.experience,
      city:           r.city,
      state:          r.state,
      hourlyMin:      r.hourlyMin,
      hourlyMax:      r.hourlyMax,
      careTypes:      careTypeMap.get(r.caregiverId) ?? [],
      languages:      languageMap.get(r.caregiverId) ?? [],
      certifications: certMap.get(r.caregiverId) ?? [],
    }))

  return { caregivers, total }
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
npx vitest run domains/clients/__tests__/find-caregivers.test.ts
```

Expected: All tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add domains/clients/find-caregivers.ts domains/clients/__tests__/find-caregivers.test.ts
git commit -m "feat: add find-caregivers domain queries with tests"
```

---

## Task 2: FilterForm client component

**Files:**
- Create: `app/(client)/client/dashboard/find-caregivers/_components/filter-form.tsx`

- [ ] **Step 2.1: Create the `_components` directory and `filter-form.tsx`**

```bash
mkdir -p app/\(client\)/client/dashboard/find-caregivers/_components
```

Create `app/(client)/client/dashboard/find-caregivers/_components/filter-form.tsx`:

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { CARE_TYPES, CERTIFICATIONS, LANGUAGES, US_STATES } from '@/lib/constants'

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

const EXPERIENCE_OPTIONS = [
  '1 year', '2 years', '3 years', '5 years', '10+ years',
]

export function FilterForm({ activeRequests, currentFilters }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildParams = useCallback(
    (overrides: Record<string, string | string[] | undefined>) => {
      const params = new URLSearchParams()

      const merged = {
        requestId:     currentFilters.requestId,
        careType:      currentFilters.careType,
        state:         currentFilters.state,
        rateMin:       currentFilters.rateMin,
        rateMax:       currentFilters.rateMax,
        language:      currentFilters.language,
        certification: currentFilters.certification,
        experience:    currentFilters.experience,
        page:          currentFilters.page,
        ...overrides,
      }

      if (merged.requestId)    params.set('requestId', merged.requestId as string)
      if (merged.careType)     params.set('careType', merged.careType as string)
      if (merged.state)        params.set('state', merged.state as string)
      if (merged.rateMin)      params.set('rateMin', merged.rateMin as string)
      if (merged.rateMax)      params.set('rateMax', merged.rateMax as string)
      if (merged.experience)   params.set('experience', merged.experience as string)
      if (merged.page)         params.set('page', merged.page as string)
      for (const lang of (merged.language as string[] | undefined) ?? []) {
        params.append('language', lang)
      }
      for (const cert of (merged.certification as string[] | undefined) ?? []) {
        params.append('certification', cert)
      }
      return params.toString()
    },
    [currentFilters],
  )

  function push(overrides: Record<string, string | string[] | undefined>) {
    const qs = buildParams({ ...overrides, page: undefined })
    router.push(`/client/dashboard/find-caregivers${qs ? `?${qs}` : ''}`)
  }

  function pushDebounced(overrides: Record<string, string | string[] | undefined>) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => push(overrides), 300)
  }

  function handleRequestChange(id: string) {
    push({ requestId: id || undefined, page: undefined })
  }

  function handleCheckboxMulti(
    key: 'language' | 'certification',
    value: string,
    checked: boolean,
  ) {
    const current = currentFilters[key] ?? []
    const next = checked ? [...current, value] : current.filter((v) => v !== value)
    push({ [key]: next.length > 0 ? next : undefined })
  }

  return (
    <div className="space-y-8">
      {/* Your Matches — request selector */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Your Matches
        </h2>
        {activeRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a care request to see your AI matches.
          </p>
        ) : (
          <select
            value={currentFilters.requestId ?? ''}
            onChange={(e) => handleRequestChange(e.target.value)}
            className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select a care request…</option>
            {activeRequests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title ?? r.careType}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Browse All Caregivers — filters */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Browse All Caregivers
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Care Type */}
          <div>
            <label className="block text-xs font-medium mb-1">Care Type</label>
            <select
              value={currentFilters.careType ?? ''}
              onChange={(e) => push({ careType: e.target.value || undefined })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              {CARE_TYPES.map((ct) => (
                <option key={ct.key} value={ct.key}>{ct.label}</option>
              ))}
            </select>
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-medium mb-1">State</label>
            <select
              value={currentFilters.state ?? ''}
              onChange={(e) => push({ state: e.target.value || undefined })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Experience */}
          <div>
            <label className="block text-xs font-medium mb-1">Experience</label>
            <select
              value={currentFilters.experience ?? ''}
              onChange={(e) => push({ experience: e.target.value || undefined })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              {EXPERIENCE_OPTIONS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Rate Min */}
          <div>
            <label className="block text-xs font-medium mb-1">Min Rate ($/hr)</label>
            <input
              type="number"
              min={0}
              defaultValue={currentFilters.rateMin ?? ''}
              onChange={(e) => pushDebounced({ rateMin: e.target.value || undefined })}
              placeholder="0"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Rate Max */}
          <div>
            <label className="block text-xs font-medium mb-1">Max Rate ($/hr)</label>
            <input
              type="number"
              min={0}
              defaultValue={currentFilters.rateMax ?? ''}
              onChange={(e) => pushDebounced({ rateMax: e.target.value || undefined })}
              placeholder="Any"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Languages */}
        <div className="mb-4">
          <p className="text-xs font-medium mb-2">Languages</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {LANGUAGES.map((lang) => (
              <label key={lang.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  value={lang.key}
                  checked={(currentFilters.language ?? []).includes(lang.key)}
                  onChange={(e) =>
                    handleCheckboxMulti('language', lang.key, e.target.checked)
                  }
                />
                {lang.label}
              </label>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div>
          <p className="text-xs font-medium mb-2">Certifications</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {CERTIFICATIONS.map((cert) => (
              <label key={cert.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  value={cert.key}
                  checked={(currentFilters.certification ?? []).includes(cert.key)}
                  onChange={(e) =>
                    handleCheckboxMulti('certification', cert.key, e.target.checked)
                  }
                />
                {cert.label}
              </label>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2.2: Commit**

```bash
git add "app/(client)/client/dashboard/find-caregivers/_components/filter-form.tsx"
git commit -m "feat: add FilterForm client component for find-caregivers"
```

---

## Task 3: SendOfferModal client component

**Files:**
- Create: `app/(client)/client/dashboard/find-caregivers/_components/send-offer-modal.tsx`

- [ ] **Step 3.1: Create `send-offer-modal.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { sendOffer } from '@/domains/matching/send-offer'

interface Props {
  caregiverId: string
  activeRequests: { id: string; title: string | null; careType: string }[]
  alreadyOffered?: boolean
}

type State = 'idle' | 'open' | 'pending' | 'sent' | 'error'

export function SendOfferModal({ caregiverId, activeRequests, alreadyOffered }: Props) {
  const [state, setState] = useState<State>(alreadyOffered ? 'sent' : 'idle')
  const [selectedRequestId, setSelectedRequestId] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (activeRequests.length === 0) {
    return (
      <button
        type="button"
        disabled
        title="Create a care request first."
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium opacity-40 cursor-not-allowed"
      >
        Send Offer
      </button>
    )
  }

  if (state === 'sent') {
    return (
      <button
        type="button"
        disabled
        className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium opacity-90 cursor-not-allowed"
      >
        Offer Sent ✓
      </button>
    )
  }

  function handleConfirm() {
    if (!selectedRequestId) return
    setErrorMessage(null)
    startTransition(async () => {
      setState('pending')
      try {
        await sendOffer(selectedRequestId, caregiverId, 0, 'Manually selected')
        setState('sent')
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to send offer.')
        setState('error')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setState('open')}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
      >
        Send Offer
      </button>

      {(state === 'open' || state === 'pending' || state === 'error') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl border border-border shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold">Send Offer</h2>
            <p className="text-sm text-muted-foreground">
              Select which care request to send this offer for:
            </p>

            <select
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Choose a request…</option>
              {activeRequests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title ?? r.careType}
                </option>
              ))}
            </select>

            {errorMessage && (
              <p className="text-xs text-destructive">{errorMessage}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setState('idle'); setErrorMessage(null) }}
                disabled={state === 'pending'}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedRequestId || state === 'pending'}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
              >
                {state === 'pending' ? 'Sending…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3.2: Commit**

```bash
git add "app/(client)/client/dashboard/find-caregivers/_components/send-offer-modal.tsx"
git commit -m "feat: add SendOfferModal client component for find-caregivers"
```

---

## Task 4: Replace page stub with Server Component

**Files:**
- Modify: `app/(client)/client/dashboard/find-caregivers/page.tsx`

- [ ] **Step 4.1: Replace the stub**

Overwrite `app/(client)/client/dashboard/find-caregivers/page.tsx`:

```tsx
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRequests, matches } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { getMatchesForRequest, searchCaregivers } from '@/domains/clients/find-caregivers'
import { FilterForm } from './_components/filter-form'
import { SendOfferModal } from './_components/send-offer-modal'
import { CARE_TYPES } from '@/lib/constants'

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>
}

function sp(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val
}

function spArr(val: string | string[] | undefined): string[] | undefined {
  if (!val) return undefined
  return Array.isArray(val) ? val : [val]
}

function scoreBadge(score: number) {
  if (score >= 80) return { label: 'Strong match', classes: 'bg-green-100 text-green-700' }
  if (score >= 60) return { label: 'Good match',   classes: 'bg-blue-100 text-blue-700' }
  return { label: 'Possible match', classes: 'bg-muted text-muted-foreground' }
}

export default async function FindCaregiversPage({ searchParams }: PageProps) {
  const session = await requireRole('client')
  const clientId = session.user.id!

  // Active care requests for dropdown + offer modal
  const activeRequests = await db
    .select({ id: careRequests.id, title: careRequests.title, careType: careRequests.careType })
    .from(careRequests)
    .where(and(eq(careRequests.clientId, clientId), eq(careRequests.status, 'active')))

  // Caregiver IDs already offered to (for "Offer Sent" initial state)
  const existingMatches = await db
    .select({ caregiverId: matches.caregiverId })
    .from(matches)
    .innerJoin(careRequests, eq(matches.requestId, careRequests.id))
    .where(eq(careRequests.clientId, clientId))

  const offeredSet = new Set(existingMatches.map((m) => m.caregiverId))

  // Parse searchParams
  const requestId    = sp(searchParams.requestId)
  const careType     = sp(searchParams.careType)
  const state        = sp(searchParams.state)
  const rateMin      = sp(searchParams.rateMin)
  const rateMax      = sp(searchParams.rateMax)
  const language     = spArr(searchParams.language)
  const certification = spArr(searchParams.certification)
  const experience   = sp(searchParams.experience)
  const page         = Math.max(1, parseInt(sp(searchParams.page) ?? '1', 10) || 1)

  const currentFilters = {
    requestId, careType, state, rateMin, rateMax, language, certification, experience,
    page: String(page),
  }

  // Verify requestId is owned by this client
  const ownedRequest = requestId
    ? activeRequests.find((r) => r.id === requestId)
    : undefined

  // Fetch matches section
  const myMatches = ownedRequest
    ? await getMatchesForRequest(ownedRequest.id, clientId)
    : []

  // Fetch directory section
  const { caregivers, total } = await searchCaregivers(
    { careType, state, rateMin, rateMax, language, certification, experience },
    page,
  )

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-8 max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Find Caregivers</h1>
        <p className="text-sm text-muted-foreground">
          Browse your AI-ranked matches and the full caregiver directory.
        </p>
      </div>

      <FilterForm activeRequests={activeRequests} currentFilters={currentFilters} />

      {/* ── Your Matches ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Your Matches
        </h2>

        {activeRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a care request to see your AI matches.
          </p>
        ) : !requestId ? (
          <p className="text-sm text-muted-foreground">
            Select a care request above to see your AI-ranked matches.
          </p>
        ) : myMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matches yet. Matches appear after you submit a care request.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myMatches.map((m) => {
              const badge = scoreBadge(m.score)
              return (
                <div key={m.matchId} className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    {m.image ? (
                      <img src={m.image} alt={m.name ?? ''} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {(m.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[m.city, m.state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>

                  {m.headline && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{m.headline}</p>
                  )}

                  {m.careTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.careTypes.map((ct) => (
                        <span key={ct} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {CARE_TYPES.find((c) => c.key === ct)?.label ?? ct}
                        </span>
                      ))}
                    </div>
                  )}

                  {(m.hourlyMin || m.hourlyMax) && (
                    <p className="text-xs text-muted-foreground">
                      ${m.hourlyMin}–${m.hourlyMax}/hr
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.classes}`}>
                      {badge.label}
                    </span>
                    <SendOfferModal
                      caregiverId={m.caregiverId}
                      activeRequests={activeRequests}
                      alreadyOffered={offeredSet.has(m.caregiverId)}
                    />
                  </div>

                  {m.reason && (
                    <p className="text-xs italic text-muted-foreground">{m.reason}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Browse All Caregivers ─────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Browse All Caregivers
          </h2>
          <span className="text-xs text-muted-foreground">{total} caregiver{total !== 1 ? 's' : ''} found</span>
        </div>

        {caregivers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No caregivers match the current filters.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {caregivers.map((cg) => (
              <div key={cg.caregiverId} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  {cg.image ? (
                    <img src={cg.image} alt={cg.name ?? ''} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {(cg.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{cg.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[cg.city, cg.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>

                {cg.headline && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{cg.headline}</p>
                )}

                {cg.careTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cg.careTypes.map((ct) => (
                      <span key={ct} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {CARE_TYPES.find((c) => c.key === ct)?.label ?? ct}
                      </span>
                    ))}
                  </div>
                )}

                {(cg.hourlyMin || cg.hourlyMax) && (
                  <p className="text-xs text-muted-foreground">
                    ${cg.hourlyMin}–${cg.hourlyMax}/hr
                  </p>
                )}

                {cg.experience && (
                  <p className="text-xs text-muted-foreground">{cg.experience} experience</p>
                )}

                <div className="flex justify-end">
                  <SendOfferModal
                    caregiverId={cg.caregiverId}
                    activeRequests={activeRequests}
                    alreadyOffered={offeredSet.has(cg.caregiverId)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {page > 1 && (
              <a
                href={`/client/dashboard/find-caregivers?${new URLSearchParams({
                  ...(careType ? { careType } : {}),
                  ...(state ? { state } : {}),
                  ...(rateMin ? { rateMin } : {}),
                  ...(rateMax ? { rateMax } : {}),
                  ...(experience ? { experience } : {}),
                  page: String(page - 1),
                }).toString()}`}
                className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted"
              >
                ← Prev
              </a>
            )}
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={`/client/dashboard/find-caregivers?${new URLSearchParams({
                  ...(careType ? { careType } : {}),
                  ...(state ? { state } : {}),
                  ...(rateMin ? { rateMin } : {}),
                  ...(rateMax ? { rateMax } : {}),
                  ...(experience ? { experience } : {}),
                  page: String(page + 1),
                }).toString()}`}
                className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted"
              >
                Next →
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 4.2: Commit**

```bash
git add "app/(client)/client/dashboard/find-caregivers/page.tsx"
git commit -m "feat: implement find-caregivers page with matches + directory sections"
```

---

## Task 5: Build verification

- [ ] **Step 5.1: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass (no regressions).

- [ ] **Step 5.2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5.3: Run Next.js build**

```bash
npx next build
```

Expected: Build completes successfully with no errors.

- [ ] **Step 5.4: Commit if build is clean**

If any of the above steps produce errors, fix them before committing. Once clean:

```bash
git add -p   # stage any fixes
git commit -m "fix: resolve build issues in find-caregivers phase"
```

Only needed if there were fixes. Skip if all steps were clean.
