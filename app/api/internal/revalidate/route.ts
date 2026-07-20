import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

const ALLOWED_TAGS = new Set(['care-types'])

export async function POST(req: Request) {
  const secret = process.env.INTERNAL_REVALIDATE_SECRET
  if (!secret) return new NextResponse('Server not configured', { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch { return new NextResponse('Bad JSON', { status: 400 }) }
  const tag = (body as { tag?: unknown })?.tag
  if (typeof tag !== 'string' || !ALLOWED_TAGS.has(tag)) {
    return new NextResponse('Unknown tag', { status: 400 })
  }

  revalidateTag(tag, 'max')
  return NextResponse.json({ ok: true })
}
