'use client'

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
  distanceMiles?: number | null
  hourlyMin: string | null
  hourlyMax: string | null
  experience?: string | null
  matchScore?: number
  matchReason?: string
}

interface CaregiverCardProps {
  caregiver: CaregiverPreview
  rank?: number
  onSendOffer?: () => void
  className?: string
}

export function CaregiverCard({ caregiver, rank, onSendOffer, className }: CaregiverCardProps) {
  const initials = caregiver.name
    ? caregiver.name.split(' ').filter(Boolean).map(n => n[0].toUpperCase()).slice(0, 2).join('')
    : '?'

  const careTypeLabels = caregiver.careTypes.map(
    key => CARE_TYPES.find(ct => ct.key === key)?.label ?? key
  )

  const score = caregiver.matchScore ?? null

  return (
    <div className={cn('rounded-[12px] border border-border bg-card p-5', className)}>
      <div className="flex gap-4">
        {/* Avatar + rank */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {caregiver.image ? (
                <img src={caregiver.image} alt={caregiver.name ?? ''} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {rank !== undefined && (
              <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {rank}
              </span>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-[15px] font-semibold text-foreground">
                {caregiver.name ?? 'Anonymous Caregiver'}
              </p>
              {caregiver.headline && (
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                  {caregiver.headline}
                </p>
              )}
            </div>

            {/* Match score */}
            {score !== null && (
              <div className="flex items-center gap-1 shrink-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={cn('h-4 w-4', i < score ? 'text-primary' : 'text-muted-foreground/30')}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-1 text-xs font-medium text-muted-foreground">{score}/5</span>
              </div>
            )}
          </div>

          {/* Match reason */}
          {caregiver.matchReason && (
            <p className="mt-2 text-xs text-primary/80 font-medium">
              ✓ {caregiver.matchReason}
            </p>
          )}

          {/* Details row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {caregiver.distanceMiles != null ? (
              <span>📍 {caregiver.distanceMiles < 1 ? '<1 mi' : `${Math.round(caregiver.distanceMiles)} mi`} away</span>
            ) : caregiver.city && caregiver.state ? (
              <span>📍 {caregiver.city}, {caregiver.state}</span>
            ) : null}
            {caregiver.experience && (
              <span>🕐 {caregiver.experience}</span>
            )}
            {caregiver.hourlyMin && caregiver.hourlyMax && (
              <span className="font-semibold text-foreground">
                ${Number(caregiver.hourlyMin).toFixed(0)}–${Number(caregiver.hourlyMax).toFixed(0)}/hr
              </span>
            )}
          </div>

          {/* Care type tags */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {careTypeLabels.slice(0, 4).map(label => (
              <span key={label} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {label}
              </span>
            ))}
            {careTypeLabels.length > 4 && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                +{careTypeLabels.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onSendOffer}
            className="rounded-[8px] bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 whitespace-nowrap"
          >
            Send Offer
          </button>
        </div>
      </div>
    </div>
  )
}
