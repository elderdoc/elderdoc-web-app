'use client'

import { useState, useRef, useEffect } from 'react'
import { DisputeModal } from './dispute-modal'
import { SavedCardBanner } from './saved-card-banner'
import { PaymentHistoryCard } from './payment-history-card'
import type { PaymentRow, DisputeRow, UnbilledShiftRow } from '@/domains/payments/queries'
import { calculateShiftHours } from '@/lib/shift-utils'

function FeeInfoPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted-foreground/25 text-[9px] font-bold text-muted-foreground leading-none hover:bg-muted-foreground/40 transition-colors"
        aria-label="About Trust & Support fee"
      >
        i
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          <div className="bg-primary/5 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">What's the Eldcare Support Fee?</p>
          </div>
          <div className="px-4 py-3 space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              Eldcare applies a <span className="font-medium text-foreground">1% Trust &amp; Support fee</span> to all invoices as a separate line item. Expenses and reimbursements are not subject to this fee.
            </p>
            <div>
              <p className="font-medium text-foreground mb-1.5">This fee helps support:</p>
              <ul className="space-y-1 list-none">
                {[
                  'The Eldcare Pledge',
                  'Operational and safety measures to protect users',
                  'Investment in our Customer Support Team',
                  'Tools, team training, and channels to help you get care completed',
                ].map(item => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-primary">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="border-t border-border pt-2.5">
              The Support fee <span className="font-medium text-foreground">doesn't affect what a caregiver is paid</span>. All expenses and tips go directly to your caregiver.
            </p>
          </div>
          <div className="absolute top-full left-5 border-4 border-transparent border-t-border" />
          <div className="absolute top-full left-5 translate-y-[-1px] border-4 border-transparent border-t-card" />
        </div>
      )}
    </div>
  )
}

interface ActiveJob {
  jobId: string
  careType: string
  caregiverName: string | null
}

interface Props {
  paymentRows: PaymentRow[]
  activeJobs: ActiveJob[]
  savedCard: { brand: string; last4: string } | null
  stripePublishableKey: string
  openDisputes: DisputeRow[]
  unbilledShifts: UnbilledShiftRow[]
}

export function BillingClient({ paymentRows, activeJobs, savedCard, stripePublishableKey, openDisputes, unbilledShifts }: Props) {
  const [disputeJobId, setDisputeJobId] = useState<string | null>(null)

  const totalUpcoming = unbilledShifts.reduce(
    (sum, s) => sum + calculateShiftHours(s.startTime, s.endTime) * s.hourlyRate * 1.01,
    0
  )
  const escrowTotal = paymentRows
    .filter(p => p.releasedAt === null)
    .reduce((sum, p) => sum + p.amount, 0)
  const totalPaid = paymentRows
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)
  const totalOverall = totalPaid + totalUpcoming

  const shiftsByJob = unbilledShifts.reduce<Record<string, UnbilledShiftRow[]>>((acc, shift) => {
    if (!acc[shift.jobId]) acc[shift.jobId] = []
    acc[shift.jobId].push(shift)
    return acc
  }, {})

  return (
    <>
      {disputeJobId && (
        <DisputeModal
          jobId={disputeJobId}
          onClose={() => setDisputeJobId(null)}
        />
      )}

      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Upcoming</p>
          <p className="text-2xl font-bold text-muted-foreground">${totalUpcoming.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Charges Sunday</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">In Escrow</p>
          <p className="text-2xl font-bold text-muted-foreground">${escrowTotal.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Held, releasing to caregiver</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Paid</p>
          <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">All completed payments</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Overall</p>
          <p className="text-2xl font-bold">${totalOverall.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Paid + upcoming</p>
        </div>
      </div>

      <SavedCardBanner savedCard={savedCard} stripePublishableKey={stripePublishableKey} />

      {Object.keys(shiftsByJob).length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Upcoming Charge — charges Sunday
          </p>
          <div className="space-y-3">
            {Object.entries(shiftsByJob).map(([jobId, jobShifts]) => {
              const subtotal = jobShifts.reduce(
                (sum, s) => sum + calculateShiftHours(s.startTime, s.endTime) * s.hourlyRate,
                0
              )
              const fee = subtotal * 0.01
              const total = subtotal + fee
              return (
                <div key={jobId} className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <p className="text-sm font-medium capitalize">
                    {jobShifts[0].careType.replace(/-/g, ' ')} · {jobShifts[0].caregiverName ?? 'Caregiver'}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">${jobShifts[0].hourlyRate.toFixed(2)}/hr</span>
                  </p>
                  <div className="space-y-1.5">
                    {jobShifts.map((s) => {
                      const hours = calculateShiftHours(s.startTime, s.endTime)
                      const amount = hours * s.hourlyRate
                      return (
                        <div key={s.shiftId} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {s.date} &nbsp; {s.startTime}–{s.endTime} &nbsp; {hours}h
                          </span>
                          <span className="font-medium">${amount.toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t border-border pt-2 space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center">
                        Trust &amp; Support fee (1%)
                        <FeeInfoPopover />
                      </span>
                      <span>${fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total due Sunday</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                  {!savedCard && (
                    <p className="text-xs text-destructive">
                      Add a payment method before Sunday to avoid a missed payment.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mb-8">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Active Jobs</p>
        {activeJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">No active jobs yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              const jobDisputeSet = new Set(openDisputes.filter((d) => d.paymentId === null).map((d) => d.jobId))
              return activeJobs.map((job) => (
                <div key={job.jobId} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{job.careType}</p>
                    <p className="text-xs text-muted-foreground">{job.caregiverName ?? 'Caregiver'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {jobDisputeSet.has(job.jobId) ? (
                      <span className="text-xs px-2 py-1 rounded-md bg-orange-100 text-orange-700 font-medium">
                        Issue reported
                      </span>
                    ) : (
                      <button
                        onClick={() => setDisputeJobId(job.jobId)}
                        className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted text-muted-foreground"
                      >
                        Report issue
                      </button>
                    )}
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Payment History</p>
        {paymentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="space-y-2">
            {paymentRows.map((row) => {
              const activeDispute = openDisputes.find(
                (d) => d.paymentId !== null && d.paymentId === row.paymentId
              ) ?? null
              return (
                <PaymentHistoryCard
                  key={row.paymentId}
                  careType={row.careType}
                  caregiverName={row.caregiverName}
                  method={row.method}
                  amount={row.amount}
                  fee={row.fee}
                  status={row.status}
                  stripePaymentIntentId={row.stripePaymentIntentId}
                  stripeInvoiceId={row.stripeInvoiceId}
                  createdAt={row.createdAt}
                  jobId={row.jobId}
                  paymentId={row.paymentId}
                  releasedAt={row.releasedAt}
                  activeDispute={activeDispute ? { disputeId: activeDispute.disputeId } : null}
                />
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
