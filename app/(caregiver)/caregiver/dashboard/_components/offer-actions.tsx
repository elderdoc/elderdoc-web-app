'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptOffer, declineOffer } from '@/domains/caregivers/actions'

interface Props {
  matchId: string
}

export function OfferActions({ matchId }: Props) {
  const router = useRouter()
  const [isAccepting, startAccept] = useTransition()
  const [isDeclining, startDecline] = useTransition()

  function handleAccept() {
    startAccept(async () => {
      await acceptOffer(matchId)
      router.refresh()
    })
  }

  function handleDecline() {
    startDecline(async () => {
      await declineOffer(matchId)
      router.refresh()
    })
  }

  return (
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
  )
}
