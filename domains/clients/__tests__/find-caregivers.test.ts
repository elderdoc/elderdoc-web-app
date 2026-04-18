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

  const mockDb = {
    select: vi.fn().mockReturnValue(mockSelectChain),
    $count: vi.fn().mockResolvedValue(0),
  }
  return { mockSelectChain, mockDb }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { getMatchesForRequest, searchCaregivers } from '../find-caregivers'

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
  mockDb.$count.mockResolvedValue(0)
})

// ── getMatchesForRequest ──────────────────────────────────────────────────────

describe('getMatchesForRequest', () => {
  it('returns [] when no matches exist for requestId', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])  // query terminates at .offset(0)
    const result = await getMatchesForRequest('req-1', 'client-1')
    expect(result).toEqual([])
  })

  it('joins careTypes onto match rows and orders by score descending', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([
      { matchId: 'm1', caregiverId: 'cg1', score: 72, reason: 'Good', name: 'Alice', image: null, headline: null, city: 'Austin', state: 'Texas', hourlyMin: '20', hourlyMax: '30' },
      { matchId: 'm2', caregiverId: 'cg2', score: 90, reason: 'Great', name: 'Bob', image: null, headline: null, city: 'Dallas', state: 'Texas', hourlyMin: '25', hourlyMax: '35' },
    ])
    mockSelectChain.where.mockResolvedValueOnce([
      { caregiverId: 'cg1', careType: 'personal-care' },
      { caregiverId: 'cg2', careType: 'dementia-care' },
    ])
    const result = await getMatchesForRequest('req-1', 'client-1')
    expect(result[0].caregiverId).toBe('cg1')
    expect(result[0].careTypes).toEqual(['personal-care'])
    expect(result[1].caregiverId).toBe('cg2')
    expect(result[1].careTypes).toEqual(['dementia-care'])
    expect(mockSelectChain.orderBy).toHaveBeenCalledOnce()
  })

  it('returns [] when clientId does not own the requestId', async () => {
    mockSelectChain.offset.mockResolvedValueOnce([])
    const result = await getMatchesForRequest('req-1', 'wrong-client')
    expect(result).toEqual([])
  })
})

// ── searchCaregivers ──────────────────────────────────────────────────────────
//
// Mock queue per test (in order of consumption):
//   1. where → [{ count: N }]  (count query terminates with .where())
//   2. where → chain           (main query .where(whereClause) returns chain)
//   3. offset → rows           (main query terminates with .offset())
//   4. where → [...]           (careTypes batch — only if rows non-empty)
//   5. where → [...]           (languages batch)
//   6. where → [...]           (certifications batch)

describe('searchCaregivers', () => {
  it('returns all active caregivers when no filters applied', async () => {
    mockSelectChain.where.mockResolvedValueOnce([{ count: 2 }])    // count query
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)      // main query → chain
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: '3 years', city: 'Austin', state: 'Texas', hourlyMin: '20', hourlyMax: '30' },
      { caregiverId: 'cg2', name: 'Bob',   image: null, headline: null, experience: '5 years', city: 'Dallas', state: 'Texas', hourlyMin: '25', hourlyMax: '35' },
    ])
    mockSelectChain.where.mockResolvedValueOnce([])                 // careTypes batch
    mockSelectChain.where.mockResolvedValueOnce([])                 // languages batch
    mockSelectChain.where.mockResolvedValueOnce([])                 // certifications batch

    const result = await searchCaregivers({}, 1)
    expect(result.total).toBe(2)
    expect(result.caregivers).toHaveLength(2)
  })

  it('filters by careType', async () => {
    mockSelectChain.where.mockResolvedValueOnce([{ count: 1 }])
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: null, city: null, state: null, hourlyMin: null, hourlyMax: null },
    ])
    mockSelectChain.where.mockResolvedValueOnce([{ caregiverId: 'cg1', careType: 'personal-care' }])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])

    const result = await searchCaregivers({ careType: 'personal-care' }, 1)
    expect(result.total).toBe(1)
    expect(result.caregivers[0].careTypes).toEqual(['personal-care'])
  })

  it('filters by state', async () => {
    mockSelectChain.where.mockResolvedValueOnce([{ count: 1 }])
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: null, city: 'Austin', state: 'Texas', hourlyMin: null, hourlyMax: null },
    ])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])

    const result = await searchCaregivers({ state: 'Texas' }, 1)
    expect(result.total).toBe(1)
    expect(result.caregivers[0].state).toBe('Texas')
  })

  it('filters by rateMin and rateMax', async () => {
    mockSelectChain.where.mockResolvedValueOnce([{ count: 1 }])
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: null, city: null, state: null, hourlyMin: '20', hourlyMax: '30' },
    ])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])

    const result = await searchCaregivers({ rateMin: '15', rateMax: '35' }, 1)
    expect(result.total).toBe(1)
  })

  it('filters by language (multi-value)', async () => {
    mockSelectChain.where.mockResolvedValueOnce([{ count: 1 }])
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: null, city: null, state: null, hourlyMin: null, hourlyMax: null },
    ])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([{ caregiverId: 'cg1', language: 'spanish' }])
    mockSelectChain.where.mockResolvedValueOnce([])

    const result = await searchCaregivers({ language: ['spanish'] }, 1)
    expect(result.total).toBe(1)
    expect(result.caregivers[0].languages).toEqual(['spanish'])
  })

  it('filters by certification (multi-value)', async () => {
    mockSelectChain.where.mockResolvedValueOnce([{ count: 1 }])
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: null, city: null, state: null, hourlyMin: null, hourlyMax: null },
    ])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([{ caregiverId: 'cg1', certification: 'cna' }])

    const result = await searchCaregivers({ certification: ['cna'] }, 1)
    expect(result.total).toBe(1)
    expect(result.caregivers[0].certifications).toEqual(['cna'])
  })

  it('filters by experience', async () => {
    mockSelectChain.where.mockResolvedValueOnce([{ count: 1 }])
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.offset.mockResolvedValueOnce([
      { caregiverId: 'cg1', name: 'Alice', image: null, headline: null, experience: '3 years', city: null, state: null, hourlyMin: null, hourlyMax: null },
    ])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])

    const result = await searchCaregivers({ experience: '3 years' }, 1)
    expect(result.total).toBe(1)
  })

  it('respects page offset (limit 20)', async () => {
    mockSelectChain.where.mockResolvedValueOnce([{ count: 25 }])
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.offset.mockResolvedValueOnce([])

    const result = await searchCaregivers({}, 2)
    expect(mockSelectChain.limit).toHaveBeenCalledWith(20)
    expect(mockSelectChain.offset).toHaveBeenCalledWith(20)
    expect(result.total).toBe(25)
  })

  it('returns correct total count', async () => {
    mockSelectChain.where.mockResolvedValueOnce([{ count: 42 }])
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.offset.mockResolvedValueOnce([])

    const result = await searchCaregivers({}, 1)
    expect(result.total).toBe(42)
  })
})
