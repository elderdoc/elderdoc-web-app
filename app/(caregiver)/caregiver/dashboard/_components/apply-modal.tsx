'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { applyToRequest } from '@/domains/caregivers/actions'

interface Props {
  requestId: string
  requestTitle: string
}

export function ApplyModal({ requestId, requestTitle }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [coverNote, setCoverNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setCoverNote('')
        setError(null)
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  function handleClose() {
    setCoverNote('')
    setError(null)
    setOpen(false)
  }

  function handleSubmit() {
    if (!coverNote.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await applyToRequest(requestId, coverNote.trim())
        handleClose()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap"
      >
        Apply
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md mx-4 rounded-xl bg-background p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-1">Apply to this request</h2>
            <p className="text-sm text-muted-foreground mb-5">{requestTitle}</p>
            <label className="block text-sm font-medium mb-2">
              Cover note <span className="text-destructive">*</span>
            </label>
            <textarea
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              maxLength={500}
              rows={5}
              required
              aria-required="true"
              className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none"
              placeholder="Introduce yourself and explain why you're a great fit…"
            />
            <p className="text-right text-xs text-muted-foreground mt-1 mb-3">{coverNote.length}/500</p>
            {error && (
              <p className="text-sm text-destructive mb-3">{error}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !coverNote.trim()}
                className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
              >
                {isPending ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
