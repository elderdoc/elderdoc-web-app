# ElderDoc — Design Specification
**Date:** 2026-04-17  
**Status:** Approved  

---

## 1. Product Overview

ElderDoc is a platform that matches clients with caregivers for elderly care, enhanced with AI (OpenAI API). It supports three user types: Client, Caregiver, and Care Recipient.

**Design principles:** Minimal, calm, premium. Apple-quality typography hierarchy. Card-based layouts. Smooth micro-interactions. Subtle motion only.

**Avoid:** AI-style gradients, overdesigned UI, generic grids, startup-template aesthetics.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| Runtime | Bun |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | NextAuth.js v5 + Google SSO |
| UI | shadcn/ui + Tailwind v4 |
| File Storage | MinIO (local) → AWS S3 (production) |
| Real-time | Bun WebSocket service + Redis pub/sub |
| AI | OpenAI gpt-4o via Vercel AI SDK |
| Payments | Stripe (stubs) + Cash |
| Session Store | Redis |
| Package Manager | Bun |

---

## 3. Infrastructure

### Docker Compose (local)

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: elderdoc
      POSTGRES_USER: elderdoc
      POSTGRES_PASSWORD: elderdoc
    ports: ["5432:5432"]

  redis:
    image: redis:7
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: elderdoc
      MINIO_ROOT_PASSWORD: elderdoc123
    ports: ["9000:9000", "9001:9001"]

  ws:
    build: ./services/ws
    environment:
      DATABASE_URL: postgres://elderdoc:elderdoc@postgres:5432/elderdoc
      REDIS_URL: redis://redis:6379
      WS_SECRET: ${WS_SECRET}
    ports: ["8080:8080"]
    depends_on: [postgres, redis]

  web:
    build: .
    environment:
      DATABASE_URL: postgres://elderdoc:elderdoc@postgres:5432/elderdoc
      REDIS_URL: redis://redis:6379
      STORAGE_ENDPOINT: http://minio:9000
      STORAGE_BUCKET: elderdoc
      WS_URL: ws://ws:8080
    ports: ["3000:3000"]
    depends_on: [postgres, redis, minio, ws]
