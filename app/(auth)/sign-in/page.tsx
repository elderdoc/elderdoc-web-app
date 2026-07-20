import { db } from '@/services/db'
import { caregiverProfiles, users, matches } from '@/db/schema'
import { count, eq, and } from 'drizzle-orm'
import { SignInClient } from './_form'

export const dynamic = 'force-dynamic'

async function getStats() {
  try {
    const [[c], [f], [m]] = await Promise.all([
      db.select({ value: count() }).from(caregiverProfiles).where(eq(caregiverProfiles.status, 'active')),
      db.select({ value: count() }).from(users).where(eq(users.role, 'client')),
      db.select({ value: count() }).from(matches).where(eq(matches.status, 'accepted')),
    ])
    return {
      caregivers: Number(c?.value ?? 0),
      families:   Number(f?.value ?? 0),
      matches:    Number(m?.value ?? 0),
    }
  } catch {
    return { caregivers: 0, families: 0, matches: 0 }
  }
}

export default async function SignInPage() {
  const stats = await getStats()
  return <SignInClient stats={stats} />
}
