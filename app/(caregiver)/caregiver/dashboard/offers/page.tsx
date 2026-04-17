import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, matches, careRequests, careRequestLocations } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { CARE_TYPES } from '@/lib/constants'
import { OfferActions } from '../_components/offer-actions'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((ct) => [ct.key, ct.label]))

export default async function OffersPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return <div className="p-8 text-muted-foreground text-sm">Complete your profile to view offers.</div>
  }

  const offers = await db
    .select({
      matchId:   matches.id,
      score:     matches.score,
      reason:    matches.reason,
      title:     careRequests.title,
      careType:  careRequests.careType,
      frequency: careRequests.frequency,
      city:      careRequestLocations.city,
      state:     careRequestLocations.state,
    })
    .from(matches)
    .innerJoin(careRequests, eq(matches.requestId, careRequests.id))
    .leftJoin(careRequestLocations, eq(careRequestLocations.requestId, careRequests.id))
    .where(and(eq(matches.caregiverId, profile.id), eq(matches.status, 'pending')))
    .orderBy(desc(matches.createdAt))

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Offers</h1>
      <p className="text-sm text-muted-foreground mb-8">AI-matched care requests waiting for your response.</p>

      {offers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending offers right now.</p>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => {
            const location = [offer.city, offer.state].filter(Boolean).join(', ')
            const title = offer.title ?? `${CARE_TYPE_LABELS[offer.careType] ?? offer.careType} Request`
            const scoreLabel = offer.score != null
              ? (offer.score >= 80 ? 'Strong match' : offer.score >= 60 ? 'Good match' : 'Possible match')
              : null
            return (
              <div
                key={offer.matchId}
                className="rounded-xl border border-border bg-card p-5 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{title}</p>
                    {scoreLabel && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {scoreLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                    <span>{CARE_TYPE_LABELS[offer.careType] ?? offer.careType}</span>
                    {location && <span>{location}</span>}
                    {offer.frequency && <span className="capitalize">{offer.frequency.replace(/-/g, ' ')}</span>}
                  </div>
                  {offer.reason && (
                    <p className="text-xs text-muted-foreground italic">&ldquo;{offer.reason}&rdquo;</p>
                  )}
                </div>
                <OfferActions matchId={offer.matchId} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
