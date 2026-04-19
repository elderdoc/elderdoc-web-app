'use client'

import { useState } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { OfferActions } from './offer-actions'

export interface OfferDetail {
  matchId: string
  score: number | null
  reason: string | null
  title: string
  careType: string
  careTypeLabel: string
  frequency: string | null
  city: string | null
  state: string | null
}

interface Props {
  offer: OfferDetail
}

export function OfferDetailDrawer({ offer }: Props) {
  const [open, setOpen] = useState(false)
  const location = [offer.city, offer.state].filter(Boolean).join(', ')
  const scoreLabel = offer.score != null
    ? (offer.score >= 80 ? 'Strong match' : offer.score >= 60 ? 'Good match' : 'Possible match')
    : null

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
        className="rounded-xl border border-border bg-card p-5 flex items-start justify-between gap-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm">{offer.title}</p>
            {scoreLabel && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {scoreLabel}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
            <span>{offer.careTypeLabel}</span>
            {location && <span>{location}</span>}
            {offer.frequency && <span className="capitalize">{offer.frequency.replace(/-/g, ' ')}</span>}
          </div>
          {offer.reason && (
            <p className="text-xs text-muted-foreground italic line-clamp-1">&ldquo;{offer.reason}&rdquo;</p>
          )}
        </div>
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <OfferActions matchId={offer.matchId} />
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full flex flex-col overflow-hidden p-0">
          <div className="flex-1 overflow-y-auto">
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
              <SheetTitle className="text-lg">{offer.title}</SheetTitle>
              <SheetDescription className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                  {offer.careTypeLabel}
                </span>
                {location && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs">
                    {location}
                  </span>
                )}
                {offer.frequency && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs capitalize">
                    {offer.frequency.replace(/-/g, ' ')}
                  </span>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="px-6 py-5 space-y-5">
              {offer.score != null && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Match Score</p>
                  <p className="text-2xl font-bold text-primary">{offer.score}%</p>
                  {scoreLabel && <p className="text-xs text-primary/70 mt-0.5">{scoreLabel}</p>}
                </div>
              )}

              {offer.reason && (
                <div>
                  <p className="text-sm font-medium mb-1.5">Why you were matched</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{offer.reason}</p>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border bg-background">
            <OfferActions matchId={offer.matchId} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
