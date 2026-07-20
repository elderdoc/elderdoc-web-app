'use client'

import { useState } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { CompleteShiftButton } from './complete-shift-button'

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_CLASSES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

export interface ShiftCardData {
  id: string
  date: string | null
  startTime: string | null
  endTime: string | null
  status: string | null
  title: string | null
  careType: string
  careTypeLabel: string
}

interface Props {
  shift: ShiftCardData
  canComplete?: boolean
}

export function ShiftCard({ shift, canComplete = true }: Props) {
  const [open, setOpen] = useState(false)
  const statusLabel = STATUS_LABELS[shift.status ?? 'scheduled'] ?? shift.status
  const statusClass = STATUS_CLASSES[shift.status ?? 'scheduled'] ?? 'bg-muted text-muted-foreground'
  const displayTitle = shift.title ?? shift.careTypeLabel

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
          <p className="font-medium text-sm mb-1">{displayTitle}</p>
          <p className="text-xs text-muted-foreground">
            {shift.date} · {shift.startTime} – {shift.endTime}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
            {statusLabel}
          </span>
          {shift.status !== 'completed' && canComplete && (
            <div onClick={(e) => e.stopPropagation()}>
              <CompleteShiftButton shiftId={shift.id} />
            </div>
          )}
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full flex flex-col overflow-hidden p-0">
          <div className="flex-1 overflow-y-auto">
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
              <SheetTitle className="text-lg">{displayTitle}</SheetTitle>
              <SheetDescription className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                  {shift.careTypeLabel}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>
                  {statusLabel}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {shift.date && (
                  <div className="rounded-lg bg-muted/50 px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Date</p>
                    <p className="text-sm font-medium">{shift.date}</p>
                  </div>
                )}
                {shift.startTime && shift.endTime && (
                  <div className="rounded-lg bg-muted/50 px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Time</p>
                    <p className="text-sm font-medium">{shift.startTime} – {shift.endTime}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {shift.status !== 'completed' && canComplete && (
            <div className="px-6 py-4 border-t border-border bg-background">
              <CompleteShiftButton shiftId={shift.id} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
