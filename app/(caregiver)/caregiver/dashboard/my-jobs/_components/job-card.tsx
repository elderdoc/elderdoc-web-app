'use client'

import { useState } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  active:    'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_CLASSES: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily:    'Daily',
  weekly:   'Weekly',
  biweekly: 'Bi-weekly',
  monthly:  'Monthly',
  as_needed:'As needed',
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

export interface JobCardData {
  id: string
  status: string | null
  createdAt: Date
  title: string
  careType: string
  careTypeLabel: string
  description: string | null
  frequency: string | null
  days: string[] | null
  shiftTimes: string[] | null
  startDate: string | null
  durationHours: number | null
  budgetAmount: string | null
  clientName: string | null
  recipientName: string | null
}

interface Props {
  job: JobCardData
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-4 py-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

export function JobCard({ job }: Props) {
  const [open, setOpen] = useState(false)
  const statusLabel = STATUS_LABELS[job.status ?? 'active'] ?? job.status
  const statusClass = STATUS_CLASSES[job.status ?? 'active'] ?? 'bg-muted text-muted-foreground'
  const daysLabel = job.days?.map((d) => DAY_LABELS[d] ?? d).join(', ')
  const freqLabel = job.frequency ? (FREQUENCY_LABELS[job.frequency] ?? job.frequency) : null
  const rateLabel = job.budgetAmount ? `$${Number(job.budgetAmount).toFixed(0)}/hr` : null
  const durationLabel = job.durationHours ? `${job.durationHours}h / shift` : null

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
        className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-sm mb-1">{job.title}</p>
            {job.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{job.description}</p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {job.clientName && <span>Client: {job.clientName}</span>}
              {job.recipientName && <span>For: {job.recipientName}</span>}
            </div>
          </div>
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full flex flex-col overflow-hidden p-0">
          <div className="flex-1 overflow-y-auto">
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
              <SheetTitle className="text-lg">{job.title}</SheetTitle>
              <SheetDescription className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                  {job.careTypeLabel}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>
                  {statusLabel}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="px-6 py-5 space-y-5">
              {/* People */}
              <div className="grid grid-cols-2 gap-3">
                {job.clientName && <DetailTile label="Client" value={job.clientName} />}
                {job.recipientName && <DetailTile label="Care recipient" value={job.recipientName} />}
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-3">
                {job.startDate && <DetailTile label="Start date" value={new Date(job.startDate).toLocaleDateString()} />}
                {freqLabel && <DetailTile label="Frequency" value={freqLabel} />}
                {daysLabel && <DetailTile label="Days" value={daysLabel} />}
                {job.shiftTimes && job.shiftTimes.length > 0 && (
                  <DetailTile label="Shift times" value={job.shiftTimes.join(', ')} />
                )}
                {durationLabel && <DetailTile label="Duration" value={durationLabel} />}
                {rateLabel && <DetailTile label="Hourly rate" value={rateLabel} />}
              </div>

              {/* Description */}
              {job.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">About this job</p>
                  <p className="text-sm text-foreground leading-relaxed">{job.description}</p>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border bg-background flex gap-2">
            <Link
              href={`/caregiver/dashboard/messages/${job.id}`}
              className="flex-1 py-2.5 rounded-md border border-border text-sm font-medium text-center hover:bg-muted whitespace-nowrap"
            >
              Message Client
            </Link>
            <Link
              href="/caregiver/dashboard/care-plans"
              className="flex-1 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium text-center whitespace-nowrap"
            >
              View Care Plan
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
