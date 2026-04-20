import { requireRole } from '@/domains/auth/session'
import { getCurrentCaregivers, getFavoriteCaregivers } from '@/domains/clients/favorites'
import { MyCaregiversTabs } from './_components/my-caregivers-tabs'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function MyCaregiversPage({ searchParams }: PageProps) {
  const session = await requireRole('client')
  const clientId = session.user.id!
  const { tab } = await searchParams
  const activeTab = tab === 'favorites' ? 'favorites' : 'current'

  const [current, favorites] = await Promise.all([
    getCurrentCaregivers(clientId),
    getFavoriteCaregivers(clientId),
  ])

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-1">My Caregivers</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Your current caregivers and the ones you&apos;ve favorited across past, current, and prospective care.
      </p>

      <MyCaregiversTabs
        activeTab={activeTab}
        current={current}
        favorites={favorites}
      />
    </div>
  )
}
