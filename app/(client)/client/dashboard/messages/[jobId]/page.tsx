import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { jobs, caregiverProfiles, users } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { ChatWindow } from '@/components/messaging/chat-window'

interface PageProps {
  params: Promise<{ jobId: string }>
}

export default async function ClientMessagePage({ params }: PageProps) {
  const { jobId } = await params
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [job] = await db
    .select({ caregiverName: users.name })
    .from(jobs)
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .where(and(eq(jobs.id, jobId), eq(jobs.clientId, clientId)))
    .limit(1)

  if (!job) notFound()

  return (
    <div className="p-8">
      <Link
        href="/client/dashboard/requests"
        className="text-xs text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1"
      >
        ← Back to Care Requests
      </Link>
      <div className="mt-4">
        <ChatWindow jobId={jobId} otherPartyName={job.caregiverName ?? 'Caregiver'} />
      </div>
    </div>
  )
}
