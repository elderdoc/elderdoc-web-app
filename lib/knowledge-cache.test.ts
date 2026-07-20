import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRedis = { get: vi.fn(), set: vi.fn() }
vi.mock('./redis', () => ({ redis: mockRedis }))

const mockKnowledgeRow = {
  about: 'About Elderdoc',
  howItWorks: 'How it works',
  pricingAndBilling: 'Pricing',
  forCaregivers: 'For caregivers',
  forClients: 'For clients',
  faqs: 'FAQs',
  support: 'Support info',
}

const mockLimit = vi.fn()
const mockFrom = vi.fn(() => ({ limit: mockLimit }))
const mockSelect = vi.fn(() => ({ from: mockFrom }))
vi.mock('@/services/db', () => ({ db: { select: mockSelect } }))
vi.mock('@/db/schema', () => ({ appKnowledge: {} }))

beforeEach(() => vi.clearAllMocks())

describe('getAppKnowledge', () => {
  it('returns cached value from Redis without hitting DB', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify(mockKnowledgeRow))
    const { getAppKnowledge } = await import('./knowledge-cache')
    const result = await getAppKnowledge()
    expect(result).toEqual(mockKnowledgeRow)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('queries DB on Redis miss and writes result to Redis', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockLimit.mockResolvedValue([mockKnowledgeRow])
    const { getAppKnowledge } = await import('./knowledge-cache')
    const result = await getAppKnowledge()
    expect(result).toEqual(mockKnowledgeRow)
    expect(mockSelect).toHaveBeenCalled()
    expect(mockRedis.set).toHaveBeenCalledWith(
      'app:knowledge',
      JSON.stringify(mockKnowledgeRow),
      'EX',
      86400,
    )
  })

  it('returns null when DB has no row', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockLimit.mockResolvedValue([])
    const { getAppKnowledge } = await import('./knowledge-cache')
    expect(await getAppKnowledge()).toBeNull()
  })

  it('falls back to DB when Redis throws', async () => {
    mockRedis.get.mockRejectedValue(new Error('Redis unavailable'))
    mockLimit.mockResolvedValue([mockKnowledgeRow])
    const { getAppKnowledge } = await import('./knowledge-cache')
    expect(await getAppKnowledge()).toEqual(mockKnowledgeRow)
  })
})
