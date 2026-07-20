# AI Support Chat — Design Spec

**Date:** 2026-05-05
**Status:** Approved

---

## Overview

A floating AI chat widget in the web app that answers questions about Elderdoc. App knowledge is stored in the database, editable by admins, and cached in Redis so it is ready before the user opens the chat. Guardrails prevent the AI from answering questions outside the Elderdoc domain.

---

## Architecture

```
Admin dashboard
  └── /knowledge page
        └── Form with 7 structured sections
              └── Server action → saves to DB → busts Redis cache

Database (packages/db)
  └── app_knowledge table — single row, one column per section

Redis (ioredis)
  └── key: "app:knowledge"
  └── TTL: 24 hours
  └── Warmed in root layout server component on every page load
  └── DB hit only on cache miss or after admin save

Web app root layout (server component)
  └── Warms Redis cache on load
  └── Renders floating chat widget for logged-in users only

Chat widget (client component)
  └── useChat → POST /api/support-chat
        └── Reads knowledge from Redis (already warm)
        └── Streams response via streamText (gpt-4o-mini)
        └── Ephemeral state — cleared when widget is closed
```

---

## Database Schema

New table added to `packages/db/schema.ts`:

```ts
export const appKnowledge = pgTable('app_knowledge', {
  id: integer('id').primaryKey().default(1),
  about: text('about').notNull().default(''),
  howItWorks: text('how_it_works').notNull().default(''),
  pricingAndBilling: text('pricing_and_billing').notNull().default(''),
  forCaregivers: text('for_caregivers').notNull().default(''),
  forClients: text('for_clients').notNull().default(''),
  faqs: text('faqs').notNull().default(''),
  support: text('support').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

- Always a single row (id = 1). Admin saves overwrite it.
- A seed script inserts the initial row with placeholder content and pushes to DB.

---

## Caching Strategy

- **Key:** `app:knowledge`
- **TTL:** 24 hours
- **Warm-up:** Root layout server component reads Redis on every page load. On miss, queries DB and writes to Redis.
- **Invalidation:** Admin save server action deletes the Redis key immediately after updating the DB row.
- **Fallback:** If Redis is unavailable, the API route falls back to DB directly.

---

## API Route

**`elderdoc-web-app/app/api/support-chat/route.ts`**

```
POST /api/support-chat

1. Verify session — return 401 if not authenticated
2. Read app knowledge from Redis
   └── On miss: query DB, write to Redis (TTL 24h)
3. Build system prompt:
   "You are an Elderdoc support assistant. Answer ONLY questions
    about Elderdoc using the information provided. If asked anything
    unrelated to Elderdoc, politely decline and redirect the user
    to ask an Elderdoc-related question.
    [knowledge sections injected]"
4. streamText(openai('gpt-4o-mini'), { system, messages })
5. Return streaming response
```

- Model: `gpt-4o-mini` — fast and cost-efficient for guardrailed Q&A.
- Guardrail is prompt-based; no separate classifier needed given the narrow domain.

---

## Chat Widget

**`elderdoc-web-app/components/support-chat/support-chat-widget.tsx`**

- Client component, mounted in root layout (persists across navigation).
- Floating button: bottom-left, fixed, `z-50`, `MessageCircle` icon (Lucide).
- Visible only when user is logged in (prop passed from layout).
- Click toggles chat panel open/closed.
- Panel uses conditional rendering (`{isOpen && <ChatPanel />}`), not CSS visibility — ensures `useChat` unmounts and state clears on close (ephemeral).

**Panel contents:**
- Header: "Elderdoc Support" + close button
- Scrollable messages list (user messages right-aligned, AI left-aligned)
- Streaming indicator while AI is responding
- Input bar + Send button
- `useChat({ api: '/api/support-chat' })`

---

## Admin Knowledge Editor

**`elderdoc-admin/app/(admin)/knowledge/page.tsx`**

- Server component — loads current `app_knowledge` row from DB on render.
- Form with 7 labeled textarea fields: About, How it works, Pricing & Billing, For Caregivers, For Clients, FAQs, Support.
- Save → server action:
  1. Upsert the single row in `app_knowledge`
  2. Delete `"app:knowledge"` from Redis
  3. Revalidate path
- Toast feedback on success/error.
- Link added to admin sidebar.

---

## Seed Data

A seed script (`packages/db/seed-knowledge.ts`) inserts the initial `app_knowledge` row with real placeholder content covering all 7 sections. Run once against the DB before or during deployment.

---

## Files Changed / Created

| File | Action |
|------|--------|
| `packages/db/schema.ts` | Add `appKnowledge` table |
| `packages/db/seed-knowledge.ts` | New seed script |
| `elderdoc-web-app/app/api/support-chat/route.ts` | New API route |
| `elderdoc-web-app/components/support-chat/support-chat-widget.tsx` | New widget component |
| `elderdoc-web-app/app/layout.tsx` | Mount widget, warm Redis cache |
| `elderdoc-admin/app/(admin)/knowledge/page.tsx` | New admin page |
| `elderdoc-admin/app/(admin)/knowledge/actions.ts` | Save + cache bust server action |
| `elderdoc-admin/package.json` | Add `ioredis` dependency (needed for cache bust) |
| `elderdoc-admin/components/sidebar.tsx` | Add Knowledge nav link |

---

## Out of Scope

- Persistent chat history across sessions
- Unauthenticated access
- Human handoff / escalation to live support
- Analytics on chat usage
