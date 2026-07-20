import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { db } from '@/services/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// PATCH /api/auth/mobile   — update role / name / email for the current user
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let userId: string
  try {
    const { payload } = await jwtVerify(token, secret)
    userId = (payload.sub as string)
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const updates: Partial<typeof users.$inferInsert> = {}
  if (typeof body.role  === 'string') updates.role  = body.role as 'client' | 'caregiver' | 'admin'
  if (typeof body.name  === 'string') updates.name  = body.name.trim() || null
  if (typeof body.email === 'string') updates.email = body.email.trim().toLowerCase()

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  try {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role })

    if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({ id: updated.id, email: updated.email, name: updated.name, role: updated.role })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')
const ALG = 'HS256'
const EXPIRY = '30d'

function unauthorized(msg = 'Unauthorized') {
  return NextResponse.json({ error: msg }, { status: 401 })
}

// ---------------------------------------------------------------------------
// POST /api/auth/mobile   — sign in, return JWT
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email: string | undefined = body?.email
  const password: string | undefined = body?.password

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  }

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1)

  if (!user?.password) return unauthorized('Invalid credentials')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return unauthorized('Invalid credentials')

  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    role: user.role ?? null,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret)

  return NextResponse.json({
    token,
    session: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      image: user.image ?? null,
      role: user.role ?? null,
    },
  })
}

// ---------------------------------------------------------------------------
// GET /api/auth/mobile   — verify JWT, return current session
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null

  if (!token) return unauthorized()

  try {
    const { payload } = await jwtVerify(token, secret)
    const userId = payload.sub as string

    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, image: users.image, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) return unauthorized('User not found')

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      image: user.image ?? null,
      role: user.role ?? null,
    })
  } catch {
    return unauthorized('Invalid or expired token')
  }
}
