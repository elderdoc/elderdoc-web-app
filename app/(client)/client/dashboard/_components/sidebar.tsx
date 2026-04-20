'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Bell, LogOut, Menu, User, X } from 'lucide-react'
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
  { href: '/client/dashboard/my-caregivers',  label: 'My Caregivers' },
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
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const avatar = userImage ? (
    <img src={userImage} alt={userName ?? 'User'} className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {userInitials}
    </span>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 h-14">
        <span className="text-lg font-bold tracking-tight">ElderDoc</span>
        <button onClick={() => setOpen(v => !v)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile top dropdown */}
      <div className={`lg:hidden fixed top-14 left-0 right-0 z-40 bg-card border-b border-border shadow-lg overflow-hidden transition-all duration-200 ${open ? 'max-h-[calc(100vh-3.5rem)] overflow-y-auto' : 'max-h-0'}`}>
        <div className="py-3">
          <nav className="space-y-1 px-3">
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
        </div>
        <div className="border-t border-border px-4 py-4 flex items-center gap-3">
          <div className="relative shrink-0">
            {avatar}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="flex-1 truncate text-sm font-medium">{userName ?? 'User'}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/client/dashboard/profile')} className="p-1.5 rounded-md hover:bg-accent">
              <User className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => router.push('/client/dashboard/notifications')} className="relative p-1.5 rounded-md hover:bg-accent">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => signOut({ callbackUrl: '/sign-in' })} className="p-1.5 rounded-md hover:bg-accent">
              <LogOut className="h-4 w-4 text-destructive" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card">
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
    </>
  )
}
