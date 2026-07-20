'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { openDispute } from '@/domains/payments/actions'

interface Props {
  jobId: string
  paymentId?: string
  onClose: () => void
}

export function DisputeModal({ jobId, paymentId, onClose }: Props) {
  const [reason, setReason] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    const result = await openDispute(jobId, reason, paymentId)
    if (result.error) {
      setError(result.error)
      setIsPending(false)
      return
    }
    setIsPending(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-sm">
        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Open a dispute</h2>
            <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Describe the issue. The payment will be held until the dispute is resolved.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={10}
              rows={4}
              placeholder="Describe the issue…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? 'Submitting…' : 'Submit dispute'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
