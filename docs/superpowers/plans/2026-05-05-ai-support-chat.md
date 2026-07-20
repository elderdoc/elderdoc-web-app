# AI Support Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating AI chat widget to the Elderdoc web app that answers app-related questions using knowledge stored in the DB, cached in Redis, and editable by admins.

**Architecture:** OpenAI gpt-4o-mini streams through a Next.js API route (`/api/support-chat`). App knowledge lives in a single DB row (`app_knowledge`), cached in Redis with a 24-hour TTL. The root layout warms the cache on every page load. The admin dashboard gets a `/knowledge` page to edit 7 structured sections.

**Tech Stack:** Vercel AI SDK (`ai`, `@ai-sdk/openai`), ioredis, Drizzle ORM, Next.js App Router, React 19, shadcn/ui, Lucide React

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/db/schema.ts` | Modify | Add `appKnowledge` table |
| `packages/db/seed-knowledge.ts` | Create | Seed initial row with real content |
| `elderdoc-web-app/lib/redis.ts` | Create | Singleton ioredis client |
| `elderdoc-web-app/lib/knowledge-cache.ts` | Create | Redis → DB knowledge fetcher |
| `elderdoc-web-app/lib/knowledge-cache.test.ts` | Create | Vitest unit tests |
| `elderdoc-web-app/app/api/support-chat/route.ts` | Create | Streaming chat API route |
| `elderdoc-web-app/components/support-chat/support-chat-widget.tsx` | Create | Floating button + chat panel |
| `elderdoc-web-app/app/layout.tsx` | Modify | Mount widget, warm cache on load |
| `elderdoc-admin/package.json` | Modify | Add ioredis dependency |
| `elderdoc-admin/lib/redis.ts` | Create | Singleton ioredis client |
| `elderdoc-admin/app/(admin)/knowledge/actions.ts` | Create | Save knowledge + bust Redis cache |
| `elderdoc-admin/app/(admin)/knowledge/_components/knowledge-form.tsx` | Create | Client form component |
| `elderdoc-admin/app/(admin)/knowledge/page.tsx` | Create | Admin knowledge editor page |
| `elderdoc-admin/components/sidebar.tsx` | Modify | Add Knowledge nav link |

---

### Task 1: Add appKnowledge table to DB schema

**Files:**
- Modify: `packages/db/schema.ts`

- [ ] **Step 1: Add the table definition**

In `packages/db/schema.ts`, add this block after the `disputes` table and before the `// --- Relations ---` comment:

```ts
export const appKnowledge = pgTable('app_knowledge', {
  id:                integer('id').primaryKey(),
  about:             text('about').notNull().default(''),
  howItWorks:        text('how_it_works').notNull().default(''),
  pricingAndBilling: text('pricing_and_billing').notNull().default(''),
  forCaregivers:     text('for_caregivers').notNull().default(''),
  forClients:        text('for_clients').notNull().default(''),
  faqs:              text('faqs').notNull().default(''),
  support:           text('support').notNull().default(''),
  updatedAt:         timestamp('updated_at').defaultNow(),
})
```

- [ ] **Step 2: Generate the migration**

```bash
cd elderdoc-web-app
bun db:generate
```

Expected: A new SQL file appears in the migrations folder.

- [ ] **Step 3: Run the migration**

```bash
bun db:migrate
```

Expected: Migration applied with no errors.

- [ ] **Step 4: Verify the table is importable in the web app**

Check whether `elderdoc-web-app/db/schema.ts` re-exports from `@elderdoc/db/schema`. If it does (e.g., `export * from '@elderdoc/db/schema'`), no change needed — `appKnowledge` is already available via `@/db/schema`. If the file has its own standalone table definitions (not using the shared package), add:

```ts
export { appKnowledge } from '@elderdoc/db/schema'
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add packages/db/schema.ts
git add elderdoc-web-app/migrations/
git commit -m "feat: add app_knowledge table to schema"
```

---

### Task 2: Seed initial knowledge row

**Files:**
- Create: `packages/db/seed-knowledge.ts`

- [ ] **Step 1: Create the seed file**

Create `packages/db/seed-knowledge.ts`:

