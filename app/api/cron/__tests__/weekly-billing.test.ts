import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockGetDefaultPaymentMethod,
  mockCreateAndPayInvoice,
  mockCalculateShiftHours,
} = vi.hoisted(() => ({
  mockDbSelect:               vi.fn(),
  mockDbInsert:               vi.fn(),
  mockDbUpdate:               vi.fn(),
  mockGetDefaultPaymentMethod: vi.fn(),
  mockCreateAndPayInvoice:    vi.fn(),
  mockCalculateShiftHours:    vi.fn(),
}))

vi.mock('@/services/db', () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
  },
}))

vi.mock('@/services/stripe', () => ({
  getDefaultPaymentMethod: mockGetDefaultPaymentMethod,
  createAndPayInvoice:     mockCreateAndPayInvoice,
}))

vi.mock('@/lib/shift-utils', () => ({
  calculateShiftHours: mockCalculateShiftHours,
}))

import { POST } from '../weekly-billing/route'

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) headers['authorization'] = authHeader
  return new NextRequest('http://localhost/api/cron/weekly-billing', { method: 'POST', headers })
}

function mockUnbilledQuery(rows: object[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(rows),
          }),
        }),
      }),
    }),
  })
}

describe('POST /api/cron/weekly-billing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'

    const mockValues = vi.fn().mockResolvedValue(undefined)
    mockDbInsert.mockReturnValue({ values: mockValues })

    const mockWhere = vi.fn().mockResolvedValue(undefined)
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere })
    mockDbUpdate.mockReturnValue({ set: mockSet })
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 401 when Authorization header has wrong secret', async () => {
    const res = await POST(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns { billed: 0, skipped: 0, totalCharged: 0 } when no unbilled shifts', async () => {
    mockUnbilledQuery([])

    const res = await POST(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ billed: 0, skipped: 0, totalCharged: 0 })
  })

  it('skips job and inserts billing_no_card notification when client has no stripeCustomerId', async () => {
    mockUnbilledQuery([
      {
        shiftId: 'shift-1', jobId: 'job-1', startTime: '09:00', endTime: '12:00',
        date: '2026-04-21', clientId: 'client-1', stripeCustomerId: null,
        budgetAmount: '20.00', careType: 'personal-care',
      },
    ])

    const mockValues = vi.fn().mockResolvedValue(undefined)
    mockDbInsert.mockReturnValue({ values: mockValues })

    const res = await POST(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ billed: 0, skipped: 1, totalCharged: 0 })
    expect(mockDbInsert).toHaveBeenCalledOnce()
    const notifArg = mockValues.mock.calls[0][0]
    expect(notifArg.type).toBe('billing_no_card')
    expect(notifArg.userId).toBe('client-1')
  })

  it('skips job and inserts billing_no_card notification when getDefaultPaymentMethod returns null', async () => {
    mockUnbilledQuery([
      {
        shiftId: 'shift-1', jobId: 'job-1', startTime: '09:00', endTime: '12:00',
        date: '2026-04-21', clientId: 'client-1', stripeCustomerId: 'cus_123',
        budgetAmount: '20.00', careType: 'personal-care',
      },
    ])
    mockGetDefaultPaymentMethod.mockResolvedValueOnce(null)

    const res = await POST(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.skipped).toBe(1)
    expect(body.billed).toBe(0)
  })

  it('bills job: calculates correct subtotal, calls createAndPayInvoice, marks billedAt, inserts notification', async () => {
    mockCalculateShiftHours.mockReturnValue(3)
    mockGetDefaultPaymentMethod.mockResolvedValue({ brand: 'visa', last4: '4242' })
    mockCreateAndPayInvoice.mockResolvedValue({ invoiceId: 'inv_123', paymentIntentId: 'pi_123' })

    mockUnbilledQuery([
      {
        shiftId: 'shift-1', jobId: 'job-1', startTime: '09:00', endTime: '12:00',
        date: '2026-04-21', clientId: 'client-1', stripeCustomerId: 'cus_123',
        budgetAmount: '20.00', careType: 'personal-care',
      },
    ])

    const mockValues = vi.fn().mockResolvedValue(undefined)
    mockDbInsert.mockReturnValue({ values: mockValues })
    const mockWhere = vi.fn().mockResolvedValue(undefined)
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere })
    mockDbUpdate.mockReturnValue({ set: mockSet })

    const res = await POST(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)

    // 3h × $20/hr = $60 = 6000 cents; fee = 60 cents
    expect(mockCreateAndPayInvoice).toHaveBeenCalledWith('cus_123', 'job-1', 6000, 60)
    // insert payment + notification = 2 inserts
    expect(mockDbInsert).toHaveBeenCalledTimes(2)
    // mark billedAt = 1 update
    expect(mockDbUpdate).toHaveBeenCalledOnce()

    const body = await res.json()
    expect(body.billed).toBe(1)
    expect(body.skipped).toBe(0)
    expect(body.totalCharged).toBeCloseTo(60.60)
  })

  it('bills two shifts for same job as a single invoice', async () => {
    mockCalculateShiftHours.mockReturnValue(3)
    mockGetDefaultPaymentMethod.mockResolvedValue({ brand: 'visa', last4: '4242' })
    mockCreateAndPayInvoice.mockResolvedValue({ invoiceId: 'inv_456', paymentIntentId: 'pi_456' })

    mockUnbilledQuery([
      {
        shiftId: 'shift-1', jobId: 'job-1', startTime: '09:00', endTime: '12:00',
        date: '2026-04-21', clientId: 'client-1', stripeCustomerId: 'cus_123',
        budgetAmount: '20.00', careType: 'personal-care',
      },
      {
        shiftId: 'shift-2', jobId: 'job-1', startTime: '14:00', endTime: '17:00',
        date: '2026-04-22', clientId: 'client-1', stripeCustomerId: 'cus_123',
        budgetAmount: '20.00', careType: 'personal-care',
      },
    ])

    const res = await POST(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)

    // 2 shifts × 3h × $20 = $120 = 12000 cents; fee = 120
    expect(mockCreateAndPayInvoice).toHaveBeenCalledOnce()
    expect(mockCreateAndPayInvoice).toHaveBeenCalledWith('cus_123', 'job-1', 12000, 120)

    const body = await res.json()
    expect(body.billed).toBe(1)
  })
})
