import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { notifications } from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { Sidebar } from './_components/sidebar'

export default async function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole('client')
  const userId = session.user.id!

  const [unreadRow] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))

  const unreadCount = Number(unreadRow?.value ?? 0)

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
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