```ts
import { db } from './client'
import { appKnowledge } from './schema'

const values = {
  about: `Elderdoc is a trusted home care platform that connects families with professional, vetted caregivers. We help clients find compassionate caregivers for their elderly loved ones, and help caregivers find meaningful, flexible work that fits their schedule.`,

  howItWorks: `Clients create a care request describing their loved one's needs, schedule, and budget. Elderdoc's AI matches the request with compatible caregivers. Clients review profiles and send an offer to their preferred match. Once accepted, caregivers manage shifts through the platform and clients are billed automatically after each completed shift.`,

  pricingAndBilling: `Clients are billed based on the caregiver's hourly rate multiplied by hours worked. Billing occurs automatically after each shift is marked complete. All payments are processed securely via Stripe. Elderdoc charges a small platform fee on each transaction. Caregivers receive funds to their connected bank account within 2–3 business days after payment clears.`,

  forCaregivers: `To join as a caregiver, complete your profile with your experience, certifications, availability, and hourly rate range. Once your profile is approved, you'll receive AI-matched job opportunities and can browse open care requests. Accept offers, manage your shift schedule, track your earnings, and receive direct deposits — all through your caregiver dashboard.`,

  forClients: `Post a care request by describing your loved one's health needs, daily schedule, and budget. Elderdoc's AI surfaces the most compatible caregivers based on skills, availability, and location. Review caregiver profiles, ratings, and experience before sending an offer. Once a caregiver accepts, your care begins on the agreed schedule, with built-in messaging and billing handled automatically.`,

  faqs: `Q: How are caregivers vetted?
A: All caregivers complete an identity verification and profile review before they can accept jobs on the platform.

Q: Can I cancel a care request?
A: Yes. You can cancel a draft or active request from your dashboard as long as no active job has started.

Q: How do I message my caregiver?
A: Once a job is active, use the messaging feature in your dashboard to communicate directly with your caregiver.

Q: What if I'm unhappy with a caregiver?
A: You can file a dispute from your dashboard and our team will review the situation.

Q: How does scheduling work?
A: Caregivers and clients agree on a schedule when a job starts. Shifts are tracked in the platform and visible in your calendar.`,

  support: `For help with your account, billing questions, or platform issues, use the Help section in your dashboard. For urgent or unresolved matters, email our support team at support@elderdoc.com. Our team typically responds within one business day.`,
}

