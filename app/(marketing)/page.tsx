import { db } from '@/services/db'
import { caregiverProfiles, users, shifts } from '@/db/schema'
import { count, eq } from 'drizzle-orm'
import { Landing } from './_landing'

export const dynamic = 'force-dynamic'

async function getStats() {
  try {
    const [[c], [f], [s]] = await Promise.all([
      db.select({ value: count() }).from(caregiverProfiles).where(eq(caregiverProfiles.status, 'active')),
      db.select({ value: count() }).from(users).where(eq(users.role, 'client')),
      db.select({ value: count() }).from(shifts).where(eq(shifts.status, 'completed')),
    ])
    return {
      caregivers: Number(c?.value ?? 0),
      families:   Number(f?.value ?? 0),
      shifts:     Number(s?.value ?? 0),
    }
  } catch {
    return { caregivers: 0, families: 0, shifts: 0 }
  }
}

export default async function LandingPage() {
  const stats = await getStats()
  return <Landing stats={stats} />
}
