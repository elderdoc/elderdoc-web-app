'use client'

import Link from 'next/link'
import { ShiftCard } from './shift-card'
import type { ShiftCardData } from './shift-card'

type Tab = 'today' | 'upcoming' | 'history'

interface Props {
  activeTab: Tab
  today: ShiftCardData[]
  upcoming: ShiftCardData[]
  history: ShiftCardData[]
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'today',    label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'history',  label: 'History' },
]

function EmptyState({ tab }: { tab: Tab }) {
  if (tab === 'today')    return <p className="text-sm text-muted-foreground">No shifts scheduled for today.</p>
  if (tab === 'upcoming') return <p className="text-sm text-muted-foreground">No upcoming shifts.</p>
  return <p className="text-sm text-muted-foreground">No past shifts yet.</p>
}

export function ShiftsTabs({ activeTab, today, upcoming, history }: Props) {
  const items = activeTab === 'today' ? today : activeTab === 'upcoming' ? upcoming : history

  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map(({ key, label }) => {
          const count = key === 'today' ? today.length : key === 'upcoming' ? upcoming.length : history.length
          return (
            <Link
              key={key}
              href={`/caregiver/dashboard/shifts?tab=${key}`}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              <span className="ml-2 text-xs text-muted-foreground">{count}</span>
            </Link>
          )
        })}
      </div>

      {items.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="space-y-3">
          {items.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} canComplete={activeTab !== 'upcoming'} />
          ))}
        </div>
      )}
    </div>
  )
}
