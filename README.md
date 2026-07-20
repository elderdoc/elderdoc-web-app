# Elderdoc

A care marketplace platform connecting families with qualified caregivers. Built with Next.js 15, Drizzle ORM, and Stripe.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL + Drizzle ORM
- **Payments:** Stripe (invoices, Connect, escrow)
- **Storage:** S3-compatible (Cloudflare R2 in production, MinIO locally)
- **Styling:** Tailwind CSS
- **Auth:** Custom session-based auth

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- MinIO (local S3-compatible storage)

### Setup

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

### Database

```bash
# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | Stripe secret key (omit to run in mock mode) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `CRON_SECRET` | Bearer token for cron job endpoints |
| `STORAGE_ENDPOINT` | S3-compatible endpoint URL |
| `STORAGE_BUCKET` | S3 bucket name |
| `STORAGE_ACCESS_KEY` | S3 access key |
| `STORAGE_SECRET_KEY` | S3 secret key |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI matching |

## Key Features

- **Care request flow** — multi-step form with schedule, clinical needs, and budget
- **AI caregiver matching** — ranked suggestions based on care requirements
- **Shift management** — calendar-based scheduling with clock-in/out
- **Billing** — automatic weekly invoicing via Stripe with escrow and dispute flow
- **Caregiver payouts** — Stripe Connect with 7-day hold and auto-release

## Project Structure

```
app/
  (client)/       # Client-facing pages
  (caregiver)/    # Caregiver-facing pages
  api/            # API routes and cron jobs
domains/          # Business logic (clients, caregivers, matching, payments)
db/
  schema.ts       # Drizzle schema
  migrations/     # SQL migration files
services/         # External service clients (Stripe, storage)
components/       # Shared UI components
lib/              # Utilities and constants
```
