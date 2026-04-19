'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Bell, LogOut, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NAV_LINKS = [
  { href: '/client/dashboard',                label: 'Home' },
  { href: '/client/dashboard/recipients',     label: 'Care Recipients' },
  { href: '/client/dashboard/requests',       label: 'Care Requests' },
  { href: '/client/dashboard/find-caregivers',label: 'Find Caregivers' },
  { href: '/client/dashboard/care-plans',     label: 'Care Plans' },
  { href: '/client/dashboard/calendar',       label: 'Calendar' },
  { href: '/client/dashboard/billing',        label: 'Billing' },
  { href: '/client/dashboard/messages',       label: 'Messages' },
]

interface SidebarProps {
  userName: string | null
  userInitials: string
  userImage: string | null
  unreadCount: number
  unreadMessageCount: number
}

export function Sidebar({ userName, userInitials, userImage, unreadCount, unreadMessageCount }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const avatar = userImage ? (
    <img src={userImage} alt={userName ?? 'User'} className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {userInitials}
    </span>
  )

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="px-6 py-5">
        <span className="text-xl font-bold tracking-tight text-foreground">ElderDoc</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_LINKS.map((link) => {
          const isActive = link.href === '/client/dashboard'
            ? pathname === link.href
            : pathname.startsWith(link.href)
          const isMessages = link.href === '/client/dashboard/messages'
          const badge = isMessages && unreadMessageCount > 0 ? unreadMessageCount : 0
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              ].join(' ')}
            >
              <span>{link.label}</span>
              {badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border px-4 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-accent outline-none">
            <div className="relative shrink-0">
              {avatar}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="truncate text-sm font-medium">{userName ?? 'User'}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">{userName ?? 'User'}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/client/dashboard/profile')}>
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/client/dashboard/notifications')}>
              <Bell className="h-4 w-4" />
              <span className="flex-1">Notifications</span>
              {unreadCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => signOut({ callbackUrl: '/sign-in' })}>
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
