import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { matches, careRequests } from '@/db/schema'
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const clientId = await getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await params

  const [match] = await db
    .select({ id: matches.id, requestId: matches.requestId, status: matches.status })
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.status, 'pending')))
    .limit(1)

  if (!match) return NextResponse.json({ error: 'Match not found or already settled' }, { status: 404 })

  // Verify the match belongs to a request owned by this client
  const [request] = await db
    .select({ id: careRequests.id })
    .from(careRequests)
    .where(and(eq(careRequests.id, match.requestId), eq(careRequests.clientId, clientId)))
    .limit(1)

  if (!request) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Match stays 'pending' so the caregiver can see and accept the offer
  return NextResponse.json({ success: true })
}
