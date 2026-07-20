# Elderdoc Admin Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Bun workspace monorepo housing the existing app as `elderdoc-app`, a shared `@elderdoc/db` package, and a new Next.js 16 admin app at `elderdoc-admin` with auth, layout, and all people-management views.

**Architecture:** The current `/Users/ashcbrd/Desktop/Development/elderdoc` folder is moved to become `elderdoc-app` inside a new parent workspace directory. A `packages/db` workspace package is extracted from `elderdoc-app/db/schema.ts` — re-export shims preserve all existing `@/db/schema` and `@/services/db` import paths in `elderdoc-app`. The admin app queries the database directly via Drizzle; no API bridge between apps.

**Tech Stack:** Next.js 16.2.4, App Router, TypeScript, Drizzle ORM, NextAuth v5 beta.31, Tailwind CSS v4, Bun workspaces, Lucide icons (no UI library).

---

### Task 1: Monorepo filesystem restructure

**Files:**
- Create: `/Users/ashcbrd/Desktop/Development/elderdoc/package.json` (workspace root, after restructure)
- Move: current `elderdoc/` → `elderdoc-app/` inside new `elderdoc/` parent
- Create: `packages/db/` skeleton directory

- [ ] **Step 1: Run filesystem restructure**

Run these commands from `/Users/ashcbrd/Desktop/Development`:

```bash
cd /Users/ashcbrd/Desktop/Development
mv elderdoc elderdoc-app-tmp
mkdir elderdoc
mv elderdoc-app-tmp elderdoc/elderdoc-app
mkdir -p elderdoc/packages/db
```

Expected: `ls elderdoc/` shows `elderdoc-app  packages`

- [ ] **Step 2: Create workspace root package.json**

Create `/Users/ashcbrd/Desktop/Development/elderdoc/package.json`:

```json
{
  "name": "elderdoc-workspace",
  "private": true,
  "workspaces": ["elderdoc-app", "elderdoc-admin", "packages/db"]
}
```

- [ ] **Step 3: Verify elderdoc-app git history is intact**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-app
git log --oneline -5
```

Expected: Shows the 5 most recent commits (same as before restructure). The `.git` folder traveled with the directory.

- [ ] **Step 4: Commit**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-app
git add package.json
git commit -m "chore: add workspace root package.json for monorepo"
```

---

### Task 2: Extract @elderdoc/db shared package

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/schema.ts` (copy of elderdoc-app/db/schema.ts)
- Create: `packages/db/client.ts`
- Create: `packages/db/index.ts`
- Create: `packages/db/drizzle.config.ts`
- Modify: `elderdoc-app/db/schema.ts` → re-export shim
- Modify: `elderdoc-app/services/db.ts` → re-export shim
- Modify: `elderdoc-app/package.json` → add `@elderdoc/db` dep

- [ ] **Step 1: Create packages/db/package.json**

```json
{
  "name": "@elderdoc/db",
  "version": "0.1.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./schema": "./schema.ts",
    "./client": "./client.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.45.2",
    "postgres": "^3.4.9"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.10",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Copy schema to packages/db/schema.ts**

Copy the full contents of `elderdoc-app/db/schema.ts` verbatim to `packages/db/schema.ts`. No changes — the schema moves wholesale.

- [ ] **Step 3: Create packages/db/client.ts**

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

declare global { var _pgClient: ReturnType<typeof postgres> | undefined }

const url = process.env.DATABASE_URL ?? 'postgresql://build-placeholder/placeholder'
const client = globalThis._pgClient ?? (globalThis._pgClient = postgres(url, { max: 10 }))

export const db = drizzle(client, { schema })
```

- [ ] **Step 4: Create packages/db/index.ts**

```ts
export * from './schema'
export { db } from './client'
```

- [ ] **Step 5: Create packages/db/drizzle.config.ts**

```ts
import type { Config } from 'drizzle-kit'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

export default {
  schema: './schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL },
} satisfies Config
```

- [ ] **Step 6: Replace elderdoc-app/db/schema.ts with re-export shim**

Overwrite `elderdoc-app/db/schema.ts` with:

```ts
export * from '@elderdoc/db/schema'
```

- [ ] **Step 7: Replace elderdoc-app/services/db.ts with re-export shim**

Overwrite `elderdoc-app/services/db.ts` with:

```ts
export { db } from '@elderdoc/db'
```

- [ ] **Step 8: Add @elderdoc/db to elderdoc-app/package.json**

In `elderdoc-app/package.json`, add to `"dependencies"`:

```json
"@elderdoc/db": "workspace:*"
```

- [ ] **Step 9: Install workspace deps**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc
bun install
```

Expected: Bun links `@elderdoc/db` to `packages/db` and installs all workspace deps without errors.

- [ ] **Step 10: Verify elderdoc-app still builds**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-app
bun run build
```

Expected: Build succeeds. If TypeScript errors appear related to `@elderdoc/db` not found, check that `bun install` ran from the workspace root (not elderdoc-app).

- [ ] **Step 11: Commit**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-app
git add db/schema.ts services/db.ts package.json
git add ../packages/db
git commit -m "feat: extract @elderdoc/db shared package, add re-export shims"
```

---

### Task 3: Schema migration — suspendedAt + admin role

**Files:**
- Modify: `packages/db/schema.ts` (add two fields to users table)
- Create: `packages/db/migrations/<timestamp>_add_admin_role_suspended_at.sql` (auto-generated)

- [ ] **Step 1: Edit packages/db/schema.ts — users table**

Change the `users` table definition. Before:
```ts
export const users = pgTable('users', {
  id:               uuid('id').defaultRandom().primaryKey(),
  email:            text('email').notNull().unique(),
  name:             text('name'),
  image:            text('image'),
  phone:            text('phone'),
  role:             text('role', { enum: ['client', 'caregiver'] }),
  password:         text('password'),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
})
```

After:
```ts
export const users = pgTable('users', {
  id:               uuid('id').defaultRandom().primaryKey(),
  email:            text('email').notNull().unique(),
  name:             text('name'),
  image:            text('image'),
  phone:            text('phone'),
  role:             text('role', { enum: ['client', 'caregiver', 'admin'] }),
  password:         text('password'),
  stripeCustomerId: text('stripe_customer_id'),
  suspendedAt:      timestamp('suspended_at'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
})
```

- [ ] **Step 2: Update elderdoc-app auth.ts role type**

In `elderdoc-app/auth.ts`, the session callback casts role. Change:

```ts
session.user.role = token.role as 'client' | 'caregiver' | null
```

To:
```ts
session.user.role = token.role as 'client' | 'caregiver' | 'admin' | null
```

Also update the type declaration in `elderdoc-app/types/next-auth.d.ts` (or wherever the session type is extended) to include `'admin'` in the role union.

- [ ] **Step 3: Generate Drizzle migration**

Copy `.env.local` (with `DATABASE_URL`) from `elderdoc-app` to `packages/db/.env.local`, then:

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/packages/db
bunx drizzle-kit generate
```

Expected: A new `.sql` file appears in `packages/db/migrations/` containing:
```sql
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp;
```
(The enum change for `role` may not generate a migration since it's a text column in Postgres — that's expected.)

- [ ] **Step 4: Run migration**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/packages/db
bunx drizzle-kit migrate
```

Expected: `All migrations applied successfully.`

- [ ] **Step 5: Commit**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-app
git add ../packages/db/schema.ts ../packages/db/migrations auth.ts
git commit -m "feat: add admin role and suspendedAt to users table"
```

---

### Task 4: Scaffold elderdoc-admin Next.js 16 app

**Files:**
- Create: `elderdoc-admin/` — full Next.js 16 app scaffold
- Modify: `elderdoc-admin/package.json` — add @elderdoc/db + auth deps
- Create: `elderdoc-admin/app/globals.css` — shared design tokens
- Create: `elderdoc-admin/tsconfig.json`

- [ ] **Step 1: Scaffold with create-next-app**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc
bunx create-next-app@16 elderdoc-admin --typescript --tailwind --app --no-src-dir --no-eslint --import-alias "@/*"
```

When prompted, accept defaults. Expected: `elderdoc-admin/` directory created with Next.js 16 app structure.

- [ ] **Step 2: Update elderdoc-admin/package.json — add deps**

Add to `"dependencies"`:
```json
"@elderdoc/db": "workspace:*",
"next-auth": "^5.0.0-beta.31",
"bcryptjs": "^3.0.3",
"drizzle-orm": "^0.45.2",
"lucide-react": "^1.8.0",
"tailwind-merge": "^3.5.0",
"tw-animate-css": "^1.4.0"
```

Add to `"devDependencies"`:
```json
"@types/bcryptjs": "^3.0.0",
"@tailwindcss/postcss": "^4"
```

- [ ] **Step 3: Run bun install from workspace root**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc
bun install
```

- [ ] **Step 4: Replace elderdoc-admin/app/globals.css**

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-cream: var(--cream);
  --color-forest: var(--forest);
  --color-forest-deep: var(--forest-deep);
  --color-forest-soft: var(--forest-soft);

  --font-sans: 'Geist', system-ui, -apple-system, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, Menlo, monospace;

  --shadow-modal: 0 24px 48px -12px rgba(15, 20, 16, 0.18), 0 4px 12px rgba(15, 20, 16, 0.06);
  --shadow-elevated: 0 4px 12px -4px rgba(15, 20, 16, 0.08), 0 2px 4px rgba(15, 20, 16, 0.04);
}

:root {
  --cream:       #FCFAF7;
  --cream-deep:  #F4F0E8;
  --ink:         #131816;
  --forest:      #1A6B4A;
  --forest-deep: #0E4D34;
  --forest-soft: #E6EFEB;

  --background:         var(--cream);
  --foreground:         var(--ink);
  --card:               #FFFFFF;
  --card-foreground:    var(--ink);
  --primary:            var(--forest);
  --primary-foreground: #FFFFFF;
  --muted:              #F2EEE6;
  --muted-foreground:   #6B6759;
  --destructive:        #B14444;
  --destructive-foreground: #FFFFFF;
  --border:             #E8E2D4;
  --input:              #DDD6C5;
  --ring:               var(--forest);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  html { -webkit-font-smoothing: antialiased; }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans);
    line-height: 1.55;
  }
}
```

- [ ] **Step 5: Verify dev server starts**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-admin
bun run dev
```

Expected: Server starts on port 3001 (or 3000 if 3000 is free). Hit Ctrl+C after confirming.

---

### Task 5: Admin auth — NextAuth v5, middleware, login page

**Files:**
- Create: `elderdoc-admin/lib/auth.ts`
- Create: `elderdoc-admin/app/api/auth/[...nextauth]/route.ts`
- Create: `elderdoc-admin/types/next-auth.d.ts`
- Create: `elderdoc-admin/middleware.ts`
- Create: `elderdoc-admin/app/login/page.tsx`
- Create: `elderdoc-admin/app/login/actions.ts`
- Create: `elderdoc-admin/.env.local`

- [ ] **Step 1: Create elderdoc-admin/lib/auth.ts**

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@elderdoc/db'
import { users } from '@elderdoc/db/schema'
import { eq, isNull } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
        if (!user?.password) return null
        if (user.role !== 'admin') return null
        if (user.suspendedAt !== null) return null

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name ?? '' }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.role = 'admin'
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.userId as string
      session.user.role = 'admin'
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
})
```

- [ ] **Step 2: Create elderdoc-admin/app/api/auth/[...nextauth]/route.ts**

```ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 3: Create elderdoc-admin/types/next-auth.d.ts**

```ts
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'admin'
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    role: 'admin'
  }
}
```

- [ ] **Step 4: Create elderdoc-admin/middleware.ts**

```ts
import { auth } from '@/lib/auth'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isLoginPage = req.nextUrl.pathname === '/login'

  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL('/login', req.url))
  }
  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL('/', req.url))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 5: Create elderdoc-admin/app/login/actions.ts**

