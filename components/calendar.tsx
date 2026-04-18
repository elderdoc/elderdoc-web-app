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
  date: string
  label: string
  status: string
  jobId: string
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
  addShiftAction: (
    jobId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) => Promise<{ error?: string }>
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SHIFT_STATUS_CLASSES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled:  'bg-destructive/10 text-destructive',
}

export function Calendar({ year, month, events, activeJobs, basePath, addShiftAction }: Props) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [formJobId, setFormJobId] = useState(activeJobs[0]?.jobId ?? '')
  const [formStart, setFormStart] = useState('09:00')
  const [formEnd, setFormEnd] = useState('17:00')

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
      const result = await addShiftAction(formJobId, dateStr, formStart, formEnd)
      if (result.error) {
        setFormError(result.error)
      } else {
        setFormStart('09:00')
        setFormEnd('17:00')
      }
    })
  }

  return (
    <div className="flex gap-6">
      {/* ── Calendar grid ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="text-sm px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            ←
          </button>
          <h2 className="font-semibold text-sm">
            {format(monthDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={nextMonth}
            className="text-sm px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground py-1">
              {d}
            </div>
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
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={[
                  'bg-card min-h-[60px] p-1.5 text-left hover:bg-muted/50 transition-colors relative',
                  isSelected ? 'ring-2 ring-inset ring-primary' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'text-xs font-medium inline-flex w-5 h-5 items-center justify-center rounded-full',
                    today ? 'bg-primary text-primary-foreground' : 'text-foreground',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((_, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary block" />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Side panel ────────────────────────────────────────────────── */}
      {selectedDate && (
        <div className="w-72 shrink-0 rounded-xl border border-border bg-card p-5 self-start">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">No shifts.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {selectedEvents.map((event, i) => (
                <li key={i} className="rounded-lg border border-border p-2">
                  <p className="text-sm font-medium">{event.label}</p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${SHIFT_STATUS_CLASSES[event.status] ?? 'bg-muted text-muted-foreground'}`}
                  >
                    {event.status}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {activeJobs.length > 0 && (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-medium">Add Shift</p>

              {activeJobs.length > 1 && (
                <select
                  value={formJobId}
                  onChange={(e) => setFormJobId(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
                >
                  {activeJobs.map((job) => (
                    <option key={job.jobId} value={job.jobId}>
                      {job.label}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Start</label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">End</label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
              </div>

              {formError && <p className="text-xs text-destructive">{formError}</p>}

              <button
                onClick={submitShift}
                disabled={isPending}
                className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {isPending ? 'Adding…' : 'Add Shift'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
