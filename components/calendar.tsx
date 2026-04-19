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

  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('09:00')
  const [editEnd, setEditEnd] = useState('17:00')
  const [editError, setEditError] = useState<string | null>(null)

  const [cancelShiftId, setCancelShiftId] = useState<string | null>(null)
  const [lateCancelWarning, setLateCancelWarning] = useState(false)

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
        setFormStart('09:00')
        setFormEnd('17:00')
      }
    })
  }

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
                If this shift starts within 4 hours, payment will still be charged. This cannot be undone.
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

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
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
                <button key={dateStr} onClick={() => setSelectedDate(isSelected ? null : day)}
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

        {selectedDate && (
          <div className="w-full lg:w-72 shrink-0 rounded-xl border border-border bg-card p-5 self-start">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">{format(selectedDate, 'EEEE, MMMM d')}</h3>
              <button onClick={() => setSelectedDate(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">No shifts.</p>
            ) : (
              <ul className="space-y-3 mb-4">
                {selectedEvents.map((event) => (
                  <li key={event.id} className="rounded-lg border border-border p-3 space-y-2">
                    <p className="text-sm font-medium">{event.label}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${SHIFT_STATUS_CLASSES[event.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {event.status}
                    </span>

                    {editShiftAction && event.status === 'scheduled' && editingShiftId === event.id && (
                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground block mb-1">Start</label>
                            <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)}
                              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring" />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground block mb-1">End</label>
                            <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)}
                              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring" />
                          </div>
                        </div>
                        {editError && <p className="text-xs text-destructive">{editError}</p>}
                        <div className="flex gap-2">
                          <button onClick={() => setEditingShiftId(null)} disabled={isPending}
                            className="flex-1 text-xs py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50">Cancel</button>
                          <button onClick={() => submitEdit(event)} disabled={isPending}
                            className="flex-1 text-xs py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
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
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs font-medium">Add Shift</p>
                {activeJobs.length > 1 && (
                  <select value={formJobId} onChange={(e) => setFormJobId(e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring">
                    {activeJobs.map((job) => (
                      <option key={job.jobId} value={job.jobId}>{job.label}</option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Start</label>
                    <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">End</label>
                    <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
                  </div>
                </div>
                {formError && <p className="text-xs text-destructive">{formError}</p>}
                <button onClick={submitShift} disabled={isPending}
                  className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors">
                  {isPending ? 'Adding…' : 'Add Shift'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
