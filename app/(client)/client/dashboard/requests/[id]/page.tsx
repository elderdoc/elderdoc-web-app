import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit3, Heart, Calendar, MapPin, DollarSign, Users, Clock, Languages, Phone, MessageSquare, Briefcase, CalendarDays, Tag, Sparkles, Star } from 'lucide-react'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRequests, careRecipients, careRequestLocations, jobs, caregiverProfiles, users, matches } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'
import { CARE_TYPES, LANGUAGES } from '@/lib/constants'
import { SendOfferButton } from '../../_components/send-offer-button'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((c) => [c.key, c.label]))
const LANGUAGE_LABELS = Object.fromEntries(LANGUAGES.map((l) => [l.key, l.label]))

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:     { label: 'Draft',     bg: 'bg-muted',                text: 'text-muted-foreground',     dot: 'bg-muted-foreground/60' },
  active:    { label: 'Open',      bg: 'bg-blue-50',              text: 'text-blue-700',              dot: 'bg-blue-500' },
  matched:   { label: 'Matched',   bg: 'bg-[var(--forest-soft)]', text: 'text-[var(--forest-deep)]', dot: 'bg-[var(--forest)]' },
  filled:    { label: 'Filled',    bg: 'bg-amber-50',             text: 'text-amber-700',             dot: 'bg-amber-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-rose-50',              text: 'text-rose-700',              dot: 'bg-rose-500' },
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-[18px] font-semibold tracking-tight text-foreground">{value}</span>
      {sub && <span className="text-[12px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

export default async function CareRequestDetailPage({ params }: PageProps) {
  const { id } = await params
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [rows, locationRows, jobRows, matchRows] = await Promise.all([
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
      .select({ city: careRequestLocations.city, state: careRequestLocations.state, address1: careRequestLocations.address1 })
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
    db
      .select({
        matchId:        matches.id,
        score:          matches.score,
        reason:         matches.reason,
        status:         matches.status,
        caregiverId:    matches.caregiverId,
        caregiverName:  users.name,
        caregiverImage: users.image,
        profileId:      caregiverProfiles.id,
        headline:       caregiverProfiles.headline,
        hourlyMin:      caregiverProfiles.hourlyMin,
        hourlyMax:      caregiverProfiles.hourlyMax,
        rating:         caregiverProfiles.rating,
      })
      .from(matches)
      .innerJoin(caregiverProfiles, eq(matches.caregiverId, caregiverProfiles.id))
      .innerJoin(users, eq(caregiverProfiles.userId, users.id))
      .where(eq(matches.requestId, id))
      .orderBy(desc(matches.score)),
  ])

  if (!rows.length) notFound()
  const req = rows[0]
  const loc = locationRows[0]
  const job = jobRows[0] ?? null
  const matchList = matchRows ?? []

  const status = req.status ?? 'draft'
  const statusMeta = STATUS_META[status] ?? STATUS_META.draft
  const careTypeLabel = CARE_TYPE_LABELS[req.careType] ?? req.careType
  const budget = req.budgetMin
    ? req.budgetMax && req.budgetMax !== req.budgetMin
      ? `$${Number(req.budgetMin).toFixed(0)}–$${Number(req.budgetMax).toFixed(0)}${BUDGET_SUFFIX[req.budgetType ?? ''] ?? ''}`
      : `$${Number(req.budgetMin).toFixed(0)}${BUDGET_SUFFIX[req.budgetType ?? ''] ?? ''}`
    : null
  const location = [loc?.city, loc?.state].filter(Boolean).join(', ')
  const caregiverInitials = (job?.caregiverName ?? '?').split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="relative px-6 lg:px-10 py-8 lg:py-10 max-w-[900px] mx-auto">
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

      {/* Request header card */}
      <div className="rounded-[20px] border border-border bg-card p-6 sm:p-8 shadow-[0_4px_20px_-8px_rgba(15,20,16,0.08)]">
        {/* Top row: status + actions */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full ${statusMeta.bg} px-3 py-1 text-[12.5px] font-semibold ${statusMeta.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
            {statusMeta.label}
          </span>
          <div className="flex gap-2">
            {status !== 'filled' && status !== 'cancelled' && (
              <Link
                href={`/client/dashboard/requests/${id}/edit`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-[13px] font-medium hover:border-foreground/30 hover:bg-muted transition-all"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </Link>
            )}
            {req.recipientId && (
              <Link
                href={`/client/dashboard/recipients/${req.recipientId}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all"
              >
                <Heart className="h-3.5 w-3.5" />
                View recipient
              </Link>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight">
          {req.title ?? careTypeLabel}
        </h1>

        {/* Metadata row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            {careTypeLabel}
          </span>
          {req.recipientName && (
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5" />
              For <span className="text-foreground font-medium ml-1">{req.recipientName}</span>
              {req.recipientRel && <span className="capitalize"> · {req.recipientRel.replace(/-/g, ' ')}</span>}
            </span>
          )}
          <span>Posted {formatDistanceToNow(req.createdAt, { addSuffix: true })}</span>
        </div>

        {/* Key stats strip */}
        <div className="mt-6 pt-5 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-5">
          {budget && <Stat label="Budget" value={budget} />}
          {req.frequency && <Stat label="Frequency" value={FREQ_LABELS[req.frequency] ?? req.frequency} />}
          {req.startDate && <Stat label="Start date" value={req.startDate} />}
          {location && <Stat label="Location" value={location} />}
        </div>
      </div>

      {/* Hired caregiver */}
      {job && (
        <div className="mt-4 rounded-[18px] border border-[var(--forest)]/25 bg-[var(--forest-soft)]/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground">
              <Briefcase className="h-3 w-3" />
            </span>
            <h2 className="text-[13.5px] font-semibold text-[var(--forest-deep)]">Hired caregiver</h2>
            <span className="ml-auto text-[12px] text-muted-foreground">
              Hired {formatDistanceToNow(job.hiredAt, { addSuffix: true })} · <span className="capitalize">{job.jobStatus}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {job.caregiverImage ? (
              <img src={job.caregiverImage} alt={job.caregiverName ?? ''} className="h-12 w-12 rounded-full object-cover ring-2 ring-card" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground ring-2 ring-card">
                {caregiverInitials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[14.5px] font-semibold">{job.caregiverName}</p>
              {job.headline && <p className="text-[12.5px] text-muted-foreground">{job.headline}</p>}
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-muted-foreground">
                {(job.hourlyMin || job.hourlyMax) && <span>${job.hourlyMin ?? '?'}–${job.hourlyMax ?? '?'}/hr</span>}
                {job.caregiverPhone && (
                  <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{job.caregiverPhone}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href={`/client/dashboard/find-caregivers/${job.profileId}`} className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-[12.5px] font-medium hover:bg-muted transition-all">
                View profile
              </Link>
              <Link href={`/client/dashboard/messages/${job.jobId}`} className="inline-flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] transition-all">
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {req.description && (
        <div className="mt-4 rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[14px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">About this request</h2>
          <p className="text-[14.5px] leading-[1.65] text-foreground/85">{req.description}</p>
        </div>
      )}

      {/* Schedule + preferences */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Dates */}
        {(req.startDate || req.endDate) && (
          <div className="rounded-[18px] border border-border bg-card p-5">
            <h2 className="text-[14px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dates</h2>
            <div className="space-y-2.5">
              {req.startDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <div className="text-[11px] text-muted-foreground">Start date</div>
                    <div className="text-[14px] font-medium">{req.startDate}</div>
                  </div>
                </div>
              )}
              {req.endDate && (
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <div className="text-[11px] text-muted-foreground">End date</div>
                    <div className="text-[14px] font-medium">{req.endDate}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preferences */}
        {(req.genderPref || (req.languagesPreferred?.length ?? 0) > 0 || (req.languagesRequired?.length ?? 0) > 0) && (
          <div className="rounded-[18px] border border-border bg-card p-5">
            <h2 className="text-[14px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Preferences</h2>
            <div className="space-y-3">
              {req.genderPref && (
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <div className="text-[11px] text-muted-foreground">Caregiver gender</div>
                    <div className="text-[14px] font-medium capitalize">{req.genderPref}</div>
                  </div>
                </div>
              )}
              {req.languagesRequired && req.languagesRequired.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Required languages</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {req.languagesRequired.map((l: string) => (
                      <span key={l} className="inline-flex rounded-full bg-[var(--forest-soft)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--forest-deep)]">
                        {LANGUAGE_LABELS[l] ?? l}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {req.languagesPreferred && req.languagesPreferred.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Preferred languages</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {req.languagesPreferred.map((l: string) => (
                      <span key={l} className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-[12px] font-medium text-foreground/80">
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

      {/* Location */}
      {(loc?.address1 || loc?.city) && (
        <div className="mt-4 rounded-[18px] border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <MapPin className="h-4.5 w-4.5 text-foreground/60" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Location</div>
            <div className="text-[14.5px] font-medium">
              {[loc?.address1, loc?.city, loc?.state].filter(Boolean).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Matched caregivers */}
      {matchList.length > 0 && (
        <div className="mt-4 rounded-[18px] border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--forest-soft)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--forest-deep)]" />
            </div>
            <h2 className="text-[14px] font-semibold">Matched caregivers</h2>
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground ml-1">
              {matchList.length}
            </span>
          </div>
          <div className="space-y-3">
            {matchList.map((m, idx) => {
              const initials = (m.caregiverName ?? '?').split(' ').filter(Boolean).map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()
              const ratingNum = m.rating ? Number(m.rating) : null
              const MATCH_STATUS: Record<string, { label: string; cls: string }> = {
                pending:  { label: 'Offer sent',  cls: 'bg-amber-50 text-amber-700' },
                accepted: { label: 'Accepted',    cls: 'bg-[var(--forest-soft)] text-[var(--forest-deep)]' },
                declined: { label: 'Declined',    cls: 'bg-rose-50 text-rose-700' },
              }
              const statusChip = MATCH_STATUS[m.status ?? 'pending']
              return (
                <div key={m.matchId} className="flex items-start gap-4 rounded-xl border border-border bg-muted/20 p-4">
                  {/* Rank */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {idx + 1}
                    </div>
                    {m.caregiverImage ? (
                      <img src={m.caregiverImage} alt={m.caregiverName ?? ''} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14.5px] font-semibold">{m.caregiverName ?? 'Caregiver'}</p>
                        {ratingNum && (
                          <span className="flex items-center gap-0.5 text-[12px] text-amber-500 font-medium">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {ratingNum.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <span className="text-[12.5px] font-semibold text-primary shrink-0">{m.score}% match</span>
                    </div>
                    {m.headline && <p className="text-[12.5px] text-muted-foreground">{m.headline}</p>}
                    {(m.hourlyMin || m.hourlyMax) && (
                      <p className="text-[12px] text-muted-foreground mt-0.5">${m.hourlyMin}–${m.hourlyMax}/hr</p>
                    )}
                    {m.reason && (
                      <p className="text-[12.5px] italic text-muted-foreground mt-1 line-clamp-2">{m.reason}</p>
                    )}
                    {/* Bottom row */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${statusChip.cls}`}>
                        {statusChip.label}
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <Link
                          href={`/client/dashboard/find-caregivers/${m.profileId}`}
                          className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-[12px] font-medium hover:bg-muted transition-all"
                        >
                          View profile
                        </Link>
                        {m.status !== 'accepted' && (
                          <SendOfferButton
                            requestId={id}
                            caregiverId={m.caregiverId}
                            caregiverName={m.caregiverName}
                            score={m.score}
                            reason={m.reason}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
            <p className="text-[12.5px] text-muted-foreground">Not seeing the right fit?</p>
            <Link
              href={`/client/dashboard/find-caregivers?requestId=${id}`}
              className="text-[12.5px] font-medium text-primary hover:underline"
            >
              Browse all caregivers →
            </Link>
          </div>
        </div>
      )}

      {/* Weekly shifts */}
      {req.schedule && req.schedule.length > 0 && (
        <div className="mt-4 rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[14px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            Weekly shifts
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground font-normal">
              {req.schedule.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(req.schedule as Array<{ day: string; startTime: string; endTime: string }>).map((entry, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="inline-flex h-8 w-12 items-center justify-center rounded-lg bg-[var(--forest-soft)] text-[11px] font-semibold uppercase text-[var(--forest-deep)] tracking-wide shrink-0">
                  {DAY_LABEL[entry.day.toLowerCase()] ?? entry.day.slice(0, 3)}
                </span>
                <span className="text-[13.5px] font-medium tabular-nums">
                  {entry.startTime} – {entry.endTime}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
