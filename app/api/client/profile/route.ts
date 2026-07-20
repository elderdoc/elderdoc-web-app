import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { users, clientLocations } from '@/db/schema'
import { eq } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return (payload.sub as string) ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      image: users.image,
      about: users.about,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!userRows.length) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const u = userRows[0]

  const locationRows = await db
    .select()
    .from(clientLocations)
    .where(eq(clientLocations.clientId, userId))
    .limit(1)

  const location = locationRows[0] ?? null

  return NextResponse.json({
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      photoUrl: u.image,
      about: u.about,
    },
    location,
  })
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, phone, about, photoUrl } = body as {
    name?: string
    phone?: string
    about?: string
    photoUrl?: string
  }

  const updates: Record<string, string> = {}
  if (name !== undefined) updates.name = name
  if (phone !== undefined) updates.phone = phone
  if (about !== undefined) updates.about = about
  if (photoUrl !== undefined) updates.image = photoUrl

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await db.update(users).set(updates).where(eq(users.id, userId))

  return NextResponse.json({ success: true })
}