```ts
'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'

export async function loginAction(email: string, password: string): Promise<{ error?: string }> {
  try {
    await signIn('credentials', { email, password, redirectTo: '/' })
    return {}
  } catch (err) {
    if (err instanceof AuthError) return { error: 'Invalid email or password.' }
    throw err
  }
}
```

- [ ] **Step 6: Create elderdoc-admin/app/login/page.tsx**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { loginAction } from './actions'
import { Leaf } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await loginAction(email, password)
      if (result.error) setError(result.error)
    })
  }

  const inputCls = 'w-full rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-[13.5px] placeholder:text-muted-foreground/50 focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow'
  const labelCls = 'block text-[12px] font-semibold text-muted-foreground mb-1.5'

  return (
    <div className="min-h-screen bg-[var(--cream)] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Leaf className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold leading-none">Elderdoc</p>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">Admin Console</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elevated)]">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] mb-1">Sign in</h1>
          <p className="text-[13px] text-muted-foreground mb-6">Restricted to admin accounts.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="admin@elderdoc.com"
              />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-[12.5px] text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-10 rounded-full bg-primary text-primary-foreground text-[13.5px] font-semibold disabled:opacity-50 hover:bg-[var(--forest-deep)] transition-colors mt-2"
            >
              {isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create elderdoc-admin/.env.local**

```
AUTH_SECRET=<generate with: openssl rand -base64 32>
DATABASE_URL=<same value as in elderdoc-app/.env.local>
```

Note: The developer must fill in `AUTH_SECRET` (run `openssl rand -base64 32`) and copy `DATABASE_URL` from `elderdoc-app/.env.local`.

- [ ] **Step 8: Verify login page renders**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-admin
bun run dev
```

Open `http://localhost:3001/login` — should show the login form. Navigating to `/` should redirect to `/login`. Hit Ctrl+C.

---

### Task 6: Admin layout, sidebar, stubs

**Files:**
- Create: `elderdoc-admin/app/layout.tsx`
- Create: `elderdoc-admin/app/(admin)/layout.tsx`
- Create: `elderdoc-admin/components/sidebar.tsx`
- Create: `elderdoc-admin/app/(admin)/page.tsx` (stub)
- Create: `elderdoc-admin/app/(admin)/users/page.tsx` (stub)
- Create: `elderdoc-admin/app/(admin)/caregivers/page.tsx` (stub)
- Create: `elderdoc-admin/app/(admin)/caregivers/[id]/page.tsx` (stub)
- Create: `elderdoc-admin/app/(admin)/clients/page.tsx` (stub)
- Create: `elderdoc-admin/app/(admin)/clients/[id]/page.tsx` (stub)
- Create: `elderdoc-admin/app/(admin)/recipients/page.tsx` (stub)
- Create stubs for operations, finance, platform sections

- [ ] **Step 1: Create elderdoc-admin/app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Elderdoc Admin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Create elderdoc-admin/components/sidebar.tsx**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Users, UserCheck, User, Baby,
  ClipboardList, Briefcase, Clock, CreditCard, AlertCircle,
  Calendar, Activity, Leaf, LogOut,
} from 'lucide-react'

const NAV = [
  { label: 'Overview', href: '/', icon: LayoutDashboard, group: null },
  { label: 'Users', href: '/users', icon: Users, group: 'People' },
  { label: 'Caregivers', href: '/caregivers', icon: UserCheck, group: 'People' },
  { label: 'Clients', href: '/clients', icon: User, group: 'People' },
  { label: 'Care Recipients', href: '/recipients', icon: Baby, group: 'People' },
  { label: 'Care Requests', href: '/care-requests', icon: ClipboardList, group: 'Operations' },
  { label: 'Jobs', href: '/jobs', icon: Briefcase, group: 'Operations' },
  { label: 'Shifts', href: '/shifts', icon: Clock, group: 'Operations' },
  { label: 'Payments', href: '/payments', icon: CreditCard, group: 'Finance' },
  { label: 'Disputes', href: '/disputes', icon: AlertCircle, group: 'Finance' },
  { label: 'Calendar', href: '/calendar', icon: Calendar, group: 'Platform' },
  { label: 'Activity', href: '/activity', icon: Activity, group: 'Platform' },
]

interface Props {
  adminName: string
  adminEmail: string
}

