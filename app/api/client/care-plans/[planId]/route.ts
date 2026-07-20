import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { carePlans, careRecipients } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
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

async function getOwnedPlan(clientId: string, planId: string) {
  const [plan] = await db
    .select({
      id:                     carePlans.id,
      recipientId:            carePlans.recipientId,
      requestId:              carePlans.requestId,
      activityMobilitySafety: carePlans.activityMobilitySafety,
      hygieneElimination:     carePlans.hygieneElimination,
      homeManagement:         carePlans.homeManagement,
      hydrationNutrition:     carePlans.hydrationNutrition,
      medicationReminders:    carePlans.medicationReminders,
      updatedAt:              carePlans.updatedAt,
    })
    .from(carePlans)
    .where(eq(carePlans.id, planId))
    .limit(1)

  if (!plan) return null

  if (plan.recipientId) {
    const [recipient] = await db
      .select({ id: careRecipients.id })
      .from(careRecipients)
      .where(and(eq(careRecipients.id, plan.recipientId), eq(careRecipients.clientId, clientId)))
      .limit(1)
    if (!recipient) return null
  }

  return plan
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId } = await params
  const plan = await getOwnedPlan(clientId, planId)
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId } = await params
  const existing = await getOwnedPlan(clientId, planId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const toTasks = (val: unknown): CareTaskEntry[] | undefined => {
    if (!Array.isArray(val)) return undefined
    return val.filter(
      (t): t is CareTaskEntry =>
        typeof t === 'object' && t !== null && typeof t.key === 'string' && typeof t.frequency === 'string'
    )
  }

  const updates: Partial<typeof carePlans.$inferInsert> = {}
  if (body.activityMobilitySafety !== undefined) updates.activityMobilitySafety = toTasks(body.activityMobilitySafety)
  if (body.hygieneElimination !== undefined)     updates.hygieneElimination = toTasks(body.hygieneElimination)
  if (body.homeManagement !== undefined)          updates.homeManagement = toTasks(body.homeManagement)
  if (body.hydrationNutrition !== undefined)      updates.hydrationNutrition = toTasks(body.hydrationNutrition)
  if (body.medicationReminders !== undefined)     updates.medicationReminders = toTasks(body.medicationReminders)

  const [updated] = await db
    .update(carePlans)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(carePlans.id, planId))
    .returning({ id: carePlans.id, updatedAt: carePlans.updatedAt })

  return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt })
}
