import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { carePlans, careRecipients, careRequests } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import type { CareTaskEntry } from '@/db/schema'

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

// ---------------------------------------------------------------------------
// POST /api/client/care-plans — create a new care plan for a recipient
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.recipientId) return NextResponse.json({ error: 'recipientId is required' }, { status: 400 })

  const [recipient] = await db
    .select({ id: careRecipients.id })
    .from(careRecipients)
    .where(and(eq(careRecipients.id, body.recipientId), eq(careRecipients.clientId, clientId)))
    .limit(1)

  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })

  const toTasks = (val: unknown): CareTaskEntry[] => {
    if (!Array.isArray(val)) return []
    return val.filter(
      (t): t is CareTaskEntry =>
        typeof t === 'object' && t !== null && typeof t.key === 'string' && typeof t.frequency === 'string'
    )
  }

  const [created] = await db
    .insert(carePlans)
    .values({
      recipientId:            body.recipientId as string,
      activityMobilitySafety: toTasks(body.activityMobilitySafety),
      hygieneElimination:     toTasks(body.hygieneElimination),
      homeManagement:         toTasks(body.homeManagement),
      hydrationNutrition:     toTasks(body.hydrationNutrition),
      medicationReminders:    toTasks(body.medicationReminders),
    })
    .returning({ id: carePlans.id, recipientId: carePlans.recipientId })

  return NextResponse.json({ id: created.id, recipientId: created.recipientId }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const recipientId = searchParams.get('recipientId')

  if (recipientId) {
    const [recipient] = await db
      .select({ id: careRecipients.id })
      .from(careRecipients)
      .where(and(eq(careRecipients.id, recipientId), eq(careRecipients.clientId, clientId)))
      .limit(1)

    if (!recipient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [plan] = await db
      .select()
      .from(carePlans)
      .where(eq(carePlans.recipientId, recipientId))
      .limit(1)

    if (!plan) return NextResponse.json({ error: 'No care plan found' }, { status: 404 })

    return NextResponse.json({
      id:                     plan.id,
      recipientId:            plan.recipientId,
      requestId:              plan.requestId,
      activityMobilitySafety: plan.activityMobilitySafety ?? [],
      hygieneElimination:     plan.hygieneElimination ?? [],
      homeManagement:         plan.homeManagement ?? [],
      hydrationNutrition:     plan.hydrationNutrition ?? [],
      medicationReminders:    plan.medicationReminders ?? [],
      updatedAt:              plan.updatedAt,
    })
  }

  // List all plans for client's recipients
  const recipients = await db
    .select({ id: careRecipients.id, name: careRecipients.name })
    .from(careRecipients)
    .where(eq(careRecipients.clientId, clientId))

  if (!recipients.length) return NextResponse.json([])

  const recipientIds = recipients.map((r) => r.id)

  const plans = await db
    .select({
      id:          carePlans.id,
      recipientId: carePlans.recipientId,
      requestId:   carePlans.requestId,
      updatedAt:   carePlans.updatedAt,
    })
    .from(carePlans)
    .where(inArray(carePlans.recipientId, recipientIds))

  const requests = plans.length > 0
    ? await db
        .select({ id: careRequests.id, title: careRequests.title, careType: careRequests.careType })
        .from(careRequests)
        .where(inArray(careRequests.id, plans.map((p) => p.requestId).filter(Boolean) as string[]))
    : []

  const recipientMap = Object.fromEntries(recipients.map((r) => [r.id, r.name]))
  const requestMap  = Object.fromEntries(requests.map((r) => [r.id, r]))

  return NextResponse.json(
    plans.map((p) => {
      const req = p.requestId ? requestMap[p.requestId] : null
      return {
        id:            p.id,
        recipientId:   p.recipientId,
        recipientName: p.recipientId ? (recipientMap[p.recipientId] ?? 'Unknown') : 'Unknown',
        jobName:       req?.title ?? req?.careType ?? 'Active Job',
        updatedAt:     p.updatedAt,
      }
    })
  )
}
