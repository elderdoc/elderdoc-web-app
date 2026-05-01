'use client'

import { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  CheckCircle2, XCircle, Info, Heart, Send, FileText,
  BookOpen, Calendar, CalendarX, PenLine, X, Trash2,
  UserCheck, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  icon?: React.ReactNode
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: string
  exiting: boolean
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ─── App-specific helpers ─────────────────────────────────────────────────────

export function useAppToast() {
  const { toast } = useToast()
  return {
    favoriteAdded: (name?: string) => toast({
      title: 'Added to favorites',
      description: name ? `${name} saved to your list` : 'Saved to your favorites',
      icon: <Heart className="h-4 w-4 fill-rose-400 text-rose-400" />,
    }),
    favoriteRemoved: (name?: string) => toast({
      title: 'Removed from favorites',
      description: name ? `${name} was removed` : undefined,
      variant: 'info',
      icon: <Heart className="h-4 w-4 text-muted-foreground/80" />,
    }),
    offerSent: (caregiverName?: string) => toast({
      title: 'Offer sent!',
      description: caregiverName
        ? `Your offer was sent to ${caregiverName}`
        : 'Your care offer has been sent',
      icon: <Send className="h-4 w-4" />,
    }),
    careRequestCreated: () => toast({
      title: 'Care request posted',
      description: 'Caregivers near you can now see your request',
      icon: <FileText className="h-4 w-4" />,
    }),
    carePlanSaved: () => toast({
      title: 'Care plan saved',
      description: 'Changes shared with the assigned caregiver',
      icon: <BookOpen className="h-4 w-4" />,
    }),
    shiftAdded: () => toast({
      title: 'Shift added',
      description: 'New shift scheduled on your calendar',
      icon: <Calendar className="h-4 w-4" />,
    }),
    shiftUpdated: () => toast({
      title: 'Shift updated',
      description: 'The shift time has been saved',
      icon: <PenLine className="h-4 w-4" />,
    }),
    shiftCancelled: (late?: boolean) => toast({
      title: late ? 'Shift cancelled · late fee' : 'Shift cancelled',
      description: late
        ? 'A $50 fee applies for cancellations under 4 hours notice'
        : 'The shift has been removed from your calendar',
      variant: late ? 'error' : 'info',
      icon: <CalendarX className="h-4 w-4" />,
    }),
    profileSaved: () => toast({
      title: 'Profile saved',
      description: 'Your changes have been applied',
      icon: <UserCheck className="h-4 w-4" />,
    }),
    recipientAdded: (name?: string) => toast({
      title: name ? `${name} added` : 'Recipient added',
      description: 'Added to your care recipients',
      icon: <Heart className="h-4 w-4" />,
    }),
    deleted: (label: string) => toast({
      title: `${label} deleted`,
      variant: 'info',
      icon: <Trash2 className="h-4 w-4" />,
    }),
    error: (msg?: string) => toast({
      title: 'Something went wrong',
      description: msg,
      variant: 'error',
    }),
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    const cleanup = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 320)
    timers.current.set(`exit-${id}`, cleanup)
  }, [])

  const toast = useCallback((opts: ToastOptions) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...opts, id, exiting: false }])
    const duration = opts.duration ?? 4500
    const t = setTimeout(() => dismiss(id), duration)
    timers.current.set(id, t)
  }, [dismiss])

  useEffect(() => {
    const t = timers.current
    return () => t.forEach(clearTimeout)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ─── Toaster ─────────────────────────────────────────────────────────────────

const VARIANT_ICON: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4" />,
  error:   <XCircle className="h-4 w-4" />,
  info:    <Info className="h-4 w-4" />,
}

const VARIANT_COLORS = {
  success: {
    iconBg:   'bg-[var(--forest-soft)] text-[var(--forest-deep)]',
    bar:      'bg-[var(--forest)]',
  },
  error: {
    iconBg:   'bg-rose-500/15 text-rose-400',
    bar:      'bg-rose-500',
  },
  info: {
    iconBg:   'bg-white/10 text-white/70',
    bar:      'bg-white/30',
  },
}

function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || toasts.length === 0) return null

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2.5 items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  )
}

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: string) => void
}) {
  const variant = t.variant ?? 'success'
  const colors = VARIANT_COLORS[variant]
  const icon = t.icon ?? VARIANT_ICON[variant]

  return (
    <div
      role="status"
      style={{ willChange: 'transform, opacity' }}
      className={cn(
        'flex items-start gap-3 rounded-2xl px-4 py-3.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]',
        'min-w-[300px] max-w-[380px]',
        'bg-[#16211c]/97 backdrop-blur-md border border-white/8',
        'transition-all duration-300 ease-out',
        t.exiting
          ? 'opacity-0 translate-y-1 scale-95'
          : 'opacity-100 translate-y-0 scale-100 animate-in slide-in-from-bottom-4 fade-in-0 duration-300',
      )}
    >
      {/* Icon */}
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5', colors.iconBg)}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[13.5px] font-semibold text-white leading-snug">{t.title}</p>
        {t.description && (
          <p className="mt-0.5 text-[12.5px] text-white/55 leading-snug">{t.description}</p>
        )}
      </div>

      {/* Close */}
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Bottom accent bar */}
      <div className={cn('absolute bottom-0 left-4 right-4 h-[2px] rounded-full opacity-50', colors.bar)} />
    </div>
  )
}
