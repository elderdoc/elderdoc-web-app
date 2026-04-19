'use client'

import { useState, useTransition } from 'react'
import { confirmCashPayment } from '@/domains/payments/actions'

export function ConfirmCashButton({ paymentId, amount }: { paymentId: string; amount: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await confirmCashPayment(paymentId)
      setOpen(false)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-1 text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Confirm received
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold mb-1">Confirm cash received</h2>
              <p className="text-sm text-muted-foreground">
                Are you sure you received <span className="font-medium text-foreground">${amount}</span> in cash from the client? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? 'Confirming…' : 'Yes, confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
