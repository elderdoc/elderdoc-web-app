import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRequests, careRequestLocations, clientLocations, caregiverFavorites, matches } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { getMatchesForRequest, searchCaregivers } from '@/domains/clients/find-caregivers'
import { FilterForm } from './_components/filter-form'
import { FindCaregiverCard } from './_components/find-caregiver-card'
import { haversineDistance } from '@/lib/geo'

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
    sort?: string
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
  if (base.sort)         params.set('sort', base.sort)
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

  const [activeRequests, existingMatches, favoriteRows] = await Promise.all([
    db
      .select({ id: careRequests.id, title: careRequests.title, careType: careRequests.careType })
      .from(careRequests)
      .where(and(eq(careRequests.clientId, clientId), eq(careRequests.status, 'active'))),
    db
      .select({ caregiverId: matches.caregiverId })
      .from(matches)
      .innerJoin(careRequests, eq(matches.requestId, careRequests.id))
      .where(eq(careRequests.clientId, clientId)),
    db
      .select({ caregiverId: caregiverFavorites.caregiverId })
      .from(caregiverFavorites)
      .where(eq(caregiverFavorites.clientId, clientId)),
  ])

  const offeredSet  = new Set(existingMatches.map((m) => m.caregiverId))
  const favoriteSet = new Set(favoriteRows.map((f) => f.caregiverId))

  const requestId     = sp(resolvedSearchParams.requestId)
  const careType      = sp(resolvedSearchParams.careType)
  const state         = sp(resolvedSearchParams.state)
  const rateMin       = sp(resolvedSearchParams.rateMin)
  const rateMax       = sp(resolvedSearchParams.rateMax)
  const language      = spArr(resolvedSearchParams.language)
  const certification = spArr(resolvedSearchParams.certification)
  const experience    = sp(resolvedSearchParams.experience)
  const sort          = sp(resolvedSearchParams.sort)
  const page          = Math.max(1, parseInt(sp(resolvedSearchParams.page) ?? '1', 10) || 1)

  const currentFilters = {
    requestId, careType, state, rateMin, rateMax, language, certification, experience, sort,
    page: String(page),
  }

  const ownedRequest = requestId
    ? activeRequests.find((r) => r.id === requestId)
    : undefined

  const [myMatches, requestLocationRow, clientLocationRow] = await Promise.all([
    ownedRequest ? getMatchesForRequest(ownedRequest.id, clientId) : Promise.resolve([]),
    ownedRequest
      ? db.select({ lat: careRequestLocations.lat, lng: careRequestLocations.lng })
          .from(careRequestLocations)
          .where(eq(careRequestLocations.requestId, ownedRequest.id))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db.select({ lat: clientLocations.lat, lng: clientLocations.lng })
      .from(clientLocations)
      .where(eq(clientLocations.clientId, clientId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ])

  const reqLat = requestLocationRow?.lat ? Number(requestLocationRow.lat) : null
  const reqLng = requestLocationRow?.lng ? Number(requestLocationRow.lng) : null
  const clientRefLat = clientLocationRow?.lat ? Number(clientLocationRow.lat) : null
  const clientRefLng = clientLocationRow?.lng ? Number(clientLocationRow.lng) : null

  const { caregivers, total } = await searchCaregivers(
    { careType, state, rateMin, rateMax, language, certification, experience },
    page,
  )

  const caregiversWithDistance = caregivers.map((cg) => {
    const cgLat = cg.lat ? Number(cg.lat) : null
    const cgLng = cg.lng ? Number(cg.lng) : null
    const distanceMiles = clientRefLat && clientRefLng && cgLat && cgLng
      ? haversineDistance(clientRefLat, clientRefLng, cgLat, cgLng)
      : null
    return { ...cg, distanceMiles }
  })

  if (sort === 'distance-asc' || sort === 'distance-desc') {
    const dir = sort === 'distance-asc' ? 1 : -1
    caregiversWithDistance.sort((a, b) => {
      if (a.distanceMiles == null && b.distanceMiles == null) return 0
      if (a.distanceMiles == null) return 1
      if (b.distanceMiles == null) return -1
      return (a.distanceMiles - b.distanceMiles) * dir
    })
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-4 lg:p-8 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Find Caregivers</h1>
        <p className="text-sm text-muted-foreground">
          Browse your intelligently matched caregivers and the full directory.
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
            Create a care request to see your matched caregivers.
          </p>
        ) : !requestId ? (
          <p className="text-sm text-muted-foreground">
            Select a care request above to see your matched caregivers.
          </p>
        ) : myMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matches yet. Matches appear after you submit a care request.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myMatches.map((m, i) => {
              const badge = scoreBadge(m.score)
              const cgLat = m.lat ? Number(m.lat) : null
              const cgLng = m.lng ? Number(m.lng) : null
              const distanceMiles = reqLat && reqLng && cgLat && cgLng
                ? haversineDistance(reqLat, reqLng, cgLat, cgLng)
                : null
              return (
                <FindCaregiverCard
                  key={m.matchId}
                  rank={i + 1}
                  caregiver={{
                    id:           m.caregiverId,
                    name:         m.name,
                    image:        m.image,
                    headline:     m.headline,
                    careTypes:    m.careTypes,
                    city:         m.city,
                    state:        m.state,
                    distanceMiles,
                    hourlyMin:    m.hourlyMin,
                    hourlyMax:    m.hourlyMax,
                    rating:       m.rating,
                    matchScore:   Math.round(m.score / 20),
                    matchReason:  m.reason,
                  }}
                  statusBadge={
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.classes}`}>
                      {badge.label}
                    </span>
                  }
                  activeRequests={activeRequests}
                  isFavorited={favoriteSet.has(m.caregiverId)}
                  alreadyOffered={offeredSet.has(m.caregiverId)}
                />
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

        {caregiversWithDistance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No caregivers match the current filters.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {caregiversWithDistance.map((cg) => (
              <FindCaregiverCard
                key={cg.caregiverId}
                caregiver={{
                  id:           cg.caregiverId,
                  name:         cg.name,
                  image:        cg.image,
                  headline:     cg.headline,
                  careTypes:    cg.careTypes,
                  city:         cg.city,
                  state:        cg.state,
                  distanceMiles: cg.distanceMiles,
                  hourlyMin:    cg.hourlyMin,
                  hourlyMax:    cg.hourlyMax,
                  experience:   cg.experience,
                  rating:       cg.rating,
                }}
                activeRequests={activeRequests}
                isFavorited={favoriteSet.has(cg.caregiverId)}
                alreadyOffered={offeredSet.has(cg.caregiverId)}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {page > 1 && (
              <a
                href={buildPageUrl({ requestId, careType, state, rateMin, rateMax, experience, language, certification, sort }, page - 1)}
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
                href={buildPageUrl({ requestId, careType, state, rateMin, rateMax, experience, language, certification, sort }, page + 1)}
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
