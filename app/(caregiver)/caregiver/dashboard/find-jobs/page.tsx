import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import {
  caregiverProfiles, careRequests, careRequestLocations, jobApplications, matches,
} from '@/db/schema'
import { eq, and, notInArray } from 'drizzle-orm'
import { CARE_TYPES } from '@/lib/constants'
import { ApplyModal } from '../_components/apply-modal'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((ct) => [ct.key, ct.label]))

export default async function FindJobsPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return <div className="p-8 text-muted-foreground text-sm">Complete your profile to browse jobs.</div>
  }

  const [appliedRows, matchedRows] = await Promise.all([
    db.select({ id: jobApplications.requestId })
      .from(jobApplications)
      .where(eq(jobApplications.caregiverId, profile.id)),
    db.select({ id: matches.requestId })
      .from(matches)
      .where(eq(matches.caregiverId, profile.id)),
  ])

  const excludedIds = [...new Set([...appliedRows.map((r) => r.id), ...matchedRows.map((r) => r.id)])]
  const statusFilter = eq(careRequests.status, 'active')
  const where = excludedIds.length > 0
    ? and(statusFilter, notInArray(careRequests.id, excludedIds))
    : statusFilter

  const requests = await db
    .select({
      id:           careRequests.id,
      title:        careRequests.title,
      careType:     careRequests.careType,
      frequency:    careRequests.frequency,
      durationHours:careRequests.durationHours,
      startDate:    careRequests.startDate,
      budgetType:   careRequests.budgetType,
      budgetAmount: careRequests.budgetAmount,
      city:         careRequestLocations.city,
      state:        careRequestLocations.state,
    })
    .from(careRequests)
    .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
    .where(where)
    .orderBy(careRequests.createdAt)

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Find Jobs</h1>
      <p className="text-sm text-muted-foreground mb-8">Browse open care requests and apply.</p>

      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open requests available right now.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const location = [req.city, req.state].filter(Boolean).join(', ')
            const title = req.title ?? `${CARE_TYPE_LABELS[req.careType] ?? req.careType} Request`
            return (
              <div
                key={req.id}
                className="rounded-xl border border-border bg-card p-5 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm mb-1">{title}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{CARE_TYPE_LABELS[req.careType] ?? req.careType}</span>
                    {location && <span>{location}</span>}
                    {req.frequency && <span className="capitalize">{req.frequency.replace(/-/g, ' ')}</span>}
                    {req.durationHours && <span>{req.durationHours}h/visit</span>}
                    {req.startDate && <span>Starts {req.startDate}</span>}
                    {req.budgetAmount && (
                      <span>${req.budgetAmount}{req.budgetType === 'hourly' ? '/hr' : ''}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <ApplyModal requestId={req.id} requestTitle={title} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