```

### Cloud Migration Path

Swap env vars only — zero application code changes:
- `DATABASE_URL` → managed PostgreSQL (RDS, Supabase, Neon)
- `REDIS_URL` → ElastiCache or Upstash
- `STORAGE_ENDPOINT` + `STORAGE_BUCKET` → AWS S3
- `WS_URL` → hosted Bun WS service (Railway, Fly.io)

---

## 4. Architecture

### Directory Structure

```
elderdoc/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx                        # Landing
│   │   └── get-started/
│   │       ├── page.tsx                    # Role selection
│   │       ├── client/
│   │       │   ├── step-1/page.tsx         # Who needs care
│   │       │   ├── step-2/page.tsx         # Type of care
│   │       │   ├── step-3/page.tsx         # Location
│   │       │   └── step-4/page.tsx         # Preview results
│   │       └── caregiver/
│   │           ├── step-1/page.tsx         # Care types
│   │           ├── step-2/page.tsx         # Background
│   │           ├── step-3/page.tsx         # Availability
│   │           ├── step-4/page.tsx         # Location + rate
│   │           ├── step-5/page.tsx         # Profile
│   │           └── complete/page.tsx       # Welcome screen
│   ├── (auth)/
│   │   └── sign-in/page.tsx
│   ├── (client)/
│   │   └── dashboard/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── find-caregivers/page.tsx
│   │       ├── recipients/page.tsx
│   │       ├── requests/page.tsx
│   │       ├── care-plans/page.tsx
│   │       └── calendar/page.tsx
│   └── (caregiver)/
│       └── dashboard/
│           ├── layout.tsx
│           ├── page.tsx
│           ├── find-jobs/page.tsx
│           ├── my-jobs/page.tsx
│           ├── shifts/page.tsx
│           ├── care-plans/page.tsx
│           ├── offers/page.tsx
│           ├── payouts/page.tsx
│           └── calendar/page.tsx
├── components/
│   ├── ui/                                 # shadcn/ui primitives
│   ├── selectable-card.tsx                 # Global selectable card pattern
│   ├── step-progress.tsx                   # Multi-step progress indicator
│   ├── caregiver-card.tsx                  # Caregiver preview card
│   ├── care-request-modal.tsx              # Multi-step care request
│   ├── care-recipient-modal.tsx            # Care recipient form
│   ├── message-thread.tsx                  # WebSocket message UI
│   ├── calendar.tsx                        # Custom calendar component
│   └── notification-bell.tsx
├── domains/
│   ├── auth/                               # NextAuth config, session utils
│   ├── caregivers/                         # Caregiver business logic
│   ├── clients/                            # Client business logic
│   ├── matching/                           # AI matching logic
│   ├── messaging/                          # Message operations
│   ├── notifications/                      # Notification creation + delivery
│   └── payments/                           # Payment orchestration
├── services/
│   ├── db.ts                               # Drizzle client
│   ├── redis.ts                            # Redis client
│   ├── storage.ts                          # S3-compatible storage adapter
│   ├── openai.ts                           # OpenAI client
│   ├── stripe.ts                           # Stripe stubs
│   └── ws/                                 # Bun WS service (separate container)
│       ├── index.ts
│       ├── auth.ts
│       └── redis.ts
├── db/
│   ├── schema.ts                           # Drizzle schema
│   └── migrations/
├── hooks/
│   ├── use-messages.ts
│   ├── use-notifications.ts
│   └── use-selectable.ts
├── lib/
│   ├── utils.ts
│   ├── validators.ts
│   ├── constants.ts                        # Care types, certifications, languages, etc.
│   └── rate-defaults.ts                    # Experience → hourly rate lookup
├── middleware.ts                           # Auth + role enforcement
└── docker-compose.yml
```

### Request Lifecycle

```
Browser
  → Server Component (Drizzle query, no API round-trip)
  → OR Server Action (mutation → domain service → Drizzle)
  → OR Route Handler (streaming AI, file upload)

WebSocket events:
  Browser ↔ Bun WS service ↔ Redis pub/sub ↔ other connected clients
```

---

## 5. Database Schema

```typescript
// db/schema.ts (Drizzle)

users: {
  id, email, name, image, role: 'client' | 'caregiver', created_at
}

caregiver_profiles: {
  id, user_id, headline, about, photo_url,
  hourly_min, hourly_max, experience, education,
  relocatable: boolean, status: 'pending' | 'active' | 'inactive',
  completed_step: number  // 1–5, used for onboarding resume
}

caregiver_care_types:     { caregiver_id, care_type }
caregiver_certifications: { caregiver_id, certification }
caregiver_languages:      { caregiver_id, language }
caregiver_work_prefs: {
  caregiver_id, work_type, shift, day,
  travel_distance_miles, start_availability
}
caregiver_location: {
  caregiver_id, address1, address2, city, state, lat, lng
}

care_recipients: {
  id, client_id, relationship, name, dob, phone, gender,
  photo_url, address: jsonb, conditions: text[],
  mobility_level, notes
}

care_requests: {
  id, client_id, recipient_id, title, description, care_type,
  frequency, days: text[], shifts: text[], start_date,
  duration_hours, gender_pref, language_pref,
  budget_type, budget_amount, status, created_at
}
care_request_location: {
  request_id, address1, address2, city, state, lat, lng
}

matches: {
  id, request_id, caregiver_id, score: number,
  reason: string, status: 'pending' | 'accepted' | 'declined'
}

jobs: {
  id, match_id, request_id, caregiver_id, client_id,
  status: 'active' | 'completed' | 'cancelled', created_at
}

shifts: {
  id, job_id, date, start_time, end_time,
  status: 'scheduled' | 'completed' | 'cancelled'
}

