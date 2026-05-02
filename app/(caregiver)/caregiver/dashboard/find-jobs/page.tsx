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
      languagesPreferred:     careRequests.languagesPreferred,
      budgetType:             careRequests.budgetType,
      budgetMin:              careRequests.budgetMin,
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
    <div className="px-6 lg:px-10 py-8 lg:py-10 max-w-[900px] mx-auto">
      <div className="mb-8">
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.025em] leading-[1.1]">Find Jobs</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">Browse open care requests and apply.</p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-[20px] border-2 border-dashed border-border bg-card/50 p-14 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-[var(--forest-soft)] flex items-center justify-center mb-4">
            <MapPin className="h-6 w-6 text-[var(--forest-deep)]" />
          </div>
          <h3 className="text-[18px] font-semibold">No open jobs right now</h3>
          <p className="mt-2 text-[13.5px] text-muted-foreground max-w-sm mx-auto">
            New care requests will appear here as families post them. Check back soon.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const reqLat = req.lat ? Number(req.lat) : null
            const reqLng = req.lng ? Number(req.lng) : null
            const distLabel = cgLat && cgLng && reqLat && reqLng
              ? `${formatMiles(haversineDistance(cgLat, cgLng, reqLat, reqLng))} away`
              : [req.city, req.state].filter(Boolean).join(', ') || null
            const title = req.title ?? `${CARE_TYPE_LABELS[req.careType] ?? req.careType} Request`
            const rateLabel = req.budgetMin
              ? `$${Number(req.budgetMin).toFixed(0)}${req.budgetType === 'hourly' ? '/hr' : req.budgetType === 'daily' ? '/day' : ''}`
              : null
            const typedSchedule = req.schedule as Array<{ day: string; startTime: string; endTime: string }> | null
            const job = { ...req, title, careTypeLabel: CARE_TYPE_LABELS[req.careType] ?? req.careType }

            return (
              <div
                key={req.id}
                className="group/card rounded-[16px] border border-border bg-card p-5 hover:border-primary/30 hover:shadow-[0_4px_16px_-8px_rgba(15,20,16,0.12)] transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2.5">
                    {/* Title + badges */}
                    <div>
                      <p className="text-[14.5px] font-semibold leading-snug group-hover/card:text-primary transition-colors">{title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-[var(--forest-soft)] px-2.5 py-0.5 text-[11.5px] font-medium text-[var(--forest-deep)]">
                          {CARE_TYPE_LABELS[req.careType] ?? req.careType}
                        </span>
                        {distLabel && (
                          <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {distLabel}
                          </span>
                        )}
                        {req.frequency && (
                          <span className="text-[12px] text-muted-foreground capitalize">
                            {req.frequency.replace(/-/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Secondary info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                      {req.startDate && <span>Starts {req.startDate}</span>}
                      {rateLabel && (
                        <span className="font-semibold text-foreground">{rateLabel}</span>
                      )}
                      {req.recipientName && <span>For {req.recipientName}</span>}
                      {typedSchedule && typedSchedule.slice(0, 2).map((entry, i) => (
                        <span key={i} className="capitalize">{entry.day} {entry.startTime}–{entry.endTime}</span>
                      ))}
                      {typedSchedule && typedSchedule.length > 2 && (
                        <span>+{typedSchedule.length - 2} more days</span>
                      )}
                    </div>

                    {req.description && (
                      <p className="text-[12.5px] text-muted-foreground line-clamp-2 max-w-lg leading-relaxed">
                        {req.description}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 pt-0.5">
                    <JobDetailDrawer
                      job={job}
                      trigger={
                        <button
                          type="button"
                          className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-[13px] font-medium hover:bg-[var(--forest-deep)] hover:shadow-[0_6px_14px_-4px_rgba(15,77,52,0.4)] transition-all whitespace-nowrap"
                        >
                          View & apply
                        </button>
                      }
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
