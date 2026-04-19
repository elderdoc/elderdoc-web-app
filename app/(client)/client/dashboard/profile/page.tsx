import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ClientProfileForm } from './_components/client-profile-form'

export default async function ClientProfilePage() {
  const session = await requireRole('client')
  const userId = session.user.id!

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, image: users.image })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-8">My Profile</h1>
      <ClientProfileForm user={user} />
    </div>
  )
}
