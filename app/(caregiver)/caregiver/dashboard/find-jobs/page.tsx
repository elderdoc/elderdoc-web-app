import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import {
  caregiverProfiles, caregiverLocations, careRequests, careRequestLocations,
  jobApplications, matches, users, careRecipients,
} from '@/db/schema'
import { eq, and, notInArray } from 'drizzle-orm'
import { CARE_TYPES } from '@/lib/constants'
import { haversineDistance, formatMiles } from '@/lib/geo'
import { MapPin } from 'lucide-react'
import { JobDetailDrawer } from '../_components/job-detail-drawer'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((ct) => [ct.key, ct.label]))

export default async function FindJobsPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const [profile, cgLocationRow] = await Promise.all([
    db.query.caregiverProfiles.findFirst({ where: eq(caregiverProfiles.userId, userId) }),
    db.select({ lat: caregiverLocations.lat, lng: caregiverLocations.lng })
      .from(caregiverLocations)
      .innerJoin(caregiverProfiles, eq(caregiverProfiles.id, caregiverLocations.caregiverId))
      .where(eq(caregiverProfiles.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ])

  if (!profile) {
    return <div className="p-4 lg:p-8 text-muted-foreground text-sm">Complete your profile to browse jobs.</div>
  }

  const cgLat = cgLocationRow?.lat ? Number(cgLocationRow.lat) : null
  const cgLng = cgLocationRow?.lng ? Number(cgLocationRow.lng) : null

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
      id:                     careRequests.id,
      title:                  careRequests.title,
      careType:               careRequests.careType,
      description:            careRequests.description,
      frequency:              careRequests.frequency,
      schedule:               careRequests.schedule,
      startDate:              careRequests.startDate,
      genderPref:             careRequests.genderPref,
      languagePref:           careRequests.languagePref,
      budgetType:             careRequests.budgetType,
      budgetAmount:           careRequests.budgetAmount,
      createdAt:              careRequests.createdAt,
      city:                   careRequestLocations.city,
      state:                  careRequestLocations.state,
      address1:               careRequestLocations.address1,
      lat:                    careRequestLocations.lat,
      lng:                    careRequestLocations.lng,
      clientName:             users.name,
      recipientName:          careRecipients.name,
      recipientConditions:    careRecipients.conditions,
      recipientMobilityLevel: careRecipients.mobilityLevel,
    })
    .from(careRequests)
    .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
    .leftJoin(users, eq(users.id, careRequests.clientId))
    .leftJoin(careRecipients, eq(careRecipients.id, careRequests.recipientId))
    .where(where)
    .orderBy(careRequests.createdAt)

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-1">Find Jobs</h1>
      <p className="text-sm text-muted-foreground mb-8">Browse open care requests and apply.</p>

      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open requests available right now.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const reqLat = req.lat ? Number(req.lat) : null
            const reqLng = req.lng ? Number(req.lng) : null
            const distLabel = cgLat && cgLng && reqLat && reqLng
              ? `${formatMiles(haversineDistance(cgLat, cgLng, reqLat, reqLng))} away`
              : [req.city, req.state].filter(Boolean).join(', ') || null
            const title = req.title ?? `${CARE_TYPE_LABELS[req.careType] ?? req.careType} Request`
            const job = { ...req, title, careTypeLabel: CARE_TYPE_LABELS[req.careType] ?? req.careType }

            return (
              <div
                key={req.id}
                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="min-w-0 space-y-2">
                  <div>
                    <p className="font-medium text-sm">{title}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">
                        {CARE_TYPE_LABELS[req.careType] ?? req.careType}
                      </span>
                      {distLabel && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {distLabel}
                        </span>
                      )}
                      {req.frequency && (
                        <span className="capitalize">{req.frequency.replace(/-/g, ' ')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {req.startDate && <span>Starts {req.startDate}</span>}
                    {req.budgetAmount && (
                      <span className="font-medium text-foreground">
                        ${req.budgetAmount}{req.budgetType === 'hourly' ? '/hr' : req.budgetType === 'daily' ? '/day' : ''}
                      </span>
                    )}
                    {req.recipientName && <span>For: {req.recipientName}</span>}
                    {req.schedule && (req.schedule as Array<{ day: string; startTime: string; endTime: string }>).slice(0, 3).map((entry, i) => (
                      <span key={i}>{entry.day} {entry.startTime}–{entry.endTime}</span>
                    ))}
                  </div>

                  {req.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-lg">{req.description}</p>
                  )}
                </div>

                <div className="shrink-0">
                  <JobDetailDrawer
                    job={job}
                    trigger={
                      <button
                        type="button"
                        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap"
                      >
                        View
                      </button>
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
