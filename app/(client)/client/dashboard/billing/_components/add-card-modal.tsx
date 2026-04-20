'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { createPaymentSetupIntent, saveDefaultPaymentMethod } from '@/domains/payments/actions'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface Props {
  stripePublishableKey: string
  onClose: () => void
}

function SetupForm({ onClose }: { onClose: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setIsPending(true)
    setError(null)

    const { error: submitErr } = await elements.submit()
    if (submitErr) {
      setError(submitErr.message ?? 'Failed to save card')
      setIsPending(false)
      return
    }

    const { error: confirmErr, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    })

    if (confirmErr) {
      setError(confirmErr.message ?? 'Failed to save card')
      setIsPending(false)
      return
    }

    if (setupIntent?.status === 'succeeded') {
      const pmId = typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id

      if (pmId) {
        const result = await saveDefaultPaymentMethod(pmId)
        if (result.error) {
          setError(result.error)
          setIsPending(false)
          return
        }
      }
    }

    setIsPending(false)
    onClose()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
          className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !stripe}
          className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save card'}
        </button>
      </div>
    </form>
  )
}

export function AddCardModal({ stripePublishableKey, onClose }: Props) {
  const stripePromise = useMemo(() => loadStripe(stripePublishableKey), [stripePublishableKey])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createPaymentSetupIntent().then((result) => {
      if (result.error) setError(result.error)
      else setClientSecret(result.clientSecret ?? null)
    })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-sm">
        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Add payment method</h2>
            <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!clientSecret && !error && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: 'stripe' } }}
            >
              <SetupForm onClose={onClose} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  )
}
