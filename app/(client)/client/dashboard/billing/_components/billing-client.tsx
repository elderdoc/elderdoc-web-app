'use client'

import { useState } from 'react'
import { RecordPaymentModal } from './record-payment-modal'
import { SavedCardBanner } from './saved-card-banner'
import { PaymentHistoryCard } from './payment-history-card'
import type { PaymentRow, DisputeRow } from '@/domains/payments/queries'

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
}

export function BillingClient({ paymentRows, activeJobs, savedCard, stripePublishableKey, openDisputes }: Props) {
  const [modalJobId, setModalJobId] = useState<string | null>(null)
  const modalJob = activeJobs.find((j) => j.jobId === modalJobId)

  return (
    <>
      {modalJob && (
        <RecordPaymentModal
          jobId={modalJob.jobId}
          jobLabel={`${modalJob.careType} — ${modalJob.caregiverName ?? 'Caregiver'}`}
          savedCard={savedCard}
          onClose={() => setModalJobId(null)}
        />
      )}

      <SavedCardBanner savedCard={savedCard} stripePublishableKey={stripePublishableKey} />

      <div className="mb-8">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Active Jobs</p>
        {activeJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">No active jobs yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Payments can be recorded once a caregiver is hired.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeJobs.map((job) => (
              <div key={job.jobId} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{job.careType}</p>
                  <p className="text-xs text-muted-foreground">{job.caregiverName ?? 'Caregiver'}</p>
                </div>
                <button
                  onClick={() => setModalJobId(job.jobId)}
                  className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Record Payment
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Payment History</p>
        {paymentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
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
