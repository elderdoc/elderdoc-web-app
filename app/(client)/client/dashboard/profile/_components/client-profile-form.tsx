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
  role: string | null
  createdAt: Date
}

interface Location {
  address1: string | null
  address2: string | null
  city: string | null
  state: string | null
}

export function ClientProfileForm({ user, location }: { user: User; location: Location | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name:     user.name ?? '',
    phone:    user.phone ?? '',
    address1: location?.address1 ?? '',
    address2: location?.address2 ?? '',
    city:     location?.city ?? '',
    state:    location?.state ?? '',
  })

  const initials = (user.name ?? user.email).split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  function handleSave() {
    startTransition(async () => {
      await updateClientProfile({
        name:     form.name,
        phone:    form.phone    || undefined,
        address1: form.address1 || undefined,
        address2: form.address2 || undefined,
        city:     form.city     || undefined,
        state:    form.state    || undefined,
      })
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="space-y-6 max-w-lg">
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

      {/* Contact info */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contact</h2>
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

      <hr className="border-border" />

      {/* Address */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Location</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Street Address</label>
          <input
            type="text"
            value={form.address1}
            onChange={e => setForm(f => ({ ...f, address1: e.target.value }))}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
            placeholder="123 Main St"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Unit / Apt (optional)</label>
          <input
            type="text"
            value={form.address2}
            onChange={e => setForm(f => ({ ...f, address2: e.target.value }))}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
            placeholder="Apt 4B"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input
              type="text"
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <input
              type="text"
              value={form.state}
              onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
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

      <hr className="border-border" />

      {/* Account info (read-only) */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Account Information</h2>
        <dl className="space-y-3">
          <div className="flex gap-4">
            <dt className="text-sm text-muted-foreground w-36 shrink-0">Account Type</dt>
            <dd className="text-sm font-medium capitalize">{user.role ?? 'Client'}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-sm text-muted-foreground w-36 shrink-0">Member Since</dt>
            <dd className="text-sm font-medium">{memberSince}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-sm text-muted-foreground w-36 shrink-0">User ID</dt>
            <dd className="text-sm font-medium font-mono text-muted-foreground">{user.id}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
