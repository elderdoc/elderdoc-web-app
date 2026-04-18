import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSelectChain, mockDb, mockOpenAI } = vi.hoisted(() => {
  const mockSelectChain = {
    from:      vi.fn(),
    innerJoin: vi.fn(),
    leftJoin:  vi.fn(),
    where:     vi.fn(),
    limit:     vi.fn(),
  }
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.leftJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockResolvedValue([])

  const mockDb = {
    select: vi.fn().mockReturnValue(mockSelectChain),
  }

  const mockCreate = vi.fn()
  const mockOpenAI = {
    chat: { completions: { create: mockCreate } },
  }

  return { mockSelectChain, mockDb, mockOpenAI }
})

vi.mock('@/services/db', () => ({ db: mockDb }))
vi.mock('@/services/openai', () => ({ getOpenAI: () => mockOpenAI }))

import { matchCaregivers } from '../match-caregivers'

const REQUEST_ROW = {
  careType: 'personal-care',
  frequency: 'daily',
  days: ['mon', 'tue'],
  shifts: ['morning'],
  durationHours: 4,
  languagePref: ['english'],
  budgetAmount: '20',
  budgetType: 'hourly',
  title: 'Need morning care',
  description: 'Help with bathing',
  state: 'CA',
}

const CANDIDATE = {
  id: 'cg-1',
  headline: 'Experienced caregiver',
  hourlyMin: '18',
  hourlyMax: '25',
  experience: '5 years',
  name: 'Alice Smith',
  image: '/alice.jpg',
  city: 'Los Angeles',
  state: 'CA',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.leftJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockResolvedValue([])
  mockDb.select.mockReturnValue(mockSelectChain)
})

describe('matchCaregivers', () => {
  it('returns [] when request not found', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([])
    const result = await matchCaregivers('req-1')
    expect(result).toEqual([])
  })

  it('returns [] and skips OpenAI when no candidates match pre-filter', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    mockSelectChain.limit.mockResolvedValueOnce([])
    const result = await matchCaregivers('req-1')
    expect(result).toEqual([])
    expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled()
  })

  it('calls OpenAI with model gpt-4o and json_object format', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    mockSelectChain.limit.mockResolvedValueOnce([CANDIDATE])
    // request and candidates queries both call .where() before .limit()
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    // cert, lang, careType queries return empty
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        rankings: [{ caregiverId: 'cg-1', score: 90, reason: 'Great fit.' }]
      }) } }]
    })

    await matchCaregivers('req-1')
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
      })
    )
  })

  it('returns top 5 sorted by score descending when more than 5 candidates', async () => {
    const candidates = Array.from({ length: 7 }, (_, i) => ({
      ...CANDIDATE, id: `cg-${i}`, name: `Caregiver ${i}`,
    }))
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    mockSelectChain.limit.mockResolvedValueOnce(candidates)
    // request and candidates queries both call .where() before .limit()
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    // 3 batch queries (cert/lang/careType) via Promise.all + inArray
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])

    const rankings = candidates.map((c, i) => ({
      caregiverId: c.id, score: 70 - i, reason: 'Good.',
    }))
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ rankings }) } }]
    })

    const result = await matchCaregivers('req-1')
    expect(result).toHaveLength(5)
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score)
  })

  it('returns [] when OpenAI returns malformed JSON', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    mockSelectChain.limit.mockResolvedValueOnce([CANDIDATE])
    // request and candidates queries both call .where() before .limit()
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'not json {{' } }]
    })
    const result = await matchCaregivers('req-1')
    expect(result).toEqual([])
  })

  it('returns [] when OpenAI returns empty rankings array', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    mockSelectChain.limit.mockResolvedValueOnce([CANDIDATE])
    // request and candidates queries both call .where() before .limit()
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockSelectChain.where.mockResolvedValueOnce([])
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ rankings: [] }) } }]
    })
    const result = await matchCaregivers('req-1')
    expect(result).toEqual([])
  })

  it('joins display data (name, image, headline, careTypes) onto returned candidates', async () => {
    mockSelectChain.limit.mockResolvedValueOnce([REQUEST_ROW])
    mockSelectChain.limit.mockResolvedValueOnce([CANDIDATE])
    // request and candidates queries both call .where() before .limit()
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.where.mockReturnValueOnce(mockSelectChain)
    mockSelectChain.where.mockResolvedValueOnce([]) // certs
    mockSelectChain.where.mockResolvedValueOnce([]) // langs
    mockSelectChain.where.mockResolvedValueOnce([{ caregiverId: 'cg-1', careType: 'personal-care' }]) // careTypes
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        rankings: [{ caregiverId: 'cg-1', score: 85, reason: 'Great fit.' }]
      }) } }]
    })
    const result = await matchCaregivers('req-1')
    expect(result[0].name).toBe('Alice Smith')
    expect(result[0].image).toBe('/alice.jpg')
    expect(result[0].headline).toBe('Experienced caregiver')
    expect(result[0].score).toBe(85)
    expect(result[0].reason).toBe('Great fit.')
    expect(result[0].careTypes).toContain('personal-care')
  })
})