async function seed() {
  await db
    .insert(appKnowledge)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({
      target: appKnowledge.id,
      set: { ...values, updatedAt: new Date() },
    })
  console.log('✓ App knowledge seeded')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Run the seed**

```bash
cd packages/db
bun seed-knowledge.ts
```

Expected output:
```
✓ App knowledge seeded
```

- [ ] **Step 3: Commit**

```bash
cd ../..
git add packages/db/seed-knowledge.ts
git commit -m "feat: seed initial app knowledge row"
```

---

### Task 3: Redis client (web app)

**Files:**
- Create: `elderdoc-web-app/lib/redis.ts`

- [ ] **Step 1: Create the Redis singleton**

Create `elderdoc-web-app/lib/redis.ts`:

```ts
import Redis from 'ioredis'

declare global { var _redis: Redis | undefined }

export const redis: Redis =
  globalThis._redis ?? (globalThis._redis = new Redis(process.env.REDIS_URL!))
```

- [ ] **Step 2: Commit**

```bash
git add elderdoc-web-app/lib/redis.ts
git commit -m "feat: add Redis client singleton to web app"
```

---

### Task 4: Knowledge cache utility + tests

**Files:**
- Create: `elderdoc-web-app/lib/knowledge-cache.ts`
- Create: `elderdoc-web-app/lib/knowledge-cache.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `elderdoc-web-app/lib/knowledge-cache.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRedis = { get: vi.fn(), set: vi.fn() }
vi.mock('./redis', () => ({ redis: mockRedis }))

const mockKnowledgeRow = {
  about: 'About Elderdoc',
  howItWorks: 'How it works',
  pricingAndBilling: 'Pricing',
  forCaregivers: 'For caregivers',
  forClients: 'For clients',
  faqs: 'FAQs',
  support: 'Support info',
}

const mockLimit = vi.fn()
const mockFrom = vi.fn(() => ({ limit: mockLimit }))
const mockSelect = vi.fn(() => ({ from: mockFrom }))
vi.mock('@/services/db', () => ({ db: { select: mockSelect } }))
vi.mock('@/db/schema', () => ({ appKnowledge: {} }))

beforeEach(() => vi.clearAllMocks())

describe('getAppKnowledge', () => {
  it('returns cached value from Redis without hitting DB', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify(mockKnowledgeRow))
    const { getAppKnowledge } = await import('./knowledge-cache')
    const result = await getAppKnowledge()
    expect(result).toEqual(mockKnowledgeRow)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('queries DB on Redis miss and writes result to Redis', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockLimit.mockResolvedValue([mockKnowledgeRow])
    const { getAppKnowledge } = await import('./knowledge-cache')
    const result = await getAppKnowledge()
    expect(result).toEqual(mockKnowledgeRow)
    expect(mockSelect).toHaveBeenCalled()
    expect(mockRedis.set).toHaveBeenCalledWith(
      'app:knowledge',
      JSON.stringify(mockKnowledgeRow),
      'EX',
      86400,
    )
  })

  it('returns null when DB has no row', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockLimit.mockResolvedValue([])
    const { getAppKnowledge } = await import('./knowledge-cache')
    expect(await getAppKnowledge()).toBeNull()
  })

  it('falls back to DB when Redis throws', async () => {
    mockRedis.get.mockRejectedValue(new Error('Redis unavailable'))
    mockLimit.mockResolvedValue([mockKnowledgeRow])
    const { getAppKnowledge } = await import('./knowledge-cache')
    expect(await getAppKnowledge()).toEqual(mockKnowledgeRow)
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd elderdoc-web-app
bun test lib/knowledge-cache.test.ts
```

Expected: Tests fail because `knowledge-cache.ts` does not exist yet.

- [ ] **Step 3: Create the implementation**

Create `elderdoc-web-app/lib/knowledge-cache.ts`:

```ts
import { redis } from './redis'
import { db } from '@/services/db'
import { appKnowledge } from '@/db/schema'

const CACHE_KEY = 'app:knowledge'
const CACHE_TTL = 86400 // 24 hours in seconds

export type AppKnowledge = {
  about: string
  howItWorks: string
  pricingAndBilling: string
  forCaregivers: string
  forClients: string
  faqs: string
  support: string
}

export async function getAppKnowledge(): Promise<AppKnowledge | null> {
  try {
    const cached = await redis.get(CACHE_KEY)
    if (cached) return JSON.parse(cached) as AppKnowledge
  } catch {
    // Redis unavailable — fall through to DB
  }

  const rows = await db.select().from(appKnowledge).limit(1)
  if (!rows[0]) return null

  const knowledge: AppKnowledge = {
    about:             rows[0].about,
    howItWorks:        rows[0].howItWorks,
    pricingAndBilling: rows[0].pricingAndBilling,
    forCaregivers:     rows[0].forCaregivers,
    forClients:        rows[0].forClients,
    faqs:              rows[0].faqs,
    support:           rows[0].support,
  }

  try {
    await redis.set(CACHE_KEY, JSON.stringify(knowledge), 'EX', CACHE_TTL)
  } catch {
    // Redis write failed — continue without caching
  }

  return knowledge
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
bun test lib/knowledge-cache.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add elderdoc-web-app/lib/knowledge-cache.ts elderdoc-web-app/lib/knowledge-cache.test.ts
git commit -m "feat: add knowledge cache utility with Redis → DB fallback"
```

---

### Task 5: Support chat API route

**Files:**
- Create: `elderdoc-web-app/app/api/support-chat/route.ts`

- [ ] **Step 1: Create the route**

Create `elderdoc-web-app/app/api/support-chat/route.ts`:

```ts
import { auth } from '@/auth'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { getAppKnowledge, type AppKnowledge } from '@/lib/knowledge-cache'

function buildSystemPrompt(k: AppKnowledge | null): string {
  const sections = k
    ? [
        `## About Elderdoc\n${k.about}`,
        `## How It Works\n${k.howItWorks}`,
        `## Pricing & Billing\n${k.pricingAndBilling}`,
        `## For Caregivers\n${k.forCaregivers}`,
        `## For Clients\n${k.forClients}`,
        `## Frequently Asked Questions\n${k.faqs}`,
        `## Support\n${k.support}`,
      ].join('\n\n')
    : 'No knowledge base available at this time.'

  return `You are a helpful support assistant for Elderdoc, a home care platform that connects families with professional caregivers.

Answer ONLY questions related to Elderdoc — how the platform works, pricing, caregivers, clients, billing, scheduling, and support. If asked about anything unrelated to Elderdoc, politely explain that you can only help with Elderdoc-related questions and invite them to ask something about the platform.

Use the following information to answer questions accurately:

${sections}`
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages } = await req.json()
  const knowledge = await getAppKnowledge()

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: buildSystemPrompt(knowledge),
    messages,
  })

  return result.toDataStreamResponse()
}
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
cd elderdoc-web-app
bun tsc --noEmit
```

Expected: No errors in the new file.

- [ ] **Step 3: Commit**

```bash
cd ..
git add elderdoc-web-app/app/api/support-chat/route.ts
git commit -m "feat: add support chat API route with streaming and guardrails"
```

---

### Task 6: Chat widget component

**Files:**
- Create: `elderdoc-web-app/components/support-chat/support-chat-widget.tsx`

- [ ] **Step 1: Create the widget**

Create `elderdoc-web-app/components/support-chat/support-chat-widget.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
import { MessageCircle, X, Send } from 'lucide-react'

interface Props {
  isLoggedIn: boolean
}

export function SupportChatWidget({ isLoggedIn }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isLoggedIn) return null

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Open Elderdoc support chat"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  )
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/support-chat',
  })
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-[480px] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-[13.5px] font-semibold">Elderdoc Support</p>
          <p className="text-[11px] text-muted-foreground">Ask me anything about Elderdoc</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-[12px] text-muted-foreground pt-8">
            Hi! How can I help you with Elderdoc today?
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border px-3 py-2.5 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask a question..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40 transition-opacity"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add elderdoc-web-app/components/support-chat/support-chat-widget.tsx
git commit -m "feat: add floating AI support chat widget component"
```

---

### Task 7: Update root layout to mount widget and warm cache

**Files:**
- Modify: `elderdoc-web-app/app/layout.tsx`

- [ ] **Step 1: Replace the layout**

Replace `elderdoc-web-app/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/toast'
import { auth } from '@/auth'
import { getAppKnowledge } from '@/lib/knowledge-cache'
import { SupportChatWidget } from '@/components/support-chat/support-chat-widget'

