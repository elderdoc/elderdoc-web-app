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
  days: string[] | null
  shifts: string[] | null
  durationHours: number | null
  startDate: string | null
  budgetType: string | null
  budgetAmount: string | null
  genderPref: string | null
  languagePref: string[] | null
  city: string | null
  state: string | null
  address1: string | null
  clientName: string | null
  recipientName: string | null
  recipientConditions: string[] | null
  recipientMobilityLevel: string | null
  createdAt: Date
}

interface Props {
  job: JobDetail
  trigger: React.ReactNode
}

export function JobDetailDrawer({ job, trigger }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [coverNote, setCoverNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const location = [job.address1, job.city, job.state].filter(Boolean).join(', ')

  function handleSubmit() {
    if (!coverNote.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await applyToRequest(job.id, coverNote.trim())
        setOpen(false)
        setCoverNote('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>

      <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col overflow-hidden p-0">
        <div className="flex-1 overflow-y-auto">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="text-lg">{job.title}</SheetTitle>
            <SheetDescription className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                {job.careTypeLabel}
              </span>
              {location && (
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs">
                  {location}
                </span>
              )}
              {job.frequency && (
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs capitalize">
                  {job.frequency.replace(/-/g, ' ')}
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="px-6 py-5 space-y-6">
            {/* Key details grid */}
            <div className="grid grid-cols-2 gap-3">
              {job.startDate && (
                <div className="rounded-lg bg-muted/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Start Date</p>
                  <p className="text-sm font-medium">{job.startDate}</p>
                </div>
              )}
              {job.durationHours && (
                <div className="rounded-lg bg-muted/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                  <p className="text-sm font-medium">{job.durationHours}h / visit</p>
                </div>
              )}
              {job.budgetAmount && (
                <div className="rounded-lg bg-muted/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Pay Rate</p>
                  <p className="text-sm font-medium">
                    ${job.budgetAmount}{job.budgetType === 'hourly' ? '/hr' : job.budgetType === 'daily' ? '/day' : ''}
                  </p>
                </div>
              )}
              {job.genderPref && (
                <div className="rounded-lg bg-muted/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Caregiver Gender Pref.</p>
                  <p className="text-sm font-medium capitalize">{job.genderPref}</p>
                </div>
              )}
              {job.clientName && (
                <div className="rounded-lg bg-muted/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Posted by</p>
                  <p className="text-sm font-medium">{job.clientName}</p>
                </div>
              )}
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Posted</p>
                <p className="text-sm font-medium">{job.createdAt.toLocaleDateString()}</p>
              </div>
            </div>

            {/* Schedule */}
            {(job.days?.length || job.shifts?.length) ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Schedule</p>
                {job.days && job.days.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Days</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.days.map((d) => (
                        <span key={d} className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {job.shifts && job.shifts.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Shifts</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.shifts.map((s) => (
                        <span key={s} className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{s.replace(/-/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Language preferences */}
            {job.languagePref && job.languagePref.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1.5">Language Preference</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.languagePref.map((l) => (
                    <span key={l} className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Care Recipient */}
            {job.recipientName && (
              <div>
                <p className="text-sm font-semibold mb-2">Care Recipient</p>
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-2">
                  <p className="text-sm font-medium">{job.recipientName}</p>
                  {job.recipientConditions && job.recipientConditions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.recipientConditions.map((c) => (
                        <span key={c} className="rounded bg-background border border-border px-1.5 py-0.5 text-xs capitalize">
                          {c.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  {job.recipientMobilityLevel && (
                    <p className="text-xs text-muted-foreground capitalize">
                      Mobility: {job.recipientMobilityLevel.replace(/-/g, ' ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div>
                <p className="text-sm font-semibold mb-1.5">About this role</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{job.description}</p>
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
