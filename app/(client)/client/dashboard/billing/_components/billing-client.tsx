'use client'

import { useState } from 'react'
import { RecordPaymentModal } from './record-payment-modal'
import type { PaymentRow } from '@/domains/payments/queries'

interface ActiveJob {
  jobId: string
  careType: string
  caregiverName: string | null
}

interface Props {
  paymentRows: PaymentRow[]
  activeJobs: ActiveJob[]
}

export function BillingClient({ paymentRows, activeJobs }: Props) {
  const [modalJobId, setModalJobId] = useState<string | null>(null)
  const modalJob = activeJobs.find((j) => j.jobId === modalJobId)

  return (
    <>
      {modalJob && (
        <RecordPaymentModal
          jobId={modalJob.jobId}
          jobLabel={`${modalJob.careType} — ${modalJob.caregiverName ?? 'Caregiver'}`}
          onClose={() => setModalJobId(null)}
        />
      )}

      {activeJobs.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Active Jobs</p>
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
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Payment History</p>
        {paymentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {paymentRows.map((row) => (
              <div key={row.paymentId} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{row.careType}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.caregiverName} · {row.method} · {row.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${(row.amount / 100).toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    row.status === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : row.status === 'failed'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