export function Sidebar({ adminName, adminEmail }: Props) {
  const pathname = usePathname()
  const groups = ['People', 'Operations', 'Finance', 'Platform']

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div className="fixed left-0 top-0 h-full w-[240px] border-r border-border bg-card flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-[13.5px] font-semibold leading-none">Elderdoc</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {/* Overview */}
        <div>
          {NAV.filter(n => n.group === null).map(item => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
        {groups.map(group => (
          <div key={group}>
            <p className="px-2 mb-1.5 text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{group}</p>
            {NAV.filter(n => n.group === group).map(item => (
              <NavItem key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom user chip */}
      <div className="border-t border-border px-4 py-4">
        <div className="mb-3">
          <p className="text-[13px] font-semibold truncate">{adminName}</p>
          <p className="text-[11.5px] text-muted-foreground truncate">{adminEmail}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 text-[12.5px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  )
}

function NavItem({ item, active }: { item: typeof NAV[0]; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={[
        'flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] font-medium transition-all mb-0.5',
        active
          ? 'border-l-2 border-l-[var(--forest)] bg-[var(--forest-soft)] text-[var(--forest-deep)] rounded-l-none'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
      ].join(' ')}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  )
}
```

- [ ] **Step 3: Create elderdoc-admin/app/(admin)/layout.tsx**

```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar adminName={session.user.name} adminEmail={session.user.email} />
      <main className="ml-[240px] flex-1 min-h-screen">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Create stub pages**

Create each file with the same stub pattern. Repeat for all stubs:

`elderdoc-admin/app/(admin)/page.tsx` (stub — will be replaced in Task 9):
```tsx
export default function OverviewPage() {
  return <div className="px-8 py-7"><h1 className="text-2xl font-semibold">Overview</h1></div>
}
```

`elderdoc-admin/app/(admin)/users/page.tsx` (stub — replaced in Task 10):
```tsx
export default function UsersPage() {
  return <div className="px-8 py-7"><h1 className="text-2xl font-semibold">Users</h1></div>
}
```

Create identical stubs for caregivers, caregivers/[id], clients, clients/[id], recipients, care-requests, jobs, shifts, payments, disputes, calendar, activity — each with its own section name in the `<h1>`.

- [ ] **Step 5: Verify layout renders**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-admin
bun run dev
```

Sign in with an admin-role account. Expected: sidebar visible at left, stub pages render at each route. Hit Ctrl+C.

---

### Task 7: UI primitives — DataList, StatusFilter, ConfirmModal, EditPanel

**Files:**
- Create: `elderdoc-admin/components/data-list.tsx`
- Create: `elderdoc-admin/components/status-filter.tsx`
- Create: `elderdoc-admin/components/confirm-modal.tsx`
- Create: `elderdoc-admin/components/edit-panel.tsx`

- [ ] **Step 1: Create elderdoc-admin/components/data-list.tsx**

```tsx
interface DataHeaderProps {
  columns: { label: string; width: string }[]
}

export function DataHeader({ columns }: DataHeaderProps) {
  return (
    <div className="flex items-center px-4 py-2.5 border-b border-border bg-muted/30">
      {columns.map((col) => (
        <span key={col.label} className={`${col.width} text-[11px] font-semibold text-muted-foreground uppercase tracking-wider`}>
          {col.label}
        </span>
      ))}
    </div>
  )
}

interface DataRowProps {
  children: React.ReactNode
  onClick?: () => void
}

export function DataRow({ children, onClick }: DataRowProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'group flex items-center px-4 min-h-[48px] border-b border-border',
        'hover:border-l-2 hover:border-l-[var(--forest)] hover:bg-[var(--forest-soft)]/20 transition-all',
        onClick ? 'cursor-pointer' : '',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

interface DataListProps {
  children: React.ReactNode
}

export function DataList({ children }: DataListProps) {
  return (
    <div className="rounded-[14px] border border-border bg-card overflow-hidden">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create elderdoc-admin/components/status-filter.tsx**

```tsx
interface StatusFilterProps {
  options: { label: string; value: string }[]
  value: string
  onChange: (value: string) => void
}

export function StatusFilter({ options, value, onChange }: StatusFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            'rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors',
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create elderdoc-admin/components/confirm-modal.tsx**

```tsx
'use client'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  title: string
  body: string
  actionLabel: string
  onConfirm: () => void
  isPending?: boolean
  variant?: 'destructive' | 'warning' | 'safe'
}

export function ConfirmModal({
  open, onClose, title, body, actionLabel, onConfirm, isPending, variant = 'destructive',
}: ConfirmModalProps) {
  if (!open) return null

  const btnCls =
    variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' :
    variant === 'warning'     ? 'bg-amber-600 text-white hover:bg-amber-700' :
    'bg-primary text-primary-foreground hover:bg-[var(--forest-deep)]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[420px] rounded-2xl bg-card shadow-[var(--shadow-modal)] p-6">
        <h2 className="text-[16px] font-semibold mb-2">{title}</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed">{body}</p>
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 h-10 rounded-full border border-border text-[13.5px] font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 h-10 rounded-full text-[13.5px] font-semibold disabled:opacity-50 transition-colors ${btnCls}`}
          >
            {isPending ? 'Please wait…' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create elderdoc-admin/components/edit-panel.tsx**

```tsx
'use client'

import { X } from 'lucide-react'

interface EditPanelProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function EditPanel({ open, onClose, title, children, footer }: EditPanelProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative flex flex-col w-full max-w-[440px] h-full bg-card border-l border-border shadow-[-8px_0_24px_-8px_rgba(0,0,0,0.1)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-border bg-card">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export const inputCls = 'w-full rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-[13.5px] placeholder:text-muted-foreground/50 focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow'
export const labelCls = 'block text-[12px] font-semibold text-muted-foreground mb-1.5'
```

---

### Task 8: Domain layer — queries and server actions

**Files:**
- Create: `elderdoc-admin/domains/users.ts`
- Create: `elderdoc-admin/domains/caregivers.ts`
- Create: `elderdoc-admin/domains/clients.ts`
- Create: `elderdoc-admin/domains/recipients.ts`

- [ ] **Step 1: Create elderdoc-admin/domains/users.ts**

```ts
'use server'

import { db } from '@elderdoc/db'
import {
  users, caregiverProfiles, careRecipients, careRequests, jobs,
} from '@elderdoc/db/schema'
import { eq, ilike, or, count, desc, isNull, isNotNull, sql } from 'drizzle-orm'

export type AdminUser = {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string | null
  suspendedAt: Date | null
  createdAt: Date
}

export async function getAllUsers(): Promise<AdminUser[]> {
  return db.select({
    id:          users.id,
    name:        users.name,
    email:       users.email,
    phone:       users.phone,
    role:        users.role,
    suspendedAt: users.suspendedAt,
    createdAt:   users.createdAt,
  }).from(users).orderBy(desc(users.createdAt))
}

export async function updateUser(
  id: string,
  data: { name?: string; email?: string; phone?: string; role?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(users).set(data).where(eq(users.id, id))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update user.' }
  }
}

export async function suspendUser(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(users).set({ suspendedAt: new Date() }).where(eq(users.id, id))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to suspend user.' }
  }
}

export async function unsuspendUser(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(users).set({ suspendedAt: null }).where(eq(users.id, id))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to restore user.' }
  }
}

export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(users).where(eq(users.id, id))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete user.' }
  }
}
```

- [ ] **Step 2: Create elderdoc-admin/domains/caregivers.ts**

```ts
'use server'

import { db } from '@elderdoc/db'
import {
  users, caregiverProfiles, caregiverCareTypes, caregiverCertifications,
  caregiverLanguages, caregiverLocations, caregiverWorkPrefs,
} from '@elderdoc/db/schema'
import { eq, desc } from 'drizzle-orm'

export type AdminCaregiver = {
  id: string
  userId: string
  name: string | null
  email: string
  status: string | null
  suspendedAt: Date | null
  hourlyMin: string | null
  hourlyMax: string | null
  city: string | null
  state: string | null
  createdAt: Date
  careTypes: string[]
  certifications: string[]
}

export async function getAllCaregivers(): Promise<AdminCaregiver[]> {
  const profiles = await db
    .select({
      id:          caregiverProfiles.id,
      userId:      caregiverProfiles.userId,
      name:        users.name,
      email:       users.email,
      status:      caregiverProfiles.status,
      suspendedAt: users.suspendedAt,
      hourlyMin:   caregiverProfiles.hourlyMin,
      hourlyMax:   caregiverProfiles.hourlyMax,
      city:        caregiverLocations.city,
      state:       caregiverLocations.state,
      createdAt:   caregiverProfiles.createdAt,
    })
    .from(caregiverProfiles)
    .innerJoin(users, eq(users.id, caregiverProfiles.userId))
    .leftJoin(caregiverLocations, eq(caregiverLocations.caregiverId, caregiverProfiles.id))
    .orderBy(desc(caregiverProfiles.createdAt))

  const careTypes = await db.select().from(caregiverCareTypes)
  const certs = await db.select().from(caregiverCertifications)

  return profiles.map((p) => ({
    ...p,
    careTypes: careTypes.filter((ct) => ct.caregiverId === p.id).map((ct) => ct.careType),
    certifications: certs.filter((c) => c.caregiverId === p.id).map((c) => c.certification),
  }))
}

export async function getCaregiverById(id: string) {
  const [profile] = await db
    .select()
    .from(caregiverProfiles)
    .innerJoin(users, eq(users.id, caregiverProfiles.userId))
    .leftJoin(caregiverLocations, eq(caregiverLocations.caregiverId, caregiverProfiles.id))
    .leftJoin(caregiverWorkPrefs, eq(caregiverWorkPrefs.caregiverId, caregiverProfiles.id))
    .where(eq(caregiverProfiles.id, id))
    .limit(1)

  if (!profile) return null

  const [careTypes, certs, languages] = await Promise.all([
    db.select().from(caregiverCareTypes).where(eq(caregiverCareTypes.caregiverId, id)),
    db.select().from(caregiverCertifications).where(eq(caregiverCertifications.caregiverId, id)),
    db.select().from(caregiverLanguages).where(eq(caregiverLanguages.caregiverId, id)),
  ])

  return { ...profile, careTypes, certifications: certs, languages }
}

export async function approveCaregiver(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(caregiverProfiles).set({ status: 'active' }).where(eq(caregiverProfiles.id, id))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to approve caregiver.' }
  }
}

export async function suspendCaregiverUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(users).set({ suspendedAt: new Date() }).where(eq(users.id, userId))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to suspend caregiver.' }
  }
}

export async function deleteCaregiverUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(users).where(eq(users.id, userId))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete caregiver.' }
  }
}
```

- [ ] **Step 3: Create elderdoc-admin/domains/clients.ts**

```ts
'use server'

import { db } from '@elderdoc/db'
import { users, careRecipients, careRequests, jobs, payments } from '@elderdoc/db/schema'
import { eq, count, sum, desc, and } from 'drizzle-orm'

export type AdminClient = {
  id: string
  name: string | null
  email: string
  suspendedAt: Date | null
  createdAt: Date
  recipientCount: number
  activeRequestCount: number
  activeJobCount: number
}

export async function getAllClients(): Promise<AdminClient[]> {
  const clients = await db
    .select({
      id:          users.id,
      name:        users.name,
      email:       users.email,
      suspendedAt: users.suspendedAt,
      createdAt:   users.createdAt,
    })
    .from(users)
    .where(eq(users.role, 'client'))
    .orderBy(desc(users.createdAt))

  const [recipients, activeReqs, activeJobs] = await Promise.all([
    db.select({ clientId: careRecipients.clientId, cnt: count() })
      .from(careRecipients).groupBy(careRecipients.clientId),
    db.select({ clientId: careRequests.clientId, cnt: count() })
      .from(careRequests).where(eq(careRequests.status, 'active')).groupBy(careRequests.clientId),
    db.select({ clientId: jobs.clientId, cnt: count() })
      .from(jobs).where(eq(jobs.status, 'active')).groupBy(jobs.clientId),
  ])

  const recMap = Object.fromEntries(recipients.map((r) => [r.clientId, Number(r.cnt)]))
  const reqMap = Object.fromEntries(activeReqs.map((r) => [r.clientId, Number(r.cnt)]))
  const jobMap = Object.fromEntries(activeJobs.map((r) => [r.clientId, Number(r.cnt)]))

  return clients.map((c) => ({
    ...c,
    recipientCount:     recMap[c.id] ?? 0,
    activeRequestCount: reqMap[c.id] ?? 0,
    activeJobCount:     jobMap[c.id] ?? 0,
  }))
}

export async function getClientById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!user) return null

  const [recs, reqs] = await Promise.all([
    db.select().from(careRecipients).where(eq(careRecipients.clientId, id)),
    db.select().from(careRequests).where(eq(careRequests.clientId, id)).orderBy(desc(careRequests.createdAt)),
  ])

  const totalPaid = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .innerJoin(jobs, eq(jobs.id, payments.jobId))
    .where(and(eq(jobs.clientId, id), eq(payments.status, 'completed')))

  return {
    user,
    recipients: recs,
    requests: reqs,
    totalPaid: totalPaid[0]?.total ?? '0',
  }
}

export async function suspendClientUser(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(users).set({ suspendedAt: new Date() }).where(eq(users.id, id))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to suspend client.' }
  }
}

