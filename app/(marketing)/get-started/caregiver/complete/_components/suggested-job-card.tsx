'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { applyToRequest } from '@/domains/caregivers/actions'
import {
  Sheet, SheetContent, SheetHeader, SheetFooter,
  SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import type { MatchedJob } from '@/domains/matching/match-jobs'
import { CARE_TYPES } from '@/lib/constants'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((c) => [c.key, c.label]))

interface Props {
  job: MatchedJob
  rank: number
}

export function SuggestedJobCard({ job, rank }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [coverNote, setCoverNote] = useState('')
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const location = [job.city, job.state].filter(Boolean).join(', ')
  const title = job.title ?? `${CARE_TYPE_LABELS[job.careType] ?? job.careType} Request`
  const scoreColor = job.score >= 80 ? 'text-green-700 bg-green-50' : job.score >= 60 ? 'text-blue-700 bg-blue-50' : 'text-muted-foreground bg-muted'

  function handleApply() {
    if (!coverNote.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await applyToRequest(job.requestId, coverNote.trim())
        setApplied(true)
        setOpen(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <>
      <div className={`rounded-xl border bg-white p-5 transition-all ${applied ? 'border-green-200 bg-green-50/40 opacity-70' : 'border-border hover:border-primary/30 hover:shadow-sm'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {/* Rank badge */}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {rank}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="font-semibold text-sm">{title}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreColor}`}>
                  {job.score}% match
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>{CARE_TYPE_LABELS[job.careType] ?? job.careType}</span>
                {location && <span>{location}</span>}
                {job.frequency && <span className="capitalize">{job.frequency.replace(/-/g, ' ')}</span>}
                {job.budgetAmount && (
                  <span className="font-medium text-foreground">
                    ${job.budgetAmount}{job.budgetType === 'hourly' ? '/hr' : ''}
                  </span>
                )}
              </div>
              {job.reason && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic">&ldquo;{job.reason}&rdquo;</p>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {applied ? (
              <span className="text-xs text-green-700 font-medium">Applied ✓</span>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap hover:bg-primary/90 transition-colors"
              >
                Apply
              </button>
            )}
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full flex flex-col overflow-hidden p-0">
          <div className="flex-1 overflow-y-auto">
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
              <SheetTitle className="text-lg">{title}</SheetTitle>
              <SheetDescription className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                  {CARE_TYPE_LABELS[job.careType] ?? job.careType}
                </span>
                {location && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs">{location}</span>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="px-6 py-5 space-y-5">
              <div className={`rounded-lg px-4 py-3 ${scoreColor}`}>
                <p className="text-xs font-medium mb-0.5">Match Score</p>
                <p className="text-2xl font-bold">{job.score}%</p>
                {job.reason && <p className="text-xs mt-1 leading-relaxed">{job.reason}</p>}
              </div>

              {job.budgetAmount && (
                <div className="rounded-lg bg-muted/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Pay Rate</p>
                  <p className="text-sm font-medium">
                    ${job.budgetAmount}{job.budgetType === 'hourly' ? '/hr' : ''}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Cover note <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  maxLength={500}
                  rows={5}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Introduce yourself and explain why you're a great fit…"
                />
                <p className="text-right text-xs text-muted-foreground mt-1">{coverNote.length}/500</p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border bg-background">
            <button
              type="button"
              onClick={handleApply}
              disabled={isPending || !coverNote.trim()}
              className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-opacity"
            >
              {isPending ? 'Submitting…' : 'Submit Application'}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