const geist = Geist({ subsets: ['latin'], display: 'swap', variable: '--font-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-mono' })
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'Elderdoc — Trusted care for the people you love',
  description: 'Find verified, compassionate caregivers for your elderly loved ones. Matched to your needs, in minutes.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session] = await Promise.all([
    auth(),
    getAppKnowledge(), // warms Redis cache; API route reads from it
  ])

  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ToastProvider>{children}</ToastProvider>
        <SupportChatWidget isLoggedIn={!!session?.user?.id} />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
cd elderdoc-web-app
bun tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add elderdoc-web-app/app/layout.tsx
git commit -m "feat: mount support chat widget and warm knowledge cache in root layout"
```

---

### Task 8: Add ioredis to admin + create Redis client

**Files:**
- Modify: `elderdoc-admin/package.json`
- Create: `elderdoc-admin/lib/redis.ts`

- [ ] **Step 1: Add ioredis to admin dependencies**

In `elderdoc-admin/package.json`, add `"ioredis": "^5.10.1"` to `dependencies` (alphabetical order, after `drizzle-orm`):

```json
"dependencies": {
  "@elderdoc/db": "workspace:*",
  "bcryptjs": "^3.0.3",
  "date-fns": "^4.1.0",
  "drizzle-orm": "^0.45.2",
  "ioredis": "^5.10.1",
  "lucide-react": "^1.8.0",
  "next": "16.2.4",
  "next-auth": "^5.0.0-beta.31",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "tailwind-merge": "^3.5.0",
  "tw-animate-css": "^1.4.0"
}
```

- [ ] **Step 2: Install**

```bash
cd elderdoc-admin
bun install
```

Expected: `ioredis` installed, lockfile updated at repo root.

- [ ] **Step 3: Create the admin Redis client**

Create `elderdoc-admin/lib/redis.ts`:

```ts
import Redis from 'ioredis'

declare global { var _adminRedis: Redis | undefined }

export const redis: Redis =
  globalThis._adminRedis ?? (globalThis._adminRedis = new Redis(process.env.REDIS_URL!))
```

- [ ] **Step 4: Commit**

```bash
cd ..
git add elderdoc-admin/package.json elderdoc-admin/lib/redis.ts bun.lock
git commit -m "feat: add ioredis to admin app for cache busting"
```

---

### Task 9: Admin knowledge server action

**Files:**
- Create: `elderdoc-admin/app/(admin)/knowledge/actions.ts`

- [ ] **Step 1: Create the action**

Create `elderdoc-admin/app/(admin)/knowledge/actions.ts`:

```ts
'use server'

import { db } from '@elderdoc/db'
import { appKnowledge } from '@elderdoc/db/schema'
import { revalidatePath } from 'next/cache'
import { redis } from '@/lib/redis'

export type SaveKnowledgeState = { success: boolean; error?: string } | null

