import { redirect } from 'next/navigation'
import { Mail, Calendar, Shield } from 'lucide-react'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { users, clientLocations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ClientProfileForm } from './_components/client-profile-form'

export default async function ClientProfilePage() {
  const session = await requireRole('client')
  const userId = session.user.id!

  const [userRows, locationRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, image: users.image, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({ address1: clientLocations.address1, address2: clientLocations.address2, city: clientLocations.city, state: clientLocations.state })
      .from(clientLocations)
      .where(eq(clientLocations.clientId, userId))
      .limit(1),
  ])

  const user = userRows[0]
  if (!user) redirect('/sign-in')

  const initials = (user.name ?? user.email).split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="relative px-6 lg:px-10 py-8 lg:py-10 max-w-[1100px] mx-auto">
      {/* Soft glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-15%] top-[-10%] h-[400px] w-[400px] rounded-full bg-[var(--forest-soft)] blur-[100px] opacity-40" />
      </div>

      {/* Hero card */}
      <div className="rounded-[20px] border border-border bg-card overflow-hidden shadow-[0_4px_20px_-8px_rgba(15,20,16,0.08)]">
        <div className="relative">
          <div className="h-32 bg-gradient-to-br from-[var(--forest-soft)] via-[var(--cream-deep)] to-[var(--forest-soft)]" />
          <div className="px-6 sm:px-8 pb-6 -mt-12">
            <div className="flex items-end gap-4 flex-wrap">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? ''}
                  className="h-24 w-24 rounded-2xl object-cover ring-4 ring-card shadow-[0_8px_24px_-8px_rgba(15,20,16,0.2)]"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary text-[24px] font-bold text-primary-foreground ring-4 ring-card shadow-[0_8px_24px_-8px_rgba(15,77,52,0.4)]">
                  {initials}
                </div>
              )}
              <div className="pb-1 min-w-0">
                <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-tight">
                  {user.name ?? 'Your profile'}
                </h1>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-foreground/70">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--forest-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--forest-deep)] capitalize">
                    <Shield className="h-3 w-3" />
                    {user.role ?? 'Client'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Member since {memberSince}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mt-5">
        <ClientProfileForm user={user} location={locationRows[0] ?? null} />
      </div>
    </div>
  )
}
