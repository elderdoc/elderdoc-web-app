import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/services/storage', () => ({ uploadFile: vi.fn() }))

import { auth } from '@/auth'
import { uploadFile } from '@/services/storage'
import { POST } from '../route'

const mockAuth = vi.mocked(auth)
const mockUpload = vi.mocked(uploadFile)

const SESSION = { user: { id: 'user-1', email: 'test@example.com', name: 'Test' } }

beforeEach(() => {
  vi.clearAllMocks()
})

function makeRequest(file?: File): Request {
  const formData = new FormData()
  if (file) formData.append('file', file)
  return new Request('http://localhost/api/upload', { method: 'POST', body: formData })
}

describe('POST /api/upload', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any)
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when no file provided', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    const res = await POST(makeRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('No file')
  })

  it('uploads file and returns url', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockUpload.mockResolvedValue('http://localhost:9000/elderdoc/avatars/user-1/photo.jpg')
    const file = new File(['fake image'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('http://localhost:9000/elderdoc/avatars/user-1/photo.jpg')
    expect(mockUpload).toHaveBeenCalledOnce()
  })

  it('uses user id in the storage key', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockUpload.mockResolvedValue('http://localhost:9000/elderdoc/avatars/user-1/avatar.png')
    const file = new File(['fake image'], 'avatar.png', { type: 'image/png' })
    await POST(makeRequest(file))
    const [key] = mockUpload.mock.calls[0]
    expect(key).toContain('user-1')
    expect(key).toContain('avatar.png')
  })
})