export async function saveKnowledge(
  _prev: SaveKnowledgeState,
  formData: FormData,
): Promise<SaveKnowledgeState> {
  const values = {
    about:             (formData.get('about') as string).trim(),
    howItWorks:        (formData.get('howItWorks') as string).trim(),
    pricingAndBilling: (formData.get('pricingAndBilling') as string).trim(),
    forCaregivers:     (formData.get('forCaregivers') as string).trim(),
    forClients:        (formData.get('forClients') as string).trim(),
    faqs:              (formData.get('faqs') as string).trim(),
    support:           (formData.get('support') as string).trim(),
    updatedAt:         new Date(),
  }

  try {
    await db
      .insert(appKnowledge)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: appKnowledge.id, set: values })

    try {
      await redis.del('app:knowledge')
    } catch {
      // Redis unavailable — cache expires naturally after 24h
    }

    revalidatePath('/knowledge')
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save.',
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add elderdoc-admin/app/(admin)/knowledge/actions.ts
git commit -m "feat: add admin knowledge save action with Redis cache bust"
```

---

### Task 10: Admin knowledge page

**Files:**
- Create: `elderdoc-admin/app/(admin)/knowledge/_components/knowledge-form.tsx`
- Create: `elderdoc-admin/app/(admin)/knowledge/page.tsx`

- [ ] **Step 1: Create the client form component**

Create `elderdoc-admin/app/(admin)/knowledge/_components/knowledge-form.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { saveKnowledge, type SaveKnowledgeState } from '../actions'

type KnowledgeRow = {
  about: string
  howItWorks: string
  pricingAndBilling: string
  forCaregivers: string
  forClients: string
  faqs: string
  support: string
} | null

const FIELDS: { name: keyof NonNullable<KnowledgeRow>; label: string }[] = [
  { name: 'about',             label: 'About' },
  { name: 'howItWorks',        label: 'How It Works' },
  { name: 'pricingAndBilling', label: 'Pricing & Billing' },
  { name: 'forCaregivers',     label: 'For Caregivers' },
  { name: 'forClients',        label: 'For Clients' },
  { name: 'faqs',              label: 'FAQs' },
  { name: 'support',           label: 'Support' },
]

export function KnowledgeForm({ knowledge }: { knowledge: KnowledgeRow }) {
  const [state, formAction, isPending] = useActionState<SaveKnowledgeState, FormData>(
    saveKnowledge,
    null,
  )

  return (
    <form action={formAction} className="space-y-6">
      {FIELDS.map(({ name, label }) => (
        <div key={name} className="space-y-1.5">
          <label htmlFor={name} className="block text-[13px] font-medium">
            {label}
          </label>
          <textarea
            id={name}
            name={name}
            defaultValue={knowledge?.[name] ?? ''}
            rows={5}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          />
        </div>
      ))}

      <div className="flex items-center gap-4 pb-10">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50 transition-opacity"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        {state?.success && (
          <p className="text-[13px] text-green-600">Saved successfully.</p>
        )}
        {state?.error && (
          <p className="text-[13px] text-red-500">{state.error}</p>
        )}
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create the page**

Create `elderdoc-admin/app/(admin)/knowledge/page.tsx`:

```tsx
import { db } from '@elderdoc/db'
import { appKnowledge } from '@elderdoc/db/schema'
import { KnowledgeForm } from './_components/knowledge-form'

export default async function KnowledgePage() {
  const rows = await db.select().from(appKnowledge).limit(1)
  const knowledge = rows[0] ?? null

  return (
    <div className="px-8 py-7 max-w-3xl">
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">App Knowledge</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          This content is used by the AI support chat to answer user questions.
        </p>
      </div>
      <KnowledgeForm knowledge={knowledge} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add elderdoc-admin/app/(admin)/knowledge/
git commit -m "feat: add admin knowledge editor page"
```

---

### Task 11: Add Knowledge link to admin sidebar

**Files:**
- Modify: `elderdoc-admin/components/sidebar.tsx`

- [ ] **Step 1: Add BookOpen to the Lucide import**

In `elderdoc-admin/components/sidebar.tsx`, add `BookOpen` to the existing import:

```ts
import {
  LayoutDashboard, Users, UserCheck, User, Baby,
  ClipboardList, Briefcase, Clock, CreditCard, AlertCircle,
  Calendar, Activity, Leaf, LogOut, BookOpen,
} from 'lucide-react'
```

- [ ] **Step 2: Add the nav item**

In the `NAV` array, add the Knowledge entry after the `Activity` entry:

```ts
{ label: 'Knowledge', href: '/knowledge', icon: BookOpen, group: 'Platform' },
```

- [ ] **Step 3: Commit**

```bash
git add elderdoc-admin/components/sidebar.tsx
git commit -m "feat: add Knowledge link to admin sidebar"
```
