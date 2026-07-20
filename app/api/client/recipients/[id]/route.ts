import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { careRecipients } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

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

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [row] = await db
    .select()
    .from(careRecipients)
    .where(and(eq(careRecipients.id, id), eq(careRecipients.clientId, clientId)))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id:           row.id,
    clientId:     row.clientId,
    name:         row.name,
    dob:          row.dob ?? null,
    phone:        row.phone ?? null,
    gender:       row.gender ?? null,
    relationship: row.relationship ?? null,
    photoUrl:     row.photoUrl ?? null,
    conditions:   row.conditions ?? [],
    mobilityLevel:row.mobilityLevel ?? null,
    height:       row.height ?? null,
    weight:       row.weight ?? null,
    notes:        row.notes ?? null,
    address:      row.address ?? null,
    clientStatus: row.clientStatus ?? {},
    createdAt:    row.createdAt?.toISOString() ?? null,
  })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const [row] = await db
    .update(careRecipients)
    .set({
      name:         body.name,
      dob:          body.dob ?? undefined,
      phone:        body.phone ?? undefined,
      gender:       body.gender ?? undefined,
      relationship: body.relationship ?? undefined,
      photoUrl:     body.photoUrl ?? undefined,
      conditions:   body.conditions ?? undefined,
      mobilityLevel:body.mobilityLevel ?? undefined,
      height:       body.height ?? undefined,
      weight:       body.weight ?? undefined,
      notes:        body.notes ?? undefined,
      address:      body.address ?? undefined,
      clientStatus: body.clientStatus ?? undefined,
    })
    .where(and(eq(careRecipients.id, id), eq(careRecipients.clientId, clientId)))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...row, createdAt: row.createdAt?.toISOString() ?? null })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db
    .delete(careRecipients)
    .where(and(eq(careRecipients.id, id), eq(careRecipients.clientId, clientId)))

  return new NextResponse(null, { status: 204 })
}
