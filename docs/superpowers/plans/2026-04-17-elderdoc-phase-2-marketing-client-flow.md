# ElderDoc Phase 2: Marketing & Client Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full public-facing marketing flow — landing page, role selection, and the 4-step anonymous client funnel (who needs care → care type → location → caregiver preview), plus a polished sign-in page.

**Architecture:** All marketing pages are Server Components. Interactive selection state (steps 1–3) lives in the URL as `searchParams` — no sessionStorage, no client state across pages. Step 4 reads `searchParams` server-side, queries the DB for matching caregivers, and renders results. Client Components handle only in-page interaction (card selection, form input, navigation to next step).

**Tech Stack:** Next.js 16 App Router (searchParams is a Promise — always `await` it) · React 19 · TypeScript · Drizzle ORM · Tailwind v4 · shadcn/ui (base-nova, `@base-ui/react` primitives) · Vitest + Testing Library

---

## ⚠️ IMPORTANT: Next.js 16 Breaking Changes

Before touching any page file, note:
- `searchParams` in `page.tsx` is `Promise<{ [key: string]: string | string[] | undefined }>` — always `await` it
- `params` is also a `Promise` — always `await` it
- File convention is `proxy.ts` (not `middleware.ts`)

---

## File Map

| File | Responsibility |
|---|---|
| `app/(marketing)/page.tsx` | Landing page — hero, trust pillars, footer |
| `app/(marketing)/get-started/page.tsx` | Role selection — two large cards |
| `app/(marketing)/get-started/client/step-1/page.tsx` | Who needs care — 6 single-select cards |
| `app/(marketing)/get-started/client/step-2/page.tsx` | Type of care — 5 multi-select cards |
| `app/(marketing)/get-started/client/step-3/page.tsx` | Location form |
| `app/(marketing)/get-started/client/step-4/page.tsx` | Caregiver preview — server query + results |
| `app/(auth)/sign-in/page.tsx` | Polished sign-in page |
| `hooks/use-selectable.ts` | useSingleSelect + useMultiSelect hooks |
| `hooks/__tests__/use-selectable.test.ts` | Hook unit tests |
| `domains/caregivers/search.ts` | Server-side caregiver filtering logic |
| `components/caregiver-card.tsx` | Caregiver preview card |
| `components/__tests__/caregiver-card.test.tsx` | Card render tests |

---

## Task 1: useSelectable Hook (TDD)

**Files:**
- Create: `hooks/__tests__/use-selectable.test.ts`
- Create: `hooks/use-selectable.ts`

- [ ] **Step 1: Write the failing tests**

Create `hooks/__tests__/use-selectable.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSingleSelect, useMultiSelect } from '@/hooks/use-selectable'

describe('useSingleSelect', () => {
  it('starts with no selection when no initial value', () => {
    const { result } = renderHook(() => useSingleSelect<string>())
    expect(result.current.selected).toBeUndefined()
  })

  it('starts with initial value when provided', () => {
    const { result } = renderHook(() => useSingleSelect('parent'))
    expect(result.current.selected).toBe('parent')
  })

  it('updates selected value on select', () => {
    const { result } = renderHook(() => useSingleSelect<string>())
    act(() => result.current.select('spouse'))
    expect(result.current.selected).toBe('spouse')
  })

  it('replaces previous selection', () => {
    const { result } = renderHook(() => useSingleSelect<string>())
    act(() => result.current.select('parent'))
    act(() => result.current.select('sibling'))
    expect(result.current.selected).toBe('sibling')
  })

  it('isSelected returns true for selected value', () => {
    const { result } = renderHook(() => useSingleSelect('parent'))
    expect(result.current.isSelected('parent')).toBe(true)
    expect(result.current.isSelected('sibling')).toBe(false)
  })
})

describe('useMultiSelect', () => {
  it('starts empty by default', () => {
    const { result } = renderHook(() => useMultiSelect<string>())
    expect(result.current.selected).toEqual([])
  })

  it('starts with initial values', () => {
    const { result } = renderHook(() => useMultiSelect(['a', 'b']))
    expect(result.current.selected).toEqual(['a', 'b'])
  })

  it('adds a value on toggle when not selected', () => {
    const { result } = renderHook(() => useMultiSelect<string>())
    act(() => result.current.toggle('personal-care'))
    expect(result.current.selected).toEqual(['personal-care'])
  })

  it('removes a value on toggle when already selected', () => {
    const { result } = renderHook(() => useMultiSelect(['personal-care']))
    act(() => result.current.toggle('personal-care'))
    expect(result.current.selected).toEqual([])
  })

  it('isSelected returns true only for selected values', () => {
    const { result } = renderHook(() => useMultiSelect(['a']))
    expect(result.current.isSelected('a')).toBe(true)
    expect(result.current.isSelected('b')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
bun run test hooks/__tests__/use-selectable.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create hooks/use-selectable.ts**

```typescript
'use client'

