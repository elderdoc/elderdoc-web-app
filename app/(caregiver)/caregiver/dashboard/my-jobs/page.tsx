import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, jobs, careRequests, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { CARE_TYPES } from '@/lib/constants'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((ct) => [ct.key, ct.label]))

const JOB_STATUS_LABELS: Record<string, string> = {
  active:    'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const JOB_STATUS_CLASSES: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

export default async function MyJobsPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return <div className="p-8 text-muted-foreground text-sm">Complete your profile to view your jobs.</div>
  }

  const myJobs = await db
    .select({
      id:         jobs.id,
      status:     jobs.status,
      createdAt:  jobs.createdAt,
      title:      careRequests.title,
      careType:   careRequests.careType,
      clientName: users.name,
    })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(users, eq(jobs.clientId, users.id))
    .where(eq(jobs.caregiverId, profile.id))
    .orderBy(desc(jobs.createdAt))

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">My Jobs</h1>
      <p className="text-sm text-muted-foreground mb-8">Your accepted care positions.</p>

      {myJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No jobs yet. Check your offers or browse open requests.</p>
      ) : (
        <div className="space-y-4">
          {myJobs.map((job) => {
            const title = job.title ?? `${CARE_TYPE_LABELS[job.careType] ?? job.careType} Request`
            const statusLabel = JOB_STATUS_LABELS[job.status ?? 'active'] ?? job.status
            const statusClass = JOB_STATUS_CLASSES[job.status ?? 'active'] ?? 'bg-muted text-muted-foreground'
            return (
              <div
                key={job.id}
                className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm mb-1">{title}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{CARE_TYPE_LABELS[job.careType] ?? job.careType}</span>
                    {job.clientName && <span>Client: {job.clientName}</span>}
                    <span>Started {job.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
