import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('ai', () => ({
  streamText: vi.fn().mockReturnValue({ toTextStreamResponse: vi.fn().mockReturnValue(new Response('ok')) }),
}))
vi.mock('@ai-sdk/openai', () => ({ openai: vi.fn().mockReturnValue('mock-model') }))

import { auth } from '@/auth'
import { streamText } from 'ai'
import { POST } from '../route'

const mockAuth = vi.mocked(auth)
const mockStreamText = vi.mocked(streamText)
const SESSION = { user: { id: 'user-1' } }

beforeEach(() => vi.clearAllMocks())

const BODY = {
  careType: 'personal-care', recipientName: 'Jane',
  conditions: ['diabetes'], mobility: 'independent',
  frequency: 'weekly', days: ['monday'], shifts: ['morning'],
  duration: '4', languages: ['english'], budgetType: 'hourly', budgetAmount: '20',
}

function makeRequest(body: object) {
  return new Request('http://localhost/api/care-request/generate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/care-request/generate', () => {
  it('returns 401 with no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    const res = await POST(makeRequest(BODY))
    expect(res.status).toBe(401)
  })

  it('calls streamText with a prompt containing careType and recipientName', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    await POST(makeRequest(BODY))
    expect(mockStreamText).toHaveBeenCalledOnce()
    const { prompt } = mockStreamText.mock.calls[0][0] as any
    expect(prompt).toContain('personal-care')
    expect(prompt).toContain('Jane')
  })

  it('returns a streaming response on success', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    const res = await POST(makeRequest(BODY))
    expect(res).toBeInstanceOf(Response)
    expect(res.status).toBe(200)
  })
})
