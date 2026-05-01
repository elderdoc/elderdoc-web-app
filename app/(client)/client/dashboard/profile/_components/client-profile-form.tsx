'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Check, User as UserIcon, Phone, Mail, MapPin } from 'lucide-react'
import { updateClientProfile } from '@/domains/clients/profile'
import { formatUSPhone } from '@/lib/phone'
import { useAppToast } from '@/components/toast'

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

const inputClass =
  'w-full rounded-[10px] border border-border bg-card h-11 px-3.5 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow'
const labelClass = 'block text-[13px] font-medium text-foreground/80 mb-1.5'

export function ClientProfileForm({ user, location }: { user: User; location: Location | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const t = useAppToast()
  const [form, setForm] = useState({
    name:     user.name ?? '',
    phone:    user.phone ?? '',
    address1: location?.address1 ?? '',
    address2: location?.address2 ?? '',
    city:     location?.city ?? '',
    state:    location?.state ?? '',
  })

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
      t.profileSaved()
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Contact info */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            Contact info
          </h2>
          <div className="space-y-3.5">
            <div>
              <label className={labelClass}>Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Email
                </span>
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className={`${inputClass} bg-muted text-muted-foreground cursor-not-allowed`}
              />
            </div>
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone
                </span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: formatUSPhone(e.target.value) }))}
                className={inputClass}
                placeholder="(555) 000-0000"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Address
          </h2>
          <div className="space-y-3.5">
            <div>
              <label className={labelClass}>Street address</label>
              <input
                type="text"
                value={form.address1}
                onChange={e => setForm(f => ({ ...f, address1: e.target.value }))}
                className={inputClass}
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label className={labelClass}>Unit / Apt <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="text"
                value={form.address2}
                onChange={e => setForm(f => ({ ...f, address2: e.target.value }))}
                className={inputClass}
                placeholder="Apt 4B"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="rounded-[18px] border border-border bg-card p-4 flex items-center justify-between gap-3">
        <div className="text-[13px] text-muted-foreground">
          Changes are saved to your account.
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--forest-deep)]">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !form.name.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13.5px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none whitespace-nowrap"
          >
            <Save className="h-4 w-4" />
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
