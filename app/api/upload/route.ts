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

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const key = `avatars/${session.user.id}/${file.name}`
  const url = await uploadFile(key, buffer, file.type || 'application/octet-stream')

  return NextResponse.json({ url })
}
