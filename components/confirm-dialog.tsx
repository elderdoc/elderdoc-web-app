'use client'

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void
  isPending?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  isPending,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className={[
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              variant === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-[var(--forest-soft)] text-[var(--forest-deep)]',
            ].join(' ')}>
              {variant === 'destructive' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <DialogTitle className="text-[17px] leading-tight font-semibold">{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-2 text-[14px] leading-[1.55] text-foreground/70">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-[var(--cream-deep)]/30 rounded-b-[18px]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-10 items-center rounded-full border border-border bg-card px-4 text-[13.5px] font-medium text-foreground hover:border-foreground/30 hover:bg-muted transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={[
              'inline-flex h-10 items-center rounded-full px-5 text-[13.5px] font-medium transition-all disabled:opacity-50',
              variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-[0_8px_18px_-6px_rgba(177,68,68,0.4)]'
                : 'bg-primary text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)]',
            ].join(' ')}
          >
            {isPending ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
