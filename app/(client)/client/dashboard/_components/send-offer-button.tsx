'use client'

import { useState, useTransition } from 'react'
import { sendOffer } from '@/domains/matching/send-offer'

interface Props {
  requestId: string
  caregiverId: string
  caregiverName?: string | null
  score: number
  reason: string
}

const DEFAULT_MESSAGE = `Hi! You matched with my care request and I think you'd be a wonderful fit for what we're looking for. Your experience and skills align well with our needs, and I'd love to have you on board. Please review the details and let me know if you're interested. Looking forward to hearing from you!`

export function SendOfferButton({ requestId, caregiverId, caregiverName, score, reason }: Props) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setMessage(DEFAULT_MESSAGE)
    setError(null)
    setOpen(true)
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      try {
        await sendOffer(requestId, caregiverId, score, reason, message.trim() || DEFAULT_MESSAGE)
        setSent(true)
        setOpen(false)
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
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
      >
        Send Offer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-md p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold mb-1">
                Send offer{caregiverName ? ` to ${caregiverName}` : ''}
              </h2>
              <p className="text-sm text-muted-foreground">
                Add a personal message. The caregiver will see this when they receive your offer.
              </p>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none resize-none"
            />

            {error && <p className="text-xs text-destructive">{error}</p>}

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
                disabled={isPending || !message.trim()}
                className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? 'Sending…' : 'Send Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