import { useState, useCallback } from 'react'

export function useSingleSelect<T>(initial?: T) {
  const [selected, setSelected] = useState<T | undefined>(initial)
  const select = useCallback((value: T) => setSelected(value), [])
  const isSelected = useCallback((value: T) => selected === value, [selected])
  return { selected, select, isSelected }
}

export function useMultiSelect<T>(initial: T[] = []) {
  const [selected, setSelected] = useState<T[]>(initial)
  const toggle = useCallback((value: T) => {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }, [])
  const isSelected = useCallback((value: T) => selected.includes(value), [selected])
  return { selected, toggle, isSelected }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
bun run test hooks/__tests__/use-selectable.test.ts
```

Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add hooks/use-selectable.ts hooks/__tests__/use-selectable.test.ts
git commit -m "feat: add useSingleSelect and useMultiSelect hooks with tests"
```

---

## Task 2: CaregiverCard Component (TDD)

**Files:**
- Create: `components/__tests__/caregiver-card.test.tsx`
- Create: `components/caregiver-card.tsx`

- [ ] **Step 1: Write the failing tests**

Create `components/__tests__/caregiver-card.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CaregiverCard } from '@/components/caregiver-card'

const mockCaregiver = {
  id: 'cg-1',
  name: 'Maria Garcia',
  image: null,
  headline: 'Compassionate caregiver with 5 years experience.',
  careTypes: ['personal-care', 'companionship'],
  city: 'Austin',
  state: 'Texas',
  hourlyMin: '22',
  hourlyMax: '30',
}

describe('CaregiverCard', () => {
  it('renders caregiver name', () => {
    render(<CaregiverCard caregiver={mockCaregiver} />)
    expect(screen.getByText('Maria Garcia')).toBeDefined()
  })

  it('renders headline', () => {
    render(<CaregiverCard caregiver={mockCaregiver} />)
    expect(screen.getByText('Compassionate caregiver with 5 years experience.')).toBeDefined()
  })

  it('renders care type labels', () => {
    render(<CaregiverCard caregiver={mockCaregiver} />)
    expect(screen.getByText('Personal Care')).toBeDefined()
    expect(screen.getByText('Companionship')).toBeDefined()
  })

  it('renders location', () => {
    render(<CaregiverCard caregiver={mockCaregiver} />)
    expect(screen.getByText('Austin, Texas')).toBeDefined()
  })

  it('renders hourly rate', () => {
    render(<CaregiverCard caregiver={mockCaregiver} />)
    expect(screen.getByText('$22–$30/hr')).toBeDefined()
  })

  it('calls onSendOffer when button clicked', () => {
    const onSendOffer = vi.fn()
    render(<CaregiverCard caregiver={mockCaregiver} onSendOffer={onSendOffer} />)
    fireEvent.click(screen.getByRole('button', { name: /send offer/i }))
    expect(onSendOffer).toHaveBeenCalledOnce()
  })

  it('shows initials in avatar when no image', () => {
    render(<CaregiverCard caregiver={mockCaregiver} />)
    expect(screen.getByText('MG')).toBeDefined()
  })

  it('shows fallback name when name is null', () => {
    render(<CaregiverCard caregiver={{ ...mockCaregiver, name: null }} />)
    expect(screen.getByText('Anonymous Caregiver')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
bun run test components/__tests__/caregiver-card.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create components/caregiver-card.tsx**

```typescript
'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CARE_TYPES } from '@/lib/constants'

export interface CaregiverPreview {
  id: string
  name: string | null
  image: string | null
  headline: string | null
  careTypes: string[]
  city: string | null
  state: string | null
  hourlyMin: string | null
  hourlyMax: string | null
}

interface CaregiverCardProps {
  caregiver: CaregiverPreview
  onSendOffer?: () => void
  className?: string
}

export function CaregiverCard({ caregiver, onSendOffer, className }: CaregiverCardProps) {
  const initials = caregiver.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  const careTypeLabels = caregiver.careTypes.map(
    key => CARE_TYPES.find(ct => ct.key === key)?.label ?? key
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-[12px] border border-border bg-card p-6',
        'shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-hover)]',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={caregiver.image ?? undefined} alt={caregiver.name ?? 'Caregiver'} />
          <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-foreground">
            {caregiver.name ?? 'Anonymous Caregiver'}
          </p>
          {caregiver.headline && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {caregiver.headline}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {careTypeLabels.slice(0, 3).map(label => (
          <Badge key={label} variant="secondary" className="text-xs font-normal">
            {label}
          </Badge>
        ))}
        {careTypeLabels.length > 3 && (
          <Badge variant="secondary" className="text-xs font-normal">
            +{careTypeLabels.length - 3} more
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {caregiver.city && caregiver.state
            ? `${caregiver.city}, ${caregiver.state}`
            : 'Location not set'}
        </span>
        {caregiver.hourlyMin && caregiver.hourlyMax && (
          <span className="font-medium text-foreground">
            ${caregiver.hourlyMin}–${caregiver.hourlyMax}/hr
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onSendOffer}
        className="w-full rounded-[8px] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Send Offer
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
bun run test components/__tests__/caregiver-card.test.tsx
```

Expected: 8 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
bun run test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/caregiver-card.tsx components/__tests__/caregiver-card.test.tsx
git commit -m "feat: add CaregiverCard component with tests"
```

---

## Task 3: Caregiver Search Domain

**Files:**
- Create: `domains/caregivers/search.ts`

No unit tests (queries live DB — integration tested via step 4 render). TypeScript will catch type errors.

- [ ] **Step 1: Create domains/caregivers/search.ts**

```typescript
import { db } from '@/services/db'
import {
  caregiverProfiles,
  caregiverCareTypes,
  caregiverLocations,
  users,
} from '@/db/schema'
import { inArray } from 'drizzle-orm'
import type { CaregiverPreview } from '@/components/caregiver-card'

export async function searchCaregivers(params: {
  careTypes: string[]
  state?: string
}): Promise<CaregiverPreview[]> {
  if (params.careTypes.length === 0) return []

  // Find caregiver IDs with at least one matching care type
  const matchingRows = await db
    .select({ caregiverId: caregiverCareTypes.caregiverId })
    .from(caregiverCareTypes)
    .where(inArray(caregiverCareTypes.careType, params.careTypes))

  if (matchingRows.length === 0) return []

  const caregiverIds = [...new Set(matchingRows.map(r => r.caregiverId))]

  // Fetch profiles (active only, limit 12)
  const profiles = await db
    .select({
      id: caregiverProfiles.id,
      userId: caregiverProfiles.userId,
      headline: caregiverProfiles.headline,
      hourlyMin: caregiverProfiles.hourlyMin,
      hourlyMax: caregiverProfiles.hourlyMax,
    })
    .from(caregiverProfiles)
    .where(inArray(caregiverProfiles.id, caregiverIds))
    .limit(12)

  if (profiles.length === 0) return []

  const profileIds = profiles.map(p => p.id)
  const userIds = profiles.map(p => p.userId)

  // Fetch user names and images in parallel
  const [userRows, allCareTypes, locations] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, image: users.image })
      .from(users)
      .where(inArray(users.id, userIds)),
    db
      .select({ caregiverId: caregiverCareTypes.caregiverId, careType: caregiverCareTypes.careType })
      .from(caregiverCareTypes)
      .where(inArray(caregiverCareTypes.caregiverId, profileIds)),
    db
      .select({ caregiverId: caregiverLocations.caregiverId, city: caregiverLocations.city, state: caregiverLocations.state })
      .from(caregiverLocations)
      .where(inArray(caregiverLocations.caregiverId, profileIds)),
  ])

  return profiles.map(profile => {
    const user = userRows.find(u => u.id === profile.userId)
    const profileCareTypes = allCareTypes
      .filter(ct => ct.caregiverId === profile.id)
      .map(ct => ct.careType)
    const location = locations.find(l => l.caregiverId === profile.id)

    return {
      id: profile.id,
      name: user?.name ?? null,
      image: user?.image ?? null,
      headline: profile.headline,
      careTypes: profileCareTypes,
      city: location?.city ?? null,
      state: location?.state ?? null,
      hourlyMin: profile.hourlyMin,
      hourlyMax: profile.hourlyMax,
    }
  })
}
```

- [ ] **Step 2: Run tests (TypeScript check via build)**

```bash
bun run test
```

All existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add domains/caregivers/search.ts
git commit -m "feat: add caregiver search domain with care type filtering"
```

---

## Task 4: Landing Page

**Files:**
- Modify: `app/(marketing)/page.tsx`

- [ ] **Step 1: Replace app/(marketing)/page.tsx**

```typescript
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="fixed top-0 z-10 w-full border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-tight text-foreground">ElderDoc</span>
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-28 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-primary">
            ElderDoc
          </p>
          <h1 className="mt-4 text-[52px] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[64px]">
            Care for your loved ones.{' '}
            <span className="text-primary">Matched by AI.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Find verified, compassionate caregivers for elderly care —
            matched to your exact needs in minutes.
          </p>
          <div className="mt-8">
            <Link
              href="/get-started"
              className="inline-flex items-center gap-2 rounded-[8px] bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get Started
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </main>

      {/* Trust pillars */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
            {[
              {
                title: 'Verified Caregivers',
                body: 'Every caregiver is background-checked and credentialed before joining the platform.',
              },
              {
                title: 'AI-Matched for You',
                body: 'Our AI scores compatibility across care type, availability, location, and preferences.',
              },
              {
                title: 'Real Families, Real Care',
                body: 'Thousands of families trust ElderDoc to find the right caregiver for their loved ones.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="bg-background px-8 py-10">
                <div className="mb-3 h-1.5 w-8 rounded-full bg-primary" />
                <h3 className="text-[15px] font-medium text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <div className="mx-auto max-w-6xl text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ElderDoc. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Verify dev server shows the landing page**

Visit `http://localhost:3001` — should show hero heading, "Get Started" button, and three trust pillars.

- [ ] **Step 3: Commit**

```bash
git add app/(marketing)/page.tsx
git commit -m "feat: build landing page with hero and trust pillars"
```

---

## Task 5: Role Selection Page

**Files:**
- Modify: `app/(marketing)/get-started/page.tsx`

- [ ] **Step 1: Replace app/(marketing)/get-started/page.tsx**

```typescript
import Link from 'next/link'

export default function RoleSelectionPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16">
      {/* Back nav */}
      <div className="absolute left-6 top-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </Link>
      </div>

      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-primary">Get Started</p>
          <h1 className="mt-3 text-[36px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground">
            How can we help?
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground">
            Choose your path to get started with ElderDoc.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/get-started/client/step-1"
            className="group flex flex-col gap-4 rounded-[12px] border border-border bg-card p-8 shadow-[var(--shadow-card)] transition-all hover:border-primary/30 hover:shadow-[var(--shadow-hover)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 11a4 4 0 100-8 4 4 0 000 8zM3 17a7 7 0 0114 0" stroke="#1A6B4A" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-foreground">
                Find Trusted Care for Your Loved One
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Browse and connect with verified caregivers matched to your specific needs.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary transition-gap group-hover:gap-2">
              Find a caregiver
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>

          <Link
            href="/get-started/caregiver/step-1"
            className="group flex flex-col gap-4 rounded-[12px] border border-border bg-card p-8 shadow-[var(--shadow-card)] transition-all hover:border-primary/30 hover:shadow-[var(--shadow-hover)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 2a3 3 0 100 6 3 3 0 000-6zM4 16c0-3.314 2.686-6 6-6s6 2.686 6 6M7 9l-3 3m9-3l3 3" stroke="#1A6B4A" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-foreground">
                Offer Your Caregiving Services
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Join our network of trusted caregivers and connect with families who need you.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary transition-gap group-hover:gap-2">
              Become a caregiver
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Visit `http://localhost:3001/get-started` — should show two large cards.

- [ ] **Step 3: Commit**

```bash
git add "app/(marketing)/get-started/page.tsx"
git commit -m "feat: build role selection page with two path cards"
```

---

## Task 6: Client Step 1 — Who Needs Care

**Files:**
- Create: `app/(marketing)/get-started/client/_components/step-shell.tsx`
- Modify: `app/(marketing)/get-started/client/step-1/page.tsx`

- [ ] **Step 1: Create shared step shell component**

Create `app/(marketing)/get-started/client/_components/step-shell.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { StepProgress } from '@/components/step-progress'

const CLIENT_STEPS = [
  { label: 'Who needs care' },
  { label: 'Type of care' },
  { label: 'Location' },
  { label: 'Preview' },
]

interface StepShellProps {
  currentStep: number
  title: string
  subtitle?: string
  children: React.ReactNode
  backHref: string
}

export function StepShell({ currentStep, title, subtitle, children, backHref }: StepShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>
          <span className="text-sm font-semibold tracking-tight text-foreground">ElderDoc</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {/* Progress */}
        <div className="mb-10 flex justify-center">
          <StepProgress steps={CLIENT_STEPS} currentStep={currentStep} />
        </div>

        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Replace app/(marketing)/get-started/client/step-1/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SelectableCard } from '@/components/selectable-card'
import { StepShell } from '../_components/step-shell'
import { RELATIONSHIPS } from '@/lib/constants'

export default function ClientStep1() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | undefined>()

  function handleContinue() {
    if (!selected) return
    router.push(`/get-started/client/step-2?relationship=${encodeURIComponent(selected)}`)
  }

  return (
    <StepShell
      currentStep={1}
      title="Who needs care?"
      subtitle="Select who you're finding care for."
      backHref="/get-started"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {RELATIONSHIPS.map(({ key, label }) => (
          <SelectableCard
            key={key}
            selected={selected === key}
            onSelect={() => setSelected(key)}
          >
            <span className="text-[15px] font-medium text-foreground">{label}</span>
          </SelectableCard>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!selected}
          onClick={handleContinue}
          className="rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </StepShell>
  )
}
```

- [ ] **Step 3: Verify in browser**

Visit `http://localhost:3001/get-started/client/step-1` — should show 6 cards (Myself, Parent, Spouse, Grandparent, Sibling, Other family member) with progress bar at top. Selecting one enables Continue.

- [ ] **Step 4: Commit**

```bash
git add "app/(marketing)/get-started/client/"
git commit -m "feat: build client step 1 — who needs care"
```

---

## Task 7: Client Step 2 — Type of Care

**Files:**
- Modify: `app/(marketing)/get-started/client/step-2/page.tsx`

- [ ] **Step 1: Replace app/(marketing)/get-started/client/step-2/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SelectableCard } from '@/components/selectable-card'
import { StepShell } from '../_components/step-shell'
import { CARE_TYPES } from '@/lib/constants'
import { Suspense } from 'react'

function Step2Inner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const relationship = searchParams.get('relationship') ?? ''
  const [selected, setSelected] = useState<string[]>([])

  function toggle(key: string) {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function handleContinue() {
    if (selected.length === 0) return
    const params = new URLSearchParams({
      relationship,
      careTypes: selected.join(','),
    })
    router.push(`/get-started/client/step-3?${params.toString()}`)
  }

  return (
    <StepShell
      currentStep={2}
      title="What type of care is needed?"
      subtitle="Select all that apply."
      backHref={`/get-started/client/step-1?relationship=${relationship}`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CARE_TYPES.map(({ key, label }) => (
          <SelectableCard
            key={key}
            selected={selected.includes(key)}
            onSelect={() => toggle(key)}
          >
            <span className="text-[15px] font-medium text-foreground">{label}</span>
          </SelectableCard>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={handleContinue}
          className="rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </StepShell>
  )
}

export default function ClientStep2() {
  return (
    <Suspense fallback={null}>
      <Step2Inner />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verify in browser**

Visit `http://localhost:3001/get-started/client/step-1`, select a relationship, click Continue → should land on step 2 with 5 care type cards. Multi-select works (multiple cards can be selected simultaneously).

- [ ] **Step 3: Commit**

```bash
git add "app/(marketing)/get-started/client/step-2/page.tsx"
git commit -m "feat: build client step 2 — type of care multi-select"
```

---

## Task 8: Client Step 3 — Location

**Files:**
- Modify: `app/(marketing)/get-started/client/step-3/page.tsx`

- [ ] **Step 1: Replace app/(marketing)/get-started/client/step-3/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StepShell } from '../_components/step-shell'
import { US_STATES } from '@/lib/constants'
import { Suspense } from 'react'

function Step3Inner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const relationship = searchParams.get('relationship') ?? ''
  const careTypes = searchParams.get('careTypes') ?? ''

  const [form, setForm] = useState({
    address1: '',
    address2: '',
    city: '',
    state: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const isValid = form.address1.trim() && form.city.trim() && form.state

  function handleContinue() {
    if (!isValid) return
    const params = new URLSearchParams({
      relationship,
      careTypes,
      address1: form.address1,
      address2: form.address2,
      city: form.city,
      state: form.state,
    })
    router.push(`/get-started/client/step-4?${params.toString()}`)
  }

  const inputClass =
    'w-full rounded-[8px] border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-offset-0 transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20'
  const labelClass = 'block text-xs font-medium text-muted-foreground uppercase tracking-[0.06em] mb-1.5'

  return (
    <StepShell
      currentStep={3}
      title="Where is care needed?"
      subtitle="We'll use this to find caregivers near you."
      backHref={`/get-started/client/step-2?relationship=${relationship}&careTypes=${careTypes}`}
    >
      <div className="mx-auto max-w-lg space-y-5">
        <div>
          <label className={labelClass}>Address Line 1</label>
          <input
            type="text"
            placeholder="123 Main Street"
            value={form.address1}
            onChange={e => set('address1', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Address Line 2 <span className="normal-case text-muted-foreground/60">(optional)</span></label>
          <input
            type="text"
            placeholder="Apt, suite, unit..."
            value={form.address2}
            onChange={e => set('address2', e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              placeholder="Austin"
              value={form.city}
              onChange={e => set('city', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <select
              value={form.state}
              onChange={e => set('state', e.target.value)}
              className={inputClass}
            >
              <option value="">Select state</option>
              {US_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Country</label>
          <input
            type="text"
            value="United States"
            disabled
            className={`${inputClass} cursor-not-allowed opacity-50`}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          disabled={!isValid}
          onClick={handleContinue}
          className="rounded-[8px] bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Find Caregivers
        </button>
      </div>
    </StepShell>
  )
}

export default function ClientStep3() {
  return (
    <Suspense fallback={null}>
      <Step3Inner />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate through steps 1 → 2 → 3. Should show address form with all fields. State dropdown has all 50 US states. Country field is locked to "United States". "Find Caregivers" button is disabled until address1, city, and state are filled.

- [ ] **Step 3: Commit**

```bash
git add "app/(marketing)/get-started/client/step-3/page.tsx"
git commit -m "feat: build client step 3 — location form"
```

---

## Task 9: Client Step 4 — Caregiver Preview

**Files:**
- Modify: `app/(marketing)/get-started/client/step-4/page.tsx`
- Create: `app/(marketing)/get-started/client/step-4/_components/preview-client.tsx`

- [ ] **Step 1: Create preview-client.tsx (handles Send Offer redirect)**

Create `app/(marketing)/get-started/client/step-4/_components/preview-client.tsx`:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { CaregiverCard } from '@/components/caregiver-card'
import type { CaregiverPreview } from '@/components/caregiver-card'

interface PreviewClientProps {
  caregivers: CaregiverPreview[]
}

export function PreviewClient({ caregivers }: PreviewClientProps) {
  const router = useRouter()

  function handleSendOffer() {
    router.push('/sign-in?callbackUrl=%2Fclient%2Fdashboard%2Frequests')
  }

  if (caregivers.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] font-medium text-foreground">No caregivers found yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Be the first to post a care request — we'll match you as caregivers join.
        </p>
        <button
          type="button"
          onClick={handleSendOffer}
          className="mt-6 rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Post a Care Request
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {caregivers.map(caregiver => (
        <CaregiverCard
          key={caregiver.id}
          caregiver={caregiver}
          onSendOffer={handleSendOffer}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Replace app/(marketing)/get-started/client/step-4/page.tsx**

```typescript
import { Suspense } from 'react'
import { StepShell } from '../_components/step-shell'
import { searchCaregivers } from '@/domains/caregivers/search'
import { PreviewClient } from './_components/preview-client'

interface Step4PageProps {
  searchParams: Promise<{
    relationship?: string
    careTypes?: string
    city?: string
    state?: string
  }>
}

async function CaregiverResults({ searchParams }: { searchParams: Step4PageProps['searchParams'] }) {
  const params = await searchParams
  const careTypes = params.careTypes?.split(',').filter(Boolean) ?? []
  const caregivers = await searchCaregivers({ careTypes, state: params.state })
  return <PreviewClient caregivers={caregivers} />
}

export default async function ClientStep4({ searchParams }: Step4PageProps) {
  const params = await searchParams
  const relationship = params.relationship ?? ''
  const careTypes = params.careTypes ?? ''
  const city = params.city ?? ''
  const state = params.state ?? ''

  return (
    <StepShell
      currentStep={4}
      title="Caregivers near you"
      subtitle={city && state ? `Showing results for ${city}, ${state}` : 'Showing available caregivers'}
      backHref={`/get-started/client/step-3?relationship=${relationship}&careTypes=${careTypes}`}
    >
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-[12px] bg-muted" />
            ))}
          </div>
        }
      >
        <CaregiverResults searchParams={searchParams} />
      </Suspense>
    </StepShell>
  )
}
```

- [ ] **Step 3: Verify in browser**

Navigate through steps 1 → 2 → 3 → 4. Step 4 should load with either a grid of caregiver cards (if caregivers exist in DB) or the empty state with "Post a Care Request" button. "Send Offer" / "Post a Care Request" redirects to `/sign-in`.

- [ ] **Step 4: Run tests**

```bash
bun run test
```

All existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/(marketing)/get-started/client/step-4/"
git commit -m "feat: build client step 4 — caregiver preview with server filtering"
```

---

## Task 10: Sign-in Page Polish

**Files:**
- Modify: `app/(auth)/sign-in/page.tsx`

- [ ] **Step 1: Replace app/(auth)/sign-in/page.tsx**

```typescript
import { signIn } from '@/auth'
import Link from 'next/link'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
            ElderDoc
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-[16px] border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          <div className="mb-6 text-center">
            <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to continue to ElderDoc
            </p>
          </div>

          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/' })
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-[8px] border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-hover)]"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <span className="underline underline-offset-2">Terms of Service</span>
            {' '}and{' '}
            <span className="underline underline-offset-2">Privacy Policy</span>.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          New to ElderDoc?{' '}
          <Link href="/get-started" className="font-medium text-primary hover:underline">
            Get started
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Visit `http://localhost:3001/sign-in` — should show a centered card with Google logo button, proper typography, and "Get started" link.

- [ ] **Step 3: Run full test suite**

```bash
bun run test
```

Expected: All 34 tests pass (24 existing + 10 useSingleSelect + useMultiSelect + 8 CaregiverCard).

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/sign-in/page.tsx"
git commit -m "feat: polish sign-in page with Google button and card layout"
```

---

## Task 11: Final Build Check

- [ ] **Step 1: Run full test suite**

```bash
bun run test
```

All tests pass.

- [ ] **Step 2: Build check**

```bash
bun run build
```

No TypeScript or build errors.

- [ ] **Step 3: Verify full flow in browser**

1. `http://localhost:3001/` → landing page with hero + trust pillars
2. Click "Get Started" → role selection with two cards
3. Click "Find Trusted Care" → step 1 (who needs care)
4. Select a relationship → Continue → step 2 (care types)
5. Select care types → Continue → step 3 (location)
6. Fill address → "Find Caregivers" → step 4 (preview / empty state)
7. Click "Send Offer" → redirects to `/sign-in`
8. `http://localhost:3001/sign-in` → Google sign-in card

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Phase 2 complete — marketing flow and client funnel"
```
