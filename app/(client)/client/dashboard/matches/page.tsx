import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { matches, careRequests, careRecipients, caregiverProfiles, users, caregiverLocations } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import Link from 'next/link'
import { Sparkles, ArrowRight, Star, MapPin, DollarSign } from 'lucide-react'
import { SendOfferButton } from '../_components/send-offer-button'

function formatCareType(key: string) {
  return key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700 border border-amber-200',
  accepted: 'bg-[var(--forest-soft)] text-[var(--forest-deep)] border border-[var(--forest-soft)]',
  declined: 'bg-muted text-muted-foreground border border-border',
}
const STATUS_LABELS: Record<string, string> = {
  pending:  'Pending',
  accepted: 'Offer sent',
  declined: 'Declined',
}

export default async function MatchesPage() {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const rows = await db
    .select({
      matchId:       matches.id,
      matchStatus:   matches.status,
      score:         matches.score,
      reason:        matches.reason,
      requestId:     careRequests.id,
      requestTitle:  careRequests.title,
      careType:      careRequests.careType,
      recipientName: careRecipients.name,
      caregiverId:   caregiverProfiles.id,
      caregiverName: users.name,
      caregiverImage: users.image,
      headline:      caregiverProfiles.headline,
      hourlyMin:     caregiverProfiles.hourlyMin,
      hourlyMax:     caregiverProfiles.hourlyMax,
      rating:        caregiverProfiles.rating,
      city:          caregiverLocations.city,
      state:         caregiverLocations.state,
    })
    .from(matches)
    .innerJoin(careRequests, and(eq(matches.requestId, careRequests.id), eq(careRequests.clientId, clientId)))
    .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
    .innerJoin(caregiverProfiles, eq(matches.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .leftJoin(caregiverLocations, eq(caregiverProfiles.id, caregiverLocations.caregiverId))
    .orderBy(desc(matches.score))

  // Group by request
  const grouped = new Map<string, { requestId: string; requestTitle: string | null; careType: string; recipientName: string | null; caregivers: typeof rows }>()
  for (const row of rows) {
    if (!grouped.has(row.requestId)) {
      grouped.set(row.requestId, {
        requestId:     row.requestId,
        requestTitle:  row.requestTitle,
        careType:      row.careType,
        recipientName: row.recipientName ?? null,
        caregivers:    [],
      })
    }
    grouped.get(row.requestId)!.caregivers.push(row)
  }

  const groups = Array.from(grouped.values())
  const totalPending = rows.filter(r => r.matchStatus === 'pending').length

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-[13px] font-medium text-primary mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          Caregiver matches
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1]">
              Your Matches
            </h1>
            <p className="mt-1.5 text-[15px] text-muted-foreground">
              AI-matched caregivers for your active care requests.
            </p>
          </div>
          {totalPending > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-[13px] font-medium text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {totalPending} pending review
            </span>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-[20px] border-2 border-dashed border-border bg-card/50 p-14 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-[var(--forest-soft)] flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-[var(--forest-deep)]" />
          </div>
          <h3 className="text-[20px] font-semibold">No matches yet</h3>
          <p className="mt-2 text-[14px] text-muted-foreground max-w-sm mx-auto">
            Once you create a care request, we'll surface your top caregiver matches here.
          </p>
          <Link
            href="/client/dashboard/requests/new"
            className="mt-6 inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all"
          >
            Create a care request
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(group => (
            <section key={group.requestId}>
              {/* Request header */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <Link
                    href={`/client/dashboard/requests/${group.requestId}`}
                    className="group/req inline-flex items-center gap-1.5 text-[18px] font-semibold tracking-[-0.015em] hover:text-primary transition-colors"
                  >
                    {group.requestTitle ?? formatCareType(group.careType)}
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 transition-all group-hover/req:opacity-100 group-hover/req:translate-x-0" />
                  </Link>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-full bg-[var(--forest-soft)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--forest-deep)]">
                      {formatCareType(group.careType)}
                    </span>
                    {group.recipientName && (
                      <span className="text-[12px] text-muted-foreground">For {group.recipientName}</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
                  {group.caregivers.length} match{group.caregivers.length !== 1 ? 'es' : ''}
                </span>
              </div>

              {/* Caregiver cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.caregivers.map((cg, rank) => {
                  const initials = cg.caregiverName?.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() ?? '?'
                  const location = [cg.city, cg.state].filter(Boolean).join(', ')
                  const rate = cg.hourlyMin
                    ? `$${Number(cg.hourlyMin).toFixed(0)}${cg.hourlyMax ? `–$${Number(cg.hourlyMax).toFixed(0)}` : '+'}/hr`
                    : null
                  const statusStyle = STATUS_STYLES[cg.matchStatus ?? 'pending']
                  const statusLabel = STATUS_LABELS[cg.matchStatus ?? 'pending']

                  return (
                    <div
                      key={cg.matchId}
                      className="rounded-[16px] border border-border bg-card p-5 flex flex-col gap-4 hover:border-foreground/15 hover:shadow-[0_6px_20px_-8px_rgba(15,20,16,0.1)] transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {/* Rank badge */}
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--forest-soft)] text-[11px] font-semibold text-[var(--forest-deep)] tabular-nums mt-0.5">
                          {rank + 1}
                        </span>

                        {/* Avatar */}
                        {cg.caregiverImage ? (
                          <img src={cg.caregiverImage} alt={cg.caregiverName ?? ''} className="h-11 w-11 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-[13px] font-bold text-primary-foreground">
                            {initials}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[15px] font-semibold leading-tight">{cg.caregiverName}</p>
                              {cg.headline && (
                                <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">{cg.headline}</p>
                              )}
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusStyle}`}>
                              {statusLabel}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {cg.rating && (
                              <span className="inline-flex items-center gap-1 text-[12px] text-foreground/70">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {Number(cg.rating).toFixed(1)}
                              </span>
                            )}
                            {location && (
                              <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {location}
                              </span>
                            )}
                            {rate && (
                              <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                                <DollarSign className="h-3 w-3" />
                                {rate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Match reason */}
                      {cg.reason && (
                        <div className="rounded-[10px] bg-[var(--forest-soft)]/50 px-3 py-2 text-[12.5px] text-[var(--forest-deep)] leading-relaxed">
                          ✓ {cg.reason}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href={`/client/dashboard/find-caregivers/${cg.caregiverId}`}
                          className="flex-1 inline-flex h-9 items-center justify-center rounded-full border border-border bg-card text-[13px] font-medium hover:border-foreground/30 hover:bg-muted transition-all"
                        >
                          View profile
                        </Link>
                        {cg.matchStatus === 'pending' && (
                          <SendOfferButton
                            requestId={group.requestId}
                            caregiverId={cg.caregiverId}
                            caregiverName={cg.caregiverName}
                            score={cg.score}
                            reason={cg.reason}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
