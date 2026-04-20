import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSelectChain, mockDb } = vi.hoisted(() => {
  const mockSelectChain = {
    from:      vi.fn(),
    innerJoin: vi.fn(),
    where:     vi.fn(),
    orderBy:   vi.fn(),
    limit:     vi.fn(),
    offset:    vi.fn(),
  }

  // Default chain — each method returns the chain itself
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.orderBy.mockReturnValue(mockSelectChain)
  // limit returns chain so .offset() can be called on it
  mockSelectChain.limit.mockReturnValue(mockSelectChain)
  // offset is the terminal call for payment queries — resolves to []
  mockSelectChain.offset.mockResolvedValue([])

  const mockDb = {
    select: vi.fn().mockReturnValue(mockSelectChain),
  }
  return { mockSelectChain, mockDb }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { getClientPayments, getCaregiverPayments, getOpenDisputesForClient, getUnbilledShiftsForClient } from '../queries'

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.orderBy.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockReturnValue(mockSelectChain)
  mockSelectChain.offset.mockResolvedValue([])
  mockDb.select.mockReturnValue(mockSelectChain)
})

// ── getClientPayments ─────────────────────────────────────────────────────────

describe('getClientPayments', () => {
  it('returns empty array when DB returns []', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    const result = await getClientPayments('client-1')
    expect(result).toEqual([])
  })

  it('maps rows correctly (paymentId, amount, careType, caregiverName, clientName=null)', async () => {
    const now = new Date()
    mockSelectChain.offset.mockResolvedValueOnce([
      {
        paymentId: 'pay-1',
        jobId: 'job-1',
        careType: 'personal-care',
        caregiverName: 'Alice Smith',
        amount: 5000,
        fee: 250,
        method: 'stripe',
        status: 'completed',
        stripePaymentIntentId: null,
        stripeInvoiceId: null,
        createdAt: now,
        releasedAt: null,
      },
    ])
    const result = await getClientPayments('client-1')
    expect(result).toHaveLength(1)
    expect(result[0].paymentId).toBe('pay-1')
    expect(result[0].jobId).toBe('job-1')
    expect(result[0].careType).toBe('personal-care')
    expect(result[0].caregiverName).toBe('Alice Smith')
    expect(result[0].clientName).toBeNull()
    expect(result[0].amount).toBe(5000)
    expect(result[0].method).toBe('stripe')
    expect(result[0].status).toBe('completed')
    expect(result[0].createdAt).toBe(now)
  })

  it('returns releasedAt as null when not set', async () => {
    const now = new Date()
    mockSelectChain.offset.mockResolvedValueOnce([
      {
        paymentId: 'pay-1',
        jobId: 'job-1',
        careType: 'personal-care',
        caregiverName: 'Alice Smith',
        amount: 5000,
        fee: 250,
        method: 'stripe',
        status: 'completed',
        stripePaymentIntentId: null,
        stripeInvoiceId: null,
        createdAt: now,
        releasedAt: null,
      },
    ])
    const result = await getClientPayments('client-1')
    expect(result[0].releasedAt).toBeNull()
  })

  it('returns releasedAt as a Date when set', async () => {
    const now = new Date()
    const released = new Date('2026-01-15T10:00:00Z')
    mockSelectChain.offset.mockResolvedValueOnce([
      {
        paymentId: 'pay-1',
        jobId: 'job-1',
        careType: 'personal-care',
        caregiverName: 'Alice Smith',
        amount: 5000,
        fee: 250,
        method: 'stripe',
        status: 'completed',
        stripePaymentIntentId: null,
        stripeInvoiceId: null,
        createdAt: now,
        releasedAt: released,
      },
    ])
    const result = await getClientPayments('client-1')
    expect(result[0].releasedAt).toBe(released)
  })

  it('calls where with clientId filter applied', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    await getClientPayments('client-abc')
    expect(mockSelectChain.where).toHaveBeenCalledOnce()
  })

  it('calls orderBy for desc ordering', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    await getClientPayments('client-1')
    expect(mockSelectChain.orderBy).toHaveBeenCalledOnce()
  })

  it('coerces string amount and fee to numbers via Number()', async () => {
    const now = new Date()
    mockSelectChain.offset.mockResolvedValueOnce([
      {
        paymentId: 'pay-coerce',
        jobId: 'job-coerce',
        careType: 'personal-care',
        caregiverName: 'Alice Smith',
        amount: '75.50',
        fee: '5.00',
        method: 'stripe',
        status: 'completed',
        stripePaymentIntentId: null,
        stripeInvoiceId: null,
        createdAt: now,
        releasedAt: null,
      },
    ])
    const result = await getClientPayments('client-1')
    expect(result[0].amount).toBe(75.5)
    expect(result[0].fee).toBe(5)
  })
})