care_plans: {
  id, job_id, daily_schedule: jsonb, medications: jsonb[],
  dietary_restrictions: text[], emergency_contacts: jsonb[],
  special_instructions
}

job_applications: {
  id, request_id, caregiver_id, cover_note,
  status: 'pending' | 'accepted' | 'declined', created_at
  // created when caregiver applies via Find Jobs tab (distinct from AI-generated matches)
}

messages:      { id, job_id, sender_id, body, created_at }
notifications: { id, user_id, type, payload: jsonb, read, created_at }
payments: {
  id, job_id, amount, method: 'stripe' | 'cash',
  status, stripe_payment_intent_id
}
```

**Key design decisions:**
- `lat`/`lng` on caregiver and request locations enables proximity pre-filtering before AI scoring
- `jsonb` for structured flexible fields (medications, emergency contacts, daily schedule)
- `text[]` arrays for multi-select fields — each discrete value preserved as specified
- `matches` is the AI output record, decoupled from `jobs` (job created only on offer acceptance)

---

## 6. Design System

### Typography

| Token | Size | Weight | Tracking |
|---|---|---|---|
| display | 56px | 600 | -0.03em |
| h1 | 40px | 600 | -0.02em |
| h2 | 28px | 500 | -0.01em |
| h3 | 20px | 500 | 0 |
| body | 16px | 400 | 0 |
| label | 13px | 500 | 0.01em (uppercase) |
| caption | 12px | 400 | 0 |

Font: Inter + system fallback stack.

### Color Palette

| Token | Light | Dark |
|---|---|---|
| background | #FAFAFA | #0A0A0A |
| surface | #FFFFFF | #111111 |
| surface-2 | #F5F5F5 | #1A1A1A |
| border | #E8E8E8 | #242424 |
| text-primary | #0A0A0A | #F5F5F5 |
| text-muted | #737373 | #A3A3A3 |
| accent | #1A6B4A | #1A6B4A |
| accent-hover | #155C3E | #155C3E |
| accent-light | #EAF4EF | #0D2B1F |
| destructive | #DC2626 | #EF4444 |

### Spacing & Radius

- **Spacing scale:** 4px base — 4, 8, 12, 16, 24, 32, 48, 64, 96
- **Radius:** card 12px · input 8px · button 8px · pill 999px · modal 16px

### Shadows

```css
--shadow-card:  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
--shadow-hover: 0 4px 12px rgba(0,0,0,0.08);
--shadow-modal: 0 24px 48px rgba(0,0,0,0.12);
```

### Motion

All transitions: `150ms cubic-bezier(0.4, 0, 0.2, 1)`  
Modal enter: fade + translateY(8px → 0)  
Page transitions: none (instant)

### Selectable Card Pattern (Global)

Used for ALL option inputs per spec. Never sliders, never grouped ranges.

```
Default:  surface bg, border-color border, radius 12px, shadow-card
Hover:    border accent-light, shadow-hover, 150ms ease
Selected: bg accent-light, border accent 2px, checkmark icon top-right
```

Multi-select: multiple cards active simultaneously.  
Single-select: selecting one deselects previous.

---

## 7. Authentication & Routing

### NextAuth v5 Configuration

- Provider: Google OAuth
- Strategy: JWT (httpOnly cookie)
- Token includes: `userId`, `role`
- No adapter required — JWT strategy is self-contained. Redis is used only for pub/sub (messaging/notifications), not for session storage.

### Middleware (`middleware.ts`)

- Protects `/(client)/dashboard/*` — requires `role === 'client'`
- Protects `/(caregiver)/dashboard/*` — requires `role === 'caregiver'`
- New Google SSO user with no role → redirect to `/get-started`
- Unauthenticated access to protected routes → redirect to `/sign-in?callbackUrl=...`

### Client "Send Offer" Intercept

Client flow steps 1–3 require no account. Step 4 "Send Offer" button redirects to:  
`/sign-in?callbackUrl=/dashboard/requests/new`

Session storage holds step 1–3 state, passed as query params to the preview page for server-side caregiver filtering.

### Caregiver Onboarding Resume

Each step is a Server Action upsert on `caregiver_profiles` with `status: 'pending'`. If user closes browser mid-flow and returns, middleware detects `status: 'pending'` and redirects to their last completed step.

---

## 8. Marketing & Client Flow

### Landing Page

- Full-viewport hero: display heading, subtext, single "Get Started" CTA
- Three trust pillars below fold: Verified Caregivers · AI-Matched for You · Real Families, Real Care
- Minimal footer

### Role Selection (`/get-started`)

Two large selectable cards, centered, generous whitespace:
- "Find Trusted Care for Your Loved One" → `/get-started/client/step-1`
- "Offer Your Caregiving Services" → `/get-started/caregiver/step-1`

### Client Step 1 — Who Needs Care (single-select)

Progress indicator (4 steps). Six individual selectable cards in 3×2 grid:
Myself · Parent · Spouse · Grandparent · Sibling · Other family member

### Client Step 2 — Type of Care (multi-select)

Five individual selectable cards (3+2 layout):
Personal Care · Companionship · Dementia Care · Mobility Assistance · Post-Hospital Recovery

### Client Step 3 — Location

Standard labeled form: Address Line 1 · Address Line 2 · City · State (dropdown) · Country (fixed: United States)

### Client Step 4 — Preview Results

Server-side filtering: care type overlap + Haversine proximity from step-3 location.  
Grid of caregiver preview cards: avatar, name, headline, care type tags, city/state, "Send Offer" CTA.  
"Send Offer" → redirect to sign-in.

---

## 9. Caregiver Onboarding

Persistent step progress sidebar (desktop) / top progress bar (mobile). Server Action upsert per step.

### Step 1 — Care Types (multi-select)
Personal Care · Companionship · Dementia Care · Mobility Assistance · Post-Hospital Recovery

### Step 2 — Background

- **Experience (single-select):** Less than 1 year · 1–2 years · 3–5 years · 5–10 years · 10+ years
- **Certifications (multi-select):** CNA · Home Health Aide · Medication Aide · Medical Assistant · LVN · RN · Retired Nurse
- **Languages (multi-select):** English · Spanish · French · Mandarin · Cantonese · Tagalog · Vietnamese · Korean · Arabic · Portuguese · Russian · Hindi
- **Education (single-select):** High school / GED · Some college · Associate's · Bachelor's · Master's or higher

### Step 3 — Availability

- **Work Type (multi-select):** Full-time · Part-time · Flexible · Live-in
- **Days (multi-select):** Monday · Tuesday · Wednesday · Thursday · Friday · Saturday · Sunday
- **Shifts (multi-select):** Morning 6am–12pm · Afternoon 12pm–6pm · Evening 6pm–10pm · Overnight 10pm–6am
- **Start (single-select):** Immediately · Within a week · Within a month

### Step 4 — Location & Rate

- Location form (same structure as client step 3)
- **Travel Distance (multi-select, discrete cards — NOT a slider):** 5 mi · 10 mi · 15 mi · 20 mi · 25 mi · 30+ mi
- Relocation: single checkbox "Open to relocating"
- **Hourly Rate:** Min and Max number inputs. Auto-filled on experience selection:

| Experience | Default Range |
|---|---|
| < 1 year | $16–$20 |
| 1–2 years | $19–$24 |
| 3–5 years | $22–$30 |
| 5–10 years | $28–$40 |
| 10+ years | $35–$55 |

User can override. Defaults set via Server Action triggered by experience card selection.

### Step 5 — Profile

- Photo: drag-and-drop upload zone → MinIO/S3 → returns URL
- Name · Email (pre-filled from Google SSO, editable) · Phone (US format)
- Password: hidden if Google SSO account, required otherwise
- Headline: three selectable template cards + free-edit field
- About: textarea, 500 character limit

### Completion Screen

Full-viewport centered layout. CSS checkmark animation. Heading: "Welcome to ElderDoc."  
CTAs: "View My Dashboard" (primary) · "Complete My Profile" (secondary)

---

## 10. Client Dashboard

### Shell Layout

Fixed left sidebar (240px): logo, user avatar, nav tabs, notification bell with unread badge.  
Mobile: bottom tab bar.

### Tabs

| Tab | Content |
|---|---|
| Dashboard | Greeting, 3 stat cards, activity feed, recipients strip |
| Find Caregivers | Filter bar + caregiver cards grid + detail sheet |
| Care Recipients | Recipient grid + Add Recipient modal |
| Care Requests | Request list + New Request modal |
| Care Plans | Active care plan list + detail view |
| Calendar | Custom monthly calendar + day panel |

### Care Recipient Modal (4 steps)

1. Relationship (individual cards): Myself · Parent · Spouse · Grandparent · Sibling · Other. "Myself" auto-fills and skips to review.
2. Photo · Name · DOB · Phone · Gender (individual cards): Male · Female · Non-binary · Prefer not to say
3. Conditions (individual checkboxes): Alzheimer's · Dementia · Parkinson's · Diabetes · Heart disease · Stroke · COPD · Arthritis · Depression · Anxiety · Vision impairment · Hearing impairment · Other  
   Mobility (individual cards): Independent · Minimal assistance · Moderate assistance · Full assistance
4. Notes (textarea)

### Care Request Modal (6 steps)

1. Care Type (single-select cards)
2. Select Care Recipient (cards from existing recipients + "Add New")
3. Address (auto-fills from recipient, editable)
4. Schedule:
   - Frequency (single-select): One-time · Weekly · Bi-weekly · Daily · As needed
   - Days (multi-select): Monday–Sunday individual cards
   - Time of Day (multi-select): Morning · Afternoon · Evening · Overnight
   - Start date (date picker)
   - Duration (single-select): 2hr · 4hr · 6hr · 8hr · 12hr
5. Preferences:
   - Gender pref (individual cards): Male · Female · No preference
   - Language pref (multi-select individual cards)
   - Budget Type (single-select): Hourly rate · Fixed per visit · Fixed monthly · Fixed bi-weekly
   - Budget amount input revealed dynamically per budget type selection
6. AI Generation: "Generate with AI" → streams title + description via OpenAI with typewriter effect

**Post-submission:** Modal transitions to "Your Top Matches" — 5 caregiver cards each with match score (0–100), one-sentence match reason, "Send Offer" CTA.

### Care Plan Detail

Sections: Daily Schedule · Medications · Dietary Restrictions · Emergency Contacts · Special Instructions. All sections editable inline by client.

### Calendar

Custom monthly grid built with `date-fns`. No third-party calendar library. Days with events show colored dot. Click date → day panel (side sheet) with event list + "Add Event."

---

## 11. Caregiver Dashboard

### Shell Layout

Same sidebar pattern as client dashboard, role-aware tab set.

### Tabs

| Tab | Content |
|---|---|
| Dashboard | Greeting, 3 stat cards, activity feed, profile completeness bar |
| Find Jobs | Filter bar + job cards list + detail sheet + Apply |
| My Jobs | Active / Completed sub-tabs + job detail + messaging |
| Shifts | Chronological shift list with status chips |
| Care Plans | Read-only care plans for active jobs |
| Offers | Incoming offer cards with Accept / Decline actions |
| Payouts | Earnings summary + shift list + Stripe Connect stub |
| Calendar | Same custom calendar component, caregiver's data |

### Job Detail (My Jobs)

Visible post-acceptance: client name, contact info, care plan link, shift history, message thread. Messaging locked until job is active.

### Offers

Offer card: client first name, care type, schedule summary, offered rate.  
Accept → creates `jobs` record, unlocks messaging, sends notification to client.  
Decline → updates `matches.status = 'declined'`.

---

## 12. AI Integration

### Care Request Generation

```typescript
// domains/matching/generate-care-request.ts
export async function generateCareRequest(input: CareRequestFormState) {
  // Server Action — streams via Route Handler
  // Model: gpt-4o
  // Returns: { title: string, description: string }
  // Displayed with typewriter effect in form
}
```

Prompt built from: care type, recipient conditions, mobility level, schedule, preferences.

### Caregiver Matching

```typescript
// domains/matching/match-caregivers.ts
export async function matchCaregivers(requestId: string): Promise<Match[]> {
  // 1. Pre-filter via Drizzle: care type overlap + Haversine proximity + shift overlap + rate range
  // 2. Send top 20 candidates + request to gpt-4o (JSON mode)
  // 3. Parse structured output: { rankings: [{ caregiverId, score, reason }] }
  // 4. Write top 5 to matches table
  // 5. Return top 5 with score + reason
}
```

### Rate Auto-Calculation

Static lookup in `lib/rate-defaults.ts`. Triggered by Server Action on experience card selection. Returns `{ min: number, max: number }` — auto-fills form inputs, user can override.

---

## 13. Messaging (WebSocket)

### Bun WS Service (`services/ws/`)

- Standalone Bun server, separate Docker container
- On connect: validates auth token against shared secret
- Associates socket with `userId`
- Subscribes to Redis pub/sub `messages:{jobId}` for user's active jobs
- On inbound message: validates job membership → writes to `messages` table → publishes to Redis → Redis fans out to all job participants

### Next.js (`hooks/use-messages.ts`)

```typescript
useMessages(jobId: string): {
  messages: Message[],
  sendMessage: (body: string) => void,
  isConnected: boolean
}
```

Manages WS connection, reconnect logic, optimistic updates.

### UI

Message bubbles: sender right (accent bg), receiver left (surface-2 bg). Timestamp on hover. Locked state shown on non-active jobs.

---

## 14. Notifications

- `createNotification(userId, type, payload)` — writes to `notifications` table + publishes to Redis `notifications:{userId}`
- Bun WS service subscribes and pushes to connected client
- `hooks/use-notifications.ts` — returns `notifications[]` + `markRead(id)`
- Notification bell in sidebar shows unread count badge
- Types: `offer_received` · `offer_accepted` · `offer_declined` · `match_found` · `job_started` · `shift_scheduled` · `message_received`

---

## 15. Payments

### Stripe (stubs — env-driven)

```typescript
// services/stripe.ts
createPaymentIntent(amount: number, jobId: string)
capturePaymentIntent(intentId: string)
createConnectAccount(caregiverId: string)
createConnectAccountLink(accountId: string)
transferPayout(amount: number, accountId: string)
```

All functions read `STRIPE_SECRET_KEY` from env. No key = mock return. Real key = live Stripe. Zero code changes between environments.

### Cash Payments

`payments.method = 'cash'` — no Stripe calls. Either party confirms in job detail UI → `status = 'completed'`.

### Payment Trigger

On shift completion → Server Action creates `payments` record → routes to Stripe or cash path based on job's payment method.

---

## 16. Implementation Phases

This spec covers ~8 independent subsystems. Recommended build order:

| Phase | Scope |
|---|---|
| 1 | Foundation: Docker stack, Drizzle schema, design system, shadcn/ui setup, auth (NextAuth + Google SSO), middleware, route shells |
| 2 | Marketing + client onboarding flow (steps 1–4, no account required) |
| 3 | Caregiver onboarding (steps 1–5 + completion screen) |
| 4 | Client dashboard: Care Recipients modal + Care Requests modal (with AI generation) |
| 5 | AI matching: post-submission match results, caregiver ranking |
| 6 | Caregiver dashboard: Find Jobs, Offers, My Jobs |
| 7 | Bun WS service + messaging + notifications |
| 8 | Care Plans, Shifts, Calendar (both dashboards) |
| 9 | Payments (Stripe stubs + cash), Payouts tab |
