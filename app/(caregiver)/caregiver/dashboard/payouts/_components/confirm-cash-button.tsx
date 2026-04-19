'use client'

import { useTransition } from 'react'
import { confirmCashPayment } from '@/domains/payments/actions'

export function ConfirmCashButton({ paymentId }: { paymentId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await confirmCashPayment(paymentId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="mt-1 text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      {isPending ? 'Confirming…' : 'Confirm received'}
    </button>
  )
}
