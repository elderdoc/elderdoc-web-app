'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CaregiverCard } from '@/components/caregiver-card'
import type { CaregiverPreview } from '@/components/caregiver-card'
import { toggleFavoriteCaregiver } from '@/domains/clients/favorites'
import { SendOfferModal } from './send-offer-modal'

interface Props {
  caregiver: CaregiverPreview
  activeRequests: { id: string; title: string | null; careType: string }[]
  isFavorited: boolean
  alreadyOffered: boolean
  statusBadge?: React.ReactNode
  rank?: number
}

export function FindCaregiverCard({
  caregiver,
  activeRequests,
  isFavorited: initialFavorited,
  alreadyOffered,
  statusBadge,
  rank,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [favorited, setFavorited] = useState(initialFavorited)

  return (
    <CaregiverCard
      caregiver={caregiver}
      rank={rank}
      statusBadge={statusBadge}
      viewProfileHref={`/client/dashboard/find-caregivers/${caregiver.id}`}
      isFavorited={favorited}
      favoriteIsPending={isPending}
      onToggleFavorite={() => {
        startTransition(async () => {
          const result = await toggleFavoriteCaregiver(caregiver.id)
          if (!result.error) {
            setFavorited(result.favorited)
            router.refresh()
          }
        })
      }}
      sendOfferNode={
        <SendOfferModal
          caregiverId={caregiver.id}
          activeRequests={activeRequests}
          alreadyOffered={alreadyOffered}
        />
      }
    />
  )
}
