import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, Calendar, DollarSign, User } from 'lucide-react'
import { CARE_TYPES } from '@/lib/constants'

const CARE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CARE_TYPES.map((c) => [c.key, c.label])
)

const STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  active:    'Matching',
  matched:   'Matched',
  filled:    'Filled',
  cancelled: 'Cancelled',
}

const STATUS_CLASSES: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  active:    'bg-amber-100 text-amber-800',
  matched:   'bg-[var(--forest-soft)] text-[var(--forest-deep)]',
  filled:    'bg-foreground text-background',
  cancelled: 'bg-destructive/10 text-destructive',
}

const STATUS_DOT: Record<string, string> = {
  draft:     'bg-muted-foreground/40',
  active:    'bg-amber-500 animate-pulse',
  matched:   'bg-primary',
  filled:    'bg-background',
  cancelled: 'bg-destructive',
}

const BUDGET_SUFFIX: Record<string, string> = {
  hourly:      '/hr',
  daily:       '/day',
  'per-visit': '/visit',
  monthly:     '/mo',
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
  budgetMin:     string | null
  schedule:      Array<{ day: string; startTime: string; endTime: string }> | null
  createdAt:     Date
  recipientName: string | null
}

export function CareRequestCard({ req }: { req: CareRequestCardData }) {
  const status = req.status ?? 'draft'
  const careTypeLabel = CARE_TYPE_LABELS[req.careType] ?? req.careType
  const budget = req.budgetMin
    ? `$${Number(req.budgetMin).toFixed(0)}${BUDGET_SUFFIX[req.budgetType ?? ''] ?? ''}`
    : null
  const frequency = req.frequency ? (FREQUENCY_LABELS[req.frequency] ?? req.frequency) : null

  return (
    <Link
      href={`/client/dashboard/requests/${req.id}`}
      className="group/req block rounded-[14px] border border-border bg-card p-5 transition-all hover:border-foreground/15 hover:shadow-[0_8px_24px_-12px_rgba(15,20,16,0.1)] hover:-translate-y-0.5"
    >
      {/* Top row: title + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold tracking-[-0.01em] truncate transition-colors group-hover/req:text-primary">
            {req.title ?? careTypeLabel}
          </h3>
          {req.recipientName && (
            <div className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>for {req.recipientName}</span>
            </div>
          )}
        </div>
        <span className={[
          'inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 h-6 text-[12px] font-medium',
          STATUS_CLASSES[status]
        ].join(' ')}>
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Tags row */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[12px] text-foreground/80">
          {careTypeLabel}
        </span>
        {frequency && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[12px] text-foreground/80">
            <Calendar className="h-3 w-3" />
            {frequency}
          </span>
        )}
        {budget && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--forest-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--forest-deep)]">
            <DollarSign className="h-3 w-3" />
            {budget.replace('$', '')}
          </span>
        )}
      </div>

      {/* Footer row */}
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-[12px] text-muted-foreground">
          Posted {formatDistanceToNow(req.createdAt, { addSuffix: true })}
        </span>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground/70 transition-all group-hover/req:text-primary group-hover/req:gap-1.5">
          View
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  )
}
