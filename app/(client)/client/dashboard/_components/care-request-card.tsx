import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
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
  draft:     'border-foreground/15 text-muted-foreground',
  active:    'border-[var(--terracotta)]/30 bg-[var(--terracotta)]/[0.08] text-[var(--terracotta)]',
  matched:   'border-primary/30 bg-primary/[0.08] text-[var(--forest-deep)]',
  filled:    'border-foreground/30 bg-foreground/[0.04] text-foreground',
  cancelled: 'border-destructive/20 bg-destructive/[0.06] text-destructive',
}

const BUDGET_SUFFIX: Record<string, string> = {
  hourly:    '/hr',
  daily:     '/day',
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
  const scheduleCount = req.schedule?.length ?? 0

  return (
    <Link
      href={`/client/dashboard/requests/${req.id}`}
      className="group/req relative block border border-border bg-card rounded-md p-5 transition-all hover:border-foreground/30 hover:shadow-[0_8px_24px_-12px_rgba(15,20,16,0.18)]"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {careTypeLabel}
            </span>
            <span className="text-foreground/30">·</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {formatDistanceToNow(req.createdAt, { addSuffix: true })}
            </span>
          </div>
          <h3 className="mt-1.5 font-display text-[20px] tracking-[-0.02em] leading-tight transition-colors group-hover/req:text-[var(--forest-deep)]">
            {req.title ?? careTypeLabel}
          </h3>
          {req.recipientName && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              for <span className="font-display italic text-foreground">{req.recipientName}</span>
            </p>
          )}
        </div>

        <span className={[
          'shrink-0 inline-flex h-[22px] items-center rounded-full px-2.5 border font-mono text-[10px] uppercase tracking-[0.06em]',
          STATUS_CLASSES[status]
        ].join(' ')}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-3 font-mono text-[11px] tabular-nums uppercase tracking-wider text-muted-foreground">
        {frequency && <span>{frequency}</span>}
        {budget && (
          <span className="text-foreground">
            <span className="font-display text-[14px] tracking-tight not-italic">{budget}</span>
          </span>
        )}
        {scheduleCount > 0 && (
          <span>
            <span className="text-foreground font-display text-[14px] tracking-tight">{scheduleCount}</span>
            {' '}session{scheduleCount !== 1 ? 's' : ''}/wk
          </span>
        )}
        <span className="ml-auto text-foreground/30 transition-transform group-hover/req:translate-x-1 group-hover/req:text-foreground">
          →
        </span>
      </div>
    </Link>
  )
}
