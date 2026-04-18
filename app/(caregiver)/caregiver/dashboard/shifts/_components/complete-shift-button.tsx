'use client'

import { useTransition } from 'react'
import { completeShift } from '@/domains/payments/actions'

interface Props {
  shiftId: string
}

export function CompleteShiftButton({ shiftId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await completeShift(shiftId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      {isPending ? 'Completing…' : 'Complete'}
    </button>
  )
}