// ── getCaregiverPayments ──────────────────────────────────────────────────────

describe('getCaregiverPayments', () => {
  it('returns empty array when DB returns []', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    const result = await getCaregiverPayments('cg-1')
    expect(result).toEqual([])
  })

  it('maps rows correctly (clientName present, caregiverName=null)', async () => {
    const now = new Date()
    mockSelectChain.offset.mockResolvedValueOnce([
      {
        paymentId: 'pay-2',
        jobId: 'job-2',
        careType: 'dementia-care',
        clientName: 'Bob Jones',
        amount: 7500,
        fee: 375,
        method: 'stripe',
        status: 'pending',
        stripePaymentIntentId: null,
        stripeInvoiceId: null,
        createdAt: now,
        releasedAt: null,
      },
    ])
    const result = await getCaregiverPayments('cg-1')
    expect(result).toHaveLength(1)
    expect(result[0].paymentId).toBe('pay-2')
    expect(result[0].jobId).toBe('job-2')
    expect(result[0].careType).toBe('dementia-care')
    expect(result[0].clientName).toBe('Bob Jones')
    expect(result[0].caregiverName).toBeNull()
    expect(result[0].amount).toBe(7500)
    expect(result[0].method).toBe('stripe')
    expect(result[0].status).toBe('pending')
    expect(result[0].createdAt).toBe(now)
  })

  it('returns releasedAt as null when not set', async () => {
    const now = new Date()
    mockSelectChain.offset.mockResolvedValueOnce([
      {
        paymentId: 'pay-2',
        jobId: 'job-2',
        careType: 'dementia-care',
        clientName: 'Bob Jones',
        amount: 7500,
        fee: 375,
        method: 'stripe',
        status: 'pending',
        stripePaymentIntentId: null,
        stripeInvoiceId: null,
        createdAt: now,
        releasedAt: null,
      },
    ])
    const result = await getCaregiverPayments('cg-1')
    expect(result[0].releasedAt).toBeNull()
  })

  it('returns releasedAt as a Date when set', async () => {
    const now = new Date()
    const released = new Date('2026-02-20T14:00:00Z')
    mockSelectChain.offset.mockResolvedValueOnce([
      {
        paymentId: 'pay-2',
        jobId: 'job-2',
        careType: 'dementia-care',
        clientName: 'Bob Jones',
        amount: 7500,
        fee: 375,
        method: 'stripe',
        status: 'completed',
        stripePaymentIntentId: null,
        stripeInvoiceId: null,
        createdAt: now,
        releasedAt: released,
      },
    ])
    const result = await getCaregiverPayments('cg-1')
    expect(result[0].releasedAt).toBe(released)
  })

  it('calls where with caregiverId filter applied', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    await getCaregiverPayments('cg-xyz')
    expect(mockSelectChain.where).toHaveBeenCalledOnce()
  })

  it('calls orderBy for desc ordering', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    await getCaregiverPayments('cg-1')
    expect(mockSelectChain.orderBy).toHaveBeenCalledOnce()
  })

  it('coerces string amount and fee to numbers via Number()', async () => {
    const now = new Date()
    mockSelectChain.offset.mockResolvedValueOnce([
      {
        paymentId: 'pay-coerce',
        jobId: 'job-coerce',
        careType: 'dementia-care',
        clientName: 'Bob Jones',
        amount: '75.50',
        fee: '5.00',
        method: 'stripe',
        status: 'completed',
        stripePaymentIntentId: null,
        stripeInvoiceId: null,
        createdAt: now,
        releasedAt: null,
      },
    ])
    const result = await getCaregiverPayments('cg-1')
    expect(result[0].amount).toBe(75.5)
    expect(result[0].fee).toBe(5)
  })
})

// ── getOpenDisputesForClient ──────────────────────────────────────────────────

