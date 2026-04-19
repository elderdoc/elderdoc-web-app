import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { jobs, caregiverProfiles, users, careRequests, messages } from '@/db/schema'
import { eq, and, ne, count } from 'drizzle-orm'
import Link from 'next/link'
import { CARE_TYPES } from '@/lib/constants'
import { notFound } from 'next/navigation'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map(c => [c.key, c.label]))

export default async function CaregiverMessagesPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const [profile] = await db
    .select({ id: caregiverProfiles.id })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.userId, userId))
    .limit(1)

  if (!profile) notFound()

  const [activeJobs, unreadRows] = await Promise.all([
    db
      .select({
        jobId:       jobs.id,
        careType:    careRequests.careType,
        clientName:  users.name,
        clientImage: users.image,
        startedAt:   jobs.createdAt,
      })
      .from(jobs)
      .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
      .innerJoin(users, eq(jobs.clientId, users.id))
      .where(eq(jobs.caregiverId, profile.id)),

    db
      .select({ jobId: messages.jobId, value: count() })
      .from(messages)
      .innerJoin(jobs, eq(messages.jobId, jobs.id))
      .where(and(eq(jobs.caregiverId, profile.id), ne(messages.senderId, userId), eq(messages.read, false)))
      .groupBy(messages.jobId),
  ])

  const unreadByJob = Object.fromEntries(unreadRows.map(r => [r.jobId, Number(r.value)]))

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-1">Messages</h1>
      <p className="text-sm text-muted-foreground mb-8">Chat with your clients.</p>

      {activeJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-muted-foreground">No conversations yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Messages become available once you accept an offer.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeJobs.map(job => {
            const initials = (job.clientName ?? '?').charAt(0).toUpperCase()
            const unread = unreadByJob[job.jobId] ?? 0
            return (
              <Link
                key={job.jobId}
                href={`/caregiver/dashboard/messages/${job.jobId}`}
                className={[
                  'flex items-center gap-4 rounded-xl border bg-card px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all',
                  unread > 0 ? 'border-primary/30' : 'border-border',
                ].join(' ')}
              >
                {job.clientImage ? (
                  <img src={job.clientImage} alt={job.clientName ?? ''} className="h-10 w-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${unread > 0 ? 'font-semibold' : 'font-medium'}`}>
                    {job.clientName ?? 'Client'}
                  </p>
                  <p className="text-xs text-muted-foreground">{CARE_TYPE_LABELS[job.careType] ?? job.careType}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {job.startedAt.toLocaleDateString()}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
