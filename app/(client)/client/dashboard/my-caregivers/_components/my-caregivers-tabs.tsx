'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { CARE_TYPES } from '@/lib/constants'
import { toggleFavoriteCaregiver } from '@/domains/clients/favorites'
import type { MyCaregiverCard } from '@/domains/clients/favorites'

type Tab = 'current' | 'favorites'

interface Props {
  activeTab: Tab
  current:   MyCaregiverCard[]
  favorites: MyCaregiverCard[]
}

function CareTypeLabel(key: string): string {
  return CARE_TYPES.find((c) => c.key === key)?.label ?? key
}

function StatusBadge({ status }: { status: MyCaregiverCard['jobStatus'] }) {
  if (status === 'active') {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Current</span>
  }
  if (status === 'completed') {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Past</span>
  }
  if (status === 'cancelled') {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Cancelled</span>
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Prospective</span>
}

function FavoriteButton({ caregiverId, favorited }: { caregiverId: string; favorited: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        startTransition(async () => {
          await toggleFavoriteCaregiver(caregiverId)
          router.refresh()
        })
      }}
      disabled={isPending}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border hover:bg-muted transition-colors"
    >
      <Heart className={`h-4 w-4 ${favorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
    </button>
  )
}

function CardGrid({ items }: { items: MyCaregiverCard[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No caregivers to show yet.</p>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((cg) => (
        <div key={cg.caregiverId} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start gap-3">
            {cg.image ? (
              <img src={cg.image} alt={cg.name ?? ''} className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                {(cg.name ?? '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm truncate">{cg.name}</p>
                {cg.rating && (
                  <span className="flex items-center gap-0.5 text-xs text-amber-500 shrink-0">
                    ★ {Number(cg.rating).toFixed(1)}
                  </span>
                )}
              </div>
              {cg.distanceMiles != null ? (
                <p className="text-xs text-muted-foreground truncate">
                  📍 {cg.distanceMiles < 1 ? '<1 mi' : `${Math.round(cg.distanceMiles)} mi`} away
                </p>
              ) : [cg.city, cg.state].filter(Boolean).length > 0 ? (
                <p className="text-xs text-muted-foreground truncate">
                  {[cg.city, cg.state].filter(Boolean).join(', ')}
                </p>
              ) : null}
            </div>
            <FavoriteButton caregiverId={cg.caregiverId} favorited={cg.isFavorited} />
          </div>

          {cg.headline && <p className="text-xs text-muted-foreground line-clamp-2">{cg.headline}</p>}

          {cg.careTypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {cg.careTypes.map((ct) => (
                <span key={ct} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {CareTypeLabel(ct)}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={cg.jobStatus} />
            <Link
              href={`/client/dashboard/find-caregivers/${cg.caregiverId}`}
              className="text-xs px-3 py-1.5 rounded-md border border-border font-medium hover:bg-muted transition-colors"
            >
              View Profile
            </Link>
          </div>
        </div>
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
