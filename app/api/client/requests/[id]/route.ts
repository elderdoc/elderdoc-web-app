import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { careRequests, careRecipients, careTypes } from '@/db/schema'
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
    .select({
      id:                  careRequests.id,
      clientId:            careRequests.clientId,
      recipientId:         careRequests.recipientId,
      title:               careRequests.title,
      description:         careRequests.description,
      careType:            careRequests.careType,
      careTypeLabel:       careTypes.label,
      frequency:           careRequests.frequency,
      schedule:            careRequests.schedule,
      startDate:           careRequests.startDate,
      endDate:             careRequests.endDate,
      languagesPreferred:  careRequests.languagesPreferred,
      languagesRequired:   careRequests.languagesRequired,
      budgetType:          careRequests.budgetType,
      budgetMin:           careRequests.budgetMin,
      budgetMax:           careRequests.budgetMax,
      status:              careRequests.status,
      createdAt:           careRequests.createdAt,
      recipientName:       careRecipients.name,
      suppliesNeeded:      careRequests.suppliesNeeded,
      infectionControl:    careRequests.infectionControl,
      safetyMeasures:      careRequests.safetyMeasures,
      clientStatus:        careRequests.clientStatus,
      transportationPref:  careRequests.transportationPref,
      genderPref:          careRequests.genderPref,
    })
    .from(careRequests)
    .leftJoin(careRecipients, eq(careRecipients.id, careRequests.recipientId))
    .leftJoin(careTypes, eq(careTypes.key, careRequests.careType))
    .where(and(eq(careRequests.id, id), eq(careRequests.clientId, clientId)))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...row,
    careTypeLabel:  row.careTypeLabel ?? row.careType,
    budgetMin:      row.budgetMin != null ? parseFloat(row.budgetMin) : null,
    budgetMax:      row.budgetMax != null ? parseFloat(row.budgetMax) : null,
    createdAt:      row.createdAt?.toISOString() ?? null,
  })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const [row] = await db
    .update(careRequests)
    .set({
      title:               body.title ?? undefined,
      description:         body.description ?? undefined,
      careType:            body.careType ?? undefined,
      frequency:           body.frequency ?? undefined,
      schedule:            body.schedule ?? undefined,
      startDate:           body.startDate ?? undefined,
      endDate:             body.endDate ?? undefined,
      languagesPreferred:  body.languagesPreferred ?? undefined,
      languagesRequired:   body.languagesRequired ?? undefined,
      budgetType:          body.budgetType ?? undefined,
      budgetMin:           body.budgetMin != null ? String(body.budgetMin) : undefined,
      budgetMax:           body.budgetMax != null ? String(body.budgetMax) : undefined,
      status:              body.status ?? undefined,
    })
    .where(and(eq(careRequests.id, id), eq(careRequests.clientId, clientId)))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...row, createdAt: row.createdAt?.toISOString() ?? null })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db
    .delete(careRequests)
    .where(and(eq(careRequests.id, id), eq(careRequests.clientId, clientId)))

  return new NextResponse(null, { status: 204 })
}
