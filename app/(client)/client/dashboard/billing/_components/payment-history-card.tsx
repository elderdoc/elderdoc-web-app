'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DisputeModal } from './dispute-modal'
import { InvoiceView } from './invoice-view'
import { withdrawDispute } from '@/domains/payments/actions'


interface Props {
  careType: string
  caregiverName: string | null
  method: string
  amount: number
  fee: number
  status: 'pending' | 'completed' | 'failed'
  stripePaymentIntentId: string | null
  stripeInvoiceId: string | null
  createdAt: Date
  jobId: string
  paymentId: string
  releasedAt: Date | null
  activeDispute: { disputeId: string } | null
}

export function PaymentHistoryCard({
  careType, caregiverName, method, amount, fee, status, stripePaymentIntentId, stripeInvoiceId, createdAt,
  jobId, paymentId, releasedAt, activeDispute,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  const receiptRef = stripeInvoiceId ?? stripePaymentIntentId
  const isMock = !receiptRef || receiptRef.startsWith('mock_pi_')
  const receiptSrc = !isMock ? `/api/receipt/${receiptRef}` : null

  function handleToggle() {
    setExpanded((v) => !v)
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div>
          <p className="text-sm font-medium">{careType}</p>
          <p className="text-xs text-muted-foreground">
            {caregiverName} · {method} · {createdAt.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-sm font-semibold">${(amount + fee).toFixed(2)}</p>
            {fee > 0 && (
              <p className="text-[10px] text-muted-foreground">
                incl. ${fee.toFixed(2)} fees (11%)
              </p>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              status === 'completed'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : status === 'failed'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {status}
            </span>
            {status === 'completed' && releasedAt !== null && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Released
              </span>
            )}
            {status === 'completed' && releasedAt === null && activeDispute && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                Disputed
              </span>
            )}
          </div>
          <span className="text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </div>
      </button>

      {/* Dispute actions row — outside the toggle button */}
      {status === 'completed' && releasedAt === null && (
        <div className="px-4 py-2 flex items-center gap-3 border-t border-border/50">
          {activeDispute ? (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={async () => {
                  setWithdrawing(true)
                  setWithdrawError(null)
                  const result = await withdrawDispute(activeDispute.disputeId)
                  if (result.error) {
                    setWithdrawError(result.error)
                  }
                  setWithdrawing(false)
                }}
                disabled={withdrawing}
                className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50"
              >
                Withdraw dispute
              </button>
              {withdrawError && (
                <p className="text-xs text-red-600 dark:text-red-400">{withdrawError}</p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDisputeModal(true)}
              className="text-xs text-primary hover:underline"
            >
              Dispute
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div className="border-t border-border">
          {isMock || !receiptRef ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">Receipt not available.</p>
          ) : status !== 'completed' ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">Receipt will be available once payment is confirmed.</p>
          ) : (
            <InvoiceView invoiceId={receiptRef} />
          )}
        </div>
      )}

      {showDisputeModal && (
        <DisputeModal
          jobId={jobId}
          paymentId={paymentId}
          onClose={() => setShowDisputeModal(false)}
        />
      )}
    </div>
  )
}
