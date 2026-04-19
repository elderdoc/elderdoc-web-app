'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateClientProfile } from '@/domains/clients/profile'
import { formatUSPhone } from '@/lib/phone'

interface User {
  id: string
  name: string | null
  email: string
  phone: string | null
  image: string | null
}

export function ClientProfileForm({ user }: { user: User }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name:  user.name ?? '',
    phone: user.phone ?? '',
  })

  const initials = (user.name ?? user.email).split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

  function handleSave() {
    startTransition(async () => {
      await updateClientProfile({ name: form.name, phone: form.phone || undefined })
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        {user.image ? (
          <img src={user.image} alt={user.name ?? ''} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
            {initials}
          </div>
        )}
        <div>
          <p className="font-semibold">{user.name ?? 'No name set'}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <hr className="border-border" />

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full rounded-lg border border-border px-4 py-3 text-sm bg-muted text-muted-foreground cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: formatUSPhone(e.target.value) }))}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
            placeholder="(555) 000-0000"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !form.name.trim()}
          className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 whitespace-nowrap"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && <p className="text-sm text-green-600">Saved!</p>}
      </div>
    </div>
  )
}
