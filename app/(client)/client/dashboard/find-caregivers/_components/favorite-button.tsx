'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { toggleFavoriteCaregiver } from '@/domains/clients/favorites'
import { useAppToast } from '@/components/toast'

export function FavoriteButton({
  caregiverId,
  initialFavorited,
  caregiverName,
  size = 'md',
}: {
  caregiverId: string
  initialFavorited: boolean
  caregiverName?: string
  size?: 'sm' | 'md'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [favorited, setFavorited] = useState(initialFavorited)
  const t = useAppToast()

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const boxSize  = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        startTransition(async () => {
          const result = await toggleFavoriteCaregiver(caregiverId)
          if (result.error) { t.error(result.error); return }
          setFavorited(result.favorited)
          if (result.favorited) t.favoriteAdded(caregiverName)
          else t.favoriteRemoved(caregiverName)
          router.refresh()
        })
      }}
      disabled={isPending}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      className={`inline-flex items-center justify-center ${boxSize} rounded-md border border-border hover:bg-muted transition-colors shrink-0`}
    >
      <Heart className={`${iconSize} ${favorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
    </button>
  )
}
