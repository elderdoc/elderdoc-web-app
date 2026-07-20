import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { jobs, payments } from '@/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return (payload.sub as string) ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Step 1: Get all job IDs for this client
  const jobRows = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.clientId, userId))

  // Step 2: If no jobs, return empty payments
  if (!jobRows.length) {
    return NextResponse.json({ payments: [] })
  }

  const jobIds = jobRows.map((j) => j.id)

  // Step 3: Get payments for those jobs
  const paymentRows = await db
    .select()
    .from(payments)
    .where(inArray(payments.jobId, jobIds))
    .orderBy(desc(payments.createdAt))
    .limit(50)

  return NextResponse.json({ payments: paymentRows })
}
