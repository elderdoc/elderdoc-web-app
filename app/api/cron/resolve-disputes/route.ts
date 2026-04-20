import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/services/db'
import { disputes } from '@/db/schema'
import { eq, and, lt } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const result = await db
    .update(disputes)
    .set({ status: 'resolved', resolvedAt: new Date() })
    .where(and(eq(disputes.status, 'open'), lt(disputes.createdAt, cutoff)))
    .returning({ id: disputes.id })

  return NextResponse.json({ resolved: result.length })
}
