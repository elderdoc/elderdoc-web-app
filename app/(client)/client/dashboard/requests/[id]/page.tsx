import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRequests, careRecipients, careRequestLocations, jobs, caregiverProfiles, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'
import { CARE_TYPES } from '@/lib/constants'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((c) => [c.key, c.label]))
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', active: 'Open', matched: 'Matched',
  filled: 'Filled', cancelled: 'Cancelled',
}
const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-blue-100 text-blue-700',
  matched: 'bg-green-100 text-green-700',
  filled: 'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
}
const FREQ_LABELS: Record<string, string> = {
  'one-time': 'One-time', daily: 'Daily', weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly', monthly: 'Monthly',
}
const BUDGET_SUFFIX: Record<string, string> = {
  hourly: '/hr', 'per-visit': '/visit', monthly: '/mo', 'bi-weekly': '/2wk',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CareRequestDetailPage({ params }: PageProps) {
  const { id } = await params
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [rows, locationRows, jobRows] = await Promise.all([
    db
      .select({
        id:            careRequests.id,
        title:         careRequests.title,
        description:   careRequests.description,
        careType:      careRequests.careType,
        status:        careRequests.status,
        frequency:     careRequests.frequency,
        days:          careRequests.days,
        shifts:        careRequests.shifts,
        startDate:     careRequests.startDate,
        durationHours: careRequests.durationHours,
        genderPref:    careRequests.genderPref,
        languagePref:  careRequests.languagePref,
        budgetType:    careRequests.budgetType,
        budgetAmount:  careRequests.budgetAmount,
        createdAt:     careRequests.createdAt,
        recipientName: careRecipients.name,
        recipientRel:  careRecipients.relationship,
      })
      .from(careRequests)
      .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
      .where(and(eq(careRequests.id, id), eq(careRequests.clientId, clientId)))
      .limit(1),
    db
      .select({
        city:     careRequestLocations.city,
        state:    careRequestLocations.state,
        address1: careRequestLocations.address1,
      })
      .from(careRequestLocations)
      .where(eq(careRequestLocations.requestId, id))
      .limit(1),
    db
      .select({
        jobId:          jobs.id,
        jobStatus:      jobs.status,
        caregiverName:  users.name,
        caregiverPhone: users.phone,
        caregiverImage: users.image,
        profileId:      caregiverProfiles.id,
        headline:       caregiverProfiles.headline,
        hourlyMin:      caregiverProfiles.hourlyMin,
        hourlyMax:      caregiverProfiles.hourlyMax,
        hiredAt:        jobs.createdAt,
      })
      .from(jobs)
      .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
      .innerJoin(users, eq(caregiverProfiles.userId, users.id))
      .where(and(eq(jobs.requestId, id), eq(jobs.clientId, clientId)))
      .limit(1),
  ])

  if (!rows.length) notFound()
  const req = rows[0]
  const loc = locationRows[0]
  const job = jobRows[0] ?? null

  const status = req.status ?? 'draft'
  const careTypeLabel = CARE_TYPE_LABELS[req.careType] ?? req.careType
  const budget = req.budgetAmount
    ? `$${Number(req.budgetAmount).toFixed(0)}${BUDGET_SUFFIX[req.budgetType ?? ''] ?? ''}`
    : null
  const location = [loc?.address1, loc?.city, loc?.state].filter(Boolean).join(', ')

  return (
    <div className="p-8">
      <Link
        href="/client/dashboard/requests"
        className="text-xs text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1"
      >
        ← Back to Care Requests
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mt-4 mb-2">
        <h1 className="text-2xl font-bold leading-snug">{req.title ?? careTypeLabel}</h1>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <span className={['rounded-full px-3 py-1 text-xs font-medium', STATUS_CLASSES[status]].join(' ')}>
            {STATUS_LABELS[status]}
          </span>
          {status !== 'filled' && status !== 'cancelled' && (
            <Link
              href={`/client/dashboard/requests/${id}/edit`}
              className="px-3 py-1 rounded-md border border-border text-xs font-medium hover:bg-muted whitespace-nowrap"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {req.recipientName && (
        <p className="text-sm text-muted-foreground">
          For {req.recipientName}{req.recipientRel ? ` (${req.recipientRel.replace(/-/g, ' ')})` : ''}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1 mb-8">
        Posted {formatDistanceToNow(req.createdAt, { addSuffix: true })}
      </p>

      {/* Filled — show hired caregiver */}
      {job && (
        <>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Hired Caregiver</p>
            <div className="flex items-center gap-4">
              {job.caregiverImage ? (
                <img src={job.caregiverImage} alt={job.caregiverName ?? ''} className="h-12 w-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shrink-0">
                  {(job.caregiverName ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">{job.caregiverName}</p>
                {job.headline && <p className="text-xs text-muted-foreground mt-0.5">{job.headline}</p>}
                <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-muted-foreground">
                  {(job.hourlyMin || job.hourlyMax) && (
                    <span>${job.hourlyMin ?? '?'}–${job.hourlyMax ?? '?'}/hr</span>
                  )}
                  {job.caregiverPhone && <span>{job.caregiverPhone}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/client/dashboard/find-caregivers/${job.profileId}`}
                  className="px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted whitespace-nowrap"
                >
                  View Profile
                </Link>
                <Link
                  href={`/client/dashboard/messages/${job.jobId}`}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium whitespace-nowrap"
                >
                  Message
                </Link>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Hired {formatDistanceToNow(job.hiredAt, { addSuffix: true })} · Job status: <span className="capitalize">{job.jobStatus}</span>
            </p>
          </div>
          <hr className="border-border mb-8" />
        </>
      )}

      {/* Description */}
      {req.description && (
        <>
          <p className="text-sm leading-relaxed text-foreground mb-8">{req.description}</p>
          <hr className="border-border mb-8" />
        </>
      )}

      {/* Details sections */}
      <div className="space-y-8">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Details</h2>
          <dl className="space-y-3">
            <Row label="Care Type" value={careTypeLabel} />
            {req.frequency && <Row label="Frequency" value={FREQ_LABELS[req.frequency] ?? req.frequency} />}
            {budget && <Row label="Budget" value={budget} />}
            {req.durationHours != null && <Row label="Duration per visit" value={`${req.durationHours} hours`} />}
            {req.startDate && <Row label="Start Date" value={req.startDate} />}
            {req.genderPref && <Row label="Caregiver Gender" value={req.genderPref} capitalize />}
          </dl>
        </section>

        {(req.days?.length || req.shifts?.length) && (
          <>
            <hr className="border-border" />
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Schedule</h2>
              <dl className="space-y-3">
                {req.days && req.days.length > 0 && (
                  <div className="flex gap-4">
                    <dt className="text-sm text-muted-foreground w-36 shrink-0">Days</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {req.days.map((d) => (
                        <span key={d} className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{d}</span>
                      ))}
                    </dd>
                  </div>
                )}
                {req.shifts && req.shifts.length > 0 && (
                  <div className="flex gap-4">
                    <dt className="text-sm text-muted-foreground w-36 shrink-0">Shifts</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {req.shifts.map((s) => (
                        <span key={s} className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{s.replace(/-/g, ' ')}</span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          </>
        )}

        {(location || req.languagePref?.length) && (
          <>
            <hr className="border-border" />
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Location & Preferences</h2>
              <dl className="space-y-3">
                {location && <Row label="Location" value={location} />}
                {req.languagePref && req.languagePref.length > 0 && (
                  <div className="flex gap-4">
                    <dt className="text-sm text-muted-foreground w-36 shrink-0">Languages</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {req.languagePref.map((l) => (
                        <span key={l} className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{l}</span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex gap-4">
      <dt className="text-sm text-muted-foreground w-36 shrink-0">{label}</dt>
      <dd className={`text-sm font-medium ${capitalize ? 'capitalize' : ''}`}>{value}</dd>
    </div>
  )
}
