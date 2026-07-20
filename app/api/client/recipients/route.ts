import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { careRecipients } from '@/db/schema'
import { eq } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

async function getClientId(req: NextRequest): Promise<string | null> {
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
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(careRecipients)
    .where(eq(careRecipients.clientId, clientId))
    .orderBy(careRecipients.createdAt)

  const result = rows.map(r => ({
    id:           r.id,
    clientId:     r.clientId,
    name:         r.name,
    dob:          r.dob ?? null,
    phone:        r.phone ?? null,
    gender:       r.gender ?? null,
    relationship: r.relationship ?? null,
    photoUrl:     r.photoUrl ?? null,
    conditions:   r.conditions ?? [],
    mobilityLevel:r.mobilityLevel ?? null,
    height:       r.height ?? null,
    weight:       r.weight ?? null,
    notes:        r.notes ?? null,
    address:      r.address ?? null,
    clientStatus: r.clientStatus ?? {},
    createdAt:    r.createdAt?.toISOString() ?? null,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const [row] = await db
    .insert(careRecipients)
    .values({
      clientId,
      name:         body.name,
      dob:          body.dob ?? null,
      phone:        body.phone ?? null,
      gender:       body.gender ?? null,
      relationship: body.relationship ?? null,
      photoUrl:     body.photoUrl ?? null,
      conditions:   body.conditions ?? [],
      mobilityLevel:body.mobilityLevel ?? null,
      height:       body.height ?? null,
      weight:       body.weight ?? null,
      notes:        body.notes ?? null,
      address:      body.address ?? null,
      clientStatus: body.clientStatus ?? null,
    })
    .returning()

  return NextResponse.json({
    ...row,
    createdAt: row.createdAt?.toISOString() ?? null,
  }, { status: 201 })
}
