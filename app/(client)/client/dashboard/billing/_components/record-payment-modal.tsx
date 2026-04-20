'use client'

import { useState, useTransition } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { initiateStripePayment } from '@/domains/payments/actions'

interface Props {
  jobId: string
  jobLabel: string
  stripePublishableKey: string
  onClose: () => void
}

function StripeForm({ jobId, amount, onClose }: { jobId: string; amount: number; onClose: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setIsPending(true)
    setError(null)

    const { error: submitErr } = await elements.submit()
    if (submitErr) {
      setError(submitErr.message ?? 'Payment failed')
      setIsPending(false)
      return
    }

    const result = await initiateStripePayment(jobId, amount)
    if (result.error || !result.clientSecret) {
      setError(result.error ?? 'Could not create payment')
      setIsPending(false)
      return
    }

    const { error: confirmErr } = await stripe.confirmPayment({
      elements,
      clientSecret: result.clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })

    if (confirmErr) {
      setError(confirmErr.message ?? 'Payment failed')
    } else {
      onClose()
    }
    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !stripe}
          className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Processing…' : 'Pay with Card'}
        </button>
      </div>
    </form>
  )
}

export function RecordPaymentModal({ jobId, jobLabel, stripePublishableKey, onClose }: Props) {
  const stripePromise = loadStripe(stripePublishableKey)
  const [method, setMethod] = useState<'cash' | 'card'>('cash')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const cents = Math.round(parseFloat(amount) * 100)
  const amountValid = !isNaN(cents) && cents > 0
  const showStripe = method === 'card' && amountValid

  function handleCashSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amountValid) { setError('Enter a valid amount'); return }
    startTransition(async () => {
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-card rounded-xl border border-border shadow-lg w-full max-h-[90vh] overflow-y-auto transition-all ${showStripe ? 'max-w-lg' : 'max-w-sm'}`}>
        <div className="p-6 flex flex-col gap-5">

          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold mb-0.5">Record Payment</h2>
            <p className="text-sm text-muted-foreground">{jobLabel}</p>
          </div>

          {/* Method tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setMethod('cash')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${method === 'cash' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setMethod('card')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${method === 'card' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              Card (Stripe)
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
              Amount (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(null) }}
              placeholder="0.00"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* Cash actions */}
          {method === 'cash' && (
            <form onSubmit={handleCashSubmit}>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? 'Recording…' : 'Record Cash Payment'}
                </button>
              </div>
            </form>
          )}

          {/* Card: enter amount first */}
          {method === 'card' && !amountValid && (
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted">
                Cancel
              </button>
              <button disabled className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground opacity-50">
                Enter amount first
              </button>
            </div>
          )}

          {/* Stripe form — full width below the controls */}
          {showStripe && (
            <div className="border-t border-border pt-5">
              <Elements stripe={stripePromise} options={{ mode: 'payment', amount: cents, currency: 'usd' }}>
                <StripeForm jobId={jobId} amount={cents} onClose={onClose} />
              </Elements>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
