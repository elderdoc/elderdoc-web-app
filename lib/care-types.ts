import 'server-only'
import { unstable_cache } from 'next/cache'
import { eq, asc } from 'drizzle-orm'
import { db } from '@/services/db'
import { careTypes } from '@/db/schema'

export type CareType = {
  id: string
  key: string
  label: string
  description: string | null
  icon: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

async function fetchActiveCareTypes(): Promise<CareType[]> {
  return db.select().from(careTypes)
    .where(eq(careTypes.isActive, true))
    .orderBy(asc(careTypes.createdAt))
}

export const getActiveCareTypes = unstable_cache(
  fetchActiveCareTypes,
  ['care-types:active'],
  { tags: ['care-types'], revalidate: 3600 },
)
