import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Hoisted mock variables
const { mockDbUpdate, mockLt } = vi.hoisted(() => {
  return {
    mockDbUpdate: vi.fn(),
    mockLt: vi.fn(),
  }
})

vi.mock('@/services/db', () => ({
  db: {
    update: mockDbUpdate,
  },
}))

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>()
  return {
    ...actual,
    lt: mockLt,
  }
})

// Import after mocks are set up
import { POST } from '../resolve-disputes/route'

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) {
    headers['authorization'] = authHeader
  }
  return new NextRequest('http://localhost/api/cron/resolve-disputes', {
    method: 'POST',
    headers,
  })
}

describe('POST /api/cron/resolve-disputes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'

    // Default lt mock — return a sentinel so and() can include it
    mockLt.mockReturnValue('lt-condition')

    // Default update chain
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    })
  })

  it('returns 401 when Authorization header is missing', async () => {
    const req = makeRequest()
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 401 when Authorization header has wrong secret', async () => {
    const req = makeRequest('Bearer wrong-secret')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns { resolved: 0 } when no disputes qualify', async () => {
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const req = makeRequest('Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ resolved: 0 })
  })

  it('returns { resolved: 2 } when two disputes are auto-resolved', async () => {
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: 'dispute-1' },
            { id: 'dispute-2' },
          ]),
        }),
      }),
    })

    const req = makeRequest('Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ resolved: 2 })
  })

  it('verifies the cutoff is 14 days ago', async () => {
    const before = Date.now()

    const req = makeRequest('Bearer test-secret')
    await POST(req)

    const after = Date.now()

    expect(mockLt).toHaveBeenCalledOnce()
    const [, cutoffArg] = mockLt.mock.calls[0]

    expect(cutoffArg).toBeInstanceOf(Date)

    const cutoffMs = cutoffArg.getTime()
    const expectedMs = 14 * 24 * 60 * 60 * 1000

    // The cutoff should be approximately (before - 14 days) to (after - 14 days)
    expect(cutoffMs).toBeGreaterThanOrEqual(before - expectedMs - 1000)
    expect(cutoffMs).toBeLessThanOrEqual(after - expectedMs + 1000)
  })
})
