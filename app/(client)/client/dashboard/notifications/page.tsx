import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Bell, Sparkles, Inbox, MessageSquare, CreditCard, Calendar, CheckCircle2,
  XCircle, ClipboardList, Heart, AlertCircle, ArrowRight,
} from 'lucide-react'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { notifications } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

function formatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface NotifMeta {
  icon: React.ElementType
  color: string
  bg: string
  category: string
}

function notifMeta(type: string): NotifMeta {
  switch (type) {
    case 'match_found':
    case 'new_match':
      return { icon: Sparkles, color: 'text-[var(--forest-deep)]', bg: 'bg-[var(--forest-soft)]', category: 'New match' }
    case 'offer_accepted':
      return { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100', category: 'Offer accepted' }
    case 'offer_received':
      return { icon: Inbox, color: 'text-[var(--forest-deep)]', bg: 'bg-[var(--forest-soft)]', category: 'New offer' }
    case 'offer_declined':
      return { icon: XCircle, color: 'text-amber-800', bg: 'bg-amber-100', category: 'Offer declined' }
    case 'application_received':
      return { icon: Inbox, color: 'text-blue-700', bg: 'bg-blue-100', category: 'New application' }
    case 'message_received':
      return { icon: MessageSquare, color: 'text-foreground', bg: 'bg-muted', category: 'New message' }
    case 'shift_scheduled':
      return { icon: Calendar, color: 'text-blue-700', bg: 'bg-blue-100', category: 'Shift scheduled' }
    case 'shift_completed':
      return { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100', category: 'Shift completed' }
    case 'shift_cancelled':
      return { icon: XCircle, color: 'text-amber-800', bg: 'bg-amber-100', category: 'Shift cancelled' }
    case 'payment_received':
    case 'payment_sent':
    case 'payment_completed':
      return { icon: CreditCard, color: 'text-emerald-700', bg: 'bg-emerald-100', category: 'Payment' }
    case 'billing_charged':
      return { icon: CreditCard, color: 'text-foreground', bg: 'bg-muted', category: 'Billing' }
    case 'billing_no_card':
      return { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', category: 'Action needed' }
    case 'care_plan_updated':
      return { icon: ClipboardList, color: 'text-[var(--forest-deep)]', bg: 'bg-[var(--forest-soft)]', category: 'Care plan' }
    default:
      return { icon: Bell, color: 'text-foreground', bg: 'bg-muted', category: formatType(type) }
  }
}

function buildDetails(type: string, payload: Record<string, any> | null): {
  title: string
  body?: string
  pills: { label: string; value: string }[]
} {
  if (!payload) return { title: formatType(type), pills: [] }
  const careType = (payload.careType as string | undefined)?.replace(/-/g, ' ')
  const recipient = payload.recipientName as string | undefined
  const caregiver = payload.caregiverName as string | undefined
  const date = payload.date as string | undefined
  const startTime = payload.startTime as string | undefined
  const endTime = payload.endTime as string | undefined
  const totalDollars = payload.totalDollars as string | undefined
  const message = payload.message as string | undefined
  const body = payload.body as string | undefined

  const pills: { label: string; value: string }[] = []
  if (careType) pills.push({ label: 'Care', value: careType })
  if (recipient) pills.push({ label: 'For', value: recipient })
  if (caregiver) pills.push({ label: 'Caregiver', value: caregiver })
  if (date && startTime) pills.push({ label: 'When', value: `${date}${endTime ? ` · ${startTime}–${endTime}` : ` · ${startTime}`}` })
  else if (date) pills.push({ label: 'Date', value: date })
  if (totalDollars) pills.push({ label: 'Amount', value: `$${totalDollars}` })

  let title = formatType(type)
  if (type === 'match_found' || type === 'new_match') title = `New caregiver match${caregiver ? ` — ${caregiver}` : ''}`
  else if (type === 'offer_accepted') title = `${caregiver ?? 'Caregiver'} accepted your offer`
  else if (type === 'offer_received') title = `New offer${caregiver ? ` from ${caregiver}` : ''}`
  else if (type === 'application_received') title = `New application${caregiver ? ` from ${caregiver}` : ''}${careType ? ` — ${careType}` : ''}`
  else if (type === 'message_received') title = `New message${caregiver ? ` from ${caregiver}` : ''}`
  else if (type === 'shift_scheduled') title = `Shift scheduled${date ? ` on ${date}` : ''}${caregiver ? ` with ${caregiver}` : ''}`
  else if (type === 'shift_completed') title = `Shift completed${caregiver ? ` by ${caregiver}` : ''}`
  else if (type === 'shift_cancelled') title = `Shift cancelled${date ? ` on ${date}` : ''}`
  else if (type === 'payment_completed' || type === 'payment_sent') title = `Payment processed${totalDollars ? ` — $${totalDollars}` : ''}`
  else if (type === 'billing_charged') title = `Weekly billing — $${totalDollars ?? '0.00'}`
  else if (type === 'billing_no_card') title = 'Action needed: add a payment method'
  else if (type === 'care_plan_updated') title = `Care plan updated${recipient ? ` for ${recipient}` : ''}`

  return { title, body: message ?? body, pills }
}

function clientHref(type: string, payload: Record<string, string> | null): string {
  const requestId          = payload?.requestId
  const jobId              = payload?.jobId
  const caregiverProfileId = payload?.caregiverProfileId
  const recipientId        = payload?.recipientId

  if (type === 'match_found' || type === 'offer_accepted') {
    if (caregiverProfileId) return `/client/dashboard/find-caregivers/${caregiverProfileId}`
    if (requestId)          return `/client/dashboard/requests/${requestId}`
  }
  if (type === 'offer_received' || type === 'offer_declined' || type === 'application_received') {
    if (requestId) return `/client/dashboard/requests/${requestId}`
  }
  if (type === 'message_received') {
    if (jobId) return `/client/dashboard/messages/${jobId}`
  }
  if (type === 'shift_scheduled' || type === 'shift_completed' || type === 'shift_cancelled') {
    if (jobId) return `/client/dashboard/messages/${jobId}`
  }
  if (type === 'payment_received' || type === 'payment_sent' || type === 'payment_completed' || type === 'billing_charged' || type === 'billing_no_card') {
    return '/client/dashboard/billing'
  }
  if (type === 'care_plan_updated' && recipientId) {
    return `/client/dashboard/care-plans/${recipientId}`
  }

  if (caregiverProfileId) return `/client/dashboard/find-caregivers/${caregiverProfileId}`
  if (recipientId)        return `/client/dashboard/recipients/${recipientId}`
  if (requestId)          return `/client/dashboard/requests/${requestId}`
  if (jobId)              return `/client/dashboard/messages/${jobId}`
  return '/client/dashboard'
}

export default async function NotificationsPage() {
  const session = await requireRole('client')
  const userId = session.user.id!

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50)

  if (rows.some((r) => !r.read)) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId))
  }

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 max-w-[1100px] mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[13px] font-medium text-primary mb-2">
          <Bell className="h-3.5 w-3.5" />
          Notifications
        </div>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-[1.15]">
              All notifications
            </h1>
            <p className="mt-1.5 text-[14.5px] text-muted-foreground">
              Your recent activity and updates.
            </p>
          </div>
          {rows.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-[12.5px] font-medium tabular-nums">
              <span className="text-muted-foreground">Total</span>
              <span className="text-foreground">{rows.length}</span>
            </span>
          )}
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-[16px] border-2 border-dashed border-border bg-card p-12 text-center max-w-2xl mx-auto">
          <div className="mx-auto h-14 w-14 rounded-full bg-[var(--forest-soft)] flex items-center justify-center mb-5">
            <Bell className="h-6 w-6 text-[var(--forest-deep)]" />
          </div>
          <h3 className="text-[18px] font-semibold">All caught up</h3>
          <p className="mt-2 text-[14px] text-muted-foreground">
            We&apos;ll let you know when there&apos;s something new.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((n) => {
            const payload = n.payload as Record<string, string> | null
            const meta = notifMeta(n.type)
            const Icon = meta.icon
            const details = buildDetails(n.type, payload)
            const href = clientHref(n.type, payload)
            return (
              <Link
                key={n.id}
                href={href}
                className="group/n block rounded-[14px] border border-border bg-card p-4 transition-all hover:border-foreground/15 hover:shadow-[0_8px_24px_-12px_rgba(15,20,16,0.1)]"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={`text-[11.5px] font-medium uppercase tracking-wide ${meta.color}`}>
                        {meta.category}
                      </span>
                      <span className="text-[11.5px] text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="mt-1 text-[14.5px] font-semibold text-foreground leading-snug">
                      {details.title}
                    </h3>
                    {details.body && (
                      <p className="mt-1 text-[13px] text-foreground/70 leading-snug line-clamp-2">{details.body}</p>
                    )}
                    {details.pills.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {details.pills.map((p, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11.5px]">
                            <span className="text-muted-foreground">{p.label}:</span>
                            <span className="font-medium capitalize">{p.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-foreground/30 transition-all group-hover/n:translate-x-0.5 group-hover/n:text-primary mt-1" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
