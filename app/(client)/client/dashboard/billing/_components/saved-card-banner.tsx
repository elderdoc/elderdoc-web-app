'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { AddCardModal } from './add-card-modal'

interface Props {
  savedCard: { brand: string; last4: string } | null
  stripePublishableKey: string
}

export function SavedCardBanner({ savedCard, stripePublishableKey }: Props) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      {showModal && (
        <AddCardModal
          stripePublishableKey={stripePublishableKey}
          onClose={() => setShowModal(false)}
        />
      )}
      <div className="mb-8 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          {savedCard ? (
            <span className="text-sm">
              <span className="capitalize font-medium">{savedCard.brand}</span>
              {' '}···· {savedCard.last4}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">No payment method saved</span>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted"
        >
          {savedCard ? 'Change card' : 'Add payment method'}
        </button>
      </div>
    </>
  )
}
