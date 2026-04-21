import { requireRole } from '@/domains/auth/session'
import { getCurrentCaregivers, getFavoriteCaregivers } from '@/domains/clients/favorites'
import { db } from '@/services/db'
import { clientLocations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { haversineDistance } from '@/lib/geo'
import { MyCaregiversTabs } from './_components/my-caregivers-tabs'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

function withDistances<T extends { lat: string | null; lng: string | null }>(
  caregivers: T[],
  clientLat: number | null,
  clientLng: number | null,
): (T & { distanceMiles: number | null })[] {
  return caregivers.map((cg) => {
    const cgLat = cg.lat ? Number(cg.lat) : null
    const cgLng = cg.lng ? Number(cg.lng) : null
    const distanceMiles = clientLat && clientLng && cgLat && cgLng
      ? haversineDistance(clientLat, clientLng, cgLat, cgLng)
      : null
    return { ...cg, distanceMiles }
  })
}

export default async function MyCaregiversPage({ searchParams }: PageProps) {
  const session = await requireRole('client')
  const clientId = session.user.id!
  const { tab } = await searchParams
  const activeTab = tab === 'favorites' ? 'favorites' : 'current'

  const [current, favorites, clientLocRow] = await Promise.all([
    getCurrentCaregivers(clientId),
    getFavoriteCaregivers(clientId),
    db.select({ lat: clientLocations.lat, lng: clientLocations.lng })
      .from(clientLocations)
      .where(eq(clientLocations.clientId, clientId))
      .limit(1),
  ])

  const clientLat = clientLocRow[0]?.lat ? Number(clientLocRow[0].lat) : null
  const clientLng = clientLocRow[0]?.lng ? Number(clientLocRow[0].lng) : null

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-1">My Caregivers</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Your current caregivers and the ones you&apos;ve favorited across past, current, and prospective care.
      </p>

      <MyCaregiversTabs
        activeTab={activeTab}
        current={withDistances(current, clientLat, clientLng)}
        favorites={withDistances(favorites, clientLat, clientLng)}
      />
    </div>
  )
}
