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
  it('returns [] when client has no recipients', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    const result = await getClientCarePlans('client-1')
    expect(result).toEqual([])
  })

  it('returns recipients with care plan data when plans exist', async () => {
    const updatedAt = new Date('2026-04-01T00:00:00Z')
    mockSelectChain.offset.mockResolvedValueOnce([
      { recipientId: 'rec-1', recipientName: 'Alice', carePlanId: 'plan-1', updatedAt },
    ])
    const result = await getClientCarePlans('client-1')
    expect(result).toHaveLength(1)
    expect(result[0].recipientId).toBe('rec-1')
    expect(result[0].carePlanId).toBe('plan-1')
    expect(result[0].updatedAt).toBe(updatedAt)
  })

  it('returns recipients without care plans (carePlanId null)', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([
      { recipientId: 'rec-2', recipientName: 'Bob', carePlanId: null, updatedAt: null },
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

  it('returns multiple rows with null carePlanId', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([
      { recipientId: 'rec-3', recipientName: 'Carol', carePlanId: null, updatedAt: null },
      { recipientId: 'rec-4', recipientName: 'Dave', carePlanId: null, updatedAt: null },
    ])
    const result = await getClientCarePlans('client-3')
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.carePlanId === null)).toBe(true)
  })
})

describe('getCarePlanByJob', () => {
  it('returns null when job does not exist or not owned by caregiver', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    const result = await getCarePlanByJob('job-1', 'wrong-caregiver')
    expect(result).toBeNull()
  })

  it('returns null when job exists but has no care plan', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([{ recipientId: 'rec-1' }])  // ownership found
    mockSelectChain.offset.mockResolvedValueOnce([])                            // no plan
    const result = await getCarePlanByJob('job-1', 'caregiver-1')
    expect(result).toBeNull()
  })

  it('returns care plan detail when job is owned and plan exists', async () => {
    const updatedAt = new Date('2026-04-01T00:00:00Z')
    mockSelectChain.offset.mockResolvedValueOnce([{ recipientId: 'rec-1' }])  // ownership found
    mockSelectChain.offset.mockResolvedValueOnce([                              // plan found
      {
        id: 'plan-1',
        requestId: 'req-1',
        recipientId: 'rec-1',
        activityMobilitySafety: [{ key: 'companionship', frequency: 'every-visit' }],
        hygieneElimination:     [{ key: 'bathShower', frequency: 'every-visit', notes: 'morning' }],
        homeManagement:         null,
        hydrationNutrition:     null,
        medicationReminders:    [{ key: 'medMorning', frequency: 'every-visit' }],
        updatedAt,
      },
    ])
    const result = await getCarePlanByJob('job-1', 'caregiver-1')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('plan-1')
    expect(result!.activityMobilitySafety).toEqual([{ key: 'companionship', frequency: 'every-visit' }])
    expect(result!.hygieneElimination).toEqual([{ key: 'bathShower', frequency: 'every-visit', notes: 'morning' }])
    expect(result!.updatedAt).toBe(updatedAt)
  })
})