export async function deleteClientUser(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(users).where(eq(users.id, id))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete client.' }
  }
}
```

- [ ] **Step 4: Create elderdoc-admin/domains/recipients.ts**

```ts
'use server'

import { db } from '@elderdoc/db'
import { careRecipients, users } from '@elderdoc/db/schema'
import { eq, desc } from 'drizzle-orm'

export type AdminRecipient = {
  id: string
  name: string
  relationship: string | null
  dob: string | null
  phone: string | null
  gender: string | null
  conditions: string[] | null
  mobilityLevel: string | null
  notes: string | null
  createdAt: Date
  clientId: string
  clientName: string | null
  clientEmail: string
}

export async function getAllRecipients(): Promise<AdminRecipient[]> {
  return db
    .select({
      id:           careRecipients.id,
      name:         careRecipients.name,
      relationship: careRecipients.relationship,
      dob:          careRecipients.dob,
      phone:        careRecipients.phone,
      gender:       careRecipients.gender,
      conditions:   careRecipients.conditions,
      mobilityLevel: careRecipients.mobilityLevel,
      notes:        careRecipients.notes,
      createdAt:    careRecipients.createdAt,
      clientId:     users.id,
      clientName:   users.name,
      clientEmail:  users.email,
    })
    .from(careRecipients)
    .innerJoin(users, eq(users.id, careRecipients.clientId))
    .orderBy(desc(careRecipients.createdAt))
}

export async function updateRecipient(
  id: string,
  data: {
    name?: string
    dob?: string
    phone?: string
    gender?: string
    relationship?: string
    conditions?: string[]
    mobilityLevel?: string
    notes?: string
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(careRecipients).set(data).where(eq(careRecipients.id, id))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update recipient.' }
  }
}

export async function deleteRecipient(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(careRecipients).where(eq(careRecipients.id, id))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete recipient.' }
  }
}
```

---

### Task 9: Overview page

**Files:**
- Modify: `elderdoc-admin/app/(admin)/page.tsx` (replace stub)

- [ ] **Step 1: Create overview page**

Replace `elderdoc-admin/app/(admin)/page.tsx` with:

```tsx
import { db } from '@elderdoc/db'
import {
  users, caregiverProfiles, careRequests, jobs, payments, disputes, notifications,
} from '@elderdoc/db/schema'
import { eq, count, sum, desc } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'

async function getStats() {
  const [
    totalUsers,
    activeCaregivers,
    openRequests,
    activeJobs,
    feesCollected,
    openDisputes,
  ] = await Promise.all([
    db.select({ cnt: count() }).from(users).then((r) => Number(r[0].cnt)),
    db.select({ cnt: count() }).from(caregiverProfiles).where(eq(caregiverProfiles.status, 'active')).then((r) => Number(r[0].cnt)),
    db.select({ cnt: count() }).from(careRequests).where(eq(careRequests.status, 'active')).then((r) => Number(r[0].cnt)),
    db.select({ cnt: count() }).from(jobs).where(eq(jobs.status, 'active')).then((r) => Number(r[0].cnt)),
    db.select({ total: sum(payments.fee) }).from(payments).where(eq(payments.status, 'completed')).then((r) => Number(r[0].total ?? 0)),
    db.select({ cnt: count() }).from(disputes).where(eq(disputes.status, 'open')).then((r) => Number(r[0].cnt)),
  ])
  return { totalUsers, activeCaregivers, openRequests, activeJobs, feesCollected, openDisputes }
}

