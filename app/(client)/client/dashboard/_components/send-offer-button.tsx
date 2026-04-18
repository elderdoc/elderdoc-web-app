'use client'

import { useState, useTransition } from 'react'
import { sendOffer } from '@/domains/matching/send-offer'

interface Props {
  requestId: string
  caregiverId: string
  score: number
  reason: string
}

export function SendOfferButton({ requestId, caregiverId, score, reason }: Props) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      try {
        await sendOffer(requestId, caregiverId, score, reason)
        setSent(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send offer.')
      }
    })
  }

  if (sent) {
    return (
      <button
        type="button"
        disabled
        className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium opacity-80 cursor-default"
      >
        Offer Sent ✓
      </button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
      >
        {isPending ? 'Sending…' : 'Send Offer'}
      </button>
    </div>
  )
}
