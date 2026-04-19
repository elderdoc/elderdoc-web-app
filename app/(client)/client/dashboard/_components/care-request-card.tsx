import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { CARE_TYPES } from '@/lib/constants'

const CARE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CARE_TYPES.map((c) => [c.key, c.label])
)

const STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  active:    'Matching in progress',
  matched:   'Matched',
  filled:    'Filled',
  cancelled: 'Cancelled',
}

const STATUS_CLASSES: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  active:    'bg-blue-100 text-blue-700',
  matched:   'bg-green-100 text-green-700',
  filled:    'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
}

const BUDGET_SUFFIX: Record<string, string> = {
  hourly:    '/hr',
  'per-visit': '/visit',
  monthly:   '/mo',
  'bi-weekly': '/2wk',
}

const FREQUENCY_LABELS: Record<string, string> = {
  'one-time':   'One-time',
  daily:        'Daily',
  weekly:       'Weekly',
  'bi-weekly':  'Bi-weekly',
  monthly:      'Monthly',
}

export interface CareRequestCardData {
  id:            string
  title:         string | null
  careType:      string
  status:        string | null
  frequency:     string | null
  budgetType:    string | null
  budgetAmount:  string | null
  durationHours: number | null
  shifts:        string[] | null
  createdAt:     Date
  recipientName: string | null
}

export function CareRequestCard({ req }: { req: CareRequestCardData }) {
  const status = req.status ?? 'draft'
  const careTypeLabel = CARE_TYPE_LABELS[req.careType] ?? req.careType
  const budget = req.budgetAmount
    ? `$${Number(req.budgetAmount).toFixed(0)}${BUDGET_SUFFIX[req.budgetType ?? ''] ?? ''}`
    : null
  const frequency = req.frequency ? (FREQUENCY_LABELS[req.frequency] ?? req.frequency) : null
  const shiftCount = req.shifts?.length ?? 0

  return (
    <Link
      href={`/client/dashboard/requests/${req.id}`}
      className="group relative block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
            {req.title ?? careTypeLabel}
          </p>
          {req.recipientName && (
            <p className="text-xs text-muted-foreground mt-0.5">for {req.recipientName}</p>
          )}
        </div>
        <span className={['shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', STATUS_CLASSES[status]].join(' ')}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">{careTypeLabel}</span>
        {frequency && <span>{frequency}</span>}
        {budget && <span className="font-medium text-foreground">{budget}</span>}
        {req.durationHours != null && (
          <span>{req.durationHours}h/session</span>
        )}
        {shiftCount > 0 && (
          <span>{shiftCount} shift{shiftCount !== 1 ? 's' : ''}/week</span>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Posted {formatDistanceToNow(req.createdAt, { addSuffix: true })}
      </p>
    </Link>
  )
}
