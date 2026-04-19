import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/services/db'
import { messages, jobs, users } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params

  const [job] = await db
    .select({ clientId: jobs.clientId })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1)

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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

  return NextResponse.json({ messages: rows, currentUserId: session.user.id })
}
