import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, jobs, careRequests, users, careRecipients } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { CARE_TYPES } from '@/lib/constants'
import { JobCard } from './_components/job-card'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((ct) => [ct.key, ct.label]))

export default async function MyJobsPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return <div className="p-4 lg:p-8 text-muted-foreground text-sm">Complete your profile to view your jobs.</div>
  }

  const myJobs = await db
    .select({
      id:            jobs.id,
      status:        jobs.status,
      createdAt:     jobs.createdAt,
      title:         careRequests.title,
      careType:      careRequests.careType,
      description:   careRequests.description,
      frequency:     careRequests.frequency,
      days:          careRequests.days,
      shiftTimes:    careRequests.shifts,
      startDate:     careRequests.startDate,
      durationHours: careRequests.durationHours,
      budgetAmount:  careRequests.budgetAmount,
      clientName:    users.name,
      recipientName: careRecipients.name,
    })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(users, eq(jobs.clientId, users.id))
    .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
    .where(eq(jobs.caregiverId, profile.id))
    .orderBy(desc(jobs.createdAt))

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-1">My Jobs</h1>
      <p className="text-sm text-muted-foreground mb-8">Your accepted care positions.</p>

      {myJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No jobs yet. Check your offers or browse open requests.</p>
      ) : (
        <div className="space-y-4">
          {myJobs.map((job) => (
            <JobCard
              key={job.id}
              job={{
                ...job,
                title: job.title ?? `${CARE_TYPE_LABELS[job.careType] ?? job.careType} Request`,
                careTypeLabel: CARE_TYPE_LABELS[job.careType] ?? job.careType,
                budgetAmount: job.budgetAmount ?? null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
