import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/services/db'
import { caregiverProfiles, jobs, messages, users } from '@/db/schema'
import { eq, asc, desc, and, ne, count } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '')

async function getAuthPayload(req: NextRequest): Promise<{ userId: string; role: string | null } | null> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return { userId: payload.sub as string, role: (payload.role as string) ?? null }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// GET /api/messages — list conversations (no jobId) or chat history (?jobId=)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthPayload(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, role } = auth
  const jobId = req.nextUrl.searchParams.get('jobId')

  // ── Per-job chat history ──────────────────────────────────────────────────
  if (jobId) {
    const [job] = await db
      .select({
        clientId:        jobs.clientId,
        caregiverUserId: caregiverProfiles.userId,
      })
      .from(jobs)
      .innerJoin(caregiverProfiles, eq(caregiverProfiles.id, jobs.caregiverId))
      .where(eq(jobs.id, jobId))
      .limit(1)

    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (userId !== job.clientId && userId !== job.caregiverUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rows = await db
      .select({
        id:         messages.id,
        body:       messages.body,
        senderId:   messages.senderId,
        senderName: users.name,
        createdAt:  messages.createdAt,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.jobId, jobId))
      .orderBy(asc(messages.createdAt))

    return NextResponse.json(
      rows.map((r) => ({
        id:         r.id,
        body:       r.body,
        senderId:   r.senderId,
        senderName: r.senderName ?? null,
        createdAt:  r.createdAt,
      }))
    )
  }

  // ── Conversation list ─────────────────────────────────────────────────────
  type JobRow = {
    jobId: string
    clientId: string
    clientName: string | null
    clientImage: string | null
    caregiverId: string
    caregiverName: string | null
    caregiverImage: string | null
  }

  let jobRows: JobRow[] = []

  if (role === 'caregiver') {
    const [profile] = await db
      .select({ id: caregiverProfiles.id, userId: caregiverProfiles.userId })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.userId, userId))
      .limit(1)
    if (!profile) return NextResponse.json([])

    const rows = await db
      .select({
        jobId:        jobs.id,
        clientId:     jobs.clientId,
        clientName:   users.name,
        clientImage:  users.image,
        caregiverId:  caregiverProfiles.userId,
      })
      .from(jobs)
      .innerJoin(users, eq(jobs.clientId, users.id))
      .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
      .where(eq(jobs.caregiverId, profile.id))

    jobRows = rows.map((r) => ({
      jobId:          r.jobId,
      clientId:       r.clientId,
      clientName:     r.clientName ?? null,
      clientImage:    r.clientImage ?? null,
      caregiverId:    r.caregiverId,
      caregiverName:  null,
      caregiverImage: null,
    }))
  } else {
    const rows = await db
      .select({
        jobId:          jobs.id,
        clientId:       jobs.clientId,
        caregiverId:    caregiverProfiles.userId,
        caregiverName:  users.name,
        caregiverImage: caregiverProfiles.photoUrl,
      })
      .from(jobs)
      .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
      .innerJoin(users, eq(caregiverProfiles.userId, users.id))
      .where(eq(jobs.clientId, userId))

    jobRows = rows.map((r) => ({
      jobId:          r.jobId,
      clientId:       r.clientId,
      clientName:     null,
      clientImage:    null,
      caregiverId:    r.caregiverId,
      caregiverName:  r.caregiverName ?? null,
      caregiverImage: r.caregiverImage ?? null,
    }))
  }

  if (!jobRows.length) return NextResponse.json([])

  const results = await Promise.all(
    jobRows.map(async (job) => {
      const [lastMsg] = await db
        .select({ body: messages.body, createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.jobId, job.jobId))
        .orderBy(desc(messages.createdAt))
        .limit(1)

      const [unreadRow] = await db
        .select({ total: count() })
        .from(messages)
        .where(
          and(
            eq(messages.jobId, job.jobId),
            ne(messages.senderId, userId),
            eq(messages.read, false),
          )
        )

      return {
        jobId:          job.jobId,
        clientId:       job.clientId,
        clientName:     job.clientName,
        clientImage:    job.clientImage,
        caregiverId:    job.caregiverId,
        caregiverName:  job.caregiverName,
        caregiverImage: job.caregiverImage,
        lastMessage:    lastMsg?.body ?? '',
        lastAt:         lastMsg?.createdAt?.toISOString() ?? null,
        unreadCount:    Number(unreadRow?.total ?? 0),
      }
    })
  )

  results.sort((a, b) => {
    if (!a.lastAt && !b.lastAt) return 0
    if (!a.lastAt) return 1
    if (!b.lastAt) return -1
    return b.lastAt.localeCompare(a.lastAt)
  })

  return NextResponse.json(results)
}

// ---------------------------------------------------------------------------
// POST /api/messages — send a message { jobId, body }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await getAuthPayload(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = auth
  const body = await req.json().catch(() => null)
  const jobId: string | undefined = body?.jobId
  const text: string | undefined = body?.body

  if (!jobId || !text?.trim()) {
    return NextResponse.json({ error: 'jobId and body are required' }, { status: 400 })
  }

  const [job] = await db
    .select({
      clientId:        jobs.clientId,
      caregiverUserId: caregiverProfiles.userId,
    })
    .from(jobs)
    .innerJoin(caregiverProfiles, eq(caregiverProfiles.id, jobs.caregiverId))
    .where(eq(jobs.id, jobId))
    .limit(1)

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (userId !== job.clientId && userId !== job.caregiverUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [msg] = await db
    .insert(messages)
    .values({
      jobId,
      senderId: userId,
      body: text.trim(),
      read: false,
    })
    .returning({
      id:        messages.id,
      body:      messages.body,
      senderId:  messages.senderId,
      createdAt: messages.createdAt,
    })

  return NextResponse.json(msg, { status: 201 })
}
