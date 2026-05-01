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

const NAV_GROUPS: { label: string; items: { href: string; label: string; index: string }[] }[] = [
  {
    label: 'Overview',
    items: [
      { href: '/client/dashboard',                label: 'Home',           index: '01' },
    ],
  },
  {
    label: 'Care',
    items: [
      { href: '/client/dashboard/recipients',     label: 'Recipients',     index: '02' },
      { href: '/client/dashboard/requests',       label: 'Requests',       index: '03' },
      { href: '/client/dashboard/find-caregivers',label: 'Find Caregivers',index: '04' },
      { href: '/client/dashboard/my-caregivers',  label: 'My Caregivers',  index: '05' },
      { href: '/client/dashboard/care-plans',     label: 'Care Plans',     index: '06' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/client/dashboard/calendar',       label: 'Calendar',       index: '07' },
      { href: '/client/dashboard/billing',        label: 'Billing',        index: '08' },
      { href: '/client/dashboard/messages',       label: 'Messages',       index: '09' },
    ],
  },
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
    <img src={userImage} alt={userName ?? 'User'} className="h-9 w-9 rounded-full object-cover ring-1 ring-foreground/15" />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-mono font-semibold uppercase tracking-wider text-background">
      {userInitials}
    </span>
  )

  const renderNavLink = (item: { href: string; label: string; index: string }) => {
    const isActive = item.href === '/client/dashboard'
      ? pathname === item.href
      : pathname.startsWith(item.href)
    const isMessages = item.href === '/client/dashboard/messages'
    const badge = isMessages && unreadMessageCount > 0 ? unreadMessageCount : 0
    return (
      <Link
        key={item.href}
        href={item.href}
        className={[
          'group/nav relative flex items-center justify-between py-2 pl-3 pr-2 text-[13px] transition-colors',
          isActive
            ? 'text-foreground'
            : 'text-foreground/60 hover:text-foreground',
        ].join(' ')}
      >
        {/* Active indicator — left rule */}
        <span
          className={[
            'absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 transition-all',
            isActive ? 'bg-foreground' : 'bg-transparent group-hover/nav:bg-foreground/30',
          ].join(' ')}
        />
        <span className="flex items-baseline gap-3">
          <span className={[
            'font-mono text-[10px] tracking-wider tabular-nums',
            isActive ? 'text-[var(--terracotta)]' : 'text-foreground/40',
          ].join(' ')}>
            {item.index}
          </span>
          <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
        </span>
        {badge > 0 && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--terracotta)] px-1 font-mono text-[9px] font-bold tabular-nums text-background">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* === Mobile top bar === */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-border bg-background/85 backdrop-blur-md px-5 h-14">
        <Link href="/client/dashboard" className="font-display text-[20px] tracking-[-0.04em] leading-none">
          Elderdoc
        </Link>
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 text-foreground transition-colors hover:bg-foreground/[0.04]"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* === Mobile dropdown panel === */}
      <div className={`lg:hidden fixed top-14 left-0 right-0 z-40 bg-background border-b border-border shadow-[0_24px_60px_-12px_rgba(15,20,16,0.18)] overflow-hidden transition-all duration-300 ${open ? 'max-h-[calc(100vh-3.5rem)] overflow-y-auto' : 'max-h-0'}`}>
        <div className="py-5 px-5 space-y-6">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
                {group.label}
              </div>
              <nav className="space-y-0.5">
                {group.items.map(renderNavLink)}
              </nav>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-5 py-4 flex items-center gap-3 bg-[var(--cream-deep)]/40">
          <div className="relative shrink-0">
            {avatar}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--terracotta)] font-mono text-[8px] font-bold text-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="flex-1 truncate text-[13px] font-medium">{userName ?? 'User'}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => router.push('/client/dashboard/profile')} className="p-2 rounded-full hover:bg-foreground/[0.06]">
              <User className="h-3.5 w-3.5 text-foreground/70" />
            </button>
            <button onClick={() => router.push('/client/dashboard/notifications')} className="relative p-2 rounded-full hover:bg-foreground/[0.06]">
              <Bell className="h-3.5 w-3.5 text-foreground/70" />
            </button>
            <button onClick={() => signOut({ callbackUrl: '/sign-in' })} className="p-2 rounded-full hover:bg-destructive/10">
              <LogOut className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        </div>
      </div>

      {/* === Desktop sidebar === */}
      <aside className="hidden lg:flex h-screen w-64 shrink-0 flex-col border-r border-border bg-background">
        {/* Masthead */}
        <div className="px-6 pt-7 pb-5 border-b border-border">
          <div className="flex items-baseline justify-between">
            <Link href="/client/dashboard" className="font-display text-[24px] tracking-[-0.045em] leading-none">
              Elderdoc
            </Link>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Vol.1
            </span>
          </div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Family · Dashboard
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-4 pt-6 pb-4 space-y-7">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2.5 px-3">
                {group.label}
              </div>
              <div className="space-y-px">
                {group.items.map(renderNavLink)}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer / Account */}
        <div className="border-t border-border bg-[var(--cream-deep)]/30">
          <DropdownMenu>
            <DropdownMenuTrigger className="group/account flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-foreground/[0.025] outline-none">
              <div className="relative shrink-0">
                {avatar}
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--terracotta)] font-mono text-[9px] font-bold text-background ring-2 ring-background">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-[13px] font-medium leading-tight">{userName ?? 'User'}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-0.5">
                  Member
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground transition-transform group-data-[state=open]/account:rotate-180">
                <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {userName ?? 'User'}
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/client/dashboard/profile')}>
                <User className="h-3.5 w-3.5" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/client/dashboard/notifications')}>
                <Bell className="h-3.5 w-3.5" />
                <span className="flex-1">Notifications</span>
                {unreadCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--terracotta)] font-mono text-[9px] font-bold text-background">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => signOut({ callbackUrl: '/sign-in' })}>
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}
