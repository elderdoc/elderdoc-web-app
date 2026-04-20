import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Hoisted mock variables
const { mockDbSelect, mockTransferPayout } = vi.hoisted(() => {
  return {
    mockDbSelect: vi.fn(),
    mockTransferPayout: vi.fn(),
  }
})

vi.mock('@/services/db', () => ({
  db: {
    select: mockDbSelect,
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}))

vi.mock('@/services/stripe', () => ({
  transferPayout: mockTransferPayout,
}))

// Import after mocks are set up
import { POST } from '../payout-sweep/route'

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) {
    headers['authorization'] = authHeader
  }
  return new NextRequest('http://localhost/api/cron/payout-sweep', {
    method: 'POST',
    headers,
  })
}

describe('POST /api/cron/payout-sweep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
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

  it('returns { released: 0, totalCents: 0 } when no eligible payments', async () => {
    // disputes query: returns empty
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })
    // payments query: returns empty
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    })

    const req = makeRequest('Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ released: 0, totalCents: 0 })
  })

  it('releases a payment: calls transferPayout with correct args and returns { released: 1, totalCents: 14850 }', async () => {
    mockTransferPayout.mockResolvedValue(undefined)

    // disputes query: returns empty (no open disputes)
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    // payments query: returns one eligible payment
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: 'payment-1',
                jobId: 'job-1',
                amount: '150.00',
                fee: '1.50',
                stripeConnectAccountId: 'acct_123',
              },
            ]),
          }),
        }),
      }),
    })

    const req = makeRequest('Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockTransferPayout).toHaveBeenCalledOnce()
    expect(mockTransferPayout).toHaveBeenCalledWith(148.5, 'acct_123', 'job-1')

    const body = await res.json()
    expect(body).toEqual({ released: 1, totalCents: 14850 })
  })

  it('skips payments where the job has an open job-level dispute', async () => {
    mockTransferPayout.mockResolvedValue(undefined)

    // disputes query: returns a job-level dispute (no paymentId)
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { jobId: 'job-disputed', paymentId: null },
        ]),
      }),
    })

    // payments query: returns one payment for the disputed job
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: 'payment-2',
                jobId: 'job-disputed',
                amount: '100.00',
                fee: '1.00',
                stripeConnectAccountId: 'acct_456',
              },
            ]),
          }),
        }),
      }),
    })

    const req = makeRequest('Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockTransferPayout).not.toHaveBeenCalled()

    const body = await res.json()
    expect(body).toEqual({ released: 0, totalCents: 0 })
  })

  it('skips payments where there is an open payment-level dispute for that payment', async () => {
    mockTransferPayout.mockResolvedValue(undefined)

    // disputes query: returns a payment-level dispute
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { jobId: 'job-3', paymentId: 'payment-3' },
        ]),
      }),
    })

    // payments query: returns the disputed payment
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: 'payment-3',
                jobId: 'job-3',
                amount: '200.00',
                fee: '2.00',
                stripeConnectAccountId: 'acct_789',
              },
            ]),
          }),
        }),
      }),
    })

    const req = makeRequest('Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockTransferPayout).not.toHaveBeenCalled()

    const body = await res.json()
    expect(body).toEqual({ released: 0, totalCents: 0 })
  })
})
