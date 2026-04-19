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

export interface JobCardData {
  id: string
  status: string | null
  createdAt: Date
  title: string
  careType: string
  careTypeLabel: string
  clientName: string | null
}

interface Props {
  job: JobCardData
}

export function JobCard({ job }: Props) {
  const [open, setOpen] = useState(false)
  const statusLabel = STATUS_LABELS[job.status ?? 'active'] ?? job.status
  const statusClass = STATUS_CLASSES[job.status ?? 'active'] ?? 'bg-muted text-muted-foreground'

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
        className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
      >
        <div className="min-w-0">
          <p className="font-medium text-sm mb-1">{job.title}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{job.careTypeLabel}</span>
            {job.clientName && <span>Client: {job.clientName}</span>}
            <span>Started {job.createdAt.toLocaleDateString()}</span>
          </div>
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
          {statusLabel}
        </span>
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

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {job.clientName && (
                  <div className="rounded-lg bg-muted/50 px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Client</p>
                    <p className="text-sm font-medium">{job.clientName}</p>
                  </div>
                )}
                <div className="rounded-lg bg-muted/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Started</p>
                  <p className="text-sm font-medium">{job.createdAt.toLocaleDateString()}</p>
                </div>
              </div>
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
