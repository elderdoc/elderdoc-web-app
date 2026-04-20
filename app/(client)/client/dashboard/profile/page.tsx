import { redirect } from 'next/navigation'
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

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-8">My Profile</h1>
      <ClientProfileForm user={user} location={locationRows[0] ?? null} />
    </div>
  )
}
