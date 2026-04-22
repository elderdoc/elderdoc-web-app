'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { applyToRequest } from '@/domains/caregivers/actions'
import {
  Sheet, SheetContent, SheetHeader, SheetFooter,
  SheetTitle, SheetDescription,
} from '@/components/ui/sheet'

export interface JobDetail {
  id: string
  title: string
  careType: string
  careTypeLabel: string
  description: string | null
  frequency: string | null
  schedule: Array<{ day: string; startTime: string; endTime: string }> | null
  startDate: string | null
  budgetType: string | null
  budgetAmount: string | null
  genderPref: string | null
  languagePref: string[] | null
  city: string | null
  state: string | null
  address1: string | null
  distanceMiles?: number | null
  clientName: string | null
  recipientName: string | null
  recipientConditions: string[] | null
  recipientMobilityLevel: string | null
  createdAt: Date | null
  score?: number | null
  reason?: string | null
}

interface Props {
  job: JobDetail
  trigger: React.ReactNode
  onApplied?: () => void
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-4 py-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

export function JobDetailDrawer({ job, trigger, onApplied }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [coverNote, setCoverNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const distanceLabel = job.distanceMiles != null
    ? `${job.distanceMiles} miles away`
    : [job.city, job.state].filter(Boolean).join(', ')

  const scoreColor = job.score != null
    ? job.score >= 80 ? 'text-green-700 bg-green-50 border-green-200'
    : job.score >= 60 ? 'text-blue-700 bg-blue-50 border-blue-200'
    : 'text-muted-foreground bg-muted border-border'
    : null

  function handleSubmit() {
    if (!coverNote.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await applyToRequest(job.id, coverNote.trim())
        setOpen(false)
        setCoverNote('')
        onApplied?.()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>

      <SheetContent side="right" className="sm:max-w-2xl w-full flex flex-col overflow-hidden p-0">
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="text-xl leading-snug">{job.title}</SheetTitle>
            <SheetDescription>
              <span className="flex flex-wrap gap-2 mt-2 not-italic">
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                  {job.careTypeLabel}
                </span>
                {distanceLabel && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs">
                    {distanceLabel}
                  </span>
                )}
                {job.frequency && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs capitalize">
                    {job.frequency.replace(/-/g, ' ')}
                  </span>
                )}
              </span>
            </SheetDescription>
          </SheetHeader>

          <div className="px-6 py-5 space-y-6">
            {/* Match score + reason */}
            {job.score != null && scoreColor && (
              <div className={`rounded-lg border px-4 py-3 ${scoreColor}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide">Match Score</p>
                  <p className="text-xl font-bold">{job.score}%</p>
                </div>
                {job.reason && <p className="text-xs leading-relaxed">{job.reason}</p>}
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">About this role</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{job.description}</p>
              </div>
            )}

            {/* Key details */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Details</p>
              <div className="grid grid-cols-2 gap-3">
                {job.budgetAmount && (
                  <Tile
                    label="Pay Rate"
                    value={`$${job.budgetAmount}${job.budgetType === 'hourly' ? '/hr' : job.budgetType === 'daily' ? '/day' : ''}`}
                  />
                )}
                {job.startDate && <Tile label="Start Date" value={job.startDate} />}
                {job.frequency && (
                  <Tile label="Frequency" value={job.frequency.replace(/-/g, ' ')} />
                )}
                {job.schedule && job.schedule.length > 0 && (
                  <Tile label="Sessions / week" value={String(job.schedule.length)} />
                )}
                {job.genderPref && job.genderPref !== 'no-preference' && (
                  <Tile label="Caregiver Gender Pref." value={job.genderPref.charAt(0).toUpperCase() + job.genderPref.slice(1)} />
                )}
                {job.clientName && <Tile label="Posted by" value={job.clientName} />}
                {job.createdAt && <Tile label="Posted" value={job.createdAt.toLocaleDateString()} />}
              </div>
            </div>

            {/* Schedule */}
            {job.schedule && job.schedule.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Schedule</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.schedule.map((entry, i) => (
                    <span key={i} className="rounded-md bg-muted px-2.5 py-1 text-xs capitalize font-medium">
                      {entry.day} &nbsp;{entry.startTime}–{entry.endTime}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            {(job.address1 || job.city || job.state) && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Location</p>
                <p className="text-sm text-foreground">
                  {[job.address1, job.city, job.state].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {/* Language preferences */}
            {job.languagePref && job.languagePref.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Language Preference</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.languagePref.map((l) => (
                    <span key={l} className="rounded-md bg-muted px-2.5 py-1 text-xs capitalize">{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Care Recipient */}
            {job.recipientName && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Care Recipient</p>
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-2">
                  <p className="text-sm font-semibold">{job.recipientName}</p>
                  {job.recipientMobilityLevel && (
                    <p className="text-xs text-muted-foreground capitalize">
                      Mobility: {job.recipientMobilityLevel.replace(/-/g, ' ')}
                    </p>
                  )}
                  {job.recipientConditions && job.recipientConditions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.recipientConditions.map((c) => (
                        <span key={c} className="rounded-md bg-background border border-border px-2 py-0.5 text-xs capitalize">
                          {c.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cover note */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Your cover note <span className="text-destructive">*</span>
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

        {/* Fixed footer */}
        <SheetFooter className="px-6 py-4 border-t border-border bg-background">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !coverNote.trim()}
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-opacity"
          >
            {isPending ? 'Submitting…' : 'Submit Application'}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
