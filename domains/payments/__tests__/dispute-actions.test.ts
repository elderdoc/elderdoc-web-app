import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockInsert,
  mockUpdate,
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
  mockValues,
  mockSet,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
  mockValues: vi.fn(),
  mockSet: vi.fn(),
}))

vi.mock('@/services/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  },
}))

vi.mock('@/db/schema', () => ({
  jobs:     { id: 'jobs.id', clientId: 'jobs.clientId' },
  payments: { id: 'payments.id', jobId: 'payments.jobId' },
  disputes: { id: 'disputes.id', clientId: 'disputes.clientId', jobId: 'disputes.jobId', paymentId: 'disputes.paymentId', status: 'disputes.status' },
}))

vi.mock('drizzle-orm', () => ({
  eq:  vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/auth'
import { openDispute, withdrawDispute } from '../actions'

const mockAuth = vi.mocked(auth)

describe('openDispute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLimit.mockResolvedValue([{ id: 'job-1' }])
    mockWhere.mockReturnValue({ limit: mockLimit })
    mockFrom.mockReturnValue({ where: mockWhere, innerJoin: vi.fn().mockReturnValue({ where: mockWhere }) })
    mockSelect.mockReturnValue({ from: mockFrom })
    mockValues.mockResolvedValue(undefined)
    mockInsert.mockReturnValue({ values: mockValues })
  })

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null as any)
    const result = await openDispute('job-1', 'bad shift')
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when job not found', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'client-1' } } as any)
    mockLimit.mockResolvedValueOnce([])
    const result = await openDispute('job-1', 'bad shift')
    expect(result).toEqual({ error: 'Job not found' })
  })

  it('inserts dispute and returns empty object on success', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'client-1' } } as any)
    mockLimit.mockResolvedValueOnce([{ id: 'job-1' }])
    mockLimit.mockResolvedValueOnce([])
    const result = await openDispute('job-1', 'bad shift')
    expect(mockInsert).toHaveBeenCalled()
    expect(result).toEqual({})
  })
})

describe('withdrawDispute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLimit.mockResolvedValue([{ id: 'dispute-1', clientId: 'client-1' }])
    mockWhere.mockReturnValue({ limit: mockLimit })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockSelect.mockReturnValue({ from: mockFrom })
    const mockWhereUpdate = vi.fn().mockResolvedValue(undefined)
    mockSet.mockReturnValue({ where: mockWhereUpdate })
    mockUpdate.mockReturnValue({ set: mockSet })
  })

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null as any)
    const result = await withdrawDispute('dispute-1')
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when dispute not found or not owned', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'client-1' } } as any)
    mockLimit.mockResolvedValueOnce([])
    const result = await withdrawDispute('dispute-1')
    expect(result).toEqual({ error: 'Dispute not found' })
  })

  it('updates status to withdrawn and returns empty object', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'client-1' } } as any)
    mockLimit.mockResolvedValueOnce([{ id: 'dispute-1', clientId: 'client-1' }])
    const result = await withdrawDispute('dispute-1')
    expect(mockUpdate).toHaveBeenCalled()
    expect(result).toEqual({})
  })
})
