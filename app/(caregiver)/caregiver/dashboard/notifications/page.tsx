import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Bell, Inbox, Briefcase, CheckCircle2, XCircle, Calendar, MessageSquare,
  Wallet, Sparkles, AlertCircle, ArrowRight,
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
    case 'offer_received':
      return { icon: Inbox, color: 'text-[var(--forest-deep)]', bg: 'bg-[var(--forest-soft)]', category: 'New offer' }
    case 'application_accepted':
      return { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100', category: 'Application accepted' }
    case 'application_declined':
      return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', category: 'Application declined' }
    case 'job_started':
      return { icon: Briefcase, color: 'text-[var(--forest-deep)]', bg: 'bg-[var(--forest-soft)]', category: 'Job started' }
    case 'shift_scheduled':
      return { icon: Calendar, color: 'text-blue-700', bg: 'bg-blue-100', category: 'Shift scheduled' }
    case 'shift_completed':
      return { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100', category: 'Shift completed' }
    case 'shift_cancelled':
      return { icon: XCircle, color: 'text-amber-800', bg: 'bg-amber-100', category: 'Shift cancelled' }
    case 'shift_edited':
      return { icon: Calendar, color: 'text-amber-800', bg: 'bg-amber-100', category: 'Shift updated' }
    case 'message_received':
      return { icon: MessageSquare, color: 'text-foreground', bg: 'bg-muted', category: 'New message' }
    case 'payment_received':
    case 'payment_completed':
      return { icon: Wallet, color: 'text-emerald-700', bg: 'bg-emerald-100', category: 'Payment' }
    case 'new_job_match':
    case 'new_request':
      return { icon: Sparkles, color: 'text-[var(--forest-deep)]', bg: 'bg-[var(--forest-soft)]', category: 'New match' }
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
  const client = payload.clientName as string | undefined
  const date = payload.date as string | undefined
  const startTime = payload.startTime as string | undefined
  const endTime = payload.endTime as string | undefined
  const totalDollars = payload.totalDollars as string | undefined
  const message = payload.message as string | undefined
  const body = payload.body as string | undefined

  const pills: { label: string; value: string }[] = []
  if (careType) pills.push({ label: 'Care', value: careType })
  if (recipient) pills.push({ label: 'For', value: recipient })
  if (client) pills.push({ label: 'Client', value: client })
  if (date && startTime) pills.push({ label: 'When', value: `${date}${endTime ? ` · ${startTime}–${endTime}` : ` · ${startTime}`}` })
  else if (date) pills.push({ label: 'Date', value: date })
  if (totalDollars) pills.push({ label: 'Amount', value: `$${totalDollars}` })

  // Title varies per type
  let title = formatType(type)
  if (type === 'offer_received') title = `New offer${client ? ` from ${client}` : ''}${careType ? ` for ${careType}` : ''}`
  else if (type === 'application_accepted') title = `Application accepted${client ? ` by ${client}` : ''}`
  else if (type === 'application_declined') title = 'Your application was declined'
  else if (type === 'job_started') title = `Job started${client ? ` with ${client}` : ''}`
  else if (type === 'shift_scheduled') title = `New shift scheduled${date ? ` on ${date}` : ''}`
  else if (type === 'shift_completed') title = 'Shift marked completed'
  else if (type === 'shift_cancelled') title = `Shift cancelled${date ? ` on ${date}` : ''}`
  else if (type === 'shift_edited') title = 'Shift time updated'
  else if (type === 'message_received') title = `New message${client ? ` from ${client}` : ''}`
  else if (type === 'payment_completed' || type === 'payment_received') title = `Payment processed${totalDollars ? ` — $${totalDollars}` : ''}`
  else if (type === 'new_job_match' || type === 'new_request') title = `New job match${careType ? ` — ${careType}` : ''}`

  return { title, body: message ?? body, pills }
}

function caregiverHref(type: string, payload: Record<string, string> | null): string {
  const requestId = payload?.requestId
  const jobId     = payload?.jobId
  const offerId   = payload?.offerId ?? payload?.matchId

  if (type === 'offer_received') {
    if (offerId) return `/caregiver/dashboard/offers?offerId=${offerId}`
    return '/caregiver/dashboard/offers'
  }
  if (type === 'application_accepted' || type === 'application_declined') {
    if (jobId) return `/caregiver/dashboard/messages/${jobId}`
    return '/caregiver/dashboard/my-jobs'
  }
  if (type === 'job_started') {
    if (jobId) return `/caregiver/dashboard/messages/${jobId}`
    return '/caregiver/dashboard/my-jobs'
  }
  if (type === 'shift_scheduled' || type === 'shift_completed' || type === 'shift_cancelled' || type === 'shift_edited') {
    return '/caregiver/dashboard/shifts'
  }
  if (type === 'message_received') {
    if (jobId) return `/caregiver/dashboard/messages/${jobId}`
    return '/caregiver/dashboard/messages'
  }
  if (type === 'payment_received' || type === 'payment_completed') {
    return '/caregiver/dashboard/payouts'
  }
  if (type === 'new_job_match' || type === 'new_request') {
    return '/caregiver/dashboard/find-jobs'
  }

  if (jobId)     return `/caregiver/dashboard/messages/${jobId}`
  if (offerId)   return `/caregiver/dashboard/offers?offerId=${offerId}`
  if (requestId) return '/caregiver/dashboard/find-jobs'
  return '/caregiver/dashboard'
}

export default async function NotificationsPage() {
  const session = await requireRole('caregiver')
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

  const unreadCount = rows.filter(r => !r.read).length

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
            const href = caregiverHref(n.type, payload)
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
