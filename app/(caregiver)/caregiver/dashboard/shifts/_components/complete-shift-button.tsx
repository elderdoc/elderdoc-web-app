'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeShift } from '@/domains/payments/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface Props {
  shiftId: string
}

export function CompleteShiftButton({ shiftId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)

  function handleComplete() {
    startTransition(async () => {
      await completeShift(shiftId)
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        disabled={isPending}
        className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Completing…' : 'Complete'}
      </button>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Mark shift as complete?"
        description="This will record the shift as completed and trigger payment processing."
        confirmLabel="Yes, Complete"
        onConfirm={() => { setConfirm(false); handleComplete() }}
        isPending={isPending}
      />
    </>
  )
}
