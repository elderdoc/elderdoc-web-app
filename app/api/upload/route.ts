import { auth } from '@/auth'
import { uploadFile } from '@/services/storage'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_BYTES = 5 * 1024 * 1024

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_').replace(/\.{2,}/g, '_')
  const key = `avatars/${session.user.id}/${safeName}`
  const url = await uploadFile(key, buffer, file.type || 'application/octet-stream')

  return NextResponse.json({ url })
}
