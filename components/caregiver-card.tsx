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
  hourlyMin: string | null
  hourlyMax: string | null
}

interface CaregiverCardProps {
  caregiver: CaregiverPreview
  onSendOffer?: () => void
  className?: string
}

export function CaregiverCard({ caregiver, onSendOffer, className }: CaregiverCardProps) {
  const initials = caregiver.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  const careTypeLabels = caregiver.careTypes.map(
    key => CARE_TYPES.find(ct => ct.key === key)?.label ?? key
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-[12px] border border-border bg-card p-6',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {caregiver.image ? (
            <img src={caregiver.image} alt={caregiver.name ?? 'Caregiver'} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-foreground">
            {caregiver.name ?? 'Anonymous Caregiver'}
          </p>
          {caregiver.headline && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {caregiver.headline}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {careTypeLabels.slice(0, 3).map(label => (
          <span key={label} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground">
            {label}
          </span>
        ))}
        {careTypeLabels.length > 3 && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground">
            +{careTypeLabels.length - 3} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {caregiver.city && caregiver.state
            ? `${caregiver.city}, ${caregiver.state}`
            : 'Location not set'}
        </span>
        {caregiver.hourlyMin && caregiver.hourlyMax && (
          <span className="font-medium text-foreground">
            ${caregiver.hourlyMin}–${caregiver.hourlyMax}/hr
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onSendOffer}
        className="w-full rounded-[8px] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Send Offer
      </button>
    </div>
  )
}
