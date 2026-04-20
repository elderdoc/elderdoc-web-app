'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import { DisputeModal } from './dispute-modal'
import { withdrawDispute } from '@/domains/payments/actions'

function ReceiptSkeleton() {
  return (
    <div className="absolute inset-0 bg-[#f5f5f5] overflow-hidden animate-pulse flex justify-center pt-6">
      <div className="w-[560px] flex flex-col">
        {/* Dark header card */}
        <div className="h-[130px] w-full rounded-t bg-[#3d4663]" />
        {/* White card body */}
        <div className="bg-white px-10 pt-8 pb-6 flex flex-col items-center gap-3 shadow-sm">
          {/* Title */}
          <div className="h-6 w-64 rounded bg-gray-200" />
          {/* Receipt number */}
          <div className="h-3.5 w-36 rounded bg-gray-200 mt-1" />
          {/* 3-column metadata */}
          <div className="w-full mt-5 grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-2.5 w-20 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
              </div>
            ))}
          </div>
          {/* Summary label */}
          <div className="self-start mt-5 h-2.5 w-16 rounded bg-gray-200" />
          {/* Divider */}
          <div className="w-full h-px bg-gray-100 mt-1" />
          {/* Line item */}
          <div className="w-full flex justify-between items-center py-3">
            <div className="h-4 w-52 rounded bg-gray-200" />
            <div className="h-4 w-14 rounded bg-gray-200" />
          </div>
          {/* Divider */}
          <div className="w-full h-px bg-gray-100" />
          {/* Total */}
          <div className="w-full flex justify-between items-center pt-2">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-4 w-14 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  const receiptRef = stripeInvoiceId ?? stripePaymentIntentId
  const isMock = !receiptRef || receiptRef.startsWith('mock_pi_')
  const receiptSrc = !isMock ? `/api/receipt/${receiptRef}` : null

  function handleToggle() {
    setExpanded((v) => !v)
    if (!expanded) setIframeLoaded(false)
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
            <p className="text-sm font-semibold">${((amount + fee) / 100).toFixed(2)}</p>
            {fee > 0 && (
              <p className="text-[10px] text-muted-foreground">
                incl. ${(fee / 100).toFixed(2)} Trust &amp; Support fee
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
        <div className="border-t border-border bg-muted/20">
          {isMock ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">Receipt not available for test/seeded payments.</p>
          ) : (
            <>
              <div className="flex justify-end px-4 pt-3">
                <a
                  href={`${receiptSrc}?download=1`}
                  download={`receipt-${receiptRef}.pdf`}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="h-3 w-3" /> Download PDF
                </a>
              </div>
              <div className="relative mt-3" style={{ height: '520px' }}>
                {!iframeLoaded && <ReceiptSkeleton />}
                <iframe
                  src={receiptSrc!}
                  className="w-full h-full border-0"
                  title="Stripe Receipt"
                  onLoad={() => setIframeLoaded(true)}
                />
              </div>
            </>
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
