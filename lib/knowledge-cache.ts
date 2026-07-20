import { redis } from './redis'
import { db } from '@/services/db'
import { appKnowledge } from '@/db/schema'

const CACHE_KEY = 'app:knowledge'
const CACHE_TTL = 86400

export type AppKnowledge = {
  about: string
  howItWorks: string
  pricingAndBilling: string
  forCaregivers: string
  forClients: string
  faqs: string
  support: string
}

export async function getAppKnowledge(): Promise<AppKnowledge | null> {
  try {
    const cached = await redis.get<AppKnowledge>(CACHE_KEY)
    if (cached) return cached
  } catch {
    // Redis unavailable — fall through to DB
  }

  const rows = await db.select().from(appKnowledge).limit(1)
  if (!rows[0]) return null

  const knowledge: AppKnowledge = {
    about:             rows[0].about,
    howItWorks:        rows[0].howItWorks,
    pricingAndBilling: rows[0].pricingAndBilling,
    forCaregivers:     rows[0].forCaregivers,
    forClients:        rows[0].forClients,
    faqs:              rows[0].faqs,
    support:           rows[0].support,
  }

  try {
    await redis.set(CACHE_KEY, knowledge, { ex: CACHE_TTL })
  } catch {
    // Redis write failed — continue without caching
  }

  return knowledge
}
