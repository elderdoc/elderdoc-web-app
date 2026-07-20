import { NextResponse } from 'next/server'
import { db } from '@/services/db'
import { careTypes } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(careTypes)
      .where(eq(careTypes.isActive, true))
      .orderBy(asc(careTypes.createdAt))

    return NextResponse.json(rows)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
