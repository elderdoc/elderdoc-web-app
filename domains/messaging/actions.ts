'use server'

import { auth } from '@/auth'
import { db } from '@/services/db'
import { messages, jobs } from '@/db/schema'
import { eq, and, ne } from 'drizzle-orm'

export async function markMessagesRead(jobId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return
  await db
    .update(messages)
    .set({ read: true })
    .where(and(eq(messages.jobId, jobId), ne(messages.senderId, session.user.id), eq(messages.read, false)))
}

export async function sendMessage(jobId: string, body: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  if (!body.trim()) return

  const [job] = await db
    .select({ clientId: jobs.clientId })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1)

  if (!job) throw new Error('Job not found')

  await db.insert(messages).values({
    jobId,
    senderId: session.user.id,
    body: body.trim(),
  })
}