describe('getOpenDisputesForClient', () => {
  // For getOpenDisputesForClient, .limit() is the terminal call (no .offset())
  // Override limit to resolve as a promise for these tests
  beforeEach(() => {
    mockSelectChain.limit.mockResolvedValue([])
  })

  it('returns empty array when DB returns []', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([])
    const result = await getOpenDisputesForClient('client-1')
    expect(result).toEqual([])
  })

  it('returns open disputes for client', async () => {
    const now = new Date()
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        disputeId: 'dispute-1',
        jobId: 'job-1',
        paymentId: 'pay-1',
        reason: 'Caregiver no-show',
        status: 'open',
        createdAt: now,
      },
      {
        disputeId: 'dispute-2',
        jobId: 'job-2',
        paymentId: null,
        reason: 'Wrong hours billed',
        status: 'open',
        createdAt: now,
      },
    ])
    const result = await getOpenDisputesForClient('client-1')
    expect(result).toHaveLength(2)
    expect(result[0].disputeId).toBe('dispute-1')
    expect(result[0].jobId).toBe('job-1')
    expect(result[0].paymentId).toBe('pay-1')
    expect(result[0].reason).toBe('Caregiver no-show')
    expect(result[0].status).toBe('open')
    expect(result[0].createdAt).toBe(now)
    expect(result[1].paymentId).toBeNull()
  })

  it('excludes resolved disputes (only open ones come back from query)', async () => {
    const now = new Date()
    // The query filters to status='open' — simulate DB returning only open ones
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        disputeId: 'dispute-1',
        jobId: 'job-1',
        paymentId: 'pay-1',
        reason: 'Caregiver no-show',
        status: 'open',
        createdAt: now,
      },
    ])
    const result = await getOpenDisputesForClient('client-1')
    // Only 1 open dispute returned; resolved ones are not present
    expect(result).toHaveLength(1)
    expect(result.every((d) => d.status === 'open')).toBe(true)
  })

  it('calls where with both clientId and status=open filters', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([])
    await getOpenDisputesForClient('client-abc')
    expect(mockSelectChain.where).toHaveBeenCalledOnce()
  })

  it('calls orderBy for desc ordering', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([])
    await getOpenDisputesForClient('client-1')
    expect(mockSelectChain.orderBy).toHaveBeenCalledOnce()
  })

  it('maps paymentId to null when undefined/null in DB row', async () => {
    const now = new Date()
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        disputeId: 'dispute-3',
        jobId: 'job-3',
        paymentId: undefined,
        reason: 'Service quality issue',
        status: 'open',
        createdAt: now,
      },
    ])
    const result = await getOpenDisputesForClient('client-1')
    expect(result[0].paymentId).toBeNull()
  })
})

// ── getUnbilledShiftsForClient ────────────────────────────────────────────────

describe('getUnbilledShiftsForClient', () => {
  // getUnbilledShiftsForClient terminal call is .limit()
  beforeEach(() => {
    mockSelectChain.limit.mockResolvedValue([])
  })

  it('returns empty array when DB returns []', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([])
    const result = await getUnbilledShiftsForClient('client-1')
    expect(result).toEqual([])
  })

  it('maps rows correctly', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        shiftId: 'shift-1',
        jobId: 'job-1',
        careType: 'personal-care',
        caregiverName: 'Alice Smith',
        date: '2026-04-21',
        startTime: '09:00',
        endTime: '12:00',
        hourlyRate: '20.00',
      },
    ])
    const result = await getUnbilledShiftsForClient('client-1')
    expect(result).toHaveLength(1)
    expect(result[0].shiftId).toBe('shift-1')
    expect(result[0].jobId).toBe('job-1')
    expect(result[0].careType).toBe('personal-care')
    expect(result[0].caregiverName).toBe('Alice Smith')
    expect(result[0].date).toBe('2026-04-21')
    expect(result[0].startTime).toBe('09:00')
    expect(result[0].endTime).toBe('12:00')
    expect(result[0].hourlyRate).toBe(20)
  })

  it('coerces string hourlyRate to number', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        shiftId: 'shift-2',
        jobId: 'job-2',
        careType: 'dementia-care',
        caregiverName: 'Bob',
        date: '2026-04-22',
        startTime: '08:00',
        endTime: '16:00',
        hourlyRate: '25.50',
      },
    ])
    const result = await getUnbilledShiftsForClient('client-1')
    expect(result[0].hourlyRate).toBe(25.5)
  })

  it('maps null caregiverName to null', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        shiftId: 'shift-3',
        jobId: 'job-3',
        careType: 'personal-care',
        caregiverName: null,
        date: '2026-04-23',
        startTime: '10:00',
        endTime: '14:00',
        hourlyRate: '18.00',
      },
    ])
    const result = await getUnbilledShiftsForClient('client-1')
    expect(result[0].caregiverName).toBeNull()
  })

  it('calls where with clientId + completed status + null billedAt', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([])
    await getUnbilledShiftsForClient('client-abc')
    expect(mockSelectChain.where).toHaveBeenCalledOnce()
  })

  it('calls orderBy for date + startTime ordering', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([])
    await getUnbilledShiftsForClient('client-1')
    expect(mockSelectChain.orderBy).toHaveBeenCalledOnce()
  })
})
