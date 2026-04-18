import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSelectChain, mockDb } = vi.hoisted(() => {
  const mockSelectChain = {
    from:      vi.fn(),
    innerJoin: vi.fn(),
    leftJoin:  vi.fn(),
    where:     vi.fn(),
    orderBy:   vi.fn(),
    limit:     vi.fn(),
    offset:    vi.fn(),
  }
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.leftJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.orderBy.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockReturnValue(mockSelectChain)
  mockSelectChain.offset.mockResolvedValue([])
  const mockDb = { select: vi.fn().mockReturnValue(mockSelectChain) }
  return { mockSelectChain, mockDb }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { getClientCarePlans, getCarePlanByJob } from '../care-plans'

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.leftJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.orderBy.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockReturnValue(mockSelectChain)
  mockSelectChain.offset.mockResolvedValue([])
  mockDb.select.mockReturnValue(mockSelectChain)
})

describe('getClientCarePlans', () => {
  it('returns [] when client has no active jobs', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    const result = await getClientCarePlans('client-1')
    expect(result).toEqual([])
  })

  it('returns jobs with care plan data when plans exist', async () => {
    const updatedAt = new Date('2026-04-01T00:00:00Z')
    mockSelectChain.offset.mockResolvedValueOnce([
      { jobId: 'job-1', requestId: 'req-1', careType: 'personal-care', caregiverName: 'Alice', carePlanId: 'plan-1', updatedAt },
    ])
    const result = await getClientCarePlans('client-1')
    expect(result).toHaveLength(1)
    expect(result[0].jobId).toBe('job-1')
    expect(result[0].carePlanId).toBe('plan-1')
    expect(result[0].updatedAt).toBe(updatedAt)
  })

  it('returns jobs without care plans (carePlanId null)', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([
      { jobId: 'job-2', requestId: 'req-2', careType: 'companion-care', caregiverName: 'Bob', carePlanId: null, updatedAt: null },
    ])
    const result = await getClientCarePlans('client-2')
    expect(result).toHaveLength(1)
    expect(result[0].carePlanId).toBeNull()
    expect(result[0].updatedAt).toBeNull()
  })

  it('calls select with limit 50 and offset 0', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    await getClientCarePlans('client-1')
    expect(mockSelectChain.limit).toHaveBeenCalledWith(50)
    expect(mockSelectChain.offset).toHaveBeenCalledWith(0)
  })

  it('returns [] when DB returns rows with null carePlanId only', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([
      { jobId: 'job-3', requestId: 'req-3', careType: 'live-in', caregiverName: 'Carol', carePlanId: null, updatedAt: null },
      { jobId: 'job-4', requestId: 'req-4', careType: 'personal-care', caregiverName: 'Dave', carePlanId: null, updatedAt: null },
    ])
    const result = await getClientCarePlans('client-3')
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.carePlanId === null)).toBe(true)
  })
})

describe('getCarePlanByJob', () => {
  it('returns null when job does not exist or not owned by client', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    const result = await getCarePlanByJob('job-1', 'wrong-client')
    expect(result).toBeNull()
  })

  it('returns null when job exists but has no care plan', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([{ jobId: 'job-1' }])  // ownership found
    mockSelectChain.offset.mockResolvedValueOnce([])                     // no plan
    const result = await getCarePlanByJob('job-1', 'client-1')
    expect(result).toBeNull()
  })

  it('returns care plan detail when job is owned and plan exists', async () => {
    const updatedAt = new Date('2026-04-01T00:00:00Z')
    mockSelectChain.offset.mockResolvedValueOnce([{ jobId: 'job-1' }])  // ownership found
    mockSelectChain.offset.mockResolvedValueOnce([                       // plan found
      {
        id: 'plan-1',
        jobId: 'job-1',
        dailySchedule: [{ time: '08:00', activity: 'Breakfast' }],
        medications: [{ name: 'Aspirin', dosage: '81mg', frequency: 'daily' }],
        dietaryRestrictions: ['no peanuts'],
        emergencyContacts: [{ name: 'Son', relationship: 'son', phone: '555-1234' }],
        specialInstructions: 'Keep warm',
        updatedAt,
      },
    ])
    const result = await getCarePlanByJob('job-1', 'client-1')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('plan-1')
    expect(result!.dailySchedule).toEqual([{ time: '08:00', activity: 'Breakfast' }])
    expect(result!.medications).toEqual([{ name: 'Aspirin', dosage: '81mg', frequency: 'daily' }])
    expect(result!.dietaryRestrictions).toEqual(['no peanuts'])
    expect(result!.updatedAt).toBe(updatedAt)
  })
})
