import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { careRequests, clientLocations, caregiverFavorites, matches, jobs } from '@/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { searchCaregivers } from '@/domains/clients/find-caregivers'
import { FilterForm } from './_components/filter-form'
import { FindCaregiverCard } from './_components/find-caregiver-card'
import { haversineDistance } from '@/lib/geo'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function sp(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val
}


function buildPageUrl(
  base: {
    careType?: string; state?: string
    rateMin?: string; rateMax?: string; experience?: string
    certification?: string; sort?: string
  },
  targetPage: number,
): string {
  const params = new URLSearchParams()
  if (base.careType)     params.set('careType', base.careType)
  if (base.state)        params.set('state', base.state)
  if (base.rateMin)      params.set('rateMin', base.rateMin)
  if (base.rateMax)      params.set('rateMax', base.rateMax)
  if (base.experience)   params.set('experience', base.experience)
  if (base.sort)         params.set('sort', base.sort)
  if (base.certification && base.certification !== 'none') params.set('certification', base.certification)
  params.set('page', String(targetPage))
  const qs = params.toString()
  return `/client/dashboard/find-caregivers${qs ? `?${qs}` : ''}`
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

  const careType      = sp(resolvedSearchParams.careType)
  const state         = sp(resolvedSearchParams.state)
  const rateMin       = sp(resolvedSearchParams.rateMin)
  const rateMax       = sp(resolvedSearchParams.rateMax)
  const certification = sp(resolvedSearchParams.certification)
  const experience    = sp(resolvedSearchParams.experience)
  const sort          = sp(resolvedSearchParams.sort)
  const page          = Math.max(1, parseInt(sp(resolvedSearchParams.page) ?? '1', 10) || 1)

  const currentFilters = {
    careType, state, rateMin, rateMax, certification, experience, sort,
    page: String(page),
  }

  const [clientLocationRow, searchResult] = await Promise.all([
    db.select({ lat: clientLocations.lat, lng: clientLocations.lng })
      .from(clientLocations)
      .where(eq(clientLocations.clientId, clientId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    searchCaregivers({ careType, state, rateMin, rateMax, certification, experience }, page),
  ])

  const { caregivers, total } = searchResult
  const clientRefLat = clientLocationRow?.lat ? Number(clientLocationRow.lat) : null
  const clientRefLng = clientLocationRow?.lng ? Number(clientLocationRow.lng) : null

  // Job count per caregiver for jobs-done sort
  const cgIds = caregivers.map((c) => c.caregiverId)
  const jobCountRows = cgIds.length > 0
    ? await db
        .select({
          caregiverId: jobs.caregiverId,
          count: sql<number>`count(*)::int`,
        })
        .from(jobs)
        .where(and(inArray(jobs.caregiverId, cgIds), eq(jobs.status, 'completed')))
        .groupBy(jobs.caregiverId)
    : []
  const jobCountMap = new Map(jobCountRows.map((r) => [r.caregiverId, Number(r.count)]))

  const caregiversWithDistance = caregivers.map((cg) => {
    const cgLat = cg.lat ? Number(cg.lat) : null
    const cgLng = cg.lng ? Number(cg.lng) : null
    const distanceMiles = clientRefLat && clientRefLng && cgLat && cgLng
      ? haversineDistance(clientRefLat, clientRefLng, cgLat, cgLng)
      : null
    return { ...cg, distanceMiles, jobsCount: jobCountMap.get(cg.caregiverId) ?? 0 }
  })

  if (sort === 'distance-asc' || sort === 'distance-desc') {
    const dir = sort === 'distance-asc' ? 1 : -1
    caregiversWithDistance.sort((a, b) => {
      if (a.distanceMiles == null && b.distanceMiles == null) return 0
      if (a.distanceMiles == null) return 1
      if (b.distanceMiles == null) return -1
      return (a.distanceMiles - b.distanceMiles) * dir
    })
  } else if (sort === 'price-asc' || sort === 'price-desc') {
    const dir = sort === 'price-asc' ? 1 : -1
    caregiversWithDistance.sort((a, b) => {
      const aMin = Number(a.hourlyMin ?? 0)
      const bMin = Number(b.hourlyMin ?? 0)
      return (aMin - bMin) * dir
    })
  } else if (sort === 'jobs-desc' || sort === 'jobs-asc') {
    const dir = sort === 'jobs-desc' ? -1 : 1
    caregiversWithDistance.sort((a, b) => (a.jobsCount - b.jobsCount) * dir)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 max-w-[1200px] mx-auto space-y-10">
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-[1.15]">
          Find Caregivers
        </h1>
        <p className="mt-1.5 text-[14.5px] text-muted-foreground">
          Browse and filter caregivers in the directory.
        </p>
      </div>

      <FilterForm activeRequests={activeRequests} currentFilters={currentFilters} />

      {/* ── Browse All Caregivers ─────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[20px] font-semibold tracking-tight">
            Browse all caregivers
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
                href={buildPageUrl({ careType, state, rateMin, rateMax, experience, certification, sort }, page - 1)}
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
                href={buildPageUrl({ careType, state, rateMin, rateMax, experience, certification, sort }, page + 1)}
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
