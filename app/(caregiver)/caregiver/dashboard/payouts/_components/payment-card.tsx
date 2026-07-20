'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'

function ReceiptSkeleton() {
  return (
    <div className="absolute inset-0 bg-[#f5f5f5] overflow-hidden animate-pulse flex justify-center pt-6">
      <div className="w-[560px] flex flex-col">
        <div className="h-[130px] w-full rounded-t bg-[#3d4663]" />
        <div className="bg-white px-10 pt-8 pb-6 flex flex-col items-center gap-3 shadow-sm">
          <div className="h-6 w-64 rounded bg-gray-200" />
          <div className="h-3.5 w-36 rounded bg-gray-200 mt-1" />
          <div className="w-full mt-5 grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-2.5 w-20 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
              </div>
            ))}
          </div>
          <div className="self-start mt-5 h-2.5 w-16 rounded bg-gray-200" />
          <div className="w-full h-px bg-gray-100 mt-1" />
          <div className="w-full flex justify-between items-center py-3">
            <div className="h-4 w-52 rounded bg-gray-200" />
            <div className="h-4 w-14 rounded bg-gray-200" />
          </div>
          <div className="w-full h-px bg-gray-100" />
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
  paymentId: string
  careType: string
  clientName: string | null
  method: string
  amount: number
  status: string
  stripePaymentIntentId: string | null
  createdAt: Date
}

export function PaymentCard({
  careType, clientName, method, amount, status, stripePaymentIntentId, createdAt,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const isMock = !stripePaymentIntentId || stripePaymentIntentId.startsWith('mock_pi_')
  const receiptSrc = !isMock ? `/api/receipt/${stripePaymentIntentId}` : null

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
            {clientName} · {method} · {createdAt.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-sm font-semibold">${(amount / 100).toFixed(2)}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              status === 'completed'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {status}
            </span>
          </div>
          <span className="text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/20">
          {isMock ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">Receipt not available for test/seeded payments.</p>
          ) : (
            <>
              <div className="flex justify-end px-4 pt-3">
                <a
                  href={`${receiptSrc}?download=1`}
                  download={`receipt-${stripePaymentIntentId}.pdf`}
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
    </div>
  )
}
