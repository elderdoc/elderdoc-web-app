'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptOffer, declineOffer } from '@/domains/caregivers/actions'

interface Props {
  matchId: string
}

export function OfferActions({ matchId }: Props) {
  const router = useRouter()
  const [isAccepting, startAccept] = useTransition()
  const [isDeclining, startDecline] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAccept() {
    setError(null)
    startAccept(async () => {
      try {
        await acceptOffer(matchId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to accept offer.')
      }
    })
  }

  function handleDecline() {
    setError(null)
    startDecline(async () => {
      try {
        await declineOffer(matchId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to decline offer.')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={handleDecline}
          disabled={isDeclining || isAccepting}
          className="px-4 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground disabled:opacity-40 transition-colors"
        >
          {isDeclining ? 'Declining…' : 'Decline'}
        </button>
        <button
          type="button"
          onClick={handleAccept}
          disabled={isAccepting || isDeclining}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
        >
          {isAccepting ? 'Accepting…' : 'Accept'}
        </button>
      </div>
    </div>
  )
}
