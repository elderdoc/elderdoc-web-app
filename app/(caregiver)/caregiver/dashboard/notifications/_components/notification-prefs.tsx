'use client'

import { useState, useTransition } from 'react'
import { Mail, MessageSquare } from 'lucide-react'
import { updateNotificationPrefs } from '@/domains/auth/notification-prefs'

export function NotificationPrefs({
  initialEmail, initialSms, phone, email,
}: { initialEmail: boolean; initialSms: boolean; phone: string | null; email: string }) {
  const [notifyEmail, setNotifyEmail] = useState(initialEmail)
  const [notifySms, setNotifySms] = useState(initialSms)
  const [isPending, startTransition] = useTransition()
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  function commit(next: { notifyEmail?: boolean; notifySms?: boolean }) {
    startTransition(async () => {
      await updateNotificationPrefs(next)
      setSavedMsg('Preferences saved')
      setTimeout(() => setSavedMsg(null), 2000)
    })
  }

  return (
    <div className="mb-8 rounded-[14px] border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[14px] font-semibold">Delivery preferences</h2>
          <p className="text-[12px] text-muted-foreground">Choose how we reach you.</p>
        </div>
        {savedMsg && <span className="text-[12px] text-[var(--forest-deep)]">{savedMsg}</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-background px-3.5 py-3 cursor-pointer">
          <div className="flex items-center gap-2.5 min-w-0">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium">Email</p>
              <p className="text-[11.5px] text-muted-foreground truncate">{email}</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={notifyEmail}
            disabled={isPending}
            onChange={e => { setNotifyEmail(e.target.checked); commit({ notifyEmail: e.target.checked }) }}
            className="h-4 w-4 rounded border-border accent-[var(--forest)]"
          />
        </label>
        <label className={[
          'flex items-center justify-between gap-3 rounded-[10px] border border-border bg-background px-3.5 py-3',
          phone ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
        ].join(' ')}>
          <div className="flex items-center gap-2.5 min-w-0">
            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium">Text message</p>
              <p className="text-[11.5px] text-muted-foreground truncate">{phone ?? 'Add a phone in profile to enable'}</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={notifySms}
            disabled={isPending || !phone}
            onChange={e => { setNotifySms(e.target.checked); commit({ notifySms: e.target.checked }) }}
            className="h-4 w-4 rounded border-border accent-[var(--forest)] disabled:opacity-40"
          />
        </label>
      </div>
    </div>
  )
}