async function getRecentActivity() {
  return db
    .select({ id: notifications.id, type: notifications.type, payload: notifications.payload, createdAt: notifications.createdAt })
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(20)
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-card px-5 py-4">
      <p className="text-[32px] font-black tabular-nums leading-none">{value}</p>
      <p className="mt-1.5 text-[12px] text-muted-foreground font-medium">{label}</p>
      {sub && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default async function OverviewPage() {
  const [stats, activity] = await Promise.all([getStats(), getRecentActivity()])

  return (
    <div className="px-8 py-7">
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Overview</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">Platform summary</p>
      </div>

      <div className="grid grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
        <StatTile label="Total users" value={stats.totalUsers} />
        <StatTile label="Active caregivers" value={stats.activeCaregivers} />
        <StatTile label="Open care requests" value={stats.openRequests} />
        <StatTile label="Active jobs" value={stats.activeJobs} />
        <StatTile label="Platform fees collected" value={`$${stats.feesCollected.toFixed(2)}`} />
        <StatTile label="Open disputes" value={stats.openDisputes} />
      </div>

      <div>
        <h2 className="text-[14px] font-semibold mb-3">Recent activity</h2>
        <div className="rounded-[14px] border border-border bg-card divide-y divide-border">
          {activity.length === 0 && (
            <p className="px-5 py-8 text-[13.5px] text-muted-foreground text-center">No activity yet.</p>
          )}
          {activity.map((n) => {
            const payload = n.payload as Record<string, unknown>
            const description = String(payload.message ?? payload.description ?? n.type)
            return (
              <div key={n.id} className="flex items-center justify-between px-5 py-3">
                <p className="text-[13px]">{description}</p>
                <p className="text-[12px] text-muted-foreground shrink-0 ml-4">
                  {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Install date-fns**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-admin
bun add date-fns
```

---

### Task 10: Users page

**Files:**
- Create: `elderdoc-admin/app/(admin)/users/_components/users-client.tsx`
- Modify: `elderdoc-admin/app/(admin)/users/page.tsx` (replace stub)

- [ ] **Step 1: Create users-client.tsx**

```tsx
'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminUser } from '@/domains/users'
import { updateUser, suspendUser, unsuspendUser, deleteUser } from '@/domains/users'
import { DataList, DataHeader, DataRow } from '@/components/data-list'
import { StatusFilter } from '@/components/status-filter'
import { ConfirmModal } from '@/components/confirm-modal'
import { EditPanel, inputCls, labelCls } from '@/components/edit-panel'

const ROLE_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Clients', value: 'client' },
  { label: 'Caregivers', value: 'caregiver' },
  { label: 'Admins', value: 'admin' },
  { label: 'Suspended', value: 'suspended' },
]

const COLUMNS = [
  { label: 'Name', width: 'w-[30%]' },
  { label: 'Email', width: 'w-[30%]' },
  { label: 'Role', width: 'w-[15%]' },
  { label: 'Joined', width: 'w-[15%]' },
  { label: '', width: 'w-[10%]' },
]

export function UsersClient({ users }: { users: AdminUser[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState('')
  const [confirmModal, setConfirmModal] = useState<{
    type: 'suspend' | 'unsuspend' | 'delete' | 'edit'
    user: AdminUser
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = users
    if (filter === 'suspended') result = result.filter((u) => u.suspendedAt !== null)
    else if (filter !== 'all') result = result.filter((u) => u.role === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((u) =>
        u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
    }
    return result
  }, [users, filter, search])

  function openEdit(user: AdminUser) {
    setEditUser(user)
    setEditName(user.name ?? '')
    setEditEmail(user.email)
    setEditPhone(user.phone ?? '')
    setEditRole(user.role ?? 'client')
    setError(null)
  }

  function handleConfirm() {
    if (!confirmModal) return
    setError(null)
    startTransition(async () => {
      let result: { success: boolean; error?: string }
      if (confirmModal.type === 'edit') {
        result = await updateUser(confirmModal.user.id, {
          name: editName, email: editEmail, phone: editPhone, role: editRole,
        })
      } else if (confirmModal.type === 'suspend') {
        result = await suspendUser(confirmModal.user.id)
      } else if (confirmModal.type === 'unsuspend') {
        result = await unsuspendUser(confirmModal.user.id)
      } else {
        result = await deleteUser(confirmModal.user.id)
      }
      if (result.success) {
        setConfirmModal(null)
        setEditUser(null)
        router.refresh()
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

  const suspendedBadge = (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 text-[11px] font-medium">
      Suspended
    </span>
  )

  const ROLE_PILLS = ['client', 'caregiver', 'admin']

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <StatusFilter options={ROLE_OPTIONS} value={filter} onChange={setFilter} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="ml-auto w-64 rounded-[10px] border border-border bg-card px-3.5 py-2 text-[13px] placeholder:text-muted-foreground/50 focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow"
        />
      </div>

      <DataList>
        <DataHeader columns={COLUMNS} />
        {filtered.length === 0 && (
          <p className="px-5 py-10 text-[13.5px] text-muted-foreground text-center">No users found.</p>
        )}
        {filtered.map((u) => (
          <DataRow key={u.id}>
            <span className="w-[30%] flex items-center text-[13.5px] font-semibold truncate pr-4">
              {u.name ?? '—'}
              {u.suspendedAt && suspendedBadge}
            </span>
            <span className="w-[30%] text-[12.5px] text-muted-foreground truncate pr-4">{u.email}</span>
            <span className="w-[15%] text-[12.5px] capitalize text-muted-foreground">{u.role ?? '—'}</span>
            <span className="w-[15%] text-[12.5px] text-muted-foreground">
              {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="w-[10%] flex items-center gap-2 text-[12px] justify-end pr-1">
              <button onClick={() => openEdit(u)} className="text-foreground/70 hover:text-foreground transition-colors">Edit</button>
              <span className="text-muted-foreground/40">·</span>
              {u.suspendedAt ? (
                <button onClick={() => setConfirmModal({ type: 'unsuspend', user: u })} className="text-[var(--forest)] hover:text-[var(--forest-deep)] transition-colors">Unsuspend</button>
              ) : (
                <button onClick={() => setConfirmModal({ type: 'suspend', user: u })} className="text-amber-600 hover:text-amber-700 transition-colors">Suspend</button>
              )}
              <span className="text-muted-foreground/40">·</span>
              <button onClick={() => setConfirmModal({ type: 'delete', user: u })} className="text-destructive hover:text-destructive/80 transition-colors">Delete</button>
            </span>
          </DataRow>
        ))}
      </DataList>

      {/* Edit panel */}
      <EditPanel
        open={editUser !== null}
        onClose={() => setEditUser(null)}
        title={`Edit ${editUser?.name ?? 'user'}`}
        footer={
          <button
            onClick={() => editUser && setConfirmModal({ type: 'edit', user: editUser })}
            className="w-full h-10 rounded-full bg-primary text-primary-foreground text-[13.5px] font-semibold hover:bg-[var(--forest-deep)] transition-colors"
          >
            Save changes
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <div className="flex gap-2 mt-1">
              {ROLE_PILLS.map((r) => (
                <button
                  key={r}
                  onClick={() => setEditRole(r)}
                  className={[
                    'flex-1 h-9 rounded-full text-[12.5px] font-medium capitalize transition-colors',
                    editRole === r ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted',
                  ].join(' ')}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-[12.5px] text-destructive">{error}</p>}
        </div>
      </EditPanel>

      {/* Confirm modals */}
      {confirmModal?.type === 'edit' && (
        <ConfirmModal
          open
          onClose={() => setConfirmModal(null)}
          title={`Update ${confirmModal.user.name ?? confirmModal.user.email}'s account?`}
          body="This will update their name, email, phone, and role immediately."
          actionLabel="Save changes"
          onConfirm={handleConfirm}
          isPending={isPending}
          variant="safe"
        />
      )}
      {confirmModal?.type === 'suspend' && (
        <ConfirmModal
          open
          onClose={() => setConfirmModal(null)}
          title={`Suspend ${confirmModal.user.name ?? confirmModal.user.email}?`}
          body="They will immediately lose access to Elderdoc until unsuspended."
          actionLabel="Suspend"
          onConfirm={handleConfirm}
          isPending={isPending}
          variant="warning"
        />
      )}
      {confirmModal?.type === 'unsuspend' && (
        <ConfirmModal
          open
          onClose={() => setConfirmModal(null)}
          title={`Restore access for ${confirmModal.user.name ?? confirmModal.user.email}?`}
          body="They will regain full access to their account immediately."
          actionLabel="Restore access"
          onConfirm={handleConfirm}
          isPending={isPending}
          variant="safe"
        />
      )}
      {confirmModal?.type === 'delete' && (
        <ConfirmModal
          open
          onClose={() => setConfirmModal(null)}
          title={`Delete ${confirmModal.user.name ?? confirmModal.user.email}?`}
          body="This permanently deletes the account and all associated data. This cannot be undone."
          actionLabel="Delete"
          onConfirm={handleConfirm}
          isPending={isPending}
          variant="destructive"
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace elderdoc-admin/app/(admin)/users/page.tsx**

```tsx
import { getAllUsers } from '@/domains/users'
import { UsersClient } from './_components/users-client'

export default async function UsersPage() {
  const users = await getAllUsers()

  return (
    <div className="px-8 py-7">
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Users</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">{users.length} total accounts</p>
      </div>
      <UsersClient users={users} />
    </div>
  )
}
```

---

### Task 11: Caregivers pages

**Files:**
- Create: `elderdoc-admin/app/(admin)/caregivers/_components/caregivers-client.tsx`
- Modify: `elderdoc-admin/app/(admin)/caregivers/page.tsx`
- Create: `elderdoc-admin/app/(admin)/caregivers/[id]/page.tsx`

- [ ] **Step 1: Create caregivers-client.tsx**

```tsx
'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AdminCaregiver } from '@/domains/caregivers'
import { approveCaregiver, suspendCaregiverUser, deleteCaregiverUser } from '@/domains/caregivers'
import { DataList, DataHeader, DataRow } from '@/components/data-list'
import { StatusFilter } from '@/components/status-filter'
import { ConfirmModal } from '@/components/confirm-modal'

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Suspended', value: 'suspended' },
]

const COLUMNS = [
  { label: 'Name', width: 'w-[22%]' },
  { label: 'Care types', width: 'w-[18%]' },
  { label: 'Certs', width: 'w-[13%]' },
  { label: 'Rate', width: 'w-[10%]' },
  { label: 'Location', width: 'w-[13%]' },
  { label: 'Status', width: 'w-[10%]' },
  { label: 'Applied', width: 'w-[10%]' },
  { label: '', width: 'w-[4%]' },
]

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  active:   'bg-[var(--forest-soft)] text-[var(--forest-deep)] border-[var(--forest-soft)]',
  inactive: 'bg-muted text-muted-foreground border-border',
}

export function CaregiversClient({ caregivers }: { caregivers: AdminCaregiver[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [confirmModal, setConfirmModal] = useState<{
    type: 'approve' | 'suspend' | 'delete'
    caregiver: AdminCaregiver
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return caregivers
    if (filter === 'suspended') return caregivers.filter((c) => c.suspendedAt !== null)
    return caregivers.filter((c) => c.status === filter)
  }, [caregivers, filter])

  function handleConfirm() {
    if (!confirmModal) return
    startTransition(async () => {
      let result: { success: boolean; error?: string }
      if (confirmModal.type === 'approve') result = await approveCaregiver(confirmModal.caregiver.id)
      else if (confirmModal.type === 'suspend') result = await suspendCaregiverUser(confirmModal.caregiver.userId)
      else result = await deleteCaregiverUser(confirmModal.caregiver.userId)
      if (result.success) { setConfirmModal(null); router.refresh() }
      else setError(result.error ?? 'Something went wrong.')
    })
  }

  const suspendedBadge = (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 text-[11px] font-medium">
      Suspended
    </span>
  )

  return (
    <div>
      <div className="mb-5">
        <StatusFilter options={STATUS_OPTIONS} value={filter} onChange={setFilter} />
      </div>
      <DataList>
        <DataHeader columns={COLUMNS} />
        {filtered.map((cg) => {
          const rateLabel = cg.hourlyMin ? `$${Number(cg.hourlyMin).toFixed(0)}–$${Number(cg.hourlyMax ?? cg.hourlyMin).toFixed(0)}/hr` : '—'
          const badgeCls = STATUS_BADGE[cg.status ?? 'pending'] ?? STATUS_BADGE.pending
          return (
            <DataRow key={cg.id}>
              <span className="w-[22%] flex items-center text-[13.5px] font-semibold truncate pr-3">
                {cg.name ?? '—'}
                {cg.suspendedAt && suspendedBadge}
              </span>
              <span className="w-[18%] text-[12px] text-muted-foreground truncate pr-3">
                {cg.careTypes.slice(0, 2).join(', ')}{cg.careTypes.length > 2 ? ` +${cg.careTypes.length - 2}` : ''}
              </span>
              <span className="w-[13%] text-[12px] text-muted-foreground">
                {cg.certifications.length > 0 ? `${cg.certifications.length} cert${cg.certifications.length > 1 ? 's' : ''}` : '—'}
              </span>
              <span className="w-[10%] text-[12px] text-muted-foreground">{rateLabel}</span>
              <span className="w-[13%] text-[12px] text-muted-foreground">
                {[cg.city, cg.state].filter(Boolean).join(', ') || '—'}
              </span>
              <span className="w-[10%]">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${badgeCls}`}>
                  {cg.status ?? 'pending'}
                </span>
              </span>
              <span className="w-[10%] text-[12px] text-muted-foreground">
                {new Date(cg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="w-[4%] flex items-center gap-1.5 text-[12px] justify-end">
                <Link href={`/caregivers/${cg.id}`} className="text-foreground/70 hover:text-foreground transition-colors">View</Link>
                {cg.status === 'pending' && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <button onClick={() => setConfirmModal({ type: 'approve', caregiver: cg })} className="text-[var(--forest)] hover:text-[var(--forest-deep)] transition-colors">Approve</button>
                  </>
                )}
                <span className="text-muted-foreground/40">·</span>
                <button onClick={() => setConfirmModal({ type: 'suspend', caregiver: cg })} className="text-amber-600 hover:text-amber-700 transition-colors">Suspend</button>
                <span className="text-muted-foreground/40">·</span>
                <button onClick={() => setConfirmModal({ type: 'delete', caregiver: cg })} className="text-destructive hover:text-destructive/80 transition-colors">Delete</button>
              </span>
            </DataRow>
          )
        })}
      </DataList>

      {confirmModal?.type === 'approve' && (
        <ConfirmModal open onClose={() => setConfirmModal(null)}
          title={`Approve ${confirmModal.caregiver.name ?? 'caregiver'} as an active caregiver?`}
          body="They will be visible to clients and eligible for matches."
          actionLabel="Approve" onConfirm={handleConfirm} isPending={isPending} variant="safe" />
      )}
      {confirmModal?.type === 'suspend' && (
        <ConfirmModal open onClose={() => setConfirmModal(null)}
          title={`Suspend ${confirmModal.caregiver.name ?? 'caregiver'}?`}
          body="They will immediately lose access to Elderdoc until unsuspended."
          actionLabel="Suspend" onConfirm={handleConfirm} isPending={isPending} variant="warning" />
      )}
      {confirmModal?.type === 'delete' && (
        <ConfirmModal open onClose={() => setConfirmModal(null)}
          title={`Delete ${confirmModal.caregiver.name ?? 'caregiver'}?`}
          body="This permanently deletes the account, profile, and all associated data."
          actionLabel="Delete" onConfirm={handleConfirm} isPending={isPending} variant="destructive" />
      )}
      {error && <p className="mt-3 text-[12.5px] text-destructive">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Replace elderdoc-admin/app/(admin)/caregivers/page.tsx**

```tsx
import { getAllCaregivers } from '@/domains/caregivers'
import { CaregiversClient } from './_components/caregivers-client'

export default async function CaregiversPage() {
  const caregivers = await getAllCaregivers()
  return (
    <div className="px-8 py-7">
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Caregivers</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">{caregivers.length} profiles</p>
      </div>
      <CaregiversClient caregivers={caregivers} />
    </div>
  )
}
```

- [ ] **Step 3: Create elderdoc-admin/app/(admin)/caregivers/[id]/page.tsx**

```tsx
import { getCaregiverById } from '@/domains/caregivers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[13.5px]">{value ?? '—'}</p>
    </div>
  )
}

export default async function CaregiverDetailPage({ params }: { params: { id: string } }) {
  const data = await getCaregiverById(params.id)
  if (!data) notFound()

  const { caregiver_profiles: profile, users: user, caregiver_locations: loc } = data as any

  return (
    <div className="px-8 py-7 max-w-3xl">
      <Link href="/caregivers" className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Caregivers
      </Link>

      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">{user?.name ?? '—'}</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">{user?.email}</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-[14px] border border-border bg-card p-6">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Profile</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Status" value={profile?.status} />
            <Field label="Rate" value={profile?.hourlyMin ? `$${Number(profile.hourlyMin).toFixed(0)}–$${Number(profile.hourlyMax ?? profile.hourlyMin).toFixed(0)}/hr` : null} />
            <Field label="Headline" value={profile?.headline} />
            <Field label="Experience" value={profile?.experience} />
            <Field label="Location" value={[loc?.city, loc?.state].filter(Boolean).join(', ')} />
            <Field label="Phone" value={user?.phone} />
          </div>
        </div>

        {data.careTypes.length > 0 && (
          <div className="rounded-[14px] border border-border bg-card p-6">
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Care Types</h2>
            <div className="flex flex-wrap gap-1.5">
              {data.careTypes.map((ct: any) => (
                <span key={ct.careType} className="rounded-full bg-[var(--forest-soft)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--forest-deep)]">{ct.careType}</span>
              ))}
            </div>
          </div>
        )}

        {data.certifications.length > 0 && (
          <div className="rounded-[14px] border border-border bg-card p-6">
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Certifications</h2>
            <div className="flex flex-wrap gap-1.5">
              {data.certifications.map((c: any) => (
                <span key={c.certification} className="rounded-full border border-border px-2.5 py-0.5 text-[12px] font-medium">{c.certification}</span>
              ))}
            </div>
          </div>
        )}

        {profile?.about && (
          <div className="rounded-[14px] border border-border bg-card p-6">
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">About</h2>
            <p className="text-[13.5px] leading-relaxed">{profile.about}</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

### Task 12: Clients pages

**Files:**
- Create: `elderdoc-admin/app/(admin)/clients/_components/clients-client.tsx`
- Modify: `elderdoc-admin/app/(admin)/clients/page.tsx`
- Create: `elderdoc-admin/app/(admin)/clients/[id]/page.tsx`

- [ ] **Step 1: Create clients-client.tsx**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AdminClient } from '@/domains/clients'
import { suspendClientUser, deleteClientUser } from '@/domains/clients'
import { DataList, DataHeader, DataRow } from '@/components/data-list'
import { ConfirmModal } from '@/components/confirm-modal'

const COLUMNS = [
  { label: 'Name', width: 'w-[25%]' },
  { label: 'Email', width: 'w-[25%]' },
  { label: 'Recipients', width: 'w-[10%]' },
  { label: 'Open requests', width: 'w-[12%]' },
  { label: 'Active jobs', width: 'w-[12%]' },
  { label: 'Joined', width: 'w-[12%]' },
  { label: '', width: 'w-[4%]' },
]

export function ClientsClient({ clients }: { clients: AdminClient[] }) {
  const router = useRouter()
  const [confirmModal, setConfirmModal] = useState<{ type: 'suspend' | 'delete'; client: AdminClient } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    if (!confirmModal) return
    startTransition(async () => {
      const result = confirmModal.type === 'suspend'
        ? await suspendClientUser(confirmModal.client.id)
        : await deleteClientUser(confirmModal.client.id)
      if (result.success) { setConfirmModal(null); router.refresh() }
    })
  }

  const suspendedBadge = (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 text-[11px] font-medium">
      Suspended
    </span>
  )

  return (
    <div>
      <DataList>
        <DataHeader columns={COLUMNS} />
        {clients.map((c) => (
          <DataRow key={c.id}>
            <span className="w-[25%] flex items-center text-[13.5px] font-semibold truncate pr-3">
              {c.name ?? '—'}
              {c.suspendedAt && suspendedBadge}
            </span>
            <span className="w-[25%] text-[12px] text-muted-foreground truncate pr-3">{c.email}</span>
            <span className="w-[10%] text-[12.5px] tabular-nums">{c.recipientCount}</span>
            <span className="w-[12%] text-[12.5px] tabular-nums">{c.activeRequestCount}</span>
            <span className="w-[12%] text-[12.5px] tabular-nums">{c.activeJobCount}</span>
            <span className="w-[12%] text-[12px] text-muted-foreground">
              {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="w-[4%] flex items-center gap-1.5 text-[12px] justify-end">
              <Link href={`/clients/${c.id}`} className="text-foreground/70 hover:text-foreground transition-colors">View</Link>
              <span className="text-muted-foreground/40">·</span>
              <button onClick={() => setConfirmModal({ type: 'suspend', client: c })} className="text-amber-600 hover:text-amber-700 transition-colors">Suspend</button>
              <span className="text-muted-foreground/40">·</span>
              <button onClick={() => setConfirmModal({ type: 'delete', client: c })} className="text-destructive hover:text-destructive/80 transition-colors">Delete</button>
            </span>
          </DataRow>
        ))}
      </DataList>

      {confirmModal?.type === 'suspend' && (
        <ConfirmModal open onClose={() => setConfirmModal(null)}
          title={`Suspend ${confirmModal.client.name ?? 'client'}?`}
          body="They will immediately lose access to Elderdoc until unsuspended."
          actionLabel="Suspend" onConfirm={handleConfirm} isPending={isPending} variant="warning" />
      )}
      {confirmModal?.type === 'delete' && (
        <ConfirmModal open onClose={() => setConfirmModal(null)}
          title={`Delete ${confirmModal.client.name ?? 'client'}?`}
          body="This permanently deletes the account, all care recipients, care requests, and associated data."
          actionLabel="Delete" onConfirm={handleConfirm} isPending={isPending} variant="destructive" />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace elderdoc-admin/app/(admin)/clients/page.tsx**

```tsx
import { getAllClients } from '@/domains/clients'
import { ClientsClient } from './_components/clients-client'

export default async function ClientsPage() {
  const clients = await getAllClients()
  return (
    <div className="px-8 py-7">
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Clients</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">{clients.length} accounts</p>
      </div>
      <ClientsClient clients={clients} />
    </div>
  )
}
```

- [ ] **Step 3: Create elderdoc-admin/app/(admin)/clients/[id]/page.tsx**

```tsx
import { getClientById } from '@/domains/clients'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-[var(--forest-soft)] text-[var(--forest-deep)]',
  draft:     'bg-muted text-muted-foreground',
  matched:   'bg-blue-50 text-blue-700',
  cancelled: 'bg-destructive/10 text-destructive',
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const data = await getClientById(params.id)
  if (!data) notFound()

  return (
    <div className="px-8 py-7 max-w-3xl">
      <Link href="/clients" className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Clients
      </Link>

      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">{data.user.name ?? '—'}</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">{data.user.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Care recipients', value: data.recipients.length },
          { label: 'Care requests', value: data.requests.length },
          { label: 'Total paid', value: `$${Number(data.totalPaid).toFixed(2)}` },
        ].map((tile) => (
          <div key={tile.label} className="rounded-[14px] border border-border bg-card px-5 py-4">
            <p className="text-[28px] font-black tabular-nums leading-none">{tile.value}</p>
            <p className="mt-1.5 text-[12px] text-muted-foreground">{tile.label}</p>
          </div>
        ))}
      </div>

      {data.recipients.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card mb-4">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[13px] font-semibold">Care Recipients</h2>
          </div>
          {data.recipients.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-b-0">
              <div>
                <p className="text-[13.5px] font-semibold">{r.name}</p>
                <p className="text-[12px] text-muted-foreground capitalize">{r.relationship ?? '—'}</p>
              </div>
              <p className="text-[12px] text-muted-foreground capitalize">{r.mobilityLevel?.replace(/-/g, ' ') ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      {data.requests.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[13px] font-semibold">Care Requests</h2>
          </div>
          {data.requests.map((req) => (
            <div key={req.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-b-0">
              <div>
                <p className="text-[13.5px] font-semibold">{req.title ?? req.careType}</p>
                <p className="text-[12px] text-muted-foreground capitalize">{req.careType} · {req.frequency ?? 'No frequency'}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-medium capitalize ${STATUS_BADGE[req.status ?? 'draft'] ?? STATUS_BADGE.draft}`}>
                {req.status ?? 'draft'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### Task 13: Care recipients page

**Files:**
- Create: `elderdoc-admin/app/(admin)/recipients/_components/recipients-client.tsx`
- Modify: `elderdoc-admin/app/(admin)/recipients/page.tsx`

- [ ] **Step 1: Create recipients-client.tsx**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminRecipient } from '@/domains/recipients'
import { updateRecipient, deleteRecipient } from '@/domains/recipients'
import { DataList, DataHeader, DataRow } from '@/components/data-list'
import { ConfirmModal } from '@/components/confirm-modal'
import { EditPanel, inputCls, labelCls } from '@/components/edit-panel'

const COLUMNS = [
  { label: 'Name', width: 'w-[20%]' },
  { label: 'Client', width: 'w-[20%]' },
  { label: 'Relationship', width: 'w-[12%]' },
  { label: 'Conditions', width: 'w-[20%]' },
  { label: 'Mobility', width: 'w-[12%]' },
  { label: 'Created', width: 'w-[12%]' },
  { label: '', width: 'w-[4%]' },
]

export function RecipientsClient({ recipients }: { recipients: AdminRecipient[] }) {
  const router = useRouter()
  const [editRecipient, setEditRecipient] = useState<AdminRecipient | null>(null)
  const [form, setForm] = useState({ name: '', dob: '', phone: '', gender: '', relationship: '', mobilityLevel: '', notes: '' })
  const [deleteTarget, setDeleteTarget] = useState<AdminRecipient | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function openEdit(r: AdminRecipient) {
    setEditRecipient(r)
    setForm({
      name: r.name, dob: r.dob ?? '', phone: r.phone ?? '',
      gender: r.gender ?? '', relationship: r.relationship ?? '',
      mobilityLevel: r.mobilityLevel ?? '', notes: r.notes ?? '',
    })
    setError(null)
  }

  function handleSave() {
    if (!editRecipient) return
    startTransition(async () => {
      const result = await updateRecipient(editRecipient.id, form)
      if (result.success) { setEditRecipient(null); router.refresh() }
      else setError(result.error ?? 'Something went wrong.')
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteRecipient(deleteTarget.id)
      if (result.success) { setDeleteTarget(null); router.refresh() }
    })
  }

  return (
    <div>
      <DataList>
        <DataHeader columns={COLUMNS} />
        {recipients.map((r) => (
          <DataRow key={r.id}>
            <span className="w-[20%] text-[13.5px] font-semibold truncate pr-3">{r.name}</span>
            <span className="w-[20%] text-[12px] text-muted-foreground truncate pr-3">{r.clientName ?? r.clientEmail}</span>
            <span className="w-[12%] text-[12px] text-muted-foreground capitalize">{r.relationship ?? '—'}</span>
            <span className="w-[20%] text-[12px] text-muted-foreground">
              {r.conditions && r.conditions.length > 0
                ? `${r.conditions.slice(0, 2).join(', ')}${r.conditions.length > 2 ? ` +${r.conditions.length - 2}` : ''}`
                : '—'}
            </span>
            <span className="w-[12%] text-[12px] text-muted-foreground capitalize">{r.mobilityLevel?.replace(/-/g, ' ') ?? '—'}</span>
            <span className="w-[12%] text-[12px] text-muted-foreground">
              {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="w-[4%] flex items-center gap-1.5 text-[12px] justify-end">
              <button onClick={() => openEdit(r)} className="text-foreground/70 hover:text-foreground transition-colors">Edit</button>
              <span className="text-muted-foreground/40">·</span>
              <button onClick={() => setDeleteTarget(r)} className="text-destructive hover:text-destructive/80 transition-colors">Delete</button>
            </span>
          </DataRow>
        ))}
      </DataList>

      <EditPanel
        open={editRecipient !== null}
        onClose={() => setEditRecipient(null)}
        title={`Edit ${editRecipient?.name ?? 'recipient'}`}
        footer={
          <button onClick={handleSave} disabled={isPending}
            className="w-full h-10 rounded-full bg-primary text-primary-foreground text-[13.5px] font-semibold disabled:opacity-50 hover:bg-[var(--forest-deep)] transition-colors">
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
        }
      >
        <div className="space-y-4">
          {(['name', 'dob', 'phone', 'gender', 'relationship', 'mobilityLevel'] as const).map((field) => (
            <div key={field}>
              <label className={labelCls}>{field === 'dob' ? 'Date of birth' : field === 'mobilityLevel' ? 'Mobility level' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <input value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} className={inputCls} />
            </div>
          ))}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={4} className={`${inputCls} resize-none`} />
          </div>
          {error && <p className="text-[12.5px] text-destructive">{error}</p>}
        </div>
      </EditPanel>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        body="This will remove them from all associated care requests."
        actionLabel="Delete"
        onConfirm={handleDelete}
        isPending={isPending}
        variant="destructive"
      />
    </div>
  )
}
```

- [ ] **Step 2: Replace elderdoc-admin/app/(admin)/recipients/page.tsx**

```tsx
import { getAllRecipients } from '@/domains/recipients'
import { RecipientsClient } from './_components/recipients-client'

export default async function RecipientsPage() {
  const recipients = await getAllRecipients()
  return (
    <div className="px-8 py-7">
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Care Recipients</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">{recipients.length} profiles</p>
      </div>
      <RecipientsClient recipients={recipients} />
    </div>
  )
}
```

---

### Task 14: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Verify @elderdoc/db package builds**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc
bun install
```

Expected: No errors. All workspace symlinks resolved.

- [ ] **Step 2: Verify elderdoc-app still builds**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-app
bun run build
```

Expected: Build succeeds. If TypeScript errors about role `'admin'` not in the existing type declarations, update `elderdoc-app/types/next-auth.d.ts` to include `'admin'` in the role union.

- [ ] **Step 3: Build elderdoc-admin**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-admin
bun run build
```

Expected: Build succeeds with zero TypeScript errors. If errors appear about `@elderdoc/db` not resolving, verify that `bun install` was run from the workspace root and that `tsconfig.json` in elderdoc-admin has `"moduleResolution": "bundler"` or `"node16"`.

If TypeScript can't resolve `@elderdoc/db`, add to `elderdoc-admin/tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@elderdoc/db": ["../packages/db/index.ts"],
      "@elderdoc/db/schema": ["../packages/db/schema.ts"],
      "@elderdoc/db/client": ["../packages/db/client.ts"]
    }
  }
}
```

- [ ] **Step 4: Smoke test admin app**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-admin
bun run dev
```

1. Navigate to `http://localhost:3001/` — should redirect to `/login`
2. Sign in with an admin-role account
3. Verify sidebar shows all nav items
4. Click through Users, Caregivers, Clients, Care Recipients — all should load data
5. Test edit panel opens and closes on the Users page
6. Test confirm modal appears before any destructive action

- [ ] **Step 5: Commit everything**

```bash
cd /Users/ashcbrd/Desktop/Development/elderdoc/elderdoc-app
git add -A
git commit -m "feat: elderdoc-admin — foundation, auth, layout, people management views"
```
