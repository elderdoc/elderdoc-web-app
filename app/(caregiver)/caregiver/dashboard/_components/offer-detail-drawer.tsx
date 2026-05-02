'use client'

import { useState } from 'react'
import {
  Sheet, SheetContent,
} from '@/components/ui/sheet'
import { OfferActions } from './offer-actions'
import { X, MapPin, Clock, Sparkles, ArrowRight } from 'lucide-react'

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

  const scoreData = offer.score != null
    ? offer.score >= 80
      ? { label: 'Strong match', color: 'text-[var(--forest-deep)]', bg: 'bg-[var(--forest-soft)]', ring: 'border-[var(--forest)]', barColor: 'bg-[var(--forest)]' }
      : offer.score >= 60
      ? { label: 'Good match', color: 'text-blue-700', bg: 'bg-blue-50', ring: 'border-blue-400', barColor: 'bg-blue-500' }
      : { label: 'Possible match', color: 'text-amber-700', bg: 'bg-amber-50', ring: 'border-amber-400', barColor: 'bg-amber-500' }
    : null

  return (
    <>
      {/* Card trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
        className="group/offer rounded-[16px] border border-border bg-card p-5 flex items-start justify-between gap-4 hover:border-primary/30 hover:shadow-[0_4px_16px_-8px_rgba(15,20,16,0.12)] transition-all cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            {/* Score ring */}
            {scoreData && offer.score != null && (
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${scoreData.ring} ${scoreData.bg}`}>
                <span className={`text-[13px] font-black tabular-nums leading-none ${scoreData.color}`}>
                  {offer.score}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-[14px] font-semibold leading-snug">{offer.title}</p>
                {scoreData && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${scoreData.bg} ${scoreData.color}`}>
                    {scoreData.label}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center rounded-full bg-[var(--forest-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--forest-deep)]">
                  {offer.careTypeLabel}
                </span>
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{location}
                  </span>
                )}
                {offer.frequency && (
                  <span className="flex items-center gap-1 capitalize">
                    <Clock className="h-3 w-3" />{offer.frequency.replace(/-/g, ' ')}
                  </span>
                )}
              </div>
              {offer.reason && (
                <p className="mt-1.5 text-[12px] text-muted-foreground italic line-clamp-1">&ldquo;{offer.reason}&rdquo;</p>
              )}
            </div>
          </div>
        </div>

        <div
          className="shrink-0 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <OfferActions matchId={offer.matchId} />
        </div>
      </div>

      {/* Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-[440px] w-full flex flex-col overflow-hidden p-0 gap-0 border-l border-border">
          {/* Header banner */}
          <div
            className="relative shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a3d2b 0%, #2d6b48 50%, #163322 100%)' }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative px-6 pt-10 pb-7">
              <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-medium text-white/90 mb-3">
                {offer.careTypeLabel}
              </span>
              <h2 className="text-[20px] font-semibold text-white leading-snug tracking-[-0.02em]">{offer.title}</h2>
              <div className="mt-2 flex flex-wrap gap-3 text-[12.5px] text-white/70">
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />{location}
                  </span>
                )}
                {offer.frequency && (
                  <span className="flex items-center gap-1.5 capitalize">
                    <Clock className="h-3.5 w-3.5" />{offer.frequency.replace(/-/g, ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6 space-y-6">

              {/* Match score */}
              {offer.score != null && scoreData && (
                <div className={`rounded-[14px] border-2 ${scoreData.ring} ${scoreData.bg} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className={`h-4 w-4 ${scoreData.color}`} />
                      <p className={`text-[13px] font-semibold ${scoreData.color}`}>Match Score</p>
                    </div>
                    <p className={`text-[28px] font-black tabular-nums leading-none ${scoreData.color}`}>
                      {offer.score}<span className="text-[16px] font-bold">%</span>
                    </p>
                  </div>
                  {/* Score bar */}
                  <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${scoreData.barColor} transition-all`}
                      style={{ width: `${offer.score}%` }}
                    />
                  </div>
                  <p className={`text-[12px] mt-1.5 ${scoreData.color} opacity-70`}>{scoreData.label}</p>
                </div>
              )}

              {/* Why matched */}
              {offer.reason && (
                <div className="rounded-[14px] border border-border bg-muted/20 p-4">
                  <p className="text-[12.5px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Why you were matched</p>
                  <p className="text-[13.5px] text-foreground/80 leading-relaxed">{offer.reason}</p>
                </div>
              )}

              {/* CTA hint */}
              <div className="rounded-[14px] bg-[var(--forest-soft)]/40 border border-[var(--forest-soft)] p-4 flex items-center gap-3">
                <ArrowRight className="h-4 w-4 text-[var(--forest-deep)] shrink-0" />
                <p className="text-[13px] text-[var(--forest-deep)] leading-snug">
                  Accept this offer to get started — the family is waiting to connect with you.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-border bg-card">
            <OfferActions matchId={offer.matchId} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
