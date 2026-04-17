import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

declare global { var _pgClient: ReturnType<typeof postgres> | undefined }

const client = globalThis._pgClient ??
  (globalThis._pgClient = postgres(process.env.DATABASE_URL, { max: 10 }))

export const db = drizzle(client, { schema })
