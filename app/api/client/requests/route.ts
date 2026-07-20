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

export async function GET(req: NextRequest) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status      = searchParams.get('status')
  const recipientId = searchParams.get('recipientId')
  const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10))
  const limit  = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))
  const offset = (page - 1) * limit

  const conditions = [eq(careRequests.clientId, clientId)]
  if (status) conditions.push(eq(careRequests.status, status as 'draft' | 'active' | 'matched' | 'filled' | 'cancelled'))
  if (recipientId) conditions.push(eq(careRequests.recipientId, recipientId))

  const rows = await db
    .select({
      id:            careRequests.id,
      title:         careRequests.title,
      careType:      careRequests.careType,
      status:        careRequests.status,
      startDate:     careRequests.startDate,
      budgetMin:     careRequests.budgetMin,
      budgetMax:     careRequests.budgetMax,
      budgetType:    careRequests.budgetType,
      recipientId:   careRequests.recipientId,
      recipientName: careRecipients.name,
      careTypeLabel: careTypes.label,
    })
    .from(careRequests)
    .leftJoin(careRecipients, eq(careRecipients.id, careRequests.recipientId))
    .leftJoin(careTypes, eq(careTypes.key, careRequests.careType))
    .where(and(...conditions))
    .orderBy(careRequests.createdAt)
    .limit(limit)
    .offset(offset)

  const result = rows.map(r => ({
    id:            r.id,
    title:         r.title ?? null,
    careType:      r.careType,
    careTypeLabel: r.careTypeLabel ?? r.careType,
    status:        r.status ?? 'draft',
    startDate:     r.startDate ?? null,
    recipientName: r.recipientName ?? null,
    budgetMin:     r.budgetMin != null ? parseFloat(r.budgetMin) : null,
    budgetMax:     r.budgetMax != null ? parseFloat(r.budgetMax) : null,
    budgetType:    r.budgetType ?? null,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.careType) return NextResponse.json({ error: 'careType is required' }, { status: 400 })

  const [row] = await db
    .insert(careRequests)
    .values({
      clientId,
      recipientId:        body.recipientId ?? null,
      title:              body.title ?? null,
      description:        body.description ?? null,
      careType:           body.careType,
      frequency:          body.frequency ?? null,
      schedule:           body.schedule ?? null,
      startDate:          body.startDate ?? null,
      endDate:            body.endDate ?? null,
      languagesPreferred: body.languagesPreferred ?? [],
      languagesRequired:  body.languagesRequired ?? [],
      budgetType:         body.budgetType ?? null,
      budgetMin:          body.budgetMin != null ? String(body.budgetMin) : null,
      budgetMax:          body.budgetMax != null ? String(body.budgetMax) : null,
      status:             'active',
    })
    .returning()

  return NextResponse.json({ ...row }, { status: 201 })
}
