'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CaregiverCard } from '@/components/caregiver-card'
import { toggleFavoriteCaregiver } from '@/domains/clients/favorites'
import type { MyCaregiverCard } from '@/domains/clients/favorites'

type Tab = 'current' | 'favorites'

interface Props {
  activeTab: Tab
  current:   MyCaregiverCard[]
  favorites: MyCaregiverCard[]
}

function StatusBadge({ status }: { status: MyCaregiverCard['jobStatus'] }) {
  if (status === 'active') return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Current</span>
  )
  if (status === 'completed') return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Past</span>
  )
  if (status === 'cancelled') return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Cancelled</span>
  )
  return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Prospective</span>
}

function MyCaregiverCardItem({ cg }: { cg: MyCaregiverCard }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <CaregiverCard
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
        rating:       cg.rating,
      }}
      statusBadge={<StatusBadge status={cg.jobStatus} />}
      viewProfileHref={`/client/dashboard/find-caregivers/${cg.caregiverId}`}
      isFavorited={cg.isFavorited}
      favoriteIsPending={isPending}
      onToggleFavorite={() => {
        startTransition(async () => {
          await toggleFavoriteCaregiver(cg.caregiverId)
          router.refresh()
        })
      }}
    />
  )
}

function CardGrid({ items }: { items: MyCaregiverCard[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No caregivers to show yet.</p>
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((cg) => (
        <MyCaregiverCardItem key={cg.caregiverId} cg={cg} />
      ))}
    </div>
  )
}

export function MyCaregiversTabs({ activeTab, current, favorites }: Props) {
  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-6">
        <Link
          href="/client/dashboard/my-caregivers?tab=current"
          className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
            activeTab === 'current'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Current caregivers
          <span className="ml-2 text-xs text-muted-foreground">{current.length}</span>
        </Link>
        <Link
          href="/client/dashboard/my-caregivers?tab=favorites"
          className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
            activeTab === 'favorites'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Favorite caregivers
          <span className="ml-2 text-xs text-muted-foreground">{favorites.length}</span>
        </Link>
      </div>

      {activeTab === 'current' ? <CardGrid items={current} /> : <CardGrid items={favorites} />}
    </div>
  )
}
