import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit3, FileText, Calendar, MapPin, DollarSign, Users, Clock, Heart, Languages, Phone, MessageSquare, Briefcase, AlertCircle, CalendarDays, Tag } from 'lucide-react'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRequests, careRecipients, careRequestLocations, jobs, caregiverProfiles, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'
import { CARE_TYPES, LANGUAGES } from '@/lib/constants'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((c) => [c.key, c.label]))
const LANGUAGE_LABELS = Object.fromEntries(LANGUAGES.map((l) => [l.key, l.label]))

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:     { label: 'Draft',     bg: 'bg-muted',                  text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  active:    { label: 'Open',      bg: 'bg-blue-50',                text: 'text-blue-700',         dot: 'bg-blue-500' },
  matched:   { label: 'Matched',   bg: 'bg-[var(--forest-soft)]',   text: 'text-[var(--forest-deep)]', dot: 'bg-[var(--forest)]' },
  filled:    { label: 'Filled',    bg: 'bg-amber-50',               text: 'text-amber-700',        dot: 'bg-amber-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-rose-50',                text: 'text-rose-700',         dot: 'bg-rose-500' },
}

const FREQ_LABELS: Record<string, string> = {
  'one-time': 'One-time', daily: 'Daily', weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly', monthly: 'Monthly',
}
const BUDGET_SUFFIX: Record<string, string> = {
  hourly: '/hr', 'per-visit': '/visit', monthly: '/mo', 'bi-weekly': '/2wk',
}
const DAY_LABEL: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

