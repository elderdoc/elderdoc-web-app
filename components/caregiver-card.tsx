'use client'

import Link from 'next/link'
import { Heart, MapPin, Clock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CARE_TYPES } from '@/lib/constants'

export interface CaregiverPreview {
  id: string
  name: string | null
  image: string | null
  headline: string | null
  careTypes: string[]
  city: string | null
  state: string | null
  lat?: number | null
  lng?: number | null
  distanceMiles?: number | null
  hourlyMin: string | null
  hourlyMax: string | null
  experience?: string | null
  rating?: string | number | null
  matchScore?: number
  matchReason?: string
}

interface CaregiverCardProps {
  caregiver: CaregiverPreview
  rank?: number
  onSendOffer?: () => void
  viewProfileHref?: string
  isFavorited?: boolean
  onToggleFavorite?: () => void
  favoriteIsPending?: boolean
  statusBadge?: React.ReactNode
  sendOfferNode?: React.ReactNode
  unauthenticatedOfferLabel?: string
  className?: string
}

export function CaregiverCard({
  caregiver, rank, onSendOffer, viewProfileHref, isFavorited, onToggleFavorite,
  favoriteIsPending, statusBadge, sendOfferNode, unauthenticatedOfferLabel, className,
}: CaregiverCardProps) {
  const initials = caregiver.name
    ? caregiver.name.split(' ').filter(Boolean).map(n => n[0].toUpperCase()).slice(0, 2).join('')
    : '?'

  const careTypeLabels = caregiver.careTypes.map(
    key => CARE_TYPES.find(ct => ct.key === key)?.label ?? key
  )

  const score = caregiver.matchScore ?? null
  const hasActions = onToggleFavorite !== undefined || viewProfileHref || sendOfferNode || onSendOffer

  return (
    <div className={cn(
      'group/cg rounded-[16px] border border-border bg-card overflow-hidden transition-all',
      'hover:border-foreground/15 hover:shadow-[0_8px_28px_-12px_rgba(15,20,16,0.12)]',
      className
    )}>
      {/* Optional rank ribbon */}
      {rank !== undefined && (
        <div className="flex items-center gap-2 px-5 pt-4 -mb-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--forest-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--forest-deep)] tabular-nums">
            <span className="opacity-60">#</span>{rank}
            <span className="text-[10px] opacity-70 font-medium">match</span>
          </span>
          {score !== null && (
            <span className="inline-flex items-center gap-1 text-[12px] text-foreground/70">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-semibold tabular-nums">{score}/5</span>
            </span>
          )}
        </div>
      )}

      <div className="p-5">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-14 w-14 overflow-hidden rounded-full ring-2 ring-card shadow-[0_2px_8px_-2px_rgba(15,20,16,0.1)]">
              {caregiver.image ? (
                <img src={caregiver.image} alt={caregiver.name ?? ''} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--forest-soft)] text-[14px] font-semibold text-[var(--forest-deep)]">
                  {initials}
                </div>
              )}
            </div>
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[16px] font-semibold tracking-[-0.01em] truncate">
                    {caregiver.name ?? 'Caregiver'}
                  </h3>
                  {caregiver.rating != null && rank === undefined && (
                    <span className="inline-flex items-center gap-0.5 text-[12px] text-foreground/70 shrink-0">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{Number(caregiver.rating).toFixed(1)}</span>
                    </span>
                  )}
                  {statusBadge}
                </div>
                {caregiver.headline && (
                  <p className="mt-0.5 text-[13.5px] text-muted-foreground line-clamp-1">
                    {caregiver.headline}
                  </p>
                )}
              </div>

              {/* Rate */}
              {caregiver.hourlyMin && caregiver.hourlyMax && (
                <div className="shrink-0 text-right">
                  <div className="text-[15px] font-semibold tabular-nums tracking-tight text-foreground">
                    ${Number(caregiver.hourlyMin).toFixed(0)}–${Number(caregiver.hourlyMax).toFixed(0)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">per hour</div>
                </div>
              )}
            </div>

            {/* Match reason */}
            {caregiver.matchReason && (
              <div className="mt-3">
                <span className="inline-flex items-start gap-1.5 rounded-full bg-[var(--forest-soft)]/70 px-2.5 py-1 text-[12.5px] text-[var(--forest-deep)]">
                  <span className="shrink-0">✓</span>
                  <span>{caregiver.matchReason}</span>
                </span>
              </div>
            )}

            {/* Details */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-muted-foreground">
              {caregiver.distanceMiles != null && (
                <span className="inline-flex items-center gap-1" title="Distance from your address">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {caregiver.distanceMiles < 1 ? '<1 mi' : `${Math.round(caregiver.distanceMiles)} mi`} away
                </span>
              )}
              {caregiver.experience && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  {caregiver.experience}
                </span>
              )}
            </div>

            {/* Care type tags */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {careTypeLabels.slice(0, 4).map(label => (
                <span key={label} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11.5px] text-foreground/80">
                  {label}
                </span>
              ))}
              {careTypeLabels.length > 4 && (
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11.5px] text-muted-foreground">
                  +{careTypeLabels.length - 4}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {hasActions && (
        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-[var(--cream-deep)]/40 border-t border-border/60">
          {onToggleFavorite !== undefined && (
            <button
              type="button"
              onClick={onToggleFavorite}
              disabled={favoriteIsPending}
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-card hover:bg-muted transition-colors"
            >
              <Heart className={cn('h-4 w-4', isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
            </button>
          )}
          {viewProfileHref && (
            <Link
              href={viewProfileHref}
              className="inline-flex items-center h-9 rounded-full border border-border bg-card px-4 text-[13px] font-medium hover:border-foreground/30 hover:bg-muted transition-colors whitespace-nowrap"
            >
              View profile
            </Link>
          )}
          {sendOfferNode ?? (onSendOffer ? (
            <button
              type="button"
              onClick={onSendOffer}
              className="inline-flex items-center gap-1.5 h-9 rounded-full bg-primary px-5 text-[13px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all whitespace-nowrap"
            >
              {unauthenticatedOfferLabel ?? 'Send offer'}
            </button>
          ) : null)}
        </div>
      )}
    </div>
  )
}
