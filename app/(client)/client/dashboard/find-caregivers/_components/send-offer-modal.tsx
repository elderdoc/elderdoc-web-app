'use client'

import { useState } from 'react'
import { sendOffer } from '@/domains/matching/send-offer'

interface Props {
  caregiverId: string
  activeRequests: { id: string; title: string | null; careType: string }[]
  alreadyOffered?: boolean
}

type State = 'idle' | 'open' | 'pending' | 'sent' | 'error'

export function SendOfferModal({ caregiverId, activeRequests, alreadyOffered }: Props) {
  const [state, setState] = useState<State>(alreadyOffered ? 'sent' : 'idle')
  const [selectedRequestId, setSelectedRequestId] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (activeRequests.length === 0) {
    return (
      <button
        type="button"
        disabled
        title="Create a care request first."
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium opacity-40 cursor-not-allowed"
      >
        Send Offer
      </button>
    )
  }

  if (state === 'sent') {
    return (
      <button
        type="button"
        disabled
        className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium opacity-90 cursor-not-allowed"
      >
        Offer Sent ✓
      </button>
    )
  }

  async function handleConfirm() {
    if (!selectedRequestId) return
    setErrorMessage(null)
    setState('pending')
    try {
      await sendOffer(selectedRequestId, caregiverId, 0, 'Manually selected')
      setState('sent')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send offer.')
      setState('error')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setState('open')}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
      >
        Send Offer
      </button>

      {(state === 'open' || state === 'pending' || state === 'error') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { if (state !== 'pending') { setState('idle'); setErrorMessage(null) } }}
        >
          <div
            className="bg-background rounded-xl border border-border shadow-lg w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-offer-title"
          >
            <h2 id="send-offer-title" className="text-base font-semibold">Send Offer</h2>
            <p className="text-sm text-muted-foreground">
              Select which care request to send this offer for:
            </p>

            <select
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Choose a request…</option>
              {activeRequests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title ?? r.careType}
                </option>
              ))}
            </select>

            {errorMessage && (
              <p className="text-xs text-destructive">{errorMessage}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setState('idle'); setErrorMessage(null) }}
                disabled={state === 'pending'}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedRequestId || state === 'pending'}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
              >
                {state === 'pending' ? 'Sending…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