interface PageProps {
  params: Promise<{ id: string }>
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/60 last:border-b-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground/70">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-muted-foreground">{label}</div>
        <div className="text-[14px] text-foreground font-medium">{value}</div>
      </div>
    </div>
  )
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
        schedule:      careRequests.schedule,
        startDate:     careRequests.startDate,
        endDate:       careRequests.endDate,
        genderPref:    careRequests.genderPref,
        languagesPreferred: careRequests.languagesPreferred,
        languagesRequired:  careRequests.languagesRequired,
        budgetType:    careRequests.budgetType,
        budgetMin:     careRequests.budgetMin,
        budgetMax:     careRequests.budgetMax,
        createdAt:     careRequests.createdAt,
        recipientId:   careRecipients.id,
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
  const statusMeta = STATUS_META[status] ?? STATUS_META.draft
  const careTypeLabel = CARE_TYPE_LABELS[req.careType] ?? req.careType
  const budget = req.budgetMin
    ? req.budgetMax && req.budgetMax !== req.budgetMin
      ? `$${Number(req.budgetMin).toFixed(0)}–$${Number(req.budgetMax).toFixed(0)}${BUDGET_SUFFIX[req.budgetType ?? ''] ?? ''}`
      : `$${Number(req.budgetMin).toFixed(0)}${BUDGET_SUFFIX[req.budgetType ?? ''] ?? ''}`
    : null
  const location = [loc?.address1, loc?.city, loc?.state].filter(Boolean).join(', ')
  const caregiverInitials = (job?.caregiverName ?? '?').split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="relative px-6 lg:px-10 py-8 lg:py-10 max-w-[1100px] mx-auto">
      {/* Soft glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-15%] top-[-10%] h-[400px] w-[400px] rounded-full bg-[var(--forest-soft)] blur-[100px] opacity-40" />
      </div>

      <Link
        href="/client/dashboard/requests"
        className="inline-flex items-center gap-1.5 text-[14px] text-foreground/70 hover:text-foreground mb-6 group/back"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover/back:-translate-x-0.5" />
        Back to Care Requests
      </Link>

      {/* Hero card */}
      <div className="rounded-[20px] border border-border bg-card overflow-hidden shadow-[0_4px_20px_-8px_rgba(15,20,16,0.08)]">
        <div className="relative">
          {/* Banner gradient */}
          <div className="h-32 bg-gradient-to-br from-[var(--forest-soft)] via-[var(--cream-deep)] to-[var(--forest-soft)]" />
          <div className="px-6 sm:px-8 pb-6 -mt-12">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="flex items-end gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary text-primary-foreground ring-4 ring-card shadow-[0_8px_24px_-8px_rgba(15,77,52,0.4)]">
                  <FileText className="h-10 w-10" />
                </div>
                <div className="pb-1 min-w-0">
                  <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-tight">
                    {req.title ?? careTypeLabel}
                  </h1>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-full ${statusMeta.bg} px-2.5 py-1 text-[12px] font-medium ${statusMeta.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                      {statusMeta.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-foreground/70">
                      <Tag className="h-3 w-3" />
                      {careTypeLabel}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      Posted {formatDistanceToNow(req.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pb-1">
                {status !== 'filled' && status !== 'cancelled' && (
                  <Link
                    href={`/client/dashboard/requests/${id}/edit`}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-[13.5px] font-medium hover:border-foreground/30 hover:bg-muted transition-all"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                )}
                {req.recipientId && (
                  <Link
                    href={`/client/dashboard/recipients/${req.recipientId}`}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13.5px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all"
                  >
                    <Heart className="h-3.5 w-3.5" />
                    View recipient
                  </Link>
                )}
              </div>
            </div>
            {req.recipientName && (
              <p className="mt-3 text-[14px] text-foreground/70">
                For <span className="font-medium text-foreground">{req.recipientName}</span>
                {req.recipientRel ? <span className="text-muted-foreground capitalize"> · {req.recipientRel.replace(/-/g, ' ')}</span> : null}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Hired caregiver */}
      {job && (
        <div className="mt-5 rounded-[18px] border border-[var(--forest)]/30 bg-[var(--forest-soft)]/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground">
              <Briefcase className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-[14px] font-semibold text-[var(--forest-deep)]">Hired caregiver</h2>
            <span className="ml-auto text-[12px] text-muted-foreground">
              Hired {formatDistanceToNow(job.hiredAt, { addSuffix: true })} · <span className="capitalize">{job.jobStatus}</span>
            </span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {job.caregiverImage ? (
              <img src={job.caregiverImage} alt={job.caregiverName ?? ''} className="h-14 w-14 rounded-full object-cover ring-2 ring-card shadow-sm" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-[14px] font-semibold text-primary-foreground ring-2 ring-card">
                {caregiverInitials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold">{job.caregiverName}</p>
              {job.headline && <p className="text-[13px] text-muted-foreground line-clamp-1">{job.headline}</p>}
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12.5px] text-muted-foreground">
                {(job.hourlyMin || job.hourlyMax) && (
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${job.hourlyMin ?? '?'}–${job.hourlyMax ?? '?'}/hr
                  </span>
                )}
                {job.caregiverPhone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {job.caregiverPhone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/client/dashboard/find-caregivers/${job.profileId}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-[13px] font-medium hover:border-foreground/30 hover:bg-muted transition-all"
              >
                View profile
              </Link>
              <Link
                href={`/client/dashboard/messages/${job.jobId}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] transition-all"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {req.description && (
        <div className="mt-5 rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-2.5">About this request</h2>
          <p className="text-[14.5px] leading-[1.6] whitespace-pre-line text-foreground/85">{req.description}</p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Details */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3">Details</h2>
          <div>
            <InfoRow icon={Tag} label="Care type" value={careTypeLabel} />
            {req.frequency && <InfoRow icon={Clock} label="Frequency" value={FREQ_LABELS[req.frequency] ?? req.frequency} />}
            {budget && <InfoRow icon={DollarSign} label="Budget" value={budget} />}
            {req.genderPref && (
              <InfoRow icon={Users} label="Caregiver gender" value={<span className="capitalize">{req.genderPref}</span>} />
            )}
          </div>
        </div>

        {/* Schedule dates */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3">Schedule</h2>
          {(req.startDate || req.endDate || (req.schedule && req.schedule.length > 0)) ? (
            <div>
              {req.startDate && <InfoRow icon={Calendar} label="Start date" value={req.startDate} />}
              {req.endDate && <InfoRow icon={CalendarDays} label="End date" value={req.endDate} />}
              {req.schedule && req.schedule.length > 0 && (
                <InfoRow
                  icon={Clock}
                  label="Shifts"
                  value={`${req.schedule.length} ${req.schedule.length === 1 ? 'entry' : 'entries'}`}
                />
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/40 p-6 text-center">
              <Calendar className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-[13px] text-muted-foreground">No schedule yet.</p>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3">Location</h2>
          {location ? (
            <div>
              {loc?.address1 && <InfoRow icon={MapPin} label="Street" value={loc.address1} />}
              {(loc?.city || loc?.state) && (
                <InfoRow
                  icon={MapPin}
                  label="City, State"
                  value={[loc.city, loc.state].filter(Boolean).join(', ')}
                />
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/40 p-6 text-center">
              <MapPin className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-[13px] text-muted-foreground">No location specified.</p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule entries */}
      {req.schedule && req.schedule.length > 0 && (
        <div className="mt-5 rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
            Weekly shifts
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
              {req.schedule.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(req.schedule as Array<{ day: string; startTime: string; endTime: string }>).map((entry, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="inline-flex h-8 w-12 items-center justify-center rounded-lg bg-[var(--forest-soft)] text-[11px] font-semibold uppercase text-[var(--forest-deep)] tracking-wide">
                  {DAY_LABEL[entry.day.toLowerCase()] ?? entry.day.slice(0, 3)}
                </span>
                <span className="text-[14px] font-medium tabular-nums">
                  {entry.startTime} – {entry.endTime}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {((req.languagesPreferred && req.languagesPreferred.length > 0) ||
        (req.languagesRequired && req.languagesRequired.length > 0)) && (
        <div className="mt-5 rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            Languages
          </h2>
          <div className="space-y-3">
            {req.languagesRequired && req.languagesRequired.length > 0 && (
              <div>
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Required</p>
                <div className="flex flex-wrap gap-1.5">
                  {req.languagesRequired.map((l: string) => (
                    <span key={l} className="inline-flex items-center gap-1 rounded-full bg-[var(--forest-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--forest-deep)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--forest)]" />
                      {LANGUAGE_LABELS[l] ?? l}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {req.languagesPreferred && req.languagesPreferred.length > 0 && (
              <div>
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Preferred</p>
                <div className="flex flex-wrap gap-1.5">
                  {req.languagesPreferred.map((l: string) => (
                    <span key={l} className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground/80">
                      {LANGUAGE_LABELS[l] ?? l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
