import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles, matches, careRequests, careRequestLocations } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { CARE_TYPES } from '@/lib/constants'
import { OfferDetailDrawer } from '../_components/offer-detail-drawer'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((ct) => [ct.key, ct.label]))

export default async function OffersPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return <div className="p-4 lg:p-8 text-muted-foreground text-sm">Complete your profile to view offers.</div>
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
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-1">Offers</h1>
      <p className="text-sm text-muted-foreground mb-8">Intelligently matched care requests waiting for your response.</p>

      {offers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending offers right now.</p>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => {
            const title = offer.title ?? `${CARE_TYPE_LABELS[offer.careType] ?? offer.careType} Request`
            return (
              <OfferDetailDrawer
                key={offer.matchId}
                offer={{ ...offer, title, careTypeLabel: CARE_TYPE_LABELS[offer.careType] ?? offer.careType }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
