import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { careRecipients, careRequests, careTypes } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

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
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))

  const [recipients, requests] = await Promise.all([
    db
      .select({ id: careRecipients.id, name: careRecipients.name, createdAt: careRecipients.createdAt })
      .from(careRecipients)
      .where(eq(careRecipients.clientId, clientId))
      .orderBy(desc(careRecipients.createdAt))
      .limit(limit),

    db
      .select({
        id:            careRequests.id,
        title:         careRequests.title,
        careType:      careRequests.careType,
        status:        careRequests.status,
        createdAt:     careRequests.createdAt,
        careTypeLabel: careTypes.label,
      })
      .from(careRequests)
      .leftJoin(careTypes, eq(careTypes.key, careRequests.careType))
      .where(eq(careRequests.clientId, clientId))
      .orderBy(desc(careRequests.createdAt))
      .limit(limit),
  ])

  const items = [
    ...recipients.map(r => ({
      type:      'recipient' as const,
      createdAt: r.createdAt.toISOString(),
      label:     r.name ?? 'Recipient',
      sublabel:  'Added as recipient',
    })),
    ...requests.map(r => ({
      type:      'request' as const,
      createdAt: r.createdAt.toISOString(),
      label:     r.title ?? r.careTypeLabel ?? r.careType ?? 'Care request',
      sublabel:  r.status ?? 'draft',
    })),
  ]

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json(items.slice(0, limit))
}
