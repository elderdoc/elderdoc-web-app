'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Check, User as UserIcon, Phone, Mail, MapPin } from 'lucide-react'
import { updateClientProfile } from '@/domains/clients/profile'
import { formatUSPhone } from '@/lib/phone'
import { useAppToast } from '@/components/toast'
import { StateSelect } from '@/components/state-select'

interface User {
  id: string
  name: string | null
  email: string
  phone: string | null
  image: string | null
  role: string | null
  about: string | null
  notifyEmail: boolean
  notifySms: boolean
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
    name:        user.name ?? '',
    phone:       user.phone ?? '',
    about:       user.about ?? '',
    notifyEmail: user.notifyEmail,
    notifySms:   user.notifySms,
    address1:    location?.address1 ?? '',
    address2:    location?.address2 ?? '',
    city:        location?.city ?? '',
    state:       location?.state ?? '',
  })

  function handleSave() {
    startTransition(async () => {
      await updateClientProfile({
        name:        form.name,
        phone:       form.phone    || undefined,
        about:       form.about,
        notifyEmail: form.notifyEmail,
        notifySms:   form.notifySms,
        address1:    form.address1 || undefined,
        address2:    form.address2 || undefined,
        city:        form.city     || undefined,
        state:       form.state    || undefined,
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
                <StateSelect value={form.state} onChange={v => setForm(f => ({ ...f, state: v }))} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="rounded-[18px] border border-border bg-card p-5">
        <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          About you
        </h2>
        <textarea
          value={form.about}
          onChange={e => setForm(f => ({ ...f, about: e.target.value }))}
          rows={4}
          maxLength={500}
          placeholder="Share a few sentences about your family and what kind of care you’re looking for. Caregivers will see this on your profile."
          className="w-full rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-[14px] focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow resize-none"
        />
        <p className="mt-1.5 text-[12px] text-muted-foreground">{form.about.length}/500</p>
      </div>

      {/* Notification preferences */}
      <div className="rounded-[18px] border border-border bg-card p-5">
        <h2 className="text-[15px] font-semibold mb-1 flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Notifications
        </h2>
        <p className="text-[12.5px] text-muted-foreground mb-4">How should we reach you about offers, matches, and messages?</p>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-background px-3.5 py-3 cursor-pointer">
            <div>
              <p className="text-[13.5px] font-medium">Email</p>
              <p className="text-[12px] text-muted-foreground">Sent to {user.email}</p>
            </div>
            <input
              type="checkbox"
              checked={form.notifyEmail}
              onChange={e => setForm(f => ({ ...f, notifyEmail: e.target.checked }))}
              className="h-4 w-4 rounded border-border accent-[var(--forest)]"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-background px-3.5 py-3 cursor-pointer">
            <div>
              <p className="text-[13.5px] font-medium">Text message (SMS)</p>
              <p className="text-[12px] text-muted-foreground">{user.phone ? `Sent to ${user.phone}` : 'Add a phone number above to enable'}</p>
            </div>
            <input
              type="checkbox"
              checked={form.notifySms}
              disabled={!user.phone && !form.phone}
              onChange={e => setForm(f => ({ ...f, notifySms: e.target.checked }))}
              className="h-4 w-4 rounded border-border accent-[var(--forest)] disabled:opacity-40"
            />
          </label>
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
