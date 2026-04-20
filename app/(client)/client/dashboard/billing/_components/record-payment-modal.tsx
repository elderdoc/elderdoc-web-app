'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { recordInvoicePayment } from '@/domains/payments/actions'
import { useRouter } from 'next/navigation'

interface Props {
  jobId: string
  jobLabel: string
  savedCard: { brand: string; last4: string } | null
  onClose: () => void
}

const FEE_RATE = 0.01

export function RecordPaymentModal({ jobId, jobLabel, savedCard, onClose }: Props) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [showFeeInfo, setShowFeeInfo] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotalCents = Math.round(parseFloat(amount) * 100)
  const amountValid = !isNaN(subtotalCents) && subtotalCents > 0
  const feeCents = amountValid ? Math.round(subtotalCents * FEE_RATE) : 0
  const totalCents = subtotalCents + feeCents

  async function handlePay() {
    if (!amountValid || !savedCard) return
    setIsPending(true)
    setError(null)
    const result = await recordInvoicePayment(jobId, subtotalCents, feeCents)
    if (result.error) {
      setError(result.error)
      setIsPending(false)
      return
    }
    router.refresh()
    onClose()
    setIsPending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-card rounded-xl border border-border shadow-lg w-full max-h-[90vh] overflow-y-auto transition-all ${amountValid ? 'max-w-md' : 'max-w-sm'}`}>
        <div className="p-6 flex flex-col gap-5">

          <div>
            <h2 className="text-lg font-semibold mb-0.5">Record Payment</h2>
            <p className="text-sm text-muted-foreground">{jobLabel}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
              Amount for caregiver (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {amountValid && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal (to caregiver)</span>
                <span className="font-medium">${(subtotalCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1">
                  Trust &amp; Support Fee (1%)
                  <button
                    type="button"
                    onClick={() => setShowFeeInfo((v) => !v)}
                    className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label="What is the Trust & Support fee?"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </span>
                <span className="font-medium">${(feeCents / 100).toFixed(2)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="font-semibold">${(totalCents / 100).toFixed(2)}</span>
              </div>

              {showFeeInfo && (
                <div className="mt-3 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">What&apos;s the Trust &amp; Support Fee?</p>
                  <p>
                    ElderDoc applies a Trust &amp; Support fee to all invoices. Expenses and reimbursements are not subject
                    to this fee. You&apos;ll see this fee as a separate item on your receipt once the task is complete.
                  </p>
                  <p>This fee helps to support:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>The ElderDoc Pledge.</li>
                    <li>Operational and safety measures to protect users.</li>
                    <li>Investment in our Customer Support Team.</li>
                    <li>Tools, team training, and channels to support you in getting your task completed.</li>
                  </ul>
                  <p>All expenses and tips go directly to your caregiver.</p>
                </div>
              )}

              {savedCard && (
                <div className="flex items-center justify-between pt-1 border-t border-border mt-2">
                  <span className="text-muted-foreground text-xs">Charging</span>
                  <span className="text-xs font-medium capitalize">
                    {savedCard.brand} ···· {savedCard.last4}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          {!savedCard && (
            <p className="text-xs text-destructive">Add a payment method before recording a payment.</p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handlePay}
              disabled={!amountValid || !savedCard || isPending}
              className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Processing…' : amountValid ? `Pay $${(totalCents / 100).toFixed(2)}` : 'Enter amount first'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
