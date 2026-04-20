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

  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.orderBy.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockReturnValue(mockSelectChain)
  mockSelectChain.offset.mockResolvedValue([])

  const mockDb = {
    select: vi.fn().mockReturnValue(mockSelectChain),
  }
  return { mockSelectChain, mockDb }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { getClientPayments, getCaregiverPayments } from '../queries'

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
        method: 'stripe',
        status: 'completed',
        createdAt: now,
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
        method: 'stripe',
        status: 'pending',
        createdAt: now,
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
})
