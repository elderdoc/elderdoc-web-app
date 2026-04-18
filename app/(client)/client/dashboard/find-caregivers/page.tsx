import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRequests, matches } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { getMatchesForRequest, searchCaregivers } from '@/domains/clients/find-caregivers'
import { FilterForm } from './_components/filter-form'
import { SendOfferModal } from './_components/send-offer-modal'
import { CARE_TYPES } from '@/lib/constants'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function sp(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val
}

function spArr(val: string | string[] | undefined): string[] | undefined {
  if (!val) return undefined
  return Array.isArray(val) ? val : [val]
}

function buildPageUrl(
  base: {
    requestId?: string; careType?: string; state?: string
    rateMin?: string; rateMax?: string; experience?: string
    language?: string[]; certification?: string[]
  },
  targetPage: number,
): string {
  const params = new URLSearchParams()
  if (base.requestId)    params.set('requestId', base.requestId)
  if (base.careType)     params.set('careType', base.careType)
  if (base.state)        params.set('state', base.state)
  if (base.rateMin)      params.set('rateMin', base.rateMin)
  if (base.rateMax)      params.set('rateMax', base.rateMax)
  if (base.experience)   params.set('experience', base.experience)
  for (const lang of base.language ?? []) params.append('language', lang)
  for (const cert of base.certification ?? []) params.append('certification', cert)
  params.set('page', String(targetPage))
  const qs = params.toString()
  return `/client/dashboard/find-caregivers${qs ? `?${qs}` : ''}`
}

function scoreBadge(score: number) {
  if (score >= 80) return { label: 'Strong match', classes: 'bg-green-100 text-green-700' }
  if (score >= 60) return { label: 'Good match',   classes: 'bg-blue-100 text-blue-700' }
  return { label: 'Possible match', classes: 'bg-muted text-muted-foreground' }
}

export default async function FindCaregiversPage({ searchParams }: PageProps) {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const resolvedSearchParams = await searchParams

  const [activeRequests, existingMatches] = await Promise.all([
    db
      .select({ id: careRequests.id, title: careRequests.title, careType: careRequests.careType })
      .from(careRequests)
      .where(and(eq(careRequests.clientId, clientId), eq(careRequests.status, 'active'))),
    db
      .select({ caregiverId: matches.caregiverId })
      .from(matches)
      .innerJoin(careRequests, eq(matches.requestId, careRequests.id))
      .where(eq(careRequests.clientId, clientId)),
  ])

  const offeredSet = new Set(existingMatches.map((m) => m.caregiverId))

  const requestId     = sp(resolvedSearchParams.requestId)
  const careType      = sp(resolvedSearchParams.careType)
  const state         = sp(resolvedSearchParams.state)
  const rateMin       = sp(resolvedSearchParams.rateMin)
  const rateMax       = sp(resolvedSearchParams.rateMax)
  const language      = spArr(resolvedSearchParams.language)
  const certification = spArr(resolvedSearchParams.certification)
  const experience    = sp(resolvedSearchParams.experience)
  const page          = Math.max(1, parseInt(sp(resolvedSearchParams.page) ?? '1', 10) || 1)

  const currentFilters = {
    requestId, careType, state, rateMin, rateMax, language, certification, experience,
    page: String(page),
  }

  const ownedRequest = requestId
    ? activeRequests.find((r) => r.id === requestId)
    : undefined

  const myMatches = ownedRequest
    ? await getMatchesForRequest(ownedRequest.id, clientId)
    : []

  const { caregivers, total } = await searchCaregivers(
    { careType, state, rateMin, rateMax, language, certification, experience },
    page,
  )

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-8 max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Find Caregivers</h1>
        <p className="text-sm text-muted-foreground">
          Browse your AI-ranked matches and the full caregiver directory.
        </p>
      </div>

      <FilterForm activeRequests={activeRequests} currentFilters={currentFilters} />

      {/* ── Your Matches ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Your Matches
        </h2>

        {activeRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a care request to see your AI matches.
          </p>
        ) : !requestId ? (
          <p className="text-sm text-muted-foreground">
            Select a care request above to see your AI-ranked matches.
          </p>
        ) : myMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matches yet. Matches appear after you submit a care request.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myMatches.map((m) => {
              const badge = scoreBadge(m.score)
              return (
                <div key={m.matchId} className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    {m.image ? (
                      <img src={m.image} alt={m.name ?? ''} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {(m.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[m.city, m.state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>

                  {m.headline && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{m.headline}</p>
                  )}

                  {m.careTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.careTypes.map((ct) => (
                        <span key={ct} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {CARE_TYPES.find((c) => c.key === ct)?.label ?? ct}
                        </span>
                      ))}
                    </div>
                  )}

                  {(m.hourlyMin || m.hourlyMax) && (
                    <p className="text-xs text-muted-foreground">
                      ${m.hourlyMin ?? '?'}–${m.hourlyMax ?? '?'}/hr
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.classes}`}>
                      {badge.label}
                    </span>
                    <SendOfferModal
                      caregiverId={m.caregiverId}
                      activeRequests={activeRequests}
                      alreadyOffered={offeredSet.has(m.caregiverId)}
                    />
                  </div>

                  {m.reason && (
                    <p className="text-xs italic text-muted-foreground">{m.reason}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Browse All Caregivers ─────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Browse All Caregivers
          </h2>
          <span className="text-xs text-muted-foreground">{total} caregiver{total !== 1 ? 's' : ''} found</span>
        </div>

        {caregivers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No caregivers match the current filters.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {caregivers.map((cg) => (
              <div key={cg.caregiverId} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  {cg.image ? (
                    <img src={cg.image} alt={cg.name ?? ''} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {(cg.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{cg.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[cg.city, cg.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>

                {cg.headline && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{cg.headline}</p>
                )}

                {cg.careTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cg.careTypes.map((ct) => (
                      <span key={ct} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {CARE_TYPES.find((c) => c.key === ct)?.label ?? ct}
                      </span>
                    ))}
                  </div>
                )}

                {(cg.hourlyMin || cg.hourlyMax) && (
                  <p className="text-xs text-muted-foreground">
                    ${cg.hourlyMin}–${cg.hourlyMax}/hr
                  </p>
                )}

                {cg.experience && (
                  <p className="text-xs text-muted-foreground">{cg.experience} experience</p>
                )}

                <div className="flex justify-end">
                  <SendOfferModal
                    caregiverId={cg.caregiverId}
                    activeRequests={activeRequests}
                    alreadyOffered={offeredSet.has(cg.caregiverId)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {page > 1 && (
              <a
                href={buildPageUrl({ requestId, careType, state, rateMin, rateMax, experience, language, certification }, page - 1)}
                className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted"
              >
                ← Prev
              </a>
            )}
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={buildPageUrl({ requestId, careType, state, rateMin, rateMax, experience, language, certification }, page + 1)}
                className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted"
              >
                Next →
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
