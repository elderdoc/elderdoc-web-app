import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'

declare global { var _pgClient: ReturnType<typeof postgres> | undefined }

const url = process.env.DATABASE_URL ?? 'postgresql://build-placeholder/placeholder'
const client = globalThis._pgClient ?? (globalThis._pgClient = postgres(url, { max: 10 }))

export const db = drizzle(client, { schema })
