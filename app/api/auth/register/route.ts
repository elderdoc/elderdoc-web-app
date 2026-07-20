import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { db } from '@/services/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')
const ALG = 'HS256'
const EXPIRY = '30d'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const name: string | undefined = body?.name
  const email: string | undefined = body?.email
  const password: string | undefined = body?.password
  const role: string | undefined = body?.role

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'name, email, password, and role are required' }, { status: 400 })
  }
  if (role !== 'client' && role !== 'caregiver') {
    return NextResponse.json({ error: 'role must be client or caregiver' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1)

  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const [newUser] = await db
    .insert(users)
    .values({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role as 'client' | 'caregiver',
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      role: users.role,
    })

  const token = await new SignJWT({
    sub: newUser.id,
    email: newUser.email,
    name: newUser.name ?? null,
    image: newUser.image ?? null,
    role: newUser.role ?? null,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret)

  return NextResponse.json({
    token,
    session: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name ?? null,
      image: newUser.image ?? null,
      role: newUser.role ?? null,
    },
  })
}
