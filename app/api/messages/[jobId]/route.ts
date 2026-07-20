import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { messages, jobs, users, caregiverProfiles } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

async function getUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    try {
      const { payload } = await jwtVerify(authHeader.slice(7), secret)
      return (payload.sub as string) ?? null
    } catch {}
  }
  const session = await auth()
  return session?.user?.id ?? null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params

  const [job] = await db
    .select({
      clientId:         jobs.clientId,
      caregiverUserId:  caregiverProfiles.userId,
    })
    .from(jobs)
    .innerJoin(caregiverProfiles, eq(caregiverProfiles.id, jobs.caregiverId))
    .where(eq(jobs.id, jobId))
    .limit(1)

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (userId !== job.clientId && userId !== job.caregiverUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db
    .select({
      id:        messages.id,
      body:      messages.body,
      senderId:  messages.senderId,
      senderName: users.name,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.jobId, jobId))
    .orderBy(asc(messages.createdAt))

  return NextResponse.json({ messages: rows, currentUserId: userId })
}
