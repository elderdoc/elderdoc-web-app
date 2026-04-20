'use client'

import { useState } from 'react'
import { DisputeModal } from './dispute-modal'
import { SavedCardBanner } from './saved-card-banner'
import { PaymentHistoryCard } from './payment-history-card'
import type { PaymentRow, DisputeRow, UnbilledShiftRow } from '@/domains/payments/queries'
import { calculateShiftHours } from '@/lib/shift-utils'

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
                  <p className="text-sm font-medium">
                    {jobShifts[0].careType} · {jobShifts[0].caregiverName ?? 'Caregiver'}
                  </p>
                  <div className="space-y-1">
                    {jobShifts.map((s) => {
                      const hours = calculateShiftHours(s.startTime, s.endTime)
                      return (
                        <div key={s.shiftId} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {s.date} &nbsp; {s.startTime}–{s.endTime} &nbsp; {hours}h
                          </span>
                          <span>${(hours * s.hourlyRate).toFixed(2)}</span>
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
                      <span>Trust &amp; Support fee (1%)</span>
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
