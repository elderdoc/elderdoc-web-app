'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV_LINKS = [
  { href: '/client/dashboard',                label: 'Home' },
  { href: '/client/dashboard/recipients',     label: 'Care Recipients' },
  { href: '/client/dashboard/requests',       label: 'Care Requests' },
  { href: '/client/dashboard/find-caregivers',label: 'Find Caregivers' },
  { href: '/client/dashboard/care-plans',     label: 'Care Plans' },
  { href: '/client/dashboard/calendar',       label: 'Calendar' },
]

interface SidebarProps {
  userName: string | null
  userInitials: string
  userImage: string | null
  unreadCount: number
}

export function Sidebar({ userName, userInitials, userImage, unreadCount }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card">
      {/* Wordmark */}
      <div className="px-6 py-5">
        <span className="text-xl font-bold tracking-tight text-foreground">ElderDoc</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV_LINKS.map((link) => {
          const isActive = link.href === '/client/dashboard'
            ? pathname === link.href
            : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              ].join(' ')}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: bell + user */}
      <div className="border-t border-border px-4 py-4 space-y-3">
        <Link href="/client/dashboard/notifications" className="relative flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {userImage ? (
              <img src={userImage} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {userInitials}
              </span>
            )}
            <span className="truncate text-sm font-medium">{userName ?? 'User'}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/sign-in' })}
            className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
