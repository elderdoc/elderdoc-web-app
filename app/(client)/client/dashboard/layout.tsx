import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { notifications, messages, jobs } from '@/db/schema'
import { eq, and, count, ne } from 'drizzle-orm'
import { Sidebar } from './_components/sidebar'

export default async function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole('client')
  const userId = session.user.id!

  const [[unreadRow], [unreadMsgRow]] = await Promise.all([
    db.select({ value: count() }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false))),
    db.select({ value: count() }).from(messages)
      .innerJoin(jobs, eq(messages.jobId, jobs.id))
      .where(and(eq(jobs.clientId, userId), ne(messages.senderId, userId), eq(messages.read, false))),
  ])

  const unreadCount = Number(unreadRow?.value ?? 0)
  const unreadMessageCount = Number(unreadMsgRow?.value ?? 0)

  const name = session.user.name ?? null
  const image = session.user.image ?? null
  const initials = name
    ? name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={name}
        userInitials={initials}
        userImage={image}
        unreadCount={unreadCount}
        unreadMessageCount={unreadMessageCount}
      />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">{children}</main>
    </div>
  )
}
