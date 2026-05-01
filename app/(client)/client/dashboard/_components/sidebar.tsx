'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Bell, LogOut, Menu, User, X, Home, Users, FileText, Search, UserCheck,
  ClipboardList, Calendar, CreditCard, MessageSquare, Sparkles,
} from 'lucide-react'
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
  { href: '/client/dashboard',                label: 'Home',            icon: Home },
  { href: '/client/dashboard/recipients',     label: 'Care Recipients', icon: Users },
  { href: '/client/dashboard/requests',       label: 'Care Requests',   icon: FileText },
  { href: '/client/dashboard/matches',        label: 'Matches',         icon: Sparkles },
  { href: '/client/dashboard/find-caregivers',label: 'Find Caregivers', icon: Search },
  { href: '/client/dashboard/my-caregivers',  label: 'My Caregivers',   icon: UserCheck },
  { href: '/client/dashboard/care-plans',     label: 'Care Plans',      icon: ClipboardList },
  { href: '/client/dashboard/calendar',       label: 'Calendar',        icon: Calendar },
  { href: '/client/dashboard/billing',        label: 'Billing',         icon: CreditCard },
  { href: '/client/dashboard/messages',       label: 'Messages',        icon: MessageSquare },
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
    <img src={userImage} alt={userName ?? 'User'} className="h-9 w-9 rounded-full object-cover ring-1 ring-border" />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--forest-soft)] text-[12px] font-semibold text-[var(--forest-deep)]">
      {userInitials}
    </span>
  )

  const renderNavLink = (item: typeof NAV_LINKS[number]) => {
    const isActive = item.href === '/client/dashboard'
      ? pathname === item.href
      : pathname.startsWith(item.href)
    const isMessages = item.href === '/client/dashboard/messages'
    const badge = isMessages && unreadMessageCount > 0 ? unreadMessageCount : 0
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        className={[
          'group/nav flex items-center justify-between gap-3 px-3 py-2.5 text-[14px] rounded-[10px] transition-all',
          isActive
            ? 'bg-[var(--forest-soft)] text-[var(--forest-deep)] font-medium'
            : 'text-foreground/70 hover:bg-muted hover:text-foreground',
        ].join(' ')}
      >
        <span className="flex items-center gap-3">
          <Icon className={`h-[17px] w-[17px] ${isActive ? 'text-primary' : 'text-foreground/60'}`} />
          {item.label}
        </span>
        {badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-md px-5 h-14">
        <Link href="/client/dashboard" className="text-[18px] font-semibold tracking-tight">
          Elderdoc
        </Link>
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted text-foreground"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      <div className={`lg:hidden fixed top-14 left-0 right-0 z-40 bg-background border-b border-border shadow-[0_24px_60px_-12px_rgba(15,20,16,0.12)] overflow-hidden transition-all duration-300 ${open ? 'max-h-[calc(100vh-3.5rem)] overflow-y-auto' : 'max-h-0'}`}>
        <nav className="py-3 px-3 space-y-1">
          {NAV_LINKS.map(renderNavLink)}
        </nav>
        <div className="border-t border-border px-4 py-4 flex items-center gap-3 bg-[var(--cream-deep)]/40">
          <div className="relative shrink-0">
            {avatar}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="flex-1 truncate text-[14px] font-medium">{userName ?? 'User'}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => router.push('/client/dashboard/profile')} className="p-2 rounded-full hover:bg-muted">
              <User className="h-4 w-4 text-foreground/70" />
            </button>
            <button onClick={() => router.push('/client/dashboard/notifications')} className="p-2 rounded-full hover:bg-muted">
              <Bell className="h-4 w-4 text-foreground/70" />
            </button>
            <button onClick={() => signOut({ callbackUrl: '/sign-in' })} className="p-2 rounded-full hover:bg-destructive/10">
              <LogOut className="h-4 w-4 text-destructive" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-[260px] shrink-0 flex-col border-r border-border bg-card">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <Link href="/client/dashboard" className="text-[22px] font-semibold tracking-tight">
            Elderdoc
          </Link>
          <div className="mt-1 text-[12px] text-muted-foreground">Family dashboard</div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          {NAV_LINKS.map(renderNavLink)}
        </nav>

        <div className="border-t border-border bg-[var(--cream-deep)]/30">
          <DropdownMenu>
            <DropdownMenuTrigger className="group/account flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted outline-none">
              <div className="relative shrink-0">
                {avatar}
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-card">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-[14px] font-medium">{userName ?? 'User'}</div>
                <div className="text-[12px] text-muted-foreground">View profile</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="text-muted-foreground transition-transform group-data-[state=open]/account:rotate-180">
                <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[12px] text-muted-foreground">{userName ?? 'User'}</DropdownMenuLabel>
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
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
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
