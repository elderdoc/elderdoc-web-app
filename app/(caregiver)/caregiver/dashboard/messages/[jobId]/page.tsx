import { notFound } from 'next/navigation'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { jobs, caregiverProfiles, users } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { ChatWindow } from '@/components/messaging/chat-window'
import { BackButton } from '@/components/back-button'

interface PageProps {
  params: Promise<{ jobId: string }>
}

export default async function CaregiverMessagePage({ params }: PageProps) {
  const { jobId } = await params
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const [profileRow] = await db
    .select({ id: caregiverProfiles.id })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.userId, userId))
    .limit(1)

  if (!profileRow) notFound()

  const [job] = await db
    .select({ clientName: users.name })
    .from(jobs)
    .innerJoin(users, eq(jobs.clientId, users.id))
    .where(and(eq(jobs.id, jobId), eq(jobs.caregiverId, profileRow.id)))
    .limit(1)

  if (!job) notFound()

  return (
    <div className="p-4 lg:p-8">
      <BackButton label="← Back to My Jobs" />
      <div className="mt-4">
        <ChatWindow jobId={jobId} otherPartyName={job.clientName ?? 'Client'} />
      </div>
    </div>
  )
}
