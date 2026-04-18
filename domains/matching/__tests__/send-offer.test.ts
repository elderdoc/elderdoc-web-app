import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

const { mockMutateChain, mockSelectChain, mockDb } = vi.hoisted(() => {
  const mockMutateChain = {
    values:    vi.fn(),
    returning: vi.fn(),
  }
  mockMutateChain.values.mockReturnValue(mockMutateChain)
  mockMutateChain.returning.mockResolvedValue([{ id: 'match-1' }])

  const mockSelectChain = {
    from:  vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  }
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockResolvedValue([])

  const mockDb = {
    insert: vi.fn().mockReturnValue(mockMutateChain),
    select: vi.fn().mockReturnValue(mockSelectChain),
  }
  return { mockMutateChain, mockSelectChain, mockDb }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { auth } from '@/auth'
import { sendOffer } from '../send-offer'

const mockAuth = vi.mocked(auth)
const SESSION = { user: { id: 'user-1', email: 'a@b.com', name: 'Client', role: 'client' } }

beforeEach(() => {
  vi.clearAllMocks()
  mockMutateChain.values.mockReturnValue(mockMutateChain)
  mockMutateChain.returning.mockResolvedValue([{ id: 'match-1' }])
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockResolvedValue([])
  mockDb.insert.mockReturnValue(mockMutateChain)
  mockDb.select.mockReturnValue(mockSelectChain)
})

describe('sendOffer', () => {
  it('throws Unauthorized when no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(sendOffer('req-1', 'cg-1', 90, 'Great fit.')).rejects.toThrow('Unauthorized')
  })

  it('throws Unauthorized when clientId does not match session user', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockSelectChain.limit.mockResolvedValueOnce([])
    await expect(sendOffer('req-1', 'cg-1', 90, 'Great fit.')).rejects.toThrow('Unauthorized')
  })

  it('inserts correct fields into matches', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockSelectChain.limit.mockResolvedValueOnce([{ id: 'req-1', clientId: 'user-1' }])

    await sendOffer('req-1', 'cg-1', 90, 'Great fit.')

    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockMutateChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId:   'req-1',
        caregiverId: 'cg-1',
        score:       90,
        reason:      'Great fit.',
        status:      'pending',
      })
    )
  })
})
