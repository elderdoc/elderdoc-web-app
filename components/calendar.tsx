'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  isSameDay,
  isToday,
} from 'date-fns'
import { SelectField } from '@/components/select-field'
import { TimeDropdown } from '@/components/ui/time-dropdown'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Plus } from 'lucide-react'

export type CalendarEvent = {
  id: string
  date: string
  label: string
  status: string
  jobId: string
  startTime: string
  endTime: string
}

export type ActiveJob = {
  jobId: string
  label: string
}

type Props = {
  year: number
  month: number
  events: CalendarEvent[]
  activeJobs: ActiveJob[]
  basePath: string
  addShiftAction?: (jobId: string, date: string, startTime: string, endTime: string) => Promise<{ error?: string }>
  editShiftAction?: (shiftId: string, date: string, startTime: string, endTime: string) => Promise<{ error?: string }>
  cancelShiftAction?: (shiftId: string) => Promise<{ error?: string; lateCancellation?: boolean }>
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SHIFT_STATUS_CLASSES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

export function Calendar({ year, month, events, activeJobs, basePath, addShiftAction, editShiftAction, cancelShiftAction }: Props) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [formJobId, setFormJobId] = useState(activeJobs[0]?.jobId ?? '')
  const [formStart, setFormStart] = useState('09:00')
  const [formEnd, setFormEnd] = useState('17:00')
  const [increment, setIncrement] = useState<15 | 30 | 60>(30)
  const [editIncrement, setEditIncrement] = useState<15 | 30 | 60>(30)

  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('09:00')
  const [editEnd, setEditEnd] = useState('17:00')
  const [editError, setEditError] = useState<string | null>(null)

  const [cancelShiftId, setCancelShiftId] = useState<string | null>(null)
  const [lateCancelWarning, setLateCancelWarning] = useState(false)
  const [confirmAddShift, setConfirmAddShift] = useState(false)

  const monthDate = new Date(year, month - 1, 1)
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOfWeek = getDay(monthStart)

  function goTo(y: number, m: number) {
    router.push(`${basePath}?year=${y}&month=${m}`)
  }

  function prevMonth() {
    if (month === 1) goTo(year - 1, 12)
    else goTo(year, month - 1)
  }

  function nextMonth() {
    if (month === 12) goTo(year + 1, 1)
    else goTo(year, month + 1)
  }

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedEvents = events.filter((e) => e.date === selectedDateStr)

  function submitShift() {
    if (!selectedDate || !formJobId || !formStart || !formEnd) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    setFormError(null)
    startTransition(async () => {
      const result = await addShiftAction!(formJobId, dateStr, formStart, formEnd)
      if (result.error) {
        setFormError(result.error)
      } else {
        setConfirmAddShift(false)
        setFormStart('09:00')
        setFormEnd('17:00')
      }
    })
  }

  function openAddConfirm() {
    if (!selectedDate || !formJobId || !formStart || !formEnd) return
    if (formEnd <= formStart) {
      setFormError('End time must be after start time.')
      return
    }
    setFormError(null)
    setConfirmAddShift(true)
  }

  const confirmJobLabel = activeJobs.find((j) => j.jobId === formJobId)?.label ?? ''

  function startEdit(event: CalendarEvent) {
    setEditingShiftId(event.id)
    setEditStart(event.startTime)
    setEditEnd(event.endTime)
    setEditError(null)
  }

  function submitEdit(event: CalendarEvent) {
    setEditError(null)
    startTransition(async () => {
      const result = await editShiftAction!(event.id, event.date, editStart, editEnd)
      if (result.error) {
        setEditError(result.error)
      } else {
        setEditingShiftId(null)
      }
    })
  }

  function confirmCancel(shiftId: string) {
    startTransition(async () => {
      const result = await cancelShiftAction!(shiftId)
      if (result.error) {
        setEditError(result.error)
      } else {
        setCancelShiftId(null)
        if (result.lateCancellation) setLateCancelWarning(true)
      }
    })
  }

  return (
    <>
      {lateCancelWarning && (
        <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 flex items-start justify-between gap-4">
          <span>This shift was cancelled within 4 hours of the start time. Payment for this shift will still be processed.</span>
          <button onClick={() => setLateCancelWarning(false)} className="shrink-0 font-medium hover:underline">Dismiss</button>
        </div>
      )}

      {cancelShiftId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold mb-1">Cancel shift?</h2>
              <p className="text-sm text-muted-foreground">
                Shifts cancelled with less than 4 hours notice will incur a <span className="font-medium text-foreground">$50 fee</span>. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setCancelShiftId(null)} disabled={isPending}
                className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted disabled:opacity-50">
                Keep shift
              </button>
              <button type="button" onClick={() => confirmCancel(cancelShiftId)} disabled={isPending}
                className="text-sm px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
                {isPending ? 'Cancelling…' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAddShift && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold mb-1">Add this shift?</h2>
              <p className="text-sm text-muted-foreground">Please confirm the details below.</p>
            </div>
            <dl className="space-y-2 text-sm">
              {confirmJobLabel && (
                <div className="flex gap-3">
                  <dt className="text-muted-foreground w-20 shrink-0">Job</dt>
                  <dd className="font-medium">{confirmJobLabel}</dd>
                </div>
              )}
              <div className="flex gap-3">
                <dt className="text-muted-foreground w-20 shrink-0">Date</dt>
                <dd className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-muted-foreground w-20 shrink-0">Time</dt>
                <dd className="font-medium">{formStart} – {formEnd}</dd>
              </div>
            </dl>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmAddShift(false)} disabled={isPending}
                className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={submitShift} disabled={isPending}
                className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {isPending ? 'Adding…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="text-sm px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors">←</button>
          <h2 className="font-semibold text-sm">{format(monthDate, 'MMMM yyyy')}</h2>
          <button onClick={nextMonth} className="text-sm px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors">→</button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-card min-h-[60px]" />
          ))}
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayEvents = events.filter((e) => e.date === dateStr)
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
            const today = isToday(day)
            return (
              <button key={dateStr} onClick={() => setSelectedDate(day)}
                className={['bg-card min-h-[60px] p-1.5 text-left hover:bg-muted/50 transition-colors relative', isSelected ? 'ring-2 ring-inset ring-primary' : ''].join(' ')}>
                <span className={['text-xs font-medium inline-flex w-5 h-5 items-center justify-center rounded-full', today ? 'bg-primary text-primary-foreground' : 'text-foreground'].join(' ')}>
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((_, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary block" />
                    ))}
                    {dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <Sheet open={!!selectedDate} onOpenChange={(open) => { if (!open) setSelectedDate(null) }}>
        <SheetContent side="right" className="sm:max-w-sm w-full flex flex-col overflow-hidden p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>{selectedDate ? format(selectedDate, 'EEEE, MMMM d') : ''}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shifts on this day.</p>
            ) : (
              <ul className="space-y-3">
                {selectedEvents.map((event) => (
                  <li key={event.id} className="rounded-lg border border-border p-4 space-y-2">
                    <p className="text-sm font-medium">{event.label}</p>
                    <p className="text-xs text-muted-foreground">{event.startTime} – {event.endTime}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${SHIFT_STATUS_CLASSES[event.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {event.status}
                    </span>

                    {editShiftAction && event.status === 'scheduled' && editingShiftId === event.id && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-[12px] font-medium text-foreground/80 block mb-1.5">Increment</label>
                          <div className="flex gap-1.5">
                            {([15, 30, 60] as const).map(inc => (
                              <button
                                key={inc}
                                type="button"
                                onClick={() => setEditIncrement(inc)}
                                className={[
                                  'flex-1 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all',
                                  editIncrement === inc
                                    ? 'border-primary bg-[var(--forest-soft)] text-[var(--forest-deep)]'
                                    : 'border-border text-foreground/70 hover:border-primary/40 hover:bg-muted',
                                ].join(' ')}
                              >
                                {inc === 60 ? '1 hr' : `${inc} min`}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[12px] font-medium text-foreground/80 block mb-1.5">Start</label>
                            <TimeDropdown value={editStart} onChange={setEditStart} increment={editIncrement} placeholder="Start" />
                          </div>
                          <div>
                            <label className="text-[12px] font-medium text-foreground/80 block mb-1.5">End</label>
                            <TimeDropdown value={editEnd} onChange={setEditEnd} increment={editIncrement} placeholder="End" minTime={editStart || undefined} />
                          </div>
                        </div>
                        {editError && <p className="text-[12px] text-destructive">{editError}</p>}
                        <div className="flex gap-2">
                          <button onClick={() => setEditingShiftId(null)} disabled={isPending}
                            className="flex-1 h-9 rounded-full border border-border bg-card text-[13px] font-medium hover:bg-muted disabled:opacity-50 transition-colors">
                            Cancel
                          </button>
                          <button onClick={() => submitEdit(event)} disabled={isPending}
                            className="flex-1 h-9 rounded-full bg-primary text-primary-foreground text-[13px] font-medium hover:bg-[var(--forest-deep)] disabled:opacity-50 transition-colors">
                            {isPending ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}

                    {editShiftAction && cancelShiftAction && event.status === 'scheduled' && editingShiftId !== event.id && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => startEdit(event)}
                          className="flex-1 text-xs py-1.5 rounded-md border border-border hover:bg-muted">Edit</button>
                        <button onClick={() => setCancelShiftId(event.id)}
                          className="flex-1 text-xs py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10">Cancel</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {addShiftAction && activeJobs.length > 0 && (
              <div className="border-t border-border pt-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[var(--forest-soft)] flex items-center justify-center text-[var(--forest-deep)]">
                    <Plus className="h-4 w-4" />
                  </div>
                  <p className="text-[14px] font-semibold">Add a shift</p>
                </div>

                {activeJobs.length > 1 && (
                  <SelectField
                    options={activeJobs.map((job) => ({ value: job.jobId, label: job.label }))}
                    value={formJobId}
                    onChange={(val) => setFormJobId(val)}
                    placeholder="Select a job…"
                  />
                )}

                {/* Increment toggle */}
                <div>
                  <label className="text-[12px] font-medium text-foreground/80 block mb-1.5">Time increment</label>
                  <div className="flex gap-1.5">
                    {([15, 30, 60] as const).map(inc => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setIncrement(inc)}
                        className={[
                          'flex-1 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all',
                          increment === inc
                            ? 'border-primary bg-[var(--forest-soft)] text-[var(--forest-deep)]'
                            : 'border-border text-foreground/70 hover:border-primary/40 hover:bg-muted',
                        ].join(' ')}
                      >
                        {inc === 60 ? '1 hour' : `${inc} min`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time dropdowns */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-medium text-foreground/80 block mb-1.5">Start time</label>
                    <TimeDropdown value={formStart} onChange={setFormStart} increment={increment} placeholder="Start" />
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-foreground/80 block mb-1.5">End time</label>
                    <TimeDropdown value={formEnd} onChange={setFormEnd} increment={increment} placeholder="End" minTime={formStart || undefined} />
                  </div>
                </div>

                {formError && (
                  <div className="rounded-[10px] border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[12.5px] text-destructive">
                    {formError}
                  </div>
                )}
                <button
                  onClick={openAddConfirm}
                  disabled={isPending}
                  className="group/cta inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground text-[14px] font-medium disabled:opacity-50 hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add shift
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
