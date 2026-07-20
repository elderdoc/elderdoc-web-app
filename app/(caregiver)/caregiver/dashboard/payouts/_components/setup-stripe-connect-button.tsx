'use client'

import { useTransition } from 'react'
import { setupStripeConnect } from '@/domains/payments/actions'

export function SetupStripeConnectButton() {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await setupStripeConnect()
      if (result.url) {
        window.location.href = result.url
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm"
    >
      {isPending ? 'Setting up…' : 'Set Up Stripe Payouts'}
    </button>
  )
}
