'use client'

import { useState } from 'react'
import {
  Sheet, SheetContent,
} from '@/components/ui/sheet'
import Link from 'next/link'
import {
  X, Clock, DollarSign, Calendar, Users, User,
  MessageCircle, ClipboardList,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  active:    'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_STYLES: Record<string, { badge: string; banner: string }> = {
  active:    { badge: 'bg-[var(--forest-soft)] text-[var(--forest-deep)] border-[var(--forest-soft)]', banner: 'linear-gradient(135deg, #1a3d2b 0%, #2d6b48 50%, #163322 100%)' },
  completed: { badge: 'bg-muted text-muted-foreground border-border', banner: 'linear-gradient(135deg, #1e2d26 0%, #2a3d32 50%, #1a2820 100%)' },
  cancelled: { badge: 'bg-destructive/10 text-destructive border-destructive/20', banner: 'linear-gradient(135deg, #2d1a1a 0%, #3d2020 50%, #241414 100%)' },
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily:     'Daily',
  weekly:    'Weekly',
  biweekly:  'Bi-weekly',
  monthly:   'Monthly',
  as_needed: 'As needed',
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
  schedule: Array<{ day: string; startTime: string; endTime: string }> | null
  startDate: string | null
  budgetMin: string | null
  clientName: string | null
  recipientName: string | null
}

interface Props {
  job: JobCardData
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-muted/50 px-3.5 py-3 border border-border/50">
      <p className="text-[11px] text-muted-foreground mb-0.5 font-medium">{label}</p>
      <p className="text-[13.5px] font-semibold">{value}</p>
    </div>
  )
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--forest-soft)] text-[var(--forest-deep)]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-[12.5px] font-semibold text-foreground/70 uppercase tracking-wider">{label}</p>
    </div>
  )
}

export function JobCard({ job }: Props) {
  const [open, setOpen] = useState(false)
  const statusKey = job.status ?? 'active'
  const statusLabel = STATUS_LABELS[statusKey] ?? job.status
  const styles = STATUS_STYLES[statusKey] ?? STATUS_STYLES.active
  const freqLabel = job.frequency ? (FREQUENCY_LABELS[job.frequency] ?? job.frequency) : null
  const rateLabel = job.budgetMin ? `$${Number(job.budgetMin).toFixed(0)}/hr` : null
  const recipientInitials = job.recipientName
    ? job.recipientName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : null

  return (
    <>
      {/* Card trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
        className="group/card rounded-[16px] border border-border bg-card p-5 hover:border-primary/30 hover:shadow-[0_4px_16px_-8px_rgba(15,20,16,0.12)] transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              {/* Recipient avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--forest-soft)] text-[var(--forest-deep)] text-[12px] font-bold">
                {recipientInitials ?? <User className="h-4.5 w-4.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-snug group-hover/card:text-primary transition-colors">{job.title}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                  <span className="inline-flex items-center rounded-full bg-[var(--forest-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--forest-deep)]">
                    {job.careTypeLabel}
                  </span>
                  {freqLabel && <span>{freqLabel}</span>}
                  {rateLabel && <span className="font-medium text-foreground">{rateLabel}</span>}
                </div>
                {(job.clientName || job.recipientName) && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 text-[12px] text-muted-foreground">
                    {job.clientName && <span>Client: {job.clientName}</span>}
                    {job.recipientName && <span>For: {job.recipientName}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium ${styles.badge}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-[480px] w-full flex flex-col overflow-hidden p-0 gap-0 border-l border-border">
          {/* Header banner */}
          <div
            className="relative shrink-0 overflow-hidden"
            style={{ background: styles.banner }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative px-6 pt-10 pb-7">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-medium text-white/90">
                  {job.careTypeLabel}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${styles.badge}`}>
                  {statusLabel}
                </span>
              </div>
              <h2 className="text-[20px] font-semibold text-white leading-snug tracking-[-0.02em]">{job.title}</h2>
              {rateLabel && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-white/80 font-medium">
                  <DollarSign className="h-3.5 w-3.5" />{rateLabel}
                </p>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6 space-y-7">

              {/* People */}
              {(job.clientName || job.recipientName) && (
                <div>
                  <SectionLabel icon={Users} label="People" />
                  <div className="grid grid-cols-2 gap-2.5">
                    {job.clientName && <InfoTile label="Client" value={job.clientName} />}
                    {job.recipientName && <InfoTile label="Care recipient" value={job.recipientName} />}
                  </div>
                </div>
              )}

              {/* Details */}
              {(job.startDate || freqLabel || rateLabel) && (
                <div>
                  <SectionLabel icon={Calendar} label="Details" />
                  <div className="grid grid-cols-2 gap-2.5">
                    {job.startDate && (
                      <InfoTile label="Start date" value={new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                    )}
                    {freqLabel && <InfoTile label="Frequency" value={freqLabel} />}
                    {rateLabel && <InfoTile label="Pay rate" value={rateLabel} />}
                  </div>
                </div>
              )}

              {/* Schedule */}
              {job.schedule && job.schedule.length > 0 && (
                <div>
                  <SectionLabel icon={Clock} label="Schedule" />
                  <div className="space-y-1.5">
                    {job.schedule.map((entry, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-[10px] bg-muted/40 px-3.5 py-2.5 border border-border/50">
                        <span className="w-20 text-[12.5px] font-semibold capitalize text-foreground">{entry.day}</span>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                        <span className="text-[12.5px] text-muted-foreground tabular-nums">{entry.startTime} – {entry.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {job.description && (
                <div>
                  <SectionLabel icon={User} label="About this job" />
                  <p className="text-[13.5px] text-foreground/80 leading-relaxed">{job.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="shrink-0 px-6 py-4 border-t border-border bg-card flex gap-2.5">
            <Link
              href={`/caregiver/dashboard/messages/${job.id}`}
              className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card text-[13.5px] font-medium hover:border-foreground/30 hover:bg-muted transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              Message client
            </Link>
            <Link
              href="/caregiver/dashboard/care-plans"
              className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground text-[13.5px] font-medium hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all"
            >
              <ClipboardList className="h-4 w-4" />
              Care plan
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
