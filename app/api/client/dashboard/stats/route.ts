import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { careRecipients, careRequests, matches } from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'

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

  const [[recipientRow], [activeRequestRow], [pendingMatchRow]] = await Promise.all([
    db
      .select({ count: count() })
      .from(careRecipients)
      .where(eq(careRecipients.clientId, clientId)),

    db
      .select({ count: count() })
      .from(careRequests)
      .where(and(eq(careRequests.clientId, clientId), eq(careRequests.status, 'active'))),

    db
      .select({ count: count() })
      .from(matches)
      .innerJoin(careRequests, eq(careRequests.id, matches.requestId))
      .where(and(eq(careRequests.clientId, clientId), eq(matches.status, 'pending'))),
  ])

  return NextResponse.json({
    recipientCount:      recipientRow?.count ?? 0,
    activeRequestCount:  activeRequestRow?.count ?? 0,
    pendingMatchCount:   pendingMatchRow?.count ?? 0,
  })
}
